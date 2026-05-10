// import-brand-from-website
// Scrapes a website (homepage + optional sub-pages) via Firecrawl,
// then asks the AI to extract a structured brand suggestion blob.
//
// Auth: standard JWT (verify_jwt = true by default).
// Body: { url: string, extra_paths?: string[], organization_id?: string, locale?: string }

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { extractBrandSuggestions } from "../_shared/brand-extractor.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface FirecrawlScrapeResult {
  success: boolean;
  markdown?: string;
  metadata?: any;
  links?: string[];
  error?: string;
}

async function firecrawlScrape(url: string, formats: string[] = ["markdown"]): Promise<FirecrawlScrapeResult> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { success: false, error: "FIRECRAWL_API_KEY not configured" };

  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats, onlyMainContent: true, waitFor: 1500 }),
    });
    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data?.error || `HTTP ${resp.status}` };
    const payload = data.data ?? data;
    return {
      success: true,
      markdown: payload?.markdown,
      metadata: payload?.metadata,
      links: payload?.links,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "scrape failed" };
  }
}

function normalizeUrl(raw: string): string | null {
  try {
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    const u = new URL(s);
    return u.toString();
  } catch {
    return null;
  }
}

Deno.serve(withPerf({ functionName: "import-brand-from-website" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawUrl: string | undefined = body?.url;
    const extraPaths: string[] = Array.isArray(body?.extra_paths) ? body.extra_paths.slice(0, 4) : [];
    const organizationId: string | undefined = body?.organization_id;
    const locale: string = body?.locale || "vi";

    const targetUrl = rawUrl ? normalizeUrl(rawUrl) : null;
    if (!targetUrl) return json({ error: "URL không hợp lệ" }, 400);

    console.log(`[import-brand-from-website] user=${user.id} url=${targetUrl} extras=${extraPaths.length}`);

    // Scrape homepage with branding
    const home = await firecrawlScrape(targetUrl, ["markdown"]);
    if (!home.success) {
      return json({ error: `Không scrape được trang chủ: ${home.error}` }, 502);
    }

    // Scrape sub-pages in parallel (best-effort)
    const subResults = await Promise.allSettled(
      extraPaths.map((p) => {
        const sub = normalizeUrl(p.startsWith("http") ? p : new URL(p, targetUrl).toString());
        return sub ? firecrawlScrape(sub, ["markdown"]) : Promise.resolve({ success: false, error: "bad url" });
      }),
    );

    const subMarkdowns: string[] = [];
    subResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success && r.value.markdown) {
        subMarkdowns.push(r.value.markdown.slice(0, 4000));
      }
    });

    const meta = home.metadata || {};
    const combinedContent = [
      `# Page title: ${meta.title || ""}`,
      meta.description ? `# Meta description: ${meta.description}` : "",
      meta.ogSiteName ? `# Site name: ${meta.ogSiteName}` : "",
      "",
      "## Homepage",
      home.markdown || "",
      ...subMarkdowns.map((m, i) => `\n## Sub page ${i + 1}\n${m}`),
    ].filter(Boolean).join("\n");

    const extracted = await extractBrandSuggestions({
      source: "website",
      content: combinedContent,
      locale,
      organizationId,
      hint: new URL(targetUrl).hostname,
    });

    if (!extracted.success) {
      return json({ error: extracted.error || "AI extraction failed" }, 502);
    }

    return json({
      success: true,
      suggestion: extracted.suggestion,
      raw_meta: {
        source_url: targetUrl,
        page_title: meta.title || null,
        og_image: meta.ogImage || meta.image || null,
        favicon: meta.favicon || null,
        scraped_pages: 1 + subMarkdowns.length,
      },
    });
  } catch (e) {
    console.error("[import-brand-from-website] error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
}));
