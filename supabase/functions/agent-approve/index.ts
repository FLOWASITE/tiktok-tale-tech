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

    const { approval_id, action, notes, reviewer_id } = await req.json();
    if (!approval_id || !action) throw new Error("approval_id and action required");

    const { data: approval, error: fetchErr } = await supabase
      .from("agent_approvals")
      .select("*, agent_pipelines(*)")
      .eq("id", approval_id)
      .single();
    if (fetchErr || !approval) throw new Error("Approval not found");

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
        if (pipelineState.stages) {
          pipelineState.stages.approval = { ...pipelineState.stages.approval, status: "completed", completed_at: now };
          pipelineState.stages.publish = { ...(pipelineState.stages.publish || {}), status: "in_progress", started_at: now };
        }

        await supabase.from("agent_pipelines").update({
          current_stage: "publish",
          pipeline_state: pipelineState,
          stage_started_at: now,
        } as any).eq("id", pipeline.id);

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "approval_granted",
          input_summary: `Approved by: ${reviewer_id || "system"}`,
          output_summary: notes || "Content approved, advancing to publish",
        } as any);

        // Fire publish stage
        fireNextStage(supabaseUrl, supabaseKey, pipeline.id, "publish");
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
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
