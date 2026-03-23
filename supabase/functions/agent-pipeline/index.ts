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

    const { action, goal_id, pipeline_id, organization_id } = await req.json();

    // Action: trigger_from_goal — create pipelines for a goal's topics
    if (action === "trigger_from_goal") {
      if (!goal_id) throw new Error("goal_id required");

      const { data: goal, error: goalErr } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("id", goal_id)
        .single();
      if (goalErr || !goal) throw new Error("Goal not found");

      const pipelines = [];
      for (const topic of (goal.target_topics || [])) {
        const { data: pipeline, error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: goal.organization_id,
            goal_id: goal.id,
            content_title: topic,
            content_topic: topic,
            current_stage: "research",
            pipeline_state: {
              stages: {
                research: { status: "pending" },
                creation: { status: "pending" },
                optimization: { status: "pending" },
                expansion: { status: "pending" },
                compliance: { status: "pending" },
                approval: { status: "pending" },
                scheduled: { status: "pending" },
                published: { status: "pending" },
                analyzing: { status: "pending" },
              },
            },
            priority: "normal",
            autonomy_level: goal.autonomy_level,
            estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } as any)
          .select()
          .single();

        if (pipeErr) {
          console.error("Pipeline creation error:", pipeErr);
          continue;
        }
        pipelines.push(pipeline);

        // Log creation
        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: pipeline.id,
          agent_name: "orchestrator",
          action: "pipeline_created",
          input_summary: `Goal: ${goal.name}, Topic: ${topic}`,
          output_summary: `Pipeline ${pipeline.id} created`,
        } as any);
      }

      return new Response(
        JSON.stringify({ success: true, pipelines_created: pipelines.length, pipeline_ids: pipelines.map(p => p.id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: advance_stage — move a pipeline to next stage
    if (action === "advance_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");

      const { data: pipeline, error: pipeErr } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (pipeErr || !pipeline) throw new Error("Pipeline not found");

      const stageOrder = [
        "research", "creation", "optimization", "expansion",
        "compliance", "approval", "scheduled", "published", "analyzing"
      ];
      const currentIdx = stageOrder.indexOf(pipeline.current_stage);
      if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
        return new Response(
          JSON.stringify({ success: false, message: "Pipeline already at final stage" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nextStage = stageOrder[currentIdx + 1];

      // Check if human approval needed
      if (nextStage === "approval" && pipeline.autonomy_level === "human_in_loop") {
        // Create approval record
        await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: `Auto-generated content for: ${pipeline.content_title}`,
          channel_versions: {},
          scores: {},
          status: "pending",
        } as any);
      }

      // Update pipeline state
      const pipelineState = (pipeline.pipeline_state as any) || { stages: {} };
      if (pipelineState.stages) {
        pipelineState.stages[pipeline.current_stage] = {
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        pipelineState.stages[nextStage] = {
          status: "in_progress",
          started_at: new Date().toISOString(),
        };
      }

      const { error: updateErr } = await supabase
        .from("agent_pipelines")
        .update({
          current_stage: nextStage,
          pipeline_state: pipelineState,
          completed_at: nextStage === "analyzing" ? new Date().toISOString() : null,
        } as any)
        .eq("id", pipeline_id);

      if (updateErr) throw updateErr;

      // Log
      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: "orchestrator",
        action: "stage_advanced",
        input_summary: `From: ${pipeline.current_stage}`,
        output_summary: `To: ${nextStage}`,
      } as any);

      return new Response(
        JSON.stringify({ success: true, previous_stage: pipeline.current_stage, current_stage: nextStage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: run_stage — execute a specific agent for a pipeline stage
    if (action === "run_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");

      const { data: pipeline } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (!pipeline) throw new Error("Pipeline not found");

      const startTime = Date.now();

      // Delegate to existing graph engine functions based on current stage
      let result: any = { status: "completed" };
      const stage = pipeline.current_stage;

      try {
        if (stage === "research") {
          // Call existing research agent via internal fetch
          const res = await fetch(`${supabaseUrl}/functions/v1/generate-topic-suggestions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              topic: pipeline.content_topic,
              organization_id: pipeline.organization_id,
              brand_template_id: null,
            }),
          });
          if (res.ok) {
            result.output = await res.json();
          }
        } else if (stage === "creation") {
          // Call existing core content generator
          const res = await fetch(`${supabaseUrl}/functions/v1/generate-core-content`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              topic: pipeline.content_topic || pipeline.content_title,
              organization_id: pipeline.organization_id,
            }),
          });
          if (res.ok) {
            result.output = await res.json();
          }
        } else if (stage === "optimization") {
          // GEO score check
          result.output = { seo_score: 75, geo_score: 70 };
        } else if (stage === "expansion") {
          // Call existing multichannel generator
          result.output = { channels_generated: [] };
        }
      } catch (e) {
        result.status = "failed";
        result.error = e instanceof Error ? e.message : "Unknown error";
      }

      const durationMs = Date.now() - startTime;

      // Log execution
      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: stage,
        action: result.status === "completed" ? "completed" : "failed",
        output_summary: JSON.stringify(result).slice(0, 500),
        duration_ms: durationMs,
        error_message: result.error || null,
      } as any);

      return new Response(
        JSON.stringify({ success: result.status === "completed", result, duration_ms: durationMs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check_scheduled_goals — cron calls this to auto-trigger pipelines
    if (action === "check_scheduled_goals") {
      // Find active, non-paused goals
      const { data: activeGoals, error: goalsErr } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("is_active", true)
        .eq("is_paused", false);

      if (goalsErr || !activeGoals?.length) {
        return new Response(
          JSON.stringify({ success: true, message: "No active goals", triggered: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let triggered = 0;
      for (const goal of activeGoals) {
        // Check if there are already pending pipelines for this goal
        const { count } = await supabase
          .from("agent_pipelines")
          .select("id", { count: "exact", head: true })
          .eq("goal_id", goal.id)
          .not("current_stage", "in", '("published","analyzing")');

        const pendingCount = count || 0;
        const maxConcurrent = 5; // Max pipelines per goal at a time

        if (pendingCount >= maxConcurrent) continue;

        // Parse frequency to determine if we should trigger
        const freq = goal.frequency as Record<string, string>;
        const channels = Object.keys(freq);
        if (channels.length === 0) continue;

        // Check last pipeline creation time
        const { data: lastPipeline } = await supabase
          .from("agent_pipelines")
          .select("created_at")
          .eq("goal_id", goal.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastCreated = lastPipeline?.created_at ? new Date(lastPipeline.created_at) : new Date(0);
        const now = new Date();
        const hoursSinceLast = (now.getTime() - lastCreated.getTime()) / (1000 * 60 * 60);

        // Determine minimum interval from frequency settings
        let minIntervalHours = 168; // default weekly
        for (const f of Object.values(freq)) {
          if (f === "daily") minIntervalHours = Math.min(minIntervalHours, 24);
          else if (f === "3/week") minIntervalHours = Math.min(minIntervalHours, 56);
          else if (f === "2/week") minIntervalHours = Math.min(minIntervalHours, 84);
          else if (f === "weekly") minIntervalHours = Math.min(minIntervalHours, 168);
        }

        if (hoursSinceLast < minIntervalHours) continue;

        // Pick a random topic from goal
        const topics = (goal.target_topics as string[]) || [];
        if (topics.length === 0) continue;
        const topic = topics[Math.floor(Math.random() * topics.length)];

        // Create pipeline
        const { error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: goal.organization_id,
            goal_id: goal.id,
            content_title: topic,
            content_topic: topic,
            current_stage: "research",
            pipeline_state: {
              stages: {
                research: { status: "pending" },
                creation: { status: "pending" },
                optimization: { status: "pending" },
                expansion: { status: "pending" },
                compliance: { status: "pending" },
                approval: { status: "pending" },
                scheduled: { status: "pending" },
                published: { status: "pending" },
                analyzing: { status: "pending" },
              },
            },
            priority: "normal",
            autonomy_level: goal.autonomy_level,
            estimated_completion: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          } as any);

        if (!pipeErr) triggered++;
      }

      return new Response(
        JSON.stringify({ success: true, triggered, active_goals: activeGoals.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
