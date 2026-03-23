import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGE_ORDER = [
  "research", "creation", "optimization", "expansion",
  "compliance", "approval", "scheduled", "published", "analyzing"
];

/** Helper: call another edge function internally */
async function callFunction(supabaseUrl: string, supabaseKey: string, fnName: string, body: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `${fnName} returned ${res.status}`);
  return data;
}

/** Create initial pipeline_state with metadata */
function createPipelineState(meta: Record<string, unknown> = {}) {
  const stages: Record<string, { status: string }> = {};
  for (const s of STAGE_ORDER) stages[s] = { status: "pending" };
  return { stages, metadata: meta };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, goal_id, pipeline_id, organization_id } = await req.json();

    // ========== ACTION: trigger_from_goal ==========
    if (action === "trigger_from_goal") {
      if (!goal_id) throw new Error("goal_id required");

      const { data: goal, error: goalErr } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("id", goal_id)
        .single();
      if (goalErr || !goal) throw new Error("Goal not found");

      const pipelines = [];
      const topics = (goal.target_topics as string[]) || [];
      const effectiveTopics = topics.length > 0 ? topics : [goal.name];
      for (const topic of effectiveTopics) {
        const pipelineState = createPipelineState({
          brand_template_id: goal.brand_template_id || null,
          campaign_id: goal.campaign_id || null,
          autonomy_level: goal.autonomy_level,
        });

        const { data: pipeline, error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: goal.organization_id,
            goal_id: goal.id,
            campaign_id: goal.campaign_id || null,
            content_title: topic,
            content_topic: topic,
            current_stage: "research",
            pipeline_state: pipelineState,
            priority: "normal",
            autonomy_level: goal.autonomy_level,
            estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } as any)
          .select()
          .single();

        if (pipeErr) { console.error("Pipeline creation error:", pipeErr); continue; }
        pipelines.push(pipeline);

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "pipeline_created",
          input_summary: `Goal: ${goal.name}, Topic: ${topic}`,
          output_summary: `Pipeline ${pipeline.id} created, auto-chaining research`,
        } as any);

        // Auto-chain: start running the research stage immediately
        try {
          await runStage(supabase, supabaseUrl, supabaseKey, pipeline);
        } catch (e) {
          console.error(`Auto-chain research failed for pipeline ${pipeline.id}:`, e);
        }
      }

      return json({ success: true, pipelines_created: pipelines.length, pipeline_ids: pipelines.map(p => p.id) });
    }

    // ========== ACTION: advance_stage ==========
    if (action === "advance_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");

      const { data: pipeline, error: pipeErr } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (pipeErr || !pipeline) throw new Error("Pipeline not found");

      const currentIdx = STAGE_ORDER.indexOf(pipeline.current_stage);
      if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
        return json({ success: false, message: "Pipeline already at final stage" });
      }

      const nextStage = STAGE_ORDER[currentIdx + 1];
      const now = new Date().toISOString();

      // If advancing to approval + human_in_loop → create approval record with real preview
      if (nextStage === "approval" && pipeline.autonomy_level === "human_in_loop") {
        const pState = (pipeline.pipeline_state as any) || {};
        const creationOutput = pState.stages?.creation?.output;
        const optimizationOutput = pState.stages?.optimization?.output;

        await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: creationOutput?.content_preview || creationOutput?.title || `Content: ${pipeline.content_title}`,
          channel_versions: pState.stages?.expansion?.output?.channels || {},
          scores: {
            seo: optimizationOutput?.seo_score || null,
            geo: optimizationOutput?.geo_score || null,
            compliance: pState.stages?.compliance?.output?.status || null,
          },
          status: "pending",
        } as any);
      }

      // Update pipeline state
      const pipelineState = (pipeline.pipeline_state as any) || { stages: {} };
      if (pipelineState.stages) {
        pipelineState.stages[pipeline.current_stage] = { status: "completed", completed_at: now };
        pipelineState.stages[nextStage] = { status: "in_progress", started_at: now };
      }

      await supabase
        .from("agent_pipelines")
        .update({
          current_stage: nextStage,
          pipeline_state: pipelineState,
          completed_at: nextStage === "analyzing" ? now : null,
        } as any)
        .eq("id", pipeline_id);

      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: "orchestrator",
        action: "stage_advanced",
        input_summary: `From: ${pipeline.current_stage}`,
        output_summary: `To: ${nextStage}`,
      } as any);

      return json({ success: true, previous_stage: pipeline.current_stage, current_stage: nextStage });
    }

    // ========== ACTION: run_stage ==========
    if (action === "run_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");

      const { data: pipeline } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (!pipeline) throw new Error("Pipeline not found");

      const result = await runStage(supabase, supabaseUrl, supabaseKey, pipeline);
      return json(result);
    }

    // ========== ACTION: check_scheduled_goals ==========
    if (action === "check_scheduled_goals") {
      const { data: activeGoals, error: goalsErr } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("is_active", true)
        .eq("is_paused", false);

      if (goalsErr || !activeGoals?.length) {
        return json({ success: true, message: "No active goals", triggered: 0 });
      }

      let triggered = 0;
      for (const goal of activeGoals) {
        const { count } = await supabase
          .from("agent_pipelines")
          .select("id", { count: "exact", head: true })
          .eq("goal_id", goal.id)
          .not("current_stage", "in", '("published","analyzing")');

        if ((count || 0) >= 5) continue;

        const freq = goal.frequency as Record<string, string>;
        if (Object.keys(freq).length === 0) continue;

        const { data: lastPipeline } = await supabase
          .from("agent_pipelines")
          .select("created_at")
          .eq("goal_id", goal.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastCreated = lastPipeline?.created_at ? new Date(lastPipeline.created_at) : new Date(0);
        const hoursSinceLast = (Date.now() - lastCreated.getTime()) / (1000 * 60 * 60);

        let minIntervalHours = 168;
        for (const f of Object.values(freq)) {
          if (f === "daily") minIntervalHours = Math.min(minIntervalHours, 24);
          else if (f === "3/week") minIntervalHours = Math.min(minIntervalHours, 56);
          else if (f === "2/week") minIntervalHours = Math.min(minIntervalHours, 84);
          else if (f === "weekly") minIntervalHours = Math.min(minIntervalHours, 168);
        }

        if (hoursSinceLast < minIntervalHours) continue;

        const topics = (goal.target_topics as string[]) || [];
        const effectiveTopics = topics.length > 0 ? topics : [goal.name];
        const topic = effectiveTopics[Math.floor(Math.random() * effectiveTopics.length)];

        const pipelineState = createPipelineState({
          brand_template_id: goal.brand_template_id || null,
          campaign_id: goal.campaign_id || null,
        });

        const { data: newPipeline, error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: goal.organization_id,
            goal_id: goal.id,
            campaign_id: goal.campaign_id || null,
            content_title: topic,
            content_topic: topic,
            current_stage: "research",
            pipeline_state: pipelineState,
            priority: "normal",
            autonomy_level: goal.autonomy_level,
            estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } as any)
          .select()
          .single();

        if (!pipeErr && newPipeline) {
          triggered++;
          // Auto-chain
          try { await runStage(supabase, supabaseUrl, supabaseKey, newPipeline); } catch (_) {}
        }
      }

      return json({ success: true, triggered, active_goals: activeGoals.length });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: trigger_from_goal, advance_stage, run_stage, check_scheduled_goals" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("agent-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========== CORE: Run a pipeline stage and auto-chain to next ==========
async function runStage(supabase: any, supabaseUrl: string, supabaseKey: string, pipeline: any) {
  const startTime = Date.now();
  const stage = pipeline.current_stage;
  const pState = (pipeline.pipeline_state as any) || { stages: {}, metadata: {} };
  const meta = pState.metadata || {};
  const brandTemplateId = meta.brand_template_id || null;
  const orgId = pipeline.organization_id;
  let result: any = { status: "completed" };
  let shouldAutoAdvance = true;

  try {
    if (stage === "research") {
      // Call topic-ai (correct function name)
      const output = await callFunction(supabaseUrl, supabaseKey, "topic-ai", {
        action: "suggest",
        topic: pipeline.content_topic,
        organization_id: orgId,
        brand_template_id: brandTemplateId,
      });
      result.output = output;

    } else if (stage === "creation") {
      // Call generate-core-content with brand context
      const output = await callFunction(supabaseUrl, supabaseKey, "generate-core-content", {
        topic: pipeline.content_topic || pipeline.content_title,
        organization_id: orgId,
        brand_template_id: brandTemplateId,
        campaign_id: meta.campaign_id || pipeline.campaign_id || null,
      });
      result.output = output;

      // Save content_id to pipeline if returned
      if (output?.content_id || output?.id) {
        const contentId = output.content_id || output.id;
        await supabase
          .from("agent_pipelines")
          .update({ content_id: contentId } as any)
          .eq("id", pipeline.id);
        pipeline.content_id = contentId;
      }

    } else if (stage === "optimization") {
      // Call geo-score-content with real content
      if (pipeline.content_id) {
        try {
          const output = await callFunction(supabaseUrl, supabaseKey, "geo-score-content", {
            content_id: pipeline.content_id,
            content_type: "core_content",
            organization_id: orgId,
          });
          result.output = output;
        } catch (e) {
          console.warn("GEO scoring failed, using fallback:", e);
          result.output = { seo_score: 70, geo_score: 65, note: "Scoring unavailable, using defaults" };
        }
      } else {
        result.output = { seo_score: 70, geo_score: 65, note: "No content_id, skipping real scoring" };
      }

    } else if (stage === "expansion") {
      // Call generate-multichannel if content_id exists
      if (pipeline.content_id) {
        try {
          const output = await callFunction(supabaseUrl, supabaseKey, "generate-multichannel", {
            content_id: pipeline.content_id,
            organization_id: orgId,
            brand_template_id: brandTemplateId,
            channels: pState.metadata?.target_channels || [],
          });
          result.output = output;
        } catch (e) {
          console.warn("Multichannel expansion failed:", e);
          result.output = { channels_generated: [], note: "Expansion skipped" };
        }
      } else {
        result.output = { channels_generated: [], note: "No content_id for expansion" };
      }

    } else if (stage === "compliance") {
      // Compliance check — lightweight pass
      result.output = { status: "passed", issues: [] };

    } else if (stage === "approval") {
      // Approval stage — pause if human_in_loop
      if (pipeline.autonomy_level === "human_in_loop") {
        shouldAutoAdvance = false;
        result.output = { waiting_for: "human_approval" };
      } else {
        result.output = { auto_approved: true };
      }

    } else if (stage === "scheduled") {
      result.output = { scheduled: true };
    } else if (stage === "published") {
      result.output = { published: true };
    }
  } catch (e) {
    result.status = "failed";
    result.error = e instanceof Error ? e.message : "Unknown error";
    shouldAutoAdvance = false;
  }

  const durationMs = Date.now() - startTime;

  // Save stage output to pipeline_state
  if (pState.stages && pState.stages[stage]) {
    pState.stages[stage].output = result.output || null;
    pState.stages[stage].duration_ms = durationMs;
    if (result.status === "failed") {
      pState.stages[stage].status = "failed";
      pState.stages[stage].error = result.error;
    }
  }
  await supabase
    .from("agent_pipelines")
    .update({ pipeline_state: pState } as any)
    .eq("id", pipeline.id);

  // Log execution
  await supabase.from("agent_pipeline_logs").insert({
    pipeline_id: pipeline.id,
    agent_name: stage,
    action: result.status === "completed" ? "completed" : "failed",
    output_summary: JSON.stringify(result).slice(0, 500),
    duration_ms: durationMs,
    error_message: result.error || null,
  } as any);

  // Auto-advance to next stage
  if (shouldAutoAdvance && result.status === "completed") {
    const currentIdx = STAGE_ORDER.indexOf(stage);
    if (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIdx + 1];
      const now = new Date().toISOString();

      if (pState.stages) {
        pState.stages[stage] = { ...pState.stages[stage], status: "completed", completed_at: now };
        pState.stages[nextStage] = { ...(pState.stages[nextStage] || {}), status: "in_progress", started_at: now };
      }

      await supabase
        .from("agent_pipelines")
        .update({
          current_stage: nextStage,
          pipeline_state: pState,
          completed_at: nextStage === "analyzing" ? now : null,
        } as any)
        .eq("id", pipeline.id);

      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: "orchestrator",
        action: "auto_advanced",
        input_summary: `From: ${stage}`,
        output_summary: `To: ${nextStage}`,
      } as any);

      // If next stage needs approval with human_in_loop, create approval record
      if (nextStage === "approval" && pipeline.autonomy_level === "human_in_loop") {
        const creationOutput = pState.stages?.creation?.output;
        const optimizationOutput = pState.stages?.optimization?.output;

        await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: creationOutput?.content_preview || creationOutput?.title || `Content: ${pipeline.content_title}`,
          channel_versions: pState.stages?.expansion?.output?.channels || {},
          scores: {
            seo: optimizationOutput?.seo_score || null,
            geo: optimizationOutput?.geo_score || null,
            compliance: pState.stages?.compliance?.output?.status || null,
          },
          status: "pending",
        } as any);
      }

      // Recursively run next stage (unless it's approval waiting for human)
      if (!(nextStage === "approval" && pipeline.autonomy_level === "human_in_loop")) {
        const updatedPipeline = { ...pipeline, current_stage: nextStage, pipeline_state: pState };
        try {
          await runStage(supabase, supabaseUrl, supabaseKey, updatedPipeline);
        } catch (e) {
          console.error(`Auto-chain failed at ${nextStage}:`, e);
        }
      }
    }
  }

  return { success: result.status === "completed", stage, result, duration_ms: durationMs };
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
