import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { approval_id, action, notes, reviewer_id } = await req.json();
    if (!approval_id || !action) throw new Error("approval_id and action required");

    // Get approval
    const { data: approval, error: fetchErr } = await supabase
      .from("agent_approvals")
      .select("*, agent_pipelines(*)")
      .eq("id", approval_id)
      .single();
    if (fetchErr || !approval) throw new Error("Approval not found");

    const now = new Date().toISOString();

    if (action === "approve") {
      // Update approval status
      await supabase
        .from("agent_approvals")
        .update({
          status: "approved",
          reviewer_id: reviewer_id || null,
          reviewer_notes: notes || null,
          decided_at: now,
        } as any)
        .eq("id", approval_id);

      // Advance pipeline past approval stage
      const pipeline = (approval as any).agent_pipelines;
      if (pipeline && pipeline.current_stage === "approval") {
        const pipelineState = pipeline.pipeline_state || { stages: {} };
        if (pipelineState.stages) {
          pipelineState.stages.approval = { status: "completed", completed_at: now };
          pipelineState.stages.scheduled = { status: "in_progress", started_at: now };
        }

        await supabase
          .from("agent_pipelines")
          .update({
            current_stage: "scheduled",
            pipeline_state: pipelineState,
          } as any)
          .eq("id", pipeline.id);

        // Log
        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "approval_granted",
          input_summary: `Approved by: ${reviewer_id || "system"}`,
          output_summary: notes || "Content approved, advancing to scheduling",
        } as any);
      }

      return new Response(
        JSON.stringify({ success: true, status: "approved", next_stage: "scheduled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      // Update approval
      await supabase
        .from("agent_approvals")
        .update({
          status: "rejected",
          reviewer_id: reviewer_id || null,
          reviewer_notes: notes || null,
          decided_at: now,
        } as any)
        .eq("id", approval_id);

      // Move pipeline back to creation for retry
      const pipeline = (approval as any).agent_pipelines;
      if (pipeline) {
        const pipelineState = pipeline.pipeline_state || { stages: {} };
        if (pipelineState.stages) {
          pipelineState.stages.approval = { status: "rejected", decided_at: now, notes };
          pipelineState.stages.creation = { status: "pending", retry: true };
        }

        await supabase
          .from("agent_pipelines")
          .update({
            current_stage: "creation",
            pipeline_state: pipelineState,
            is_flagged: true,
            flag_reason: notes || "Rejected by reviewer",
          } as any)
          .eq("id", pipeline.id);

        // Log
        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "approval_rejected",
          input_summary: `Rejected by: ${reviewer_id || "system"}`,
          output_summary: notes || "Content rejected, returning to creation",
        } as any);
      }

      return new Response(
        JSON.stringify({ success: true, status: "rejected", next_stage: "creation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: approve, reject" }),
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
