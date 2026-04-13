import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, organization_id, date_range } = body;

    // ========== ACTION: compute_stats ==========
    if (action === "compute_stats") {
      if (!organization_id) throw new Error("organization_id required");

      const days = date_range === "week" ? 7 : date_range === "all" ? 90 : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // 1. Pipeline stats
      const { data: pipelines } = await supabase
        .from("agent_pipelines")
        .select("id, current_stage, completed_at, is_flagged, overall_quality_score, content_type, created_at, pipeline_state")
        .eq("organization_id", organization_id)
        .gte("created_at", since)
        .limit(500);

      const total = pipelines?.length || 0;
      const completed = pipelines?.filter((p: any) => p.completed_at)?.length || 0;
      const failed = pipelines?.filter((p: any) => p.is_flagged)?.length || 0;

      // Avg quality
      const scored = pipelines?.filter((p: any) => p.overall_quality_score != null) || [];
      const avgQuality = scored.length > 0
        ? Math.round(scored.reduce((s: number, p: any) => s + p.overall_quality_score, 0) / scored.length * 100) / 100
        : null;

      // 2. Stage duration analysis from logs
      const { data: logs } = await supabase
        .from("agent_pipeline_logs")
        .select("agent_name, action, duration_ms, error_message, created_at")
        .eq("action", "completed")
        .gte("created_at", since)
        .limit(1000);

      const stageDurations: Record<string, { total: number; count: number }> = {};
      for (const log of (logs || [])) {
        if (!log.duration_ms) continue;
        const stage = log.agent_name;
        if (!stageDurations[stage]) stageDurations[stage] = { total: 0, count: 0 };
        stageDurations[stage].total += log.duration_ms;
        stageDurations[stage].count++;
      }

      const avgStageDurations: Record<string, number> = {};
      let bottleneckStage = "";
      let maxAvgDuration = 0;
      for (const [stage, data] of Object.entries(stageDurations)) {
        const avg = Math.round(data.total / data.count);
        avgStageDurations[stage] = avg;
        if (avg > maxAvgDuration) {
          maxAvgDuration = avg;
          bottleneckStage = stage;
        }
      }

      // 3. Failure analysis
      const { data: failLogs } = await supabase
        .from("agent_pipeline_logs")
        .select("agent_name, error_message")
        .eq("action", "failed")
        .gte("created_at", since)
        .limit(200);

      const failReasons: Record<string, number> = {};
      for (const log of (failLogs || [])) {
        const reason = classifyError(log.error_message || "unknown");
        failReasons[reason] = (failReasons[reason] || 0) + 1;
      }
      const topFailure = Object.entries(failReasons).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Stage fail rates
      const stageFailRates: Record<string, { total: number; failed: number; rate: number }> = {};
      const { data: allStageLogs } = await supabase
        .from("agent_pipeline_logs")
        .select("agent_name, action")
        .in("action", ["completed", "failed"])
        .gte("created_at", since)
        .limit(2000);

      for (const log of (allStageLogs || [])) {
        if (!stageFailRates[log.agent_name]) stageFailRates[log.agent_name] = { total: 0, failed: 0, rate: 0 };
        stageFailRates[log.agent_name].total++;
        if (log.action === "failed") stageFailRates[log.agent_name].failed++;
      }
      for (const data of Object.values(stageFailRates)) {
        data.rate = data.total > 0 ? Math.round((data.failed / data.total) * 100) : 0;
      }

      // 4. Recovery stats
      const { data: recoveryLogs } = await supabase
        .from("agent_pipeline_logs")
        .select("id")
        .eq("action", "recover_stuck")
        .gte("created_at", since);
      const recoveryCount = recoveryLogs?.length || 0;

      // 5. Quality gate auto-tuning suggestions
      const suggestions: Array<{ type: string; message: string; priority: string }> = [];
      
      const passRate = total > 0 ? ((completed / total) * 100) : 0;
      const flagRate = total > 0 ? ((failed / total) * 100) : 0;

      if (passRate > 80 && avgQuality && avgQuality > 75) {
        suggestions.push({
          type: "raise_threshold",
          message: `Tỷ lệ pass ${passRate.toFixed(0)}% với quality TB ${avgQuality}đ — có thể nâng ngưỡng quality gate để lọc chặt hơn.`,
          priority: "medium",
        });
      }
      if (flagRate > 30) {
        suggestions.push({
          type: "lower_threshold",
          message: `${flagRate.toFixed(0)}% pipeline bị flag — cần xem lại ngưỡng quality hoặc compliance rules.`,
          priority: "high",
        });
      }
      if (bottleneckStage && maxAvgDuration > 30000) {
        suggestions.push({
          type: "bottleneck",
          message: `Stage "${bottleneckStage}" mất TB ${(maxAvgDuration / 1000).toFixed(1)}s — cần tối ưu.`,
          priority: "high",
        });
      }
      if (recoveryCount > 5) {
        suggestions.push({
          type: "stability",
          message: `${recoveryCount} lần recovery trong ${days} ngày — hệ thống cần ổn định hơn.`,
          priority: "medium",
        });
      }

      return json({
        success: true,
        stats: {
          total_pipelines: total,
          completed,
          failed,
          avg_quality_score: avgQuality,
          stage_durations: avgStageDurations,
          stage_bottleneck: bottleneckStage || null,
          stage_fail_rates: stageFailRates,
          top_failure_reason: topFailure,
          recovery_count: recoveryCount,
          pass_rate: Math.round(passRate * 100) / 100,
          flag_rate: Math.round(flagRate * 100) / 100,
        },
        suggestions,
        date_range: `${days}d`,
      });
    }

    // ========== ACTION: aggregate_daily ==========
    if (action === "aggregate_daily") {
      // Aggregate stats for yesterday (called by cron)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];

      // Get all orgs with pipelines
      const { data: orgs } = await supabase
        .from("agent_pipelines")
        .select("organization_id")
        .gte("created_at", `${dateStr}T00:00:00Z`)
        .lte("created_at", `${dateStr}T23:59:59Z`);

      const orgIds = [...new Set((orgs || []).map((o: any) => o.organization_id))];
      let aggregated = 0;

      for (const orgId of orgIds) {
        const { data: dayPipelines } = await supabase
          .from("agent_pipelines")
          .select("id, completed_at, is_flagged, overall_quality_score, pipeline_state")
          .eq("organization_id", orgId)
          .gte("created_at", `${dateStr}T00:00:00Z`)
          .lte("created_at", `${dateStr}T23:59:59Z`);

        if (!dayPipelines?.length) continue;

        const total = dayPipelines.length;
        const completed = dayPipelines.filter((p: any) => p.completed_at).length;
        const failed = dayPipelines.filter((p: any) => p.is_flagged).length;
        const scored = dayPipelines.filter((p: any) => p.overall_quality_score != null);
        const avgQuality = scored.length > 0
          ? Math.round(scored.reduce((s: number, p: any) => s + p.overall_quality_score, 0) / scored.length * 100) / 100
          : null;

        // Stage duration from logs
        const { data: dayLogs } = await supabase
          .from("agent_pipeline_logs")
          .select("agent_name, action, duration_ms")
          .in("action", ["completed", "failed"])
          .gte("created_at", `${dateStr}T00:00:00Z`)
          .lte("created_at", `${dateStr}T23:59:59Z`)
          .in("pipeline_id", dayPipelines.map((p: any) => p.id));

        const stageDurations: Record<string, number> = {};
        const stageCounts: Record<string, number> = {};
        let bottleneck = "";
        let maxDur = 0;
        for (const log of (dayLogs || [])) {
          if (!log.duration_ms || log.action !== "completed") continue;
          stageDurations[log.agent_name] = (stageDurations[log.agent_name] || 0) + log.duration_ms;
          stageCounts[log.agent_name] = (stageCounts[log.agent_name] || 0) + 1;
        }
        const avgDurations: Record<string, number> = {};
        for (const [stage, total] of Object.entries(stageDurations)) {
          const avg = Math.round(total / (stageCounts[stage] || 1));
          avgDurations[stage] = avg;
          if (avg > maxDur) { maxDur = avg; bottleneck = stage; }
        }

        // Recovery count
        const { data: recoveries } = await supabase
          .from("agent_pipeline_logs")
          .select("id")
          .eq("action", "recover_stuck")
          .gte("created_at", `${dateStr}T00:00:00Z`)
          .lte("created_at", `${dateStr}T23:59:59Z`);

        // Upsert
        await supabase.from("orchestrator_daily_stats").upsert({
          date: dateStr,
          organization_id: orgId,
          total_pipelines: total,
          completed,
          failed,
          avg_quality_score: avgQuality,
          stage_bottleneck: bottleneck || null,
          stage_durations: avgDurations,
          recovery_count: recoveries?.length || 0,
        }, { onConflict: "date,organization_id" });

        aggregated++;
      }

      return json({ success: true, aggregated, date: dateStr });
    }

    return json({ error: "Unknown action. Use: compute_stats, aggregate_daily" }, 400);
  } catch (e) {
    console.error("agent-orchestrator-analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function classifyError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("rate limit") || msg.includes("429")) return "rate_limit";
  if (msg.includes("network") || msg.includes("fetch failed")) return "network";
  if (msg.includes("auth") || msg.includes("401") || msg.includes("403")) return "auth";
  if (msg.includes("not found") || msg.includes("null") || msg.includes("missing")) return "data_missing";
  if (msg.includes("publish") || msg.includes("channel")) return "publish_error";
  if (msg.includes("quality") || msg.includes("compliance")) return "quality_gate";
  return "unknown";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
