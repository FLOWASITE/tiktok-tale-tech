// Weekly cron: check Google rank for tracked keywords via Firecrawl search
// POST body (optional): { organization_id?: string, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY chưa cấu hình");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY chưa cấu hình (cần kết nối Firecrawl)");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const orgFilter: string | undefined = body.organization_id;
    const limit: number = Math.min(body.limit ?? 50, 200);
    const triggeredBy: string = body.triggered_by ?? "manual";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Open a tracker run record
    const { data: runRow } = await supabase
      .from("seo_rank_tracker_runs")
      .insert({ organization_id: orgFilter ?? null, triggered_by: triggeredBy })
      .select("id")
      .single();
    const runId = runRow?.id as string | undefined;

    // Pick keywords to track: prioritize ones with tracking_url, sort by least recently checked
    let q = supabase
      .from("seo_keywords")
      .select("id, organization_id, keyword, locale, current_rank, tracking_url, last_checked_at")
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (orgFilter) q = q.eq("organization_id", orgFilter);

    const { data: keywords, error: kwErr } = await q;
    if (kwErr) throw kwErr;
    if (!keywords?.length) {
      return new Response(JSON.stringify({ checked: 0, message: "Không có keyword nào cần kiểm tra" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target domains per org from brand_templates.website_url
    const orgIds = [...new Set(keywords.map(k => k.organization_id))];
    const { data: brands } = await supabase
      .from("brand_templates").select("organization_id, website_url").in("organization_id", orgIds);
    const orgDomain = new Map<string, string>();
    for (const b of brands ?? []) {
      const url = (b as any).website_url as string | null;
      if (url && !orgDomain.has(b.organization_id)) {
        try { orgDomain.set(b.organization_id, new URL(url).hostname.replace(/^www\./, "")); } catch {}
      }
    }

    let checked = 0;
    let found = 0;
    const errors: string[] = [];

    for (const kw of keywords) {
      try {
        const targetDomain = orgDomain.get(kw.organization_id) ?? "flowa.one";
        const searchQuery = kw.keyword;

        const searchRes = await fetch(`${FIRECRAWL_GATEWAY}/v1/search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": FIRECRAWL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 30,
            lang: kw.locale === "en" ? "en" : "vi",
            country: kw.locale === "en" ? "us" : "vn",
          }),
        });

        if (!searchRes.ok) {
          const t = await searchRes.text();
          errors.push(`${kw.keyword}: search ${searchRes.status} ${t.slice(0, 100)}`);
          continue;
        }

        const searchJson = await searchRes.json();
        const results: Array<{ url: string }> = searchJson.data ?? searchJson.results ?? [];

        let rank: number | null = null;
        let serpUrl: string | null = null;
        for (let i = 0; i < results.length; i++) {
          try {
            const host = new URL(results[i].url).hostname.replace(/^www\./, "");
            if (host.endsWith(targetDomain)) {
              rank = i + 1;
              serpUrl = results[i].url;
              break;
            }
          } catch {}
        }

        const previous = kw.current_rank;
        const change = previous && rank ? previous - rank : null;

        await supabase.from("seo_keywords").update({
          previous_rank: previous,
          current_rank: rank,
          rank_change: change,
          last_checked_at: new Date().toISOString(),
        }).eq("id", kw.id);

        await supabase.from("seo_rank_history").insert({
          organization_id: kw.organization_id,
          keyword_id: kw.id,
          rank,
          serp_url: serpUrl,
          source: "firecrawl",
        });

        if (rank) found++;
        checked++;
      } catch (e: any) {
        errors.push(`${kw.keyword}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 500)); // gentle rate limit
    }

    return new Response(JSON.stringify({ checked, found, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[seo-rank-tracker] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
