import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { slugify, appendUtmToUrls } from "../_shared/utm-helper.ts";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { runSelfCritiqueLoop, CRITIQUE_CONFIG } from "../_shared/self-critique.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGE_ORDER = ["strategy", "create", "quality", "approval", "publish", "analyze"];

const MAX_RETRIES = 3;

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

/** Fire-and-forget: trigger next stage as a NEW Edge Function invocation */
function fireNextStage(supabaseUrl: string, supabaseKey: string, pipelineId: string, nextStage?: string) {
  fetch(`${supabaseUrl}/functions/v1/agent-pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ action: "run_stage", pipeline_id: pipelineId, stage: nextStage }),
  }).catch(e => console.error("Fire-next-stage failed:", e));
}

/** Parse JSON from LLM response that may be wrapped in markdown code fences */
function parseJsonFromLLM(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  return null;
}

/** Create initial pipeline_state with 6 new stages */
function createPipelineState(meta: Record<string, unknown> = {}) {
  const stages: Record<string, { status: string }> = {};
  for (const s of STAGE_ORDER) stages[s] = { status: "pending" };
  return { stages, metadata: meta };
}

function resolveContentId(pipeline: any, pState: any): string | null {
  return pipeline?.content_id
    || pState?.content_id
    || pState?.stages?.create?.output?.id
    || pState?.stages?.create?.output?.content_id
    || pState?.stages?.create?.content_id
    // Legacy fallbacks
    || pState?.stages?.creation?.output?.id
    || pState?.stages?.creation?.output?.content_id
    || null;
}

/** Fetch agent model config from ai_agent_model_configs table */
async function getAgentModelConfig(supabase: any, orgId: string, agentName: string) {
  try {
    const { data } = await supabase
      .from("ai_agent_model_configs")
      .select("model_override, temperature, max_tokens, quality_mode, fallback_model, is_enabled")
      .eq("organization_id", orgId)
      .eq("agent_name", agentName)
      .eq("is_enabled", true)
      .maybeSingle();
    return data || null;
  } catch (e) {
    console.warn(`[getAgentModelConfig] Failed for ${agentName}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, goal_id, pipeline_id, organization_id } = body;

    // ========== ACTION: trigger_from_goal ==========
    // New flow: call generate-campaign-strategy instead of creating pipelines directly
    if (action === "trigger_from_goal") {
      if (!goal_id) throw new Error("goal_id required");

      const { data: goal, error: goalErr } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("id", goal_id)
        .single();
      if (goalErr || !goal) throw new Error("Goal not found");

      // Call generate-campaign-strategy to create a content plan
      const strategyResult = await callFunction(supabaseUrl, supabaseKey, "generate-campaign-strategy", {
        goal_id: goal.id,
        campaign_title: goal.name,
        campaign_description: goal.description || "",
        target_channels: goal.target_channels || [],
        campaign_duration_days: goal.campaign_duration_days || 14,
        campaign_start_date: goal.campaign_start_date || new Date().toISOString().split("T")[0],
        approval_mode: goal.approval_mode || "approve_plan",
        brand_template_id: goal.brand_template_id || null,
        clarification_context: goal.clarification_context || null,
        organization_id: goal.organization_id,
      });

      return json({
        success: true,
        plan_id: strategyResult.plan_id,
        total_pieces: strategyResult.total_pieces || 0,
        pipelines_created: strategyResult.pipelines_created || 0,
        approval_mode: strategyResult.approval_mode || "approve_plan",
      });
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

      // If advancing to approval + human_in_loop → create approval record
      if (nextStage === "approval" && pipeline.autonomy_level === "human_in_loop") {
        const pState = (pipeline.pipeline_state as any) || {};
        const createOutput = pState.stages?.create?.output;
        const qualityOutput = pState.stages?.quality?.output;

        await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: createOutput?.content_preview || createOutput?.title || `Content: ${pipeline.content_title}`,
          channel_versions: {},
          scores: {
            seo: qualityOutput?.seo_score || null,
            geo: qualityOutput?.geo_score || null,
            compliance: qualityOutput?.compliance_status || null,
          },
          status: "pending",
        } as any);
      }

      const pipelineState = (pipeline.pipeline_state as any) || { stages: {} };
      if (pipelineState.stages) {
        pipelineState.stages[pipeline.current_stage] = { ...pipelineState.stages[pipeline.current_stage], status: "completed", completed_at: now };
        pipelineState.stages[nextStage] = { ...(pipelineState.stages[nextStage] || {}), status: "in_progress", started_at: now };
      }

      await supabase
        .from("agent_pipelines")
        .update({
          current_stage: nextStage,
          pipeline_state: pipelineState,
          stage_started_at: now,
          completed_at: nextStage === "analyze" ? now : null,
        } as any)
        .eq("id", pipeline_id);

      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: "orchestrator",
        action: "stage_advanced",
        input_summary: `From: ${pipeline.current_stage}`,
        output_summary: `To: ${nextStage}`,
      } as any);

      // Fire-and-forget: run the next stage
      fireNextStage(supabaseUrl, supabaseKey, pipeline_id, nextStage);

      return json({ success: true, previous_stage: pipeline.current_stage, current_stage: nextStage });
    }

    // ========== ACTION: run_stage ==========
    if (action === "run_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");
      const requestedStage = body.stage;

      const { data: pipeline } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (!pipeline) throw new Error("Pipeline not found");

      if (requestedStage && pipeline.current_stage !== requestedStage) {
        console.log(`[run_stage] Requested ${requestedStage} but pipeline is at ${pipeline.current_stage}. Skipping.`);
        return json({ status: 'skipped', reason: 'stage_mismatch' });
      }

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
          .eq("is_flagged", false)
          .not("current_stage", "in", '("publish","analyze")');

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

        // Trigger via strategy instead of direct pipeline creation
        try {
          await callFunction(supabaseUrl, supabaseKey, "generate-campaign-strategy", {
            goal_id: goal.id,
            campaign_title: goal.name,
            campaign_description: goal.description || "",
            target_channels: goal.target_channels || [],
            campaign_duration_days: goal.campaign_duration_days || 7,
            campaign_start_date: new Date().toISOString().split("T")[0],
            approval_mode: goal.approval_mode || "full_auto",
            brand_template_id: goal.brand_template_id || null,
            clarification_context: goal.clarification_context || null,
            organization_id: goal.organization_id,
          });
          triggered++;
        } catch (e) {
          console.error(`Failed to trigger strategy for goal ${goal.id}:`, e);
        }
      }

      return json({ success: true, triggered, active_goals: activeGoals.length });
    }

    // ========== ACTION: check_scheduled_publish ==========
    if (action === "check_scheduled_publish") {
      // Find pipelines at publish stage: either scheduled_publish_at <= now OR scheduled_publish_at is null
      const now = new Date().toISOString();
      const { data: scheduledPipelines } = await supabase
        .from("agent_pipelines")
        .select("id")
        .eq("current_stage", "publish")
        .lte("scheduled_publish_at", now)
        .is("completed_at", null);

      const { data: unscheduledPipelines } = await supabase
        .from("agent_pipelines")
        .select("id")
        .eq("current_stage", "publish")
        .is("scheduled_publish_at", null)
        .is("completed_at", null);

      const allReady = [...(scheduledPipelines || []), ...(unscheduledPipelines || [])];
      // Deduplicate
      const seen = new Set<string>();
      const readyPipelines = allReady.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

      let triggered = 0;
      for (const p of readyPipelines) {
        fireNextStage(supabaseUrl, supabaseKey, p.id, "publish");
        triggered++;
        await new Promise(r => setTimeout(r, 1000));
      }
      return json({ success: true, triggered });
    }

    // ========== ACTION: recover_stuck ==========
    if (action === "recover_stuck") {
      const stuckThresholdMs = 15 * 60 * 1000; // 15 minutes
      const cutoff = new Date(Date.now() - stuckThresholdMs).toISOString();

      // Find pipelines stuck: stage_started_at > 15 min ago, not completed, not flagged
      const { data: stuckPipelines, error: stuckErr } = await supabase
        .from("agent_pipelines")
        .select("id, current_stage, pipeline_state, organization_id")
        .is("completed_at", null)
        .eq("is_flagged", false)
        .lt("stage_started_at", cutoff)
        .not("current_stage", "eq", "approval"); // Don't auto-recover approval (needs human)

      if (stuckErr) throw new Error(`Query stuck pipelines failed: ${stuckErr.message}`);
      if (!stuckPipelines?.length) {
        return json({ success: true, recovered: 0, message: "No stuck pipelines found" });
      }

      // Optionally filter by organization_id
      const filtered = organization_id
        ? stuckPipelines.filter((p: any) => p.organization_id === organization_id)
        : stuckPipelines;

      const MAX_RETRY_LIMIT = 3;
      let recovered = 0;
      let flagged = 0;
      for (const p of filtered) {
        const pState = (p.pipeline_state as any) || { stages: {} };
        const stageState = pState.stages?.[p.current_stage];
        const retryCount = stageState?.retry_count || 0;

        // If exceeded max retry limit, flag the pipeline and skip
        if (retryCount >= MAX_RETRY_LIMIT) {
          await supabase
            .from("agent_pipelines")
            .update({
              is_flagged: true,
              flag_reason: `Auto-flagged: exceeded max retry limit (${retryCount} retries at stage ${p.current_stage})`,
            } as any)
            .eq("id", p.id);

          await supabase.from("agent_pipeline_logs").insert({
            pipeline_id: p.id,
            agent_name: "recovery",
            action: "flag_max_retries",
            input_summary: `Stage: ${p.current_stage}, retry_count: ${retryCount}`,
            output_summary: `Flagged: exceeded max retry limit of ${MAX_RETRY_LIMIT}`,
          } as any);

          flagged++;
          continue;
        }

        // Reset stage status to pending for re-execution
        if (pState.stages?.[p.current_stage]) {
          pState.stages[p.current_stage] = {
            ...stageState,
            status: "pending",
            last_error: stageState?.last_error || null,
            retry_count: retryCount + 1,
            recovered_at: new Date().toISOString(),
          };
        }

        const now = new Date().toISOString();
        await supabase
          .from("agent_pipelines")
          .update({
            pipeline_state: pState,
            stage_started_at: now,
          } as any)
          .eq("id", p.id);

        await supabase.from("agent_pipeline_logs").insert({
          pipeline_id: p.id,
          agent_name: "recovery",
          action: "recover_stuck",
          input_summary: `Stage: ${p.current_stage}, stuck > 15min, retry ${retryCount + 1}/${MAX_RETRY_LIMIT}`,
          output_summary: "Reset to pending, re-firing",
        } as any);

        // Staggered re-fire: 5s between each pipeline
        const delay = recovered * 5000;
        setTimeout(() => {
          fireNextStage(supabaseUrl, supabaseKey, p.id, p.current_stage);
        }, delay);

        recovered++;
      }

      return json({ success: true, recovered, flagged, total_stuck: filtered.length });
    }

    // ========== ACTION: backfill_approvals ==========
    if (action === "backfill_approvals") {
      // Find pipelines at approval stage without a matching agent_approvals record
      const { data: approvalPipelines } = await supabase
        .from("agent_pipelines")
        .select("id, organization_id, content_title, pipeline_state, autonomy_level")
        .eq("current_stage", "approval")
        .is("completed_at", null);

      if (!approvalPipelines?.length) {
        return json({ success: true, backfilled: 0, message: "No pipelines at approval stage" });
      }

      // Filter by org if provided
      const candidates = organization_id
        ? approvalPipelines.filter((p: any) => p.organization_id === organization_id)
        : approvalPipelines;

      let backfilled = 0;
      for (const p of candidates) {
        // Check if approval record already exists
        const { data: existing } = await supabase
          .from("agent_approvals")
          .select("id")
          .eq("pipeline_id", p.id)
          .limit(1)
          .maybeSingle();

        if (existing) continue; // Already has an approval record

        const pState = (p.pipeline_state as any) || { stages: {} };
        const createOutput = pState.stages?.create?.output;
        const qualityOutput = pState.stages?.quality?.output;

        const { error: insertErr } = await supabase.from("agent_approvals").insert({
          pipeline_id: p.id,
          organization_id: p.organization_id,
          content_preview: createOutput?.content_preview || createOutput?.title || p.content_title || "Content pending review",
          channel_versions: {},
          scores: {
            geo: qualityOutput?.geo?.overall_score || null,
            compliance: qualityOutput?.compliance?.status || null,
            persona_fit: qualityOutput?.persona_fit?.overall || null,
            overall: qualityOutput?.overall || null,
            self_review: qualityOutput?.self_review?.overall || null,
          },
          status: "pending",
        } as any);

        if (insertErr) {
          console.error(`[backfill] Failed to create approval for pipeline ${p.id}:`, JSON.stringify(insertErr));
        } else {
          backfilled++;
          console.log(`[backfill] Created approval record for pipeline ${p.id}`);
        }
      }

      return json({ success: true, backfilled, total_at_approval: candidates.length });
    }

    // ========== ACTION: backfill_publish ==========
    if (action === "backfill_publish") {
      // Find pipelines at publish stage missing target_channels in meta
      const { data: publishPipelines } = await supabase
        .from("agent_pipelines")
        .select("id, organization_id, goal_id, pipeline_state, content_id")
        .eq("current_stage", "publish")
        .is("completed_at", null);

      if (!publishPipelines?.length) {
        return json({ success: true, fixed: 0, message: "No pipelines at publish stage" });
      }

      const candidates = organization_id
        ? publishPipelines.filter((p: any) => p.organization_id === organization_id)
        : publishPipelines;

      let fixed = 0;
      for (const p of candidates) {
        const pState = (p.pipeline_state as any) || { stages: {}, metadata: {} };
        const meta = pState.metadata || {};
        const hasChannels = meta.target_channels && meta.target_channels.length > 0;
        const hasContentId = !!p.content_id;

        if (hasChannels && hasContentId) continue; // Already OK

        // Resolve target_channels from goal
        let targetChannels = meta.target_channels || [];
        if (!hasChannels && p.goal_id) {
          const { data: goal } = await supabase
            .from("agent_goals")
            .select("target_channels")
            .eq("id", p.goal_id)
            .single();
          if (goal?.target_channels?.length) {
            targetChannels = goal.target_channels;
          }
        }

        // Resolve content_id from pipeline_state
        let contentId = p.content_id;
        if (!contentId) {
          contentId = resolveContentId(p, pState);
        }

        // Update pipeline
        pState.metadata = { ...meta, target_channels: targetChannels };
        const updates: any = { pipeline_state: pState };
        if (contentId && !p.content_id) {
          updates.content_id = contentId;
        }

        const { error: updErr } = await supabase
          .from("agent_pipelines")
          .update(updates)
          .eq("id", p.id);

        if (updErr) {
          console.error(`[backfill_publish] Failed for pipeline ${p.id}:`, JSON.stringify(updErr));
        } else {
          fixed++;
          console.log(`[backfill_publish] Fixed pipeline ${p.id}: channels=${targetChannels.length}, contentId=${contentId ? 'yes' : 'no'}`);
        }
      }

      return json({ success: true, fixed, total_at_publish: candidates.length });
    }

    // ========== ACTION: create_from_plan ==========
    if (action === "create_from_plan") {
      const { plan_id } = body;
      if (!plan_id) throw new Error("plan_id required");

      const { data: plan, error: planErr } = await supabase
        .from("campaign_content_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planErr || !plan) throw new Error("Plan not found");
      if (!plan.plan_approved) throw new Error("Plan not yet approved");

      const pieces = plan.plan_data as any[];
      if (!pieces?.length) throw new Error("Plan has no content pieces");

      let goalData: any = null;
      if (plan.goal_id) {
        const { data: g } = await supabase.from("agent_goals").select("*").eq("id", plan.goal_id).single();
        goalData = g;
      }

      const pipelineIds: string[] = [];

      for (const piece of pieces) {
        const autonomyLevel = plan.approval_mode === "full_auto"
          ? "full_auto"
          : plan.approval_mode === "approve_each"
            ? "human_in_loop"
            : "human_on_loop";

        // Map piece format to content_type
        const contentType = piece.content_type
          || (piece.format === "video_script" ? "video_script"
            : piece.format === "carousel" ? "carousel"
            : "multichannel");

        const pipelineState = createPipelineState({
          brand_template_id: goalData?.brand_template_id || null,
          campaign_id: goalData?.campaign_id || null,
          target_channels: (piece.target_channel || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((ch: string) => ch === 'blog' ? 'website' : ch),
          campaign_context: {
            plan_id: plan.id,
            total_pieces: pieces.length,
            piece_number: piece.piece_number,
            angle: piece.angle,
            content_type: contentType,
            target_channel: piece.target_channel,
            content_role: piece.content_role,
            format: piece.format,
            estimated_length: piece.estimated_length || "medium",
            campaign_title: goalData?.name || "",
            clarification_context: plan.clarification_context,
          },
        });

        // Skip strategy stage — it's already done via campaign plan
        if (pipelineState.stages?.strategy) {
          pipelineState.stages.strategy = { status: "completed", completed_at: new Date().toISOString() } as any;
        }

        const { data: pipeline, error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: plan.organization_id,
            goal_id: plan.goal_id,
            campaign_plan_id: plan.id,
            piece_number: piece.piece_number,
            content_title: piece.title,
            content_topic: piece.key_message,
            content_type: contentType,
            current_stage: "create",
            pipeline_state: pipelineState,
            priority: "normal",
            autonomy_level: autonomyLevel,
            scheduled_publish_at: piece.scheduled_date ? `${piece.scheduled_date}T09:00:00Z` : null,
            estimated_completion: new Date(Date.now() + ({ multichannel: 5, carousel: 8, video_script: 4 }[contentType] || 6) * 60 * 1000).toISOString(),
            stage_started_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();

        if (pipeErr) { console.error("Pipeline creation error:", pipeErr); continue; }
        pipelineIds.push(pipeline.id);
        piece.pipeline_id = pipeline.id;
        piece.status = "in_progress";

        // === Create content_schedules for Calendar integration ===
        if (piece.scheduled_date) {
          const scheduleIds: Record<string, string> = {};
          const targetChannels = [piece.target_channel].flat().filter(Boolean).map(ch => ch === 'blog' ? 'website' : ch);
          for (const ch of targetChannels) {
            try {
              const { data: schedule, error: schedErr } = await supabase
                .from("content_schedules")
                .insert({
                  content_id: null, // Will be updated after create stage
                  channel: ch,
                  organization_id: plan.organization_id,
                  scheduled_at: `${piece.scheduled_date}T09:00:00Z`,
                  timezone: "Asia/Ho_Chi_Minh",
                  publish_status: "scheduled",
                  notes: `Auto-created from campaign plan: ${piece.title}`,
                  created_by: goalData?.created_by || null,
                } as any)
                .select("id")
                .single();
              if (schedErr) {
                console.error(`[create_from_plan] Failed to create schedule for ${ch}:`, schedErr);
              } else if (schedule) {
                scheduleIds[ch] = schedule.id;
              }
            } catch (e) {
              console.error(`[create_from_plan] Schedule creation error for ${ch}:`, e);
            }
          }
          // Store schedule_ids in pipeline_state metadata
          if (Object.keys(scheduleIds).length > 0) {
            pipelineState.metadata.schedule_ids = scheduleIds;
            await supabase.from("agent_pipelines")
              .update({ pipeline_state: pipelineState } as any)
              .eq("id", pipeline.id);
            console.log(`[create_from_plan] Created ${Object.keys(scheduleIds).length} schedule(s) for pipeline ${pipeline.id}`);
          }
        }
      }

      // Update plan status and plan_data with pipeline IDs
      await supabase.from("campaign_content_plans").update({
        plan_data: pieces,
        status: "executing",
        updated_at: new Date().toISOString(),
      } as any).eq("id", plan_id);

      // Start all pipelines with staggered fire-and-forget
      for (const pid of pipelineIds) {
        fireNextStage(supabaseUrl, supabaseKey, pid, "create");
        await new Promise(r => setTimeout(r, 3000));
      }

      return json({ success: true, pipeline_count: pipelineIds.length, pipeline_ids: pipelineIds });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: trigger_from_goal, advance_stage, run_stage, check_scheduled_goals, check_scheduled_publish, create_from_plan, recover_stuck, backfill_approvals, backfill_publish" }),
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

// ========== CORE: Run a single pipeline stage (6 stages) ==========
async function runStage(supabase: any, supabaseUrl: string, supabaseKey: string, pipelineInput: any) {
  const startTime = Date.now();
  const pipelineId = pipelineInput.id;

  const { data: freshPipeline, error: fetchErr } = await supabase
    .from("agent_pipelines")
    .select("*")
    .eq("id", pipelineId)
    .single();
  if (fetchErr || !freshPipeline) throw new Error(`Pipeline ${pipelineId} not found on re-fetch`);

  let pipeline = freshPipeline;
  const stage = pipeline.current_stage;
  const pState = (pipeline.pipeline_state as any) || { stages: {}, metadata: {} };

  // ===== DEDUP GUARD =====
  const stageState = pState.stages?.[stage];
  if (stageState?.status === 'completed') {
    console.log(`[${stage}] Already completed, skipping duplicate execution`);
    return { status: 'skipped', reason: 'already_completed', stage };
  }
  if (stageState?.status === 'in_progress' && stageState?.started_at) {
    const elapsed = Date.now() - new Date(stageState.started_at).getTime();
    if (elapsed < 10000) {
      console.log(`[${stage}] Already in_progress (${elapsed}ms ago), skipping duplicate`);
      return { status: 'skipped', reason: 'already_in_progress', stage };
    }
  }

  const meta = pState.metadata || {};
  const brandTemplateId = meta.brand_template_id || null;
  const orgId = pipeline.organization_id;
  const contentType = pipeline.content_type || meta.campaign_context?.content_type || "multichannel";
  let result: any = { status: "completed" };
  let shouldAutoAdvance = true;

  // Fetch agent model config for this stage
  const agentConfig = await getAgentModelConfig(supabase, orgId, stage);
  const modelOverride = agentConfig?.model_override || undefined;
  const agentTemperature = agentConfig?.temperature || undefined;
  const agentMaxTokens = agentConfig?.max_tokens || undefined;
  const fallbackModel = agentConfig?.fallback_model || undefined;

  console.log(`[${stage}] Pipeline ${pipelineId} — content_type: ${contentType}, content_id: ${pipeline.content_id || 'NULL'}, brand: ${brandTemplateId || 'NULL'}, model: ${modelOverride || 'default'}`);

  // Mark stage as in_progress
  if (pState.stages?.[stage]) {
    pState.stages[stage].status = "in_progress";
    pState.stages[stage].started_at = new Date().toISOString();
  }
  await supabase.from("agent_pipelines")
    .update({ pipeline_state: pState, stage_started_at: new Date().toISOString() } as any)
    .eq("id", pipeline.id);

  try {
    // ========== STAGE: strategy ==========
    if (stage === "strategy") {
      // Strategy is usually done before pipeline creation (via campaign plan).
      // Only runs for manually created single-topic pipelines.
      const campaignCtx = meta.campaign_context;
      const campaignTitle = pipeline.content_title || "";

      let instruction = `CRITICAL: The user specifically wants content about: "${campaignTitle}".`;
      if (pipeline.content_topic && pipeline.content_topic !== campaignTitle) {
        instruction += ` Additional context: ${pipeline.content_topic}.`;
      }
      if (campaignCtx?.clarification_context) {
        instruction += ` User clarifications: ${JSON.stringify(campaignCtx.clarification_context)}.`;
      }

      const output = await callFunction(supabaseUrl, supabaseKey, "topic-ai", {
        action: "suggest",
        topic: campaignTitle || pipeline.content_topic,
        instruction,
        organization_id: orgId,
        brand_template_id: brandTemplateId,
        ...(modelOverride && { model_override: modelOverride }),
        ...(agentTemperature && { temperature: agentTemperature }),
      });
      result.output = output;

    // ========== STAGE: create ==========
    } else if (stage === "create") {
      const campaignCtx = meta.campaign_context;

      // Derive topic
      const strategyOutput = pState.stages?.strategy?.output;
      const creationTopic = strategyOutput?.suggestions?.[0]?.topic
        || strategyOutput?.topic
        || pipeline.content_topic
        || pipeline.content_title;

      if (!creationTopic) {
        throw new Error("No topic available for content creation.");
      }

      // ─── Resolve target_channels with fallback ───
      let resolvedChannels: string[] = (meta.target_channels || []).flatMap((ch: string) =>
        ch.includes(',') ? ch.split(',').map((s: string) => s.trim()) : [ch]
      ).filter(Boolean).map((ch: string) => ch === 'blog' ? 'website' : ch);

      if (resolvedChannels.length === 0 && pipeline.goal_id) {
        console.log(`[create] target_channels empty, fetching from goal ${pipeline.goal_id}`);
        const { data: goal } = await supabase
          .from("agent_goals")
          .select("target_channels")
          .eq("id", pipeline.goal_id)
          .single();
        if (goal?.target_channels?.length) {
          resolvedChannels = goal.target_channels.map((ch: string) => ch === 'blog' ? 'website' : ch);
        }
      }

      if (resolvedChannels.length === 0 && pipeline.campaign_plan_id && pipeline.piece_number) {
        console.log(`[create] Fallback: fetching channels from campaign plan`);
        const { data: planData } = await supabase
          .from("campaign_content_plans")
          .select("plan_data")
          .eq("id", pipeline.campaign_plan_id)
          .single();
        if (planData?.plan_data) {
          const pieces = Array.isArray(planData.plan_data) ? planData.plan_data : [];
          const matchPiece = pieces.find((p: any) => p.piece_number === pipeline.piece_number);
          if (matchPiece?.target_channel) {
            resolvedChannels = matchPiece.target_channel.split(',').map((s: string) => s.trim()).filter(Boolean).map((ch: string) => ch === 'blog' ? 'website' : ch);
          }
        }
      }

      // Persist resolved channels back to pipeline_state
      if (resolvedChannels.length > 0 && (!meta.target_channels || meta.target_channels.length === 0)) {
        pState.metadata = { ...meta, target_channels: resolvedChannels };
        await supabase.from("agent_pipelines").update({ pipeline_state: pState } as any).eq("id", pipeline.id);
      }

      // ===== Delegate to agent-creator-v2 =====
      const creatorResult = await callFunction(supabaseUrl, supabaseKey, "agent-creator-v2", {
        pipeline_id: pipeline.id,
        content_type: contentType,
        topic: creationTopic,
        organization_id: orgId,
        brand_template_id: brandTemplateId,
        campaign_context: campaignCtx || undefined,
        target_channels: resolvedChannels,
        content_goal: meta.content_goal || undefined,
        content_angle: meta.content_angle || undefined,
        content_role: meta.content_role || undefined,
        length_mode: meta.content_length || undefined,
        campaign_id: meta.campaign_id || pipeline.campaign_id || null,
        ...(modelOverride && { model_override: modelOverride }),
        ...(agentTemperature && { temperature: agentTemperature }),
        ...(agentMaxTokens && { max_tokens: agentMaxTokens }),
      });

      result.output = creatorResult.output || creatorResult;

      // Save multichannel_content_id in pipeline state for Publisher
      const mcContentId = creatorResult.multichannel_content_id;
      if (mcContentId) {
        pState.multichannel_content_id = mcContentId;
        if (pState.stages?.create) {
          pState.stages.create.multichannel_content_id = mcContentId;
        }
        console.log(`[create] Saved multichannel_content_id: ${mcContentId}`);
      }

      const contentId = creatorResult.content_id || (contentType === "multichannel" ? mcContentId : null);
      if (!creatorResult.success || !contentId) {
        throw new Error(creatorResult.error || "Creator agent failed to return content_id");
      }

      // Save content_id
      await saveContentId(supabase, pipeline, pState, contentId);
      pipeline.content_id = contentId;

      // === Update content_schedules with content_id ===
      const scheduleIds = meta.schedule_ids as Record<string, string> | undefined;
      if (scheduleIds && Object.keys(scheduleIds).length > 0) {
        const ids = Object.values(scheduleIds);
        const { error: schedUpdateErr } = await supabase
          .from("content_schedules")
          .update({ content_id: contentId, updated_at: new Date().toISOString() })
          .in("id", ids);
        if (schedUpdateErr) {
          console.warn("[create] Failed to update content_schedules with content_id:", schedUpdateErr);
        } else {
          console.log(`[create] Updated ${ids.length} content_schedule(s) with content_id ${contentId}`);
        }
      }

      // Re-fetch pipeline to ensure content_id is committed
      const { data: refreshed } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline.id)
        .single();
      if (refreshed) pipeline = refreshed;

    // ========== STAGE: quality ==========
    } else if (stage === "quality") {
      const contentId = resolveContentId(pipeline, pState);
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

      // ── 1. GEO Scoring (all content types) ──
      let geoScores: any = null;
      const contentText = await fetchContentText(supabase, contentId, contentType, pState);

      if (contentText) {
        try {
          geoScores = await callFunction(supabaseUrl, supabaseKey, "geo-score-content", {
            contentText,
            contentId: contentId || undefined,
            contentType: contentType === "multichannel" ? "core_content" : contentType,
            organizationId: orgId,
          });
        } catch (e) {
          console.warn("[quality] GEO scoring failed:", e);
        }
      }

      // ── 2. Compliance Check via LLM ──
      let complianceResult: any = null;
      try {
        let brandData: any = null;
        let industryRules: any[] = [];

        if (brandTemplateId) {
          const { data: brand } = await supabase
            .from("brand_templates")
            .select("brand_name, industry, tone_of_voice, forbidden_words, formality_level, industry_template_id")
            .eq("id", brandTemplateId)
            .single();
          brandData = brand;

          if (brand?.industry_template_id) {
            const { data: jurisdictions } = await supabase
              .from("industry_jurisdiction_profiles")
              .select("resolved_rules")
              .eq("industry_template_id", brand.industry_template_id)
              .limit(1);
            if (jurisdictions?.length > 0 && jurisdictions[0].resolved_rules) {
              const resolved = jurisdictions[0].resolved_rules;
              industryRules = [
                ...(resolved.forbidden_terms || []).map((t: string) => `Từ cấm: "${t}"`),
                ...(resolved.compliance_rules || []).map((r: string) => `Quy định: ${r}`),
              ];
            }
          }
        }

        if (contentText) {
          const compliancePrompt = `Kiểm tra tuân thủ nội dung ${contentType} cho ngành "${brandData?.industry || "general"}".
Tiêu đề: ${pipeline.content_title}
Nội dung (trích): ${contentText.slice(0, 3000)}
${brandData ? `Brand: ${brandData.brand_name}. Tone: ${brandData.tone_of_voice || "N/A"}. Từ cấm: ${(brandData.forbidden_words || []).join(", ") || "Không"}` : ""}
${industryRules.length > 0 ? `Quy định ngành:\n${industryRules.join("\n")}` : ""}

Trả về JSON: { "status": "passed"|"needs_review"|"failed", "score": 0-100, "issues": [{"type":"...","severity":"high|medium|low","description":"..."}], "summary": "..." }`;

          const complianceModel = modelOverride || "google/gemini-2.5-flash";
          const complianceResult2 = await callAIWithMetrics(supabase, {
            functionName: 'agent-pipeline-quality',
            organizationId: orgId,
            actionType: 'compliance_check',
            modelOverride: complianceModel,
            ...(agentTemperature && { temperatureOverride: agentTemperature }),
            messages: [
              { role: "system", content: "Bạn là AI kiểm tra tuân thủ nội dung. Luôn trả về JSON hợp lệ." },
              { role: "user", content: compliancePrompt },
            ],
          });
          const aiContent = complianceResult2.data?.choices?.[0]?.message?.content || "";
          complianceResult = parseJsonFromLLM(aiContent);
        }
      } catch (e) {
        console.warn("[quality] Compliance check failed:", e);
      }

      // ── 3. Persona-Fit Scoring ──
      let personaFit: any = null;
      if (contentText && brandTemplateId) {
        try {
          const { data: personas } = await supabase
            .from("customer_personas")
            .select("name, occupation, age_range, pain_points, desires, buying_triggers, communication_style, objections")
            .eq("brand_template_id", brandTemplateId)
            .eq("is_primary", true)
            .limit(1);

          if (personas?.length) {
            const persona = personas[0];
            const personaPrompt = `Đánh giá mức độ phù hợp của nội dung sau với persona "${persona.name}" (${persona.occupation || ""}, ${persona.age_range || ""}).

NỘI DUNG (trích): ${contentText.slice(0, 2500)}

PERSONA:
- Pain points: ${JSON.stringify(persona.pain_points || [])}
- Desires: ${JSON.stringify(persona.desires || [])}
- Communication style: ${persona.communication_style || "N/A"}
- Objections: ${JSON.stringify(persona.objections || [])}
- Buying triggers: ${JSON.stringify(persona.buying_triggers || [])}

Chấm 5 chiều (0-100): pain_points (30%), desires (25%), communication_style (20%), objections (15%), triggers (10%).
Trả về JSON: { "pain_points": <number>, "desires": <number>, "communication_style": <number>, "objections": <number>, "triggers": <number>, "feedback": "<1 câu>" }`;

            const personaModel = modelOverride || "google/gemini-2.5-flash-lite";
            const pfResult = await callAIWithMetrics(supabase, {
              functionName: 'agent-pipeline-quality',
              organizationId: orgId,
              actionType: 'persona_fit',
              modelOverride: personaModel,
              ...(agentTemperature && { temperatureOverride: agentTemperature }),
              messages: [
                { role: "system", content: "Đánh giá persona fit. Luôn trả JSON." },
                { role: "user", content: personaPrompt },
              ],
            });
            const pfParsed = parseJsonFromLLM(pfResult.data?.choices?.[0]?.message?.content || "");
            if (pfParsed) {
              const overall = Math.round(
                (pfParsed.pain_points || 50) * 0.30 +
                (pfParsed.desires || 50) * 0.25 +
                (pfParsed.communication_style || 50) * 0.20 +
                (pfParsed.objections || 50) * 0.15 +
                (pfParsed.triggers || 50) * 0.10
              );
              personaFit = { ...pfParsed, overall, persona_name: persona.name };
            }
          }
        } catch (e) {
          console.warn("[quality] Persona-fit check failed:", e);
        }
      }

      // ── 4. Merge all scores ──
      const geoOverall = geoScores?.overall_score || null;
      const compScore = complianceResult?.score || null;
      const selfReview = (pipeline.quality_scores as any)?.self_review || pState.stages?.create?.output?.self_review || null;
      const selfReviewScore = selfReview?.overall || null;
      const personaFitScore = personaFit?.overall || null;

      // Weighted overall: GEO 30%, Compliance 25%, Self-review 25%, Persona-fit 20%
      const scoreParts: { score: number; weight: number }[] = [];
      if (geoOverall !== null) scoreParts.push({ score: geoOverall, weight: 0.30 });
      if (compScore !== null) scoreParts.push({ score: compScore, weight: 0.25 });
      if (selfReviewScore !== null) scoreParts.push({ score: selfReviewScore, weight: 0.25 });
      if (personaFitScore !== null) scoreParts.push({ score: personaFitScore, weight: 0.20 });

      let overallScore: number | null = null;
      if (scoreParts.length > 0) {
        const totalWeight = scoreParts.reduce((sum, p) => sum + p.weight, 0);
        overallScore = Math.round(scoreParts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight);
      }

      const qualityScores = {
        geo: geoScores ? { overall_score: geoOverall, factor_scores: geoScores.factor_scores } : null,
        compliance: complianceResult || null,
        self_review: selfReview || null,
        persona_fit: personaFit || null,
        overall: overallScore,
      };

      // Save quality scores to pipeline
      await supabase.from("agent_pipelines").update({
        quality_scores: qualityScores,
        overall_quality_score: overallScore,
      } as any).eq("id", pipeline.id);

      // ── 5. Self-Critique Loop — sync critique_score to multi_channel_contents ──
      if (contentId && (contentType === "multichannel" || contentType === "core_content")) {
        try {
          // Fetch channel content from multi_channel_contents for critique
          const { data: mccRow } = await supabase
            .from("multi_channel_contents")
            .select("facebook_content, instagram_content, twitter_content, linkedin_content, website_content, email_content, youtube_content, tiktok_content, threads_content, google_maps_content, zalo_oa_content, telegram_content, selected_channels")
            .eq("id", contentId)
            .single();

          if (mccRow) {
            // Build content object matching Manual Mode format
            const contentForCritique: Record<string, any> = {};
            const channelColumns: Record<string, string> = {
              facebook: 'facebook_content', instagram: 'instagram_content',
              twitter: 'twitter_content', linkedin: 'linkedin_content',
              website: 'website_content', email: 'email_content',
              youtube: 'youtube_content', tiktok: 'tiktok_content',
              threads: 'threads_content', google_maps: 'google_maps_content',
              zalo_oa: 'zalo_oa_content', telegram: 'telegram_content',
            };

            const channels = mccRow.selected_channels || [];
            for (const ch of channels) {
              const col = channelColumns[ch];
              if (col && (mccRow as any)[col]) {
                contentForCritique[col] = (mccRow as any)[col];
              }
            }

            // Fetch brand voice for critique context
            let brandVoice: any = undefined;
            if (brandTemplateId) {
              const { data: brand } = await supabase
                .from("brand_templates")
                .select("tone_of_voice, forbidden_words, formality_level, language_style, preferred_words")
                .eq("id", brandTemplateId)
                .single();
              if (brand) {
                brandVoice = {
                  tone_of_voice: brand.tone_of_voice || [],
                  forbidden_words: brand.forbidden_words || [],
                  formality_level: brand.formality_level,
                  language_style: brand.language_style,
                  preferred_words: brand.preferred_words || [],
                };
              }
            }

            const lovableKey = Deno.env.get("LOVABLE_API_KEY");
            if (lovableKey && Object.keys(contentForCritique).length > 0) {
              console.log(`[quality][self-critique] Running critique loop for content ${contentId}, channels: ${channels.join(', ')}`);

              const critiqueLoop = await runSelfCritiqueLoop({
                content: contentForCritique,
                contentType: 'multichannel',
                brandVoice,
                additionalContext: `Channels: ${channels.join(', ')}`,
                apiKey: lovableKey,
                maxRefinements: 0, // Agent mode: score only, no refinement (quality gate handles flagging)
                organizationId: orgId,
              });

              const critiqueResult = critiqueLoop.critiqueResult;
              const critiqueScore = critiqueResult?.overall_score ?? null;

              // Sync critique_score to multi_channel_contents
              const { error: updateErr } = await supabase
                .from("multi_channel_contents")
                .update({
                  critique_score: critiqueScore,
                  critique_details: critiqueResult || null,
                  was_refined: critiqueLoop.wasRefined,
                  refinement_count: critiqueLoop.refinementCount,
                  needs_manual_review: critiqueLoop.needsManualReview,
                } as any)
                .eq("id", contentId);

              if (updateErr) {
                console.warn(`[quality][self-critique] Failed to sync critique_score to mcc:`, updateErr);
              } else {
                console.log(`[quality][self-critique] Synced critique_score=${critiqueScore} to multi_channel_contents ${contentId}`);
              }

              // Also include in pipeline quality_scores for unified view
              (qualityScores as any).self_critique = {
                overall_score: critiqueScore,
                quality_tier: critiqueResult?.quality_tier,
                passed: critiqueResult?.passed,
                issues_count: critiqueResult?.issues?.length || 0,
              };

              // Re-save pipeline with self_critique included
              await supabase.from("agent_pipelines").update({
                quality_scores: qualityScores,
              } as any).eq("id", pipeline.id);
            }
          }
        } catch (critiqueErr) {
          console.warn("[quality][self-critique] Self-critique sync failed (non-blocking):", critiqueErr);
        }
      }

      result.output = qualityScores;

      // Flag if quality gate fails
      const qualityFailed = complianceResult?.status === "failed" 
        || (overallScore !== null && overallScore < 50);
      const qualityWarning = complianceResult?.status === "needs_review"
        || (overallScore !== null && overallScore < 65);

      if (qualityFailed) {
        await supabase.from("agent_pipelines").update({
          is_flagged: true,
          flag_reason: `Quality gate failed (score: ${overallScore}): ${complianceResult?.summary || "Low quality"}`,
        } as any).eq("id", pipelineId);
        shouldAutoAdvance = false;
      } else if (qualityWarning) {
        const highIssues = (complianceResult?.issues || []).filter((i: any) => i.severity === "high");
        if (highIssues.length > 0) {
          await supabase.from("agent_pipelines").update({
            is_flagged: true,
            flag_reason: `Quality warning: ${complianceResult?.summary || "Needs review"}`,
          } as any).eq("id", pipelineId);
        }
      }

    // ========== STAGE: approval ==========
    } else if (stage === "approval") {
      // --- Smart Auto-Approve check ---
      const qualityOutput = pState.stages?.quality?.output;
      let smartAutoApproved = false;

      if (pipeline.autonomy_level === "human_in_loop" && pipeline.goal_id) {
        try {
          const { data: goalForRules } = await supabase
            .from("agent_goals")
            .select("clarification_context")
            .eq("id", pipeline.goal_id)
            .single();

          const autoRules = (goalForRules?.clarification_context as any)?.auto_approve_rules;
          if (autoRules?.enabled && qualityOutput) {
            const overallScore = qualityOutput.overall ?? 0;
            const geoScore = qualityOutput.geo?.overall_score ?? 0;
            const riskScore = qualityOutput.compliance?.risk_score ?? 0;
            const complianceStatus = qualityOutput.compliance?.status;

            const meetsQuality = overallScore >= (autoRules.min_quality ?? 70);
            const meetsGeo = geoScore >= (autoRules.min_geo ?? 60);
            const meetsRisk = riskScore <= (autoRules.max_risk ?? 30);
            const noBlockingCompliance = complianceStatus !== "blocked";

            if (meetsQuality && meetsGeo && meetsRisk && noBlockingCompliance) {
              smartAutoApproved = true;
              await supabase.from("agent_approvals").insert({
                pipeline_id: pipeline.id,
                organization_id: pipeline.organization_id,
                content_preview: pipeline.content_title,
                scores: qualityOutput,
                status: "auto_approved",
                decided_at: new Date().toISOString(),
                reviewer_notes: `Smart auto-approved: quality=${overallScore}≥${autoRules.min_quality}, geo=${geoScore}≥${autoRules.min_geo}, risk=${riskScore}≤${autoRules.max_risk}`,
              } as any);
              result.output = { auto_approved: true, mode: "smart_auto_approve", scores: { overall: overallScore, geo: geoScore, risk: riskScore } };
              console.log(`[approval] Smart auto-approved pipeline ${pipeline.id}: quality=${overallScore}, geo=${geoScore}, risk=${riskScore}`);
            }
          }
        } catch (e) {
          console.warn("[approval] Smart auto-approve check failed, falling back:", e);
        }
      }

      if (!smartAutoApproved && pipeline.autonomy_level === "human_in_loop") {
        // Check if approval record already exists
        const { data: existingApproval } = await supabase
          .from("agent_approvals")
          .select("id, status")
          .eq("pipeline_id", pipeline.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingApproval?.status === "approved") {
          // Already approved — auto-advance
          result.output = { already_approved: true, approval_id: existingApproval.id };
        } else if (existingApproval?.status === "pending") {
          // Waiting for human
          shouldAutoAdvance = false;
          result.output = { waiting_for: "human_approval", approval_id: existingApproval.id };
        } else {
          // Create new approval record
          const createOutput = pState.stages?.create?.output;

          const { data: newApproval, error: approvalInsertErr } = await supabase.from("agent_approvals").insert({
            pipeline_id: pipeline.id,
            organization_id: pipeline.organization_id,
            content_preview: createOutput?.title || pipeline.content_title || `Content: ${pipeline.content_title}`,
            channel_versions: {},
            scores: {
              geo: qualityOutput?.geo?.overall_score || null,
              compliance: qualityOutput?.compliance?.status || null,
              persona_fit: qualityOutput?.persona_fit?.overall || null,
              overall: qualityOutput?.overall || null,
              self_review: qualityOutput?.self_review?.overall || null,
            },
            status: "pending",
          } as any).select("id").single();

          if (approvalInsertErr) {
            console.error(`[approval] Failed to create approval record for pipeline ${pipeline.id}:`, JSON.stringify(approvalInsertErr));
          }

          shouldAutoAdvance = false;
          result.output = { waiting_for: "human_approval", approval_id: newApproval?.id };

          // Send notification
          try {
            const { data: orgMembers } = await supabase
              .from("organization_members")
              .select("user_id")
              .eq("organization_id", pipeline.organization_id)
              .in("role", ["owner", "admin"])
              .limit(5);

            if (orgMembers?.length) {
              const notifications = orgMembers.map((m: any) => ({
                user_id: m.user_id,
                organization_id: pipeline.organization_id,
                type: "agent_approval_pending",
                title: "Nội dung chờ duyệt",
                message: `"${pipeline.content_title}" đã sẵn sàng để bạn xem xét.`,
                data: { pipeline_id: pipeline.id, approval_id: newApproval?.id },
              }));
              await supabase.from("notifications").insert(notifications);
            }
          } catch (e) {
            console.warn("[approval] Notification failed:", e);
          }
        }
      } else if (!smartAutoApproved && pipeline.autonomy_level === "human_on_loop") {
        // Auto-approve but create a record for tracking
        await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: pipeline.content_title,
          scores: pState.stages?.quality?.output || {},
          status: "auto_approved",
          decided_at: new Date().toISOString(),
        } as any);
        result.output = { auto_approved: true, mode: "human_on_loop" };
      } else if (!smartAutoApproved) {
        // full_auto — skip entirely
        result.output = { auto_approved: true, mode: "full_auto" };
      }

    // ========== STAGE: publish ==========
    } else if (stage === "publish") {
      // Check scheduled time
      if (pipeline.scheduled_publish_at) {
        const scheduledAt = new Date(pipeline.scheduled_publish_at);
        if (scheduledAt > new Date()) {
          shouldAutoAdvance = false;
          result.output = { waiting_for: "scheduled_time", scheduled_at: pipeline.scheduled_publish_at };
          if (pState.stages?.[stage]) {
            pState.stages[stage].status = "pending";
          }
          await supabase.from("agent_pipelines")
            .update({ pipeline_state: pState } as any)
            .eq("id", pipeline.id);
          return { success: true, stage, result, duration_ms: Date.now() - startTime };
        }
      }

      // Resolve content and get org owner for auth
      const contentId = resolveContentId(pipeline, pState);
      const targetChannels = meta.target_channels || [];
      const publishResults: Record<string, any> = {};
      let successCount = 0;
      let failCount = 0;

      if (contentId && targetChannels.length > 0) {
        // Get org owner user_id for auth context
        let publishUserId: string | null = null;
        try {
          const { data: owner } = await supabase
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", orgId)
            .eq("role", "owner")
            .limit(1)
            .single();
          publishUserId = owner?.user_id || null;
        } catch { /* ignore */ }

        // === Fallback: create content_schedules if missing (older pipelines) ===
        const scheduleIds = (meta.schedule_ids || {}) as Record<string, string>;
        if (Object.keys(scheduleIds).length === 0 && pipeline.scheduled_publish_at) {
          console.log(`[publish] No schedule_ids in metadata, creating fallback schedules`);
          for (const ch of targetChannels) {
            try {
              const { data: fallbackSchedule } = await supabase
                .from("content_schedules")
                .insert({
                  content_id: contentId,
                  channel: ch,
                  organization_id: orgId,
                  scheduled_at: pipeline.scheduled_publish_at,
                  timezone: "Asia/Ho_Chi_Minh",
                  publish_status: "scheduled",
                  notes: `Auto-created fallback from pipeline: ${pipeline.content_title}`,
                  created_by: publishUserId,
                } as any)
                .select("id")
                .single();
              if (fallbackSchedule) {
                scheduleIds[ch] = fallbackSchedule.id;
              }
            } catch (e) {
              console.warn(`[publish] Fallback schedule creation failed for ${ch}:`, e);
            }
          }
          // Save back to metadata
          if (Object.keys(scheduleIds).length > 0) {
            pState.metadata.schedule_ids = scheduleIds;
            await supabase.from("agent_pipelines")
              .update({ pipeline_state: pState } as any)
              .eq("id", pipeline.id);
          }
        }

        // --- UTM Auto-Generator: fetch channel content texts ---
        const UTM_CHANNEL_COLUMN_MAP: Record<string, string> = {
          website: 'website_content', facebook: 'facebook_content',
          instagram: 'instagram_content', twitter: 'twitter_content',
          google_maps: 'google_maps_content', linkedin: 'linkedin_content',
          email: 'email_content', youtube: 'youtube_content',
          zalo_oa: 'zalo_oa_content', telegram: 'telegram_content',
          tiktok: 'tiktok_content', threads: 'threads_content',
        };
        const UTM_SOURCE_MAP: Record<string, string> = {
          facebook: 'facebook', instagram: 'instagram', twitter: 'twitter',
          linkedin: 'linkedin', zalo_oa: 'zalo', threads: 'threads',
          website: 'website', google_maps: 'google-maps', tiktok: 'tiktok',
          youtube: 'youtube', telegram: 'telegram', email: 'email',
        };

        let channelTexts: Record<string, string> = {};
        try {
          const columns = [...new Set(targetChannels.map((ch: string) => UTM_CHANNEL_COLUMN_MAP[ch]).filter(Boolean))];
          if (columns.length > 0) {
            const { data: mcc } = await supabase
              .from("multi_channel_contents")
              .select(columns.join(','))
              .eq("id", contentId)
              .single();
            if (mcc) {
              for (const ch of targetChannels) {
                const col = UTM_CHANNEL_COLUMN_MAP[ch];
                if (col && (mcc as any)[col]) {
                  channelTexts[ch] = String((mcc as any)[col]);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[publish] Failed to fetch channel texts for UTM:', e);
        }

        const campaignSlug = slugify(pipeline.content_title || meta.goal_name || 'campaign');

        for (const channel of targetChannels) {
          const scheduleId = scheduleIds[channel] || null;
          try {
            // Apply UTM to channel content text
            const rawText = channelTexts[channel] || '';
            const utmSource = UTM_SOURCE_MAP[channel] || channel;
            const enrichedText = rawText ? appendUtmToUrls(rawText, { source: utmSource, campaign: campaignSlug }) : '';

            const pubPayload: Record<string, any> = {
              action: channel,
              content_id: contentId,
              organization_id: orgId,
              pipeline_id: pipeline.id,
              user_id: publishUserId,
            };
            if (enrichedText) {
              pubPayload.content = enrichedText;
            }
            if (scheduleId) {
              pubPayload.scheduleId = scheduleId;
            }

            const pubResult = await callFunction(supabaseUrl, supabaseKey, "channel-publisher", pubPayload);
            publishResults[channel] = { success: true, ...pubResult };
            successCount++;

            // Update schedule status to published
            if (scheduleId) {
              await supabase.from("content_schedules")
                .update({
                  publish_status: "published",
                  published_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", scheduleId);
            }
          } catch (e) {
            console.warn(`[publish] ${channel} failed:`, e);
            publishResults[channel] = { success: false, error: e instanceof Error ? e.message : "Unknown" };
            failCount++;

            // Update schedule status to failed
            if (scheduleId) {
              await supabase.from("content_schedules")
                .update({
                  publish_status: "failed",
                  publish_error: e instanceof Error ? e.message : "Unknown error",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", scheduleId);
            }
          }
          // Stagger requests
          if (targetChannels.length > 1) await new Promise(r => setTimeout(r, 2000));
        }
      }

      result.output = {
        published: successCount > 0,
        results: publishResults,
        success_count: successCount,
        fail_count: failCount,
        total_channels: targetChannels.length,
      };

      // Flag if all channels failed
      if (targetChannels.length > 0 && successCount === 0) {
        await supabase.from("agent_pipelines").update({
          is_flagged: true,
          flag_reason: `Publishing failed on all ${failCount} channels`,
        } as any).eq("id", pipelineId);
      }

    // ========== STAGE: analyze ==========
    } else if (stage === "analyze") {
      const now = new Date().toISOString();

      // Mark pipeline as completed
      await supabase.from("agent_pipelines").update({
        completed_at: now,
      } as any).eq("id", pipeline.id);

      // Collect final summary
      const qualityOutput = pState.stages?.quality?.output || {};
      const publishOutput = pState.stages?.publish?.output || {};
      const selfReview = (pipeline.quality_scores as any)?.self_review || pState.stages?.create?.output?.self_review;

      const analysisSummary = {
        completed_at: now,
        content_type: contentType,
        quality_score: qualityOutput.overall || pipeline.overall_quality_score || null,
        geo_score: qualityOutput.geo?.overall_score || null,
        compliance_status: qualityOutput.compliance?.status || null,
        persona_fit: qualityOutput.persona_fit?.overall || null,
        self_review_score: selfReview?.overall || null,
        publish_success: publishOutput.success_count || 0,
        publish_fail: publishOutput.fail_count || 0,
        channels_published: Object.keys(publishOutput.results || {}).filter(
          (ch: string) => publishOutput.results[ch]?.success
        ),
      };

      // Update campaign plan progress if applicable
      if (pipeline.campaign_plan_id) {
        try {
          const { data: plan } = await supabase
            .from("campaign_content_plans")
            .select("plan_data, total_pieces, completed_pieces")
            .eq("id", pipeline.campaign_plan_id)
            .single();
          if (plan) {
            const newCompleted = (plan.completed_pieces || 0) + 1;
            const updateData: any = {
              completed_pieces: newCompleted,
              updated_at: now,
            };
            if (newCompleted >= (plan.total_pieces || 0)) {
              updateData.status = "completed";
            }
            const planData = (plan.plan_data as any[]) || [];
            const pieceIdx = planData.findIndex((p: any) => p.pipeline_id === pipeline.id);
            if (pieceIdx >= 0) {
              planData[pieceIdx].status = "completed";
              planData[pieceIdx].quality_score = analysisSummary.quality_score;
              updateData.plan_data = planData;
            }
            await supabase.from("campaign_content_plans").update(updateData).eq("id", pipeline.campaign_plan_id);
          }
        } catch (e) {
          console.warn("[analyze] Campaign plan update failed:", e);
        }
      }

      // Send completion notification
      try {
        const goalId = pipeline.goal_id;
        if (goalId) {
          const { data: goal } = await supabase.from("agent_goals").select("created_by").eq("id", goalId).single();
          if (goal?.created_by) {
            await supabase.from("notifications").insert({
              user_id: goal.created_by,
              organization_id: pipeline.organization_id,
              type: "agent_pipeline_completed",
              title: "Nội dung đã hoàn thành",
              message: `"${pipeline.content_title}" đã hoàn thành pipeline (Score: ${analysisSummary.quality_score || "N/A"}).`,
              data: { pipeline_id: pipeline.id, ...analysisSummary },
            });
          }
        }
      } catch (e) {
        console.warn("[analyze] Notification failed:", e);
      }

      result.output = analysisSummary;
      shouldAutoAdvance = false;
    }

  } catch (e) {
    // ========== RETRY LOGIC ==========
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const currentRetries = pState.stages?.[stage]?.retry_count || 0;

    if (currentRetries < MAX_RETRIES) {
      if (pState.stages?.[stage]) {
        pState.stages[stage].retry_count = currentRetries + 1;
        pState.stages[stage].last_error = errorMessage;
        pState.stages[stage].status = "retrying";
      }
      await supabase.from("agent_pipelines")
        .update({ pipeline_state: pState } as any)
        .eq("id", pipeline.id);

      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: stage,
        action: "retry_scheduled",
        output_summary: `Retry ${currentRetries + 1}/${MAX_RETRIES}: ${errorMessage}`,
        error_message: errorMessage,
      } as any);

      const delayMs = Math.pow(2, currentRetries) * 1000;
      await new Promise(r => setTimeout(r, delayMs));
      fireNextStage(supabaseUrl, supabaseKey, pipeline.id, stage);

      return { success: false, stage, retrying: true, retry_count: currentRetries + 1, error: errorMessage };
    }

    result.status = "failed";
    result.error = errorMessage;
    shouldAutoAdvance = false;

    if (pState.stages?.[stage]) {
      pState.stages[stage].status = "failed";
      pState.stages[stage].error = errorMessage;
      pState.stages[stage].retry_count = currentRetries;
    }

    await supabase.from("agent_pipelines")
      .update({
        pipeline_state: pState,
        is_flagged: true,
        flag_reason: `Stage "${stage}" failed after ${MAX_RETRIES} retries: ${errorMessage}`,
      } as any)
      .eq("id", pipeline.id);
  }

  const durationMs = Date.now() - startTime;

  // Save stage output to pipeline_state
  if (pState.stages?.[stage] && result.status !== "failed") {
    pState.stages[stage].output = result.output || null;
    pState.stages[stage].duration_ms = durationMs;
    pState.stages[stage].status = "completed";
    pState.stages[stage].completed_at = new Date().toISOString();
  }

  await supabase.from("agent_pipelines")
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

  // Auto-advance to next stage via fire-and-forget
  if (shouldAutoAdvance && result.status === "completed") {
    const currentIdx = STAGE_ORDER.indexOf(stage);
    if (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIdx + 1];
      const now = new Date().toISOString();

      if (pState.stages) {
        pState.stages[nextStage] = { ...(pState.stages[nextStage] || {}), status: "in_progress", started_at: now };
      }

      // If next stage is approval + human_in_loop, create approval record
      if (nextStage === "approval" && pipeline.autonomy_level === "human_in_loop") {
        const createOutput = pState.stages?.create?.output;
        const qualityOutput = pState.stages?.quality?.output;

        const { error: autoApprovalErr } = await supabase.from("agent_approvals").insert({
          pipeline_id: pipeline.id,
          organization_id: pipeline.organization_id,
          content_preview: createOutput?.content_preview || createOutput?.title || `Content: ${pipeline.content_title}`,
          channel_versions: {},
          scores: {
            geo: qualityOutput?.geo?.overall_score || null,
            compliance: qualityOutput?.compliance?.status || null,
            persona_fit: qualityOutput?.persona_fit?.overall || null,
            overall: qualityOutput?.overall || null,
          },
          status: "pending",
        } as any);

        if (autoApprovalErr) {
          console.error(`[auto-advance] Failed to create approval record for pipeline ${pipeline.id}:`, JSON.stringify(autoApprovalErr));
        }
      }

      const advanceUpdate: any = {
        current_stage: nextStage,
        pipeline_state: pState,
        stage_started_at: now,
        completed_at: nextStage === "analyze" ? now : null,
      };

      const contentIdForAdvance = resolveContentId(pipeline, pState);
      if (contentIdForAdvance) {
        advanceUpdate.content_id = contentIdForAdvance;
      }

      const { error: advanceError } = await supabase
        .from("agent_pipelines")
        .update(advanceUpdate)
        .eq("id", pipeline.id);

      if (advanceError) {
        console.error(`[advance] Failed to advance pipeline ${pipeline.id}:`, advanceError);
      }

      await supabase.from("agent_pipeline_logs").insert({
        pipeline_id: pipeline.id,
        agent_name: "orchestrator",
        action: "auto_advanced",
        input_summary: `From: ${stage}`,
        output_summary: `To: ${nextStage}`,
      } as any);

      if (!(nextStage === "approval" && pipeline.autonomy_level === "human_in_loop")) {
        // Stagger quality stage invocations to prevent concurrency overload
        if (nextStage === "quality") {
          const staggerDelay = Math.floor(Math.random() * 15000); // 0-15s random delay
          console.log(`[advance] Staggering quality stage fire by ${staggerDelay}ms for pipeline ${pipeline.id}`);
          setTimeout(() => {
            fireNextStage(supabaseUrl, supabaseKey, pipeline.id, nextStage);
          }, staggerDelay);
        } else {
          fireNextStage(supabaseUrl, supabaseKey, pipeline.id, nextStage);
        }
      }
    }
  }

  return { success: result.status === "completed", stage, result, duration_ms: durationMs };
}

/** Helper: save content_id to pipeline with RPC fallback */
async function saveContentId(supabase: any, pipeline: any, pState: any, contentId: string) {
  console.log(`[create] Saving content_id: ${contentId} to pipeline ${pipeline.id}`);

  const { error: cidError } = await supabase
    .from("agent_pipelines")
    .update({ content_id: contentId } as any)
    .eq("id", pipeline.id);

  if (cidError) {
    console.error(`[create] FAILED to save content_id:`, JSON.stringify(cidError));
    const { error: retryError } = await supabase.rpc("update_pipeline_content_id", {
      p_pipeline_id: pipeline.id,
      p_content_id: contentId,
    });
    if (retryError) {
      console.error("[create] RPC fallback also failed:", JSON.stringify(retryError));
    }
  }

  pState.content_id = contentId;
  if (pState.stages?.create) {
    pState.stages.create.content_id = contentId;
  }
}

/** Helper: fetch content text for quality scoring based on content_type */
async function fetchContentText(supabase: any, contentId: string | null, contentType: string, pState: any): Promise<string> {
  // Try fetching from database first
  if (contentId) {
    if (contentType === "multichannel") {
      // For multichannel: query multi_channel_contents first, aggregate all channel texts (same as manual flow)
      const { data: mcc } = await supabase
        .from("multi_channel_contents")
        .select("title, facebook_content, website_content, instagram_content, linkedin_content, twitter_content, tiktok_content, threads_content, email_content")
        .eq("id", contentId)
        .single();
      if (mcc) {
        const channelTexts = [
          mcc.facebook_content,
          mcc.website_content,
          mcc.instagram_content,
          mcc.linkedin_content,
          mcc.twitter_content,
          mcc.tiktok_content,
          mcc.threads_content,
          mcc.email_content,
        ].filter(Boolean);
        if (channelTexts.length > 0) {
          const combined = `${mcc.title || ""}\n\n${channelTexts.join("\n\n")}`;
          return combined.slice(0, 10000);
        }
      }
      // Fallback: try core_contents if MCC not found (legacy case)
      const { data: cc } = await supabase.from("core_contents").select("title, content").eq("id", contentId).single();
      if (cc?.content) return `${cc.title || ""}\n\n${cc.content}`;
    }
    if (contentType === "core_content") {
      const { data: cc } = await supabase.from("core_contents").select("title, content").eq("id", contentId).single();
      if (cc?.content) return `${cc.title || ""}\n\n${cc.content}`;
    }
    if (contentType === "video_script") {
      const { data: script } = await supabase.from("video_scripts").select("title, script_content").eq("id", contentId).single();
      if (script?.script_content) return `${script.title || ""}\n\n${typeof script.script_content === 'string' ? script.script_content : JSON.stringify(script.script_content)}`;
    }
    if (contentType === "carousel") {
      const { data: carousel } = await supabase.from("carousels").select("title, slides_data").eq("id", contentId).single();
      if (carousel?.slides_data) {
        const slides = Array.isArray(carousel.slides_data) ? carousel.slides_data : [];
        const slidesText = slides.map((s: any, i: number) => `Slide ${i + 1}: ${typeof s.textContent === 'string' ? s.textContent : s.headline || JSON.stringify(s)}`).join("\n");
        return `${carousel.title || ""}\n\n${slidesText}`;
      }
    }
  }

  // Fallback: extract from pipeline_state create output
  const createOutput = pState.stages?.create?.output;
  if (createOutput) {
    return createOutput.content || createOutput.article || createOutput.script || JSON.stringify(createOutput.slides || "N/A").slice(0, 3000);
  }
  return "";
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
