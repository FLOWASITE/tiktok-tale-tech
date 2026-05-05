import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_URLS = 1000;
const FETCH_TIMEOUT_MS = 15000;

function safeFetch(url: string, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function normHost(u: string): string {
  try { return new URL(u).host.toLowerCase(); } catch { return ""; }
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && w.length <= 30)
  )).slice(0, 20);
}

function stripHtml(s: string) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// --- Source fetchers -------------------------------------------------

async function fetchWordPressOrg(connection: any) {
  const siteUrl: string = connection.metadata?.site_url;
  const username: string = connection.metadata?.username;
  if (!siteUrl || !username) throw new Error("WordPress connection thiếu site_url/username");
  const appPassword = await decryptCredential(connection.refresh_token);
  if (!appPassword) throw new Error("Không decrypt được application password");
  const auth = "Basic " + btoa(`${username}:${appPassword}`);

  const out: any[] = [];
  for (let page = 1; page <= 10 && out.length < MAX_URLS; page++) {
    const r = await safeFetch(
      `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,link,title,excerpt,date,slug,status&status=publish`,
      { headers: { Authorization: auth } }
    );
    if (!r.ok) {
      if (r.status === 400 && page > 1) break;
      throw new Error(`WP REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const p of arr) {
      out.push({
        url: p.link,
        title: stripHtml(p.title?.rendered || ""),
        excerpt: stripHtml(p.excerpt?.rendered || "").slice(0, 500),
        published_at: p.date,
        external_id: String(p.id),
        slug: p.slug,
      });
    }
    if (arr.length < 100) break;
  }
  return out;
}

async function fetchWordPressCom(connection: any) {
  const siteId = connection.metadata?.selected_site_id;
  if (!siteId) throw new Error("WordPress.com connection thiếu selected_site_id");
  const accessToken = await decryptCredential(connection.access_token);
  if (!accessToken) throw new Error("Không decrypt được access token");

  const out: any[] = [];
  let offset = 0;
  for (let i = 0; i < 10 && out.length < MAX_URLS; i++) {
    const r = await safeFetch(
      `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts?number=100&offset=${offset}&fields=ID,URL,title,excerpt,date,slug`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!r.ok) throw new Error(`WP.com ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const posts = j?.posts || [];
    if (!posts.length) break;
    for (const p of posts) {
      out.push({
        url: p.URL,
        title: stripHtml(p.title || ""),
        excerpt: stripHtml(p.excerpt || "").slice(0, 500),
        published_at: p.date,
        external_id: String(p.ID),
        slug: p.slug,
      });
    }
    offset += posts.length;
    if (posts.length < 100) break;
  }
  return out;
}

async function fetchBlogger(connection: any, supabase: any) {
  const blogId = connection.metadata?.selected_blog_id || connection.page_id;
  if (!blogId) throw new Error("Blogger connection thiếu selected_blog_id");

  // Refresh nếu sắp hết hạn
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (expiresAt - Date.now() < 10 * 60 * 1000 && connection.refresh_token) {
    await safeFetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/refresh-blogger-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connectionId: connection.id }),
    }).catch(() => {});
    const { data: refreshed } = await supabase
      .from("social_connections").select("access_token").eq("id", connection.id).single();
    if (refreshed?.access_token) connection.access_token = refreshed.access_token;
  }

  const accessToken = await decryptCredential(connection.access_token);
  if (!accessToken) throw new Error("Không decrypt được Blogger access token");

  const out: any[] = [];
  let pageToken: string | null = null;
  for (let i = 0; i < 10 && out.length < MAX_URLS; i++) {
    const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=100&fetchBodies=false${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const r = await safeFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Blogger ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const items = j?.items || [];
    for (const p of items) {
      out.push({
        url: p.url,
        title: p.title || "",
        excerpt: stripHtml(p.content || "").slice(0, 500),
        published_at: p.published,
        external_id: String(p.id),
      });
    }
    pageToken = j?.nextPageToken || null;
    if (!pageToken) break;
  }
  return out;
}

async function fetchSitemap(rootUrl: string, depth = 0): Promise<any[]> {
  if (depth > 3) return [];
  const r = await safeFetch(rootUrl, { headers: { "User-Agent": "FlowaBot/1.0" } });
  if (!r.ok) throw new Error(`Sitemap ${r.status} @ ${rootUrl}`);
  const xml = await r.text();
  const out: any[] = [];

  // Sitemap index → recurse
  const sitemapMatches = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/sitemap>/g)];
  if (sitemapMatches.length) {
    for (const m of sitemapMatches.slice(0, 20)) {
      try {
        const child = await fetchSitemap(m[1].trim(), depth + 1);
        out.push(...child);
        if (out.length >= MAX_URLS) break;
      } catch (e) {
        console.warn("[sync-external-links] sitemap child failed", e);
      }
    }
    return out;
  }

  // Regular urlset
  const urlMatches = [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>(?:[\s\S]*?<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/g)];
  for (const m of urlMatches.slice(0, MAX_URLS)) {
    out.push({
      url: m[1].trim(),
      title: null,
      published_at: m[2] ? new Date(m[2]).toISOString() : null,
    });
  }
  return out;
}

// --- Main handler ----------------------------------------------------

Deno.serve(withPerf({ functionName: "sync-external-links" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims?.sub) throw new Error("Unauthorized");
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const { connectionId, sitemapUrl, organizationId, brandTemplateId } = body;

    if (!organizationId) throw new Error("organizationId required");
    // Verify membership
    const { data: mem } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!mem) throw new Error("Forbidden: not a member of this organization");

    let items: any[] = [];
    let sourceType = "manual";
    let sourceRefId = "";
    let domain = "";

    if (connectionId) {
      const { data: conn, error: connErr } = await supabase
        .from("social_connections").select("*").eq("id", connectionId).single();
      if (connErr || !conn) throw new Error("Connection not found");
      if (conn.organization_id !== organizationId) throw new Error("Forbidden");
      sourceRefId = conn.id;

      switch (conn.platform) {
        case "wordpress":
          sourceType = "wordpress";
          items = await fetchWordPressOrg(conn);
          domain = normHost(conn.metadata?.site_url || items[0]?.url || "");
          break;
        case "wordpress_com":
          sourceType = "wordpress_com";
          items = await fetchWordPressCom(conn);
          domain = normHost(conn.metadata?.selected_site_url || items[0]?.url || "");
          break;
        case "blogger":
          sourceType = "blogger";
          items = await fetchBlogger(conn, supabase);
          domain = normHost(items[0]?.url || conn.metadata?.blog_url || "");
          break;
        case "website":
          sourceType = "sitemap";
          // Try sitemap.xml from website connection metadata
          const siteUrl = conn.metadata?.website_url || conn.metadata?.site_url;
          if (!siteUrl) throw new Error("Website connection thiếu URL để dò sitemap");
          items = await fetchSitemap(siteUrl.replace(/\/$/, "") + "/sitemap.xml");
          domain = normHost(siteUrl);
          break;
        default:
          throw new Error(`Platform "${conn.platform}" chưa hỗ trợ sync link`);
      }
    } else if (sitemapUrl) {
      sourceType = "sitemap";
      sourceRefId = sitemapUrl;
      items = await fetchSitemap(sitemapUrl);
      domain = normHost(sitemapUrl);
    } else {
      throw new Error("Cần connectionId hoặc sitemapUrl");
    }

    if (!items.length) {
      return new Response(JSON.stringify({ inserted: 0, updated: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build rows
    const rows = items.slice(0, MAX_URLS).map((it) => {
      const u = it.url;
      const d = normHost(u) || domain;
      return {
        organization_id: organizationId,
        brand_template_id: brandTemplateId || null,
        source_type: sourceType,
        source_ref_id: sourceRefId,
        domain: d,
        url: u,
        title: it.title || null,
        excerpt: it.excerpt || null,
        keywords: extractKeywords(`${it.title || ""} ${it.slug || ""}`),
        published_at: it.published_at || null,
        last_synced_at: new Date().toISOString(),
        status: "active",
        metadata: it.external_id ? { external_id: it.external_id } : {},
      };
    }).filter((r) => r.url && r.url.startsWith("http"));

    // Upsert in chunks
    let inserted = 0;
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("external_link_sources")
        .upsert(chunk, { onConflict: "organization_id,url" });
      if (error) {
        console.error("[sync-external-links] upsert error:", error);
        throw new Error(error.message);
      }
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({
      total: rows.length, inserted, sourceType, domain,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[sync-external-links] error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
