import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getValidAccessToken } from "../_shared/gsc-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function syncConnection(supabase: any, conn: any, days: number = 7) {
  const run = await supabase.from("gsc_sync_runs").insert({
    connection_id: conn.id,
    organization_id: conn.organization_id,
    status: "running",
  }).select().single();
  const runId = run.data?.id;

  try {
    const accessToken = await getValidAccessToken(supabase, conn);
    const endDate = new Date(); endDate.setDate(endDate.getDate() - 2);
    const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const apiUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(conn.site_url)}/searchAnalytics/query`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["date", "page", "query"],
        rowLimit: 5000,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`GSC API error: ${JSON.stringify(json)}`);

    const rows = json.rows || [];
    const records = rows.map((r: any) => ({
      connection_id: conn.id,
      organization_id: conn.organization_id,
      date: r.keys[0],
      page: r.keys[1],
      query: r.keys[2],
      impressions: Math.round(r.impressions || 0),
      clicks: Math.round(r.clicks || 0),
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    // Delete overlap range, then insert
    if (records.length) {
      await supabase.from("gsc_metrics_daily")
        .delete()
        .eq("connection_id", conn.id)
        .gte("date", fmt(startDate))
        .lte("date", fmt(endDate));
      // Chunked insert
      for (let i = 0; i < records.length; i += 500) {
        await supabase.from("gsc_metrics_daily").insert(records.slice(i, i + 500));
      }
    }

    await supabase.from("gsc_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", conn.id);
    await supabase.from("gsc_sync_runs").update({ status: "success", rows_synced: records.length, completed_at: new Date().toISOString() }).eq("id", runId);
    return { ok: true, rows: records.length };
  } catch (error: any) {
    console.error(`[gsc-sync] Connection ${conn.id} failed:`, error);
    await supabase.from("gsc_sync_runs").update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() }).eq("id", runId);
    return { ok: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let connectionIds: string[] | null = null;
    let days = 7;
    try {
      const body = await req.json();
      connectionIds = body?.connection_ids || null;
      days = body?.days || 7;
    } catch { /* cron call có thể no body */ }

    let q = supabase.from("gsc_connections").select("*").eq("is_active", true);
    if (connectionIds?.length) q = q.in("id", connectionIds);
    const { data: connections, error } = await q;
    if (error) throw error;

    const results = [];
    for (const conn of connections || []) {
      results.push({ connection_id: conn.id, site: conn.site_url, ...(await syncConnection(supabase, conn, days)) });
    }
    return new Response(JSON.stringify({ synced: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[gsc-sync-metrics] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
