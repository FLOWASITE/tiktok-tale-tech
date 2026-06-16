// Cron-driven cleanup: mark generation_tasks treo (>5 phút không heartbeat) thành failed.
// Chạy mỗi 2 phút qua pg_cron. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_THRESHOLD_MINUTES = 5;
const MAX_TASKS_PER_RUN = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60_000).toISOString();
  const hardCutoff = new Date(Date.now() - 10 * 60_000).toISOString();

  try {
    const { data: stale, error: selErr } = await supabase
      .from("generation_tasks")
      .select("id, organization_id, last_heartbeat_at, created_at")
      .eq("status", "generating")
      .or(`last_heartbeat_at.lt.${cutoff},and(last_heartbeat_at.is.null,created_at.lt.${hardCutoff})`)
      .limit(MAX_TASKS_PER_RUN);

    if (selErr) throw selErr;

    const ids = (stale ?? []).map((t) => t.id);
    let updated = 0;

    if (ids.length > 0) {
      const { error: updErr, count } = await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          error_message: `Auto-recovered: no heartbeat for >${STALE_THRESHOLD_MINUTES} minutes (likely edge function timeout)`,
          updated_at: new Date().toISOString(),
        }, { count: "exact" })
        .in("id", ids)
        .eq("status", "generating");

      if (updErr) throw updErr;
      updated = count ?? ids.length;
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[recover-stale-multichannel-tasks] scanned=${ids.length} updated=${updated} duration=${durationMs}ms`);

    await supabase.from("cron_run_logs").insert({
      job_name: "recover-stale-multichannel-tasks",
      status: "success",
      triggered_by: "cron",
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
      summary: { scanned: ids.length, recovered: updated, threshold_minutes: STALE_THRESHOLD_MINUTES },
    });

    return new Response(
      JSON.stringify({ ok: true, scanned: ids.length, recovered: updated, duration_ms: durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[recover-stale-multichannel-tasks] Error:", error);
    await supabase.from("cron_run_logs").insert({
      job_name: "recover-stale-multichannel-tasks",
      status: "failed",
      triggered_by: "cron",
      duration_ms: Date.now() - startedAt,
      completed_at: new Date().toISOString(),
      errors: [{ message: (error as Error).message }],
    }).catch(() => {});

    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
