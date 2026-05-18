// Fetch SERP top 10 + scrape top results via Firecrawl, store snapshot for competitive analysis.
// POST: { keyword_id: string, max_scrape?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getGatewayConfig } from "../_shared/lovable-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = getGatewayConfig().apiKey;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY chưa cấu hình");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY chưa cấu hình (kết nối Firecrawl)");

    // Auth — verify caller and check workspace membership
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const keywordId = body.keyword_id as string | undefined;
    const maxScrape: number = Math.min(body.max_scrape ?? 5, 10);
    if (!keywordId) return new Response(JSON.stringify({ error: "keyword_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: kw, error: kwErr } = await supabase
      .from("seo_keywords")
      .select("id, organization_id, keyword, locale")
      .eq("id", keywordId)
      .maybeSingle();
    if (kwErr || !kw) throw new Error("Keyword not found");

    // Membership check
    const { data: mem } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", kw.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mem) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get our domain
    const { data: brand } = await supabase
      .from("brand_templates").select("website_url").eq("organization_id", kw.organization_id).limit(1).maybeSingle();
    let ourHost: string | null = null;
    try { if (brand?.website_url) ourHost = new URL(brand.website_url).hostname.replace(/^www\./, ""); } catch {}

    // 1) SERP search
    const searchRes = await fetch(`${FIRECRAWL_GATEWAY}/v2/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": FIRECRAWL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: kw.keyword,
        limit: 10,
        lang: kw.locale === "en" ? "en" : "vi",
        country: kw.locale === "en" ? "us" : "vn",
      }),
    });
    if (!searchRes.ok) {
      const t = await searchRes.text();
      throw new Error(`Firecrawl search ${searchRes.status}: ${t.slice(0, 200)}`);
    }
    const searchJson = await searchRes.json();
    const results: Array<{ url: string; title?: string; description?: string }> = searchJson.data ?? searchJson.results ?? searchJson.web?.results ?? [];

    const topResults = results.slice(0, 10).map((r, i) => {
      let host = "";
      try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch {}
      return {
        rank: i + 1,
        url: r.url,
        title: r.title ?? null,
        description: r.description ?? null,
        host,
        our_site: ourHost ? host.endsWith(ourHost) : false,
      };
    });

    // 2) Scrape top N for word count + H2s
    const wordCounts: number[] = [];
    const allH2s: string[] = [];
    const scrapeTargets = topResults.slice(0, maxScrape).filter(r => !r.our_site);

    await Promise.all(scrapeTargets.map(async (r) => {
      try {
        const sc = await fetch(`${FIRECRAWL_GATEWAY}/v2/scrape`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": FIRECRAWL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: r.url, formats: ["markdown"], onlyMainContent: true }),
        });
        if (!sc.ok) return;
        const j = await sc.json();
        const md: string = j.markdown ?? j.data?.markdown ?? "";
        if (!md) return;
        const words = md.trim().split(/\s+/).filter(Boolean).length;
        wordCounts.push(words);
        const h2s = [...md.matchAll(/^##\s+(.+)$/gm)].map(m => m[1].trim()).slice(0, 12);
        allH2s.push(...h2s);
      } catch (_e) { /* skip */ }
    }));

    const median = (arr: number[]): number | null => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
    };

    // Frequency of H2s (loose normalization)
    const freq = new Map<string, number>();
    for (const h of allH2s) {
      const key = h.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (!key || key.length < 4) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    const commonH2s = [...freq.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);

    const snapshot = {
      organization_id: kw.organization_id,
      keyword_id: kw.id,
      top_results: topResults,
      median_word_count: median(wordCounts),
      common_h2s: commonH2s.length ? commonH2s : null,
      schema_types: null,
      source: "firecrawl",
    };
    const { data: saved } = await supabase.from("seo_serp_snapshots").insert(snapshot).select("id, snapshot_at").single();

    return new Response(JSON.stringify({ ok: true, snapshot_id: saved?.id, snapshot: { ...snapshot, snapshot_at: saved?.snapshot_at } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[seo-serp-enrich] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
