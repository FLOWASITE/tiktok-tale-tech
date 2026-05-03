// Save selected keywords from a research-v2 preview job, optionally auto-enrich
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { jobId, selectedKeywords, autoEnrich = true, locale = "vi" } = await req.json();
    if (!jobId || !Array.isArray(selectedKeywords) || !selectedKeywords.length) {
      return new Response(JSON.stringify({ error: "jobId & selectedKeywords required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: job, error: jobErr } = await supabase.from("keyword_research_jobs")
      .select("id, organization_id, preview, seed_keyword").eq("id", jobId).single();
    if (jobErr || !job) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const preview: any[] = Array.isArray(job.preview) ? job.preview : [];
    const selectedSet = new Set(selectedKeywords.map((k: string) => k.toLowerCase().trim()));
    const chosen = preview.filter(p => selectedSet.has(String(p.keyword).toLowerCase().trim()));
    if (!chosen.length) return new Response(JSON.stringify({ error: "No matching keywords in preview" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Cluster handling
    const clusterNames = [...new Set(chosen.map(c => c.cluster_name).filter(Boolean))];
    const clusterMap = new Map<string, string>();
    for (const name of clusterNames) {
      const { data: existing } = await supabase.from("seo_clusters")
        .select("id").eq("organization_id", job.organization_id).eq("name", name).maybeSingle();
      if (existing) {
        clusterMap.set(name, existing.id);
      } else {
        const { data: created } = await supabase.from("seo_clusters")
          .insert({ organization_id: job.organization_id, name, description: `Auto từ "${job.seed_keyword}"`, status: "planning" })
          .select("id").single();
        if (created) clusterMap.set(name, created.id);
      }
    }

    const rows = chosen.map(s => ({
      organization_id: job.organization_id,
      keyword: String(s.keyword).toLowerCase().trim(),
      locale,
      search_volume: s.search_volume || 0,
      difficulty: Math.min(100, Math.max(0, s.difficulty || 50)),
      cpc_vnd: s.cpc_vnd || 0,
      intent: s.intent,
      funnel_stage: s.funnel_stage,
      cluster_id: clusterMap.get(s.cluster_name) || null,
      source: "ai_suggested" as const,
      notes: s.rationale,
      status: "new" as const,
    }));

    const { data: inserted, error: insErr } = await supabase.from("seo_keywords")
      .upsert(rows, { onConflict: "organization_id,keyword,locale", ignoreDuplicates: true })
      .select("id, keyword, search_volume, difficulty");
    if (insErr) throw insErr;

    await supabase.from("keyword_research_jobs").update({
      status: "done",
      keywords_added: inserted?.length || 0,
      selected_count: chosen.length,
      auto_enrich: autoEnrich,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    // Auto-enrich top 10 priority (lowest difficulty + highest volume)
    let enrichJobId: string | null = null;
    if (autoEnrich && inserted && inserted.length) {
      const top = [...inserted]
        .sort((a: any, b: any) => (b.search_volume || 0) - (a.search_volume || 0) || (a.difficulty || 50) - (b.difficulty || 50))
        .slice(0, 10).map((r: any) => r.id);
      if (top.length) {
        try {
          const enrichResp = await fetch(`${SUPABASE_URL}/functions/v1/enrich-keyword-serp`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ keywordIds: top, organizationId: job.organization_id, locale }),
          });
          const enrichData = await enrichResp.json().catch(() => ({}));
          if (enrichResp.ok && enrichData.jobId) {
            enrichJobId = enrichData.jobId;
            await supabase.from("keyword_research_jobs").update({ enrich_job_id: enrichJobId }).eq("id", jobId);
          }
        } catch (e) {
          console.warn("[keyword-research-save] Auto-enrich failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({
      inserted: inserted?.length || 0,
      clustersCreated: clusterMap.size,
      enrichJobId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[keyword-research-save] Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
