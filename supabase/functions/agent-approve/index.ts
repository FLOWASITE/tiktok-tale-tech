import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Fire-and-forget: trigger next stage */
function fireNextStage(supabaseUrl: string, supabaseKey: string, pipelineId: string, nextStage: string) {
  fetch(`${supabaseUrl}/functions/v1/agent-pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
    body: JSON.stringify({ action: "run_stage", pipeline_id: pipelineId, stage: nextStage }),
  }).catch(e => console.error("Fire-next-stage failed:", e));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    let { approval_id, action, notes, reviewer_id, scheduled_publish_at } = body;
    const pipeline_id = body.pipeline_id;
    if (!action) throw new Error("action required");

    // Fallback: resolve approval_id from pipeline_id if not provided
    if (!approval_id && pipeline_id) {
      const { data: found } = await supabase
        .from("agent_approvals")
        .select("id")
        .eq("pipeline_id", pipeline_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (found) approval_id = found.id;
    }
    if (!approval_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Không tìm thấy yêu cầu duyệt cho pipeline này (có thể đã được xử lý).", code: "approval_missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: approval, error: fetchErr } = await supabase
      .from("agent_approvals")
      .select("*, agent_pipelines(*)")
      .eq("id", approval_id)
      .maybeSingle();
    if (fetchErr || !approval) {
      return new Response(
        JSON.stringify({ ok: false, error: "Yêu cầu duyệt không tồn tại hoặc đã bị xóa.", code: "approval_not_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency: already decided
    if ((approval as any).status && (approval as any).status !== "pending") {
      return new Response(
        JSON.stringify({
          ok: true,
          already_decided: true,
          status: (approval as any).status,
          message: `Yêu cầu này đã được ${(approval as any).status === "approved" ? "duyệt" : "xử lý"} trước đó.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const pipeline = (approval as any).agent_pipelines;

    if (action === "approve") {
      // Update approval status
      await supabase.from("agent_approvals").update({
        status: "approved",
        reviewer_id: reviewer_id || null,
        reviewer_notes: notes || null,
        decided_at: now,
      } as any).eq("id", approval_id);

      // Advance pipeline: approval → publish
      if (pipeline && pipeline.current_stage === "approval") {
        const pipelineState = pipeline.pipeline_state || { stages: {} };
        const meta = pipelineState.metadata || {};
        if (pipelineState.stages) {
          pipelineState.stages.approval = { ...pipelineState.stages.approval, status: "completed", completed_at: now };
          pipelineState.stages.publish = { ...(pipelineState.stages.publish || {}), status: "in_progress", started_at: now };
        }

        const effectiveSchedule = scheduled_publish_at || pipeline.scheduled_publish_at;
        const isFutureSchedule = effectiveSchedule && new Date(effectiveSchedule) > new Date();

        // For future schedules, set publish stage to "pending" so recovery doesn't re-fire
        if (isFutureSchedule && pipelineState.stages) {
          pipelineState.stages.publish.status = "pending";
          pipelineState.stages.publish.waiting_for = "scheduled_time";
        }

        const pipelineUpdate: any = {
          current_stage: "publish",
          pipeline_state: pipelineState,
          stage_started_at: now,
        };
        if (scheduled_publish_at !== undefined) {
          pipelineUpdate.scheduled_publish_at = scheduled_publish_at;
        }

        await supabase.from("agent_pipelines").update(pipelineUpdate).eq("id", pipeline.id);

        // === Create content_schedules for Calendar when future-scheduled ===
        if (isFutureSchedule && pipeline.content_id) {
          const existingScheduleIds = (meta.schedule_ids || {}) as Record<string, string>;
          if (Object.keys(existingScheduleIds).length === 0) {
            const targetChannels = (meta.target_channels || []) as string[];
            const scheduleIds: Record<string, string> = {};
            for (const ch of targetChannels) {
              try {
                const { data: schedule } = await supabase
                  .from("content_schedules")
                  .insert({
                    content_id: pipeline.content_id,
                    channel: ch,
                    organization_id: pipeline.organization_id,
                    scheduled_at: effectiveSchedule,
                    timezone: "Asia/Ho_Chi_Minh",
                    publish_status: "scheduled",
                    notes: `Approved & scheduled: ${pipeline.content_title}`,
                    created_by: reviewer_id || null,
                  } as any)
                  .select("id")
                  .single();
                if (schedule) scheduleIds[ch] = schedule.id;
              } catch (e) {
                console.warn(`[agent-approve] Failed to create schedule for ${ch}:`, e);
              }
            }
            if (Object.keys(scheduleIds).length > 0) {
              pipelineState.metadata = { ...meta, schedule_ids: scheduleIds };
              await supabase.from("agent_pipelines")
                .update({ pipeline_state: pipelineState } as any)
                .eq("id", pipeline.id);
            }
          }
        }

        const logMessage = isFutureSchedule
          ? `Content approved, scheduled for ${effectiveSchedule}`
          : notes || "Content approved, advancing to publish";

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "approval_granted",
          input_summary: `Approved by: ${reviewer_id || "system"}`,
          output_summary: logMessage,
        } as any);

        // Only fire publish stage immediately if not scheduled for future
        if (!isFutureSchedule) {
          fireNextStage(supabaseUrl, supabaseKey, pipeline.id, "publish");
        }
      }

      return json({ success: true, status: "approved", next_stage: "publish" });
    }

    if (action === "reject") {
      await supabase.from("agent_approvals").update({
        status: "rejected",
        reviewer_id: reviewer_id || null,
        reviewer_notes: notes || null,
        decided_at: now,
      } as any).eq("id", approval_id);

      // Move pipeline back to create for retry
      if (pipeline) {
        const pipelineState = pipeline.pipeline_state || { stages: {} };
        if (pipelineState.stages) {
          pipelineState.stages.approval = { ...pipelineState.stages.approval, status: "rejected", decided_at: now, notes };
          pipelineState.stages.create = { status: "pending", retry: true };
          pipelineState.stages.quality = { status: "pending" };
        }

        await supabase.from("agent_pipelines").update({
          current_stage: "create",
          pipeline_state: pipelineState,
          stage_started_at: now,
          is_flagged: true,
          flag_reason: notes || "Rejected by reviewer",
        } as any).eq("id", pipeline.id);

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "approval_rejected",
          input_summary: `Rejected by: ${reviewer_id || "system"}`,
          output_summary: notes || "Content rejected, returning to create stage",
        } as any);

        // Auto-restart creation if not flagged for manual review
        if (!notes?.includes("manual")) {
          fireNextStage(supabaseUrl, supabaseKey, pipeline.id, "create");
        }
      }

      return json({ success: true, status: "rejected", next_stage: "create" });
    }

    if (action === "request_changes") {
      await supabase.from("agent_approvals").update({
        status: "changes_requested",
        reviewer_id: reviewer_id || null,
        reviewer_notes: notes || null,
        decided_at: now,
      } as any).eq("id", approval_id);

      // Move back to quality with reviewer feedback
      if (pipeline) {
        const pipelineState = pipeline.pipeline_state || { stages: {} };
        if (pipelineState.stages) {
          pipelineState.stages.approval = { ...pipelineState.stages.approval, status: "changes_requested", decided_at: now, notes };
          pipelineState.stages.quality = { status: "pending", reviewer_feedback: notes };
        }
        pipelineState.metadata = pipelineState.metadata || {};
        pipelineState.metadata.reviewer_feedback = notes;

        await supabase.from("agent_pipelines").update({
          current_stage: "create",
          pipeline_state: pipelineState,
          stage_started_at: now,
        } as any).eq("id", pipeline.id);

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "changes_requested",
          input_summary: `Changes requested by: ${reviewer_id || "system"}`,
          output_summary: notes || "Reviewer requested changes",
        } as any);

        fireNextStage(supabaseUrl, supabaseKey, pipeline.id, "create");
      }

      return json({ success: true, status: "changes_requested", next_stage: "create" });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: approve, reject, request_changes" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-approve error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Internal error", code: "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
