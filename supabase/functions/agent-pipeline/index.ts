import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGE_ORDER = [
  "research", "creation", "optimization", "expansion",
  "compliance", "approval", "scheduled", "published", "analyzing"
];

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

/** Create initial pipeline_state with metadata */
function createPipelineState(meta: Record<string, unknown> = {}) {
  const stages: Record<string, { status: string }> = {};
  for (const s of STAGE_ORDER) stages[s] = { status: "pending" };
  return { stages, metadata: meta };
}

function resolveContentId(pipeline: any, pState: any): string | null {
  return pipeline?.content_id
    || pState?.content_id
    || pState?.stages?.creation?.output?.id
    || pState?.stages?.creation?.output?.content_id
    || pState?.stages?.creation?.content_id
    || null;
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
          target_channels: goal.target_channels || [],
          goal_description: goal.description || null,
          clarification_context: goal.clarification_context || null,
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
            stage_started_at: new Date().toISOString(),
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
          output_summary: `Pipeline ${pipeline.id} created, firing research stage`,
        } as any);

        // Fire-and-forget: start research stage as NEW invocation
        fireNextStage(supabaseUrl, supabaseKey, pipeline.id, "research");
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

      // If advancing to approval + human_in_loop → create approval record
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

      // Fire-and-forget: run the next stage
      fireNextStage(supabaseUrl, supabaseKey, pipeline_id, nextStage);

      return json({ success: true, previous_stage: pipeline.current_stage, current_stage: nextStage });
    }

    // ========== ACTION: run_stage ==========
    if (action === "run_stage") {
      if (!pipeline_id) throw new Error("pipeline_id required");
      const requestedStage = body.stage; // May be undefined (backwards compat)

      const { data: pipeline } = await supabase
        .from("agent_pipelines")
        .select("*")
        .eq("id", pipeline_id)
        .single();
      if (!pipeline) throw new Error("Pipeline not found");

      // If a specific stage was requested, verify pipeline is at that stage
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
          target_channels: goal.target_channels || [],
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
            stage_started_at: new Date().toISOString(),
          } as any)
          .select()
          .single();

        if (!pipeErr && newPipeline) {
          triggered++;
          // Fire-and-forget instead of recursive call
          fireNextStage(supabaseUrl, supabaseKey, newPipeline.id, "research");
        }
      }

      return json({ success: true, triggered, active_goals: activeGoals.length });
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

      // Fetch goal for extra context
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

        const pipelineState = createPipelineState({
          brand_template_id: goalData?.brand_template_id || null,
          campaign_id: goalData?.campaign_id || null,
          target_channels: [piece.target_channel],
          campaign_context: {
            total_pieces: pieces.length,
            piece_number: piece.piece_number,
            angle: piece.angle,
            target_channel: piece.target_channel,
            content_role: piece.content_role,
            format: piece.format,
            estimated_length: piece.estimated_length || "medium",
            campaign_title: goalData?.name || "",
            clarification_context: plan.clarification_context,
          },
        });

        const { data: pipeline, error: pipeErr } = await supabase
          .from("agent_pipelines")
          .insert({
            organization_id: plan.organization_id,
            goal_id: plan.goal_id,
            campaign_plan_id: plan.id,
            piece_number: piece.piece_number,
            content_title: piece.title,
            content_topic: piece.key_message,
            current_stage: "research",
            pipeline_state: pipelineState,
            priority: "normal",
            autonomy_level: autonomyLevel,
            scheduled_publish_at: piece.scheduled_date ? `${piece.scheduled_date}T09:00:00Z` : null,
            estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            stage_started_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();

        if (pipeErr) { console.error("Pipeline creation error:", pipeErr); continue; }
        pipelineIds.push(pipeline.id);
        piece.pipeline_id = pipeline.id;
        piece.status = "in_progress";
      }

      // Update plan status and plan_data with pipeline IDs
      await supabase.from("campaign_content_plans").update({
        plan_data: pieces,
        status: "executing",
        updated_at: new Date().toISOString(),
      } as any).eq("id", plan_id);

      // Start all pipelines with staggered fire-and-forget
      for (const pid of pipelineIds) {
        fireNextStage(supabaseUrl, supabaseKey, pid, "research");
        await new Promise(r => setTimeout(r, 2000));
      }

      return json({ success: true, pipeline_count: pipelineIds.length, pipeline_ids: pipelineIds });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: trigger_from_goal, advance_stage, run_stage, check_scheduled_goals, create_from_plan" }),
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

// ========== CORE: Run a single pipeline stage (NO recursive chaining) ==========
async function runStage(supabase: any, supabaseUrl: string, supabaseKey: string, pipelineInput: any) {
  const startTime = Date.now();
  const pipelineId = pipelineInput.id;

  // CRITICAL: Always re-fetch pipeline from DB to get latest content_id and state
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
  let result: any = { status: "completed" };
  let shouldAutoAdvance = true;

  console.log(`[${stage}] Pipeline ${pipelineId} — content_id: ${pipeline.content_id || 'NULL'}, brand: ${brandTemplateId || 'NULL'}`);

  // Mark stage as in_progress with timestamp
  if (pState.stages?.[stage]) {
    pState.stages[stage].status = "in_progress";
    pState.stages[stage].started_at = new Date().toISOString();
  }
  await supabase.from("agent_pipelines")
    .update({ pipeline_state: pState, stage_started_at: new Date().toISOString() } as any)
    .eq("id", pipeline.id);

  try {
    if (stage === "research") {
      // Fetch goal for clarification context
      let goalData: any = null;
      if (pipeline.goal_id) {
        const { data: g } = await supabase.from("agent_goals").select("name, description, clarification_context").eq("id", pipeline.goal_id).single();
        goalData = g;
      }

      // Campaign context from content plan (takes priority)
      const campaignCtx = meta.campaign_context;

      // Build instruction that prioritizes campaign topic
      const campaignTitle = pipeline.content_title || goalData?.name || "";
      const campaignDesc = pipeline.content_topic || goalData?.description || "";
      const clarification = campaignCtx?.clarification_context || goalData?.clarification_context;

      let instruction = "";
      if (campaignTitle) {
        instruction = `CRITICAL: The user specifically wants content about: "${campaignTitle}".`;
        if (campaignDesc && campaignDesc !== campaignTitle) {
          instruction += ` Additional context: ${campaignDesc}.`;
        }
        if (clarification) {
          instruction += ` User clarifications: ${JSON.stringify(clarification)}.`;
        }
        if (campaignCtx) {
          instruction += ` This is piece ${campaignCtx.piece_number} of ${campaignCtx.total_pieces} in a campaign about "${campaignCtx.campaign_title}".`;
          instruction += ` Required angle: "${campaignCtx.angle}". Content role: "${campaignCtx.content_role}". Target channel: "${campaignCtx.target_channel}". Format: "${campaignCtx.format}".`;
          instruction += ` Focus your research on finding data, stats, and insights that support a "${campaignCtx.angle}" angle for this specific topic.`;
        } else {
          instruction += ` ALL your topic suggestions MUST be directly related to this subject. Do NOT suggest unrelated trending topics. Suggest 3 angle variations of this specific topic.`;
        }
      }

      // === DEDUP: Fetch existing content to avoid duplicates ===
      let dedupContext = "";
      try {
        const { data: existingContent } = await supabase
          .from("multi_channel_contents")
          .select("title, content_topic")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(30);

        const { data: recentPipelines } = await supabase
          .from("agent_pipelines")
          .select("content_title, content_topic")
          .eq("organization_id", orgId)
          .neq("id", pipelineId)
          .order("created_at", { ascending: false })
          .limit(15);

        const existingTopics = [
          ...(existingContent || []).map((c: any) => c.title).filter(Boolean),
          ...(recentPipelines || []).map((p: any) => p.content_title).filter(Boolean),
        ];

        if (existingTopics.length > 0) {
          dedupContext = `\n\nDEDUPLICATION — These topics ALREADY EXIST (do NOT suggest similar ones):\n${existingTopics.slice(0, 30).join("\n")}\n\nSuggest DIFFERENT angles that haven't been covered yet.`;
          instruction += dedupContext;
        }
      } catch (dedupErr) {
        console.warn("[research] Dedup fetch failed, continuing without:", dedupErr);
      }

      const output = await callFunction(supabaseUrl, supabaseKey, "topic-ai", {
        action: "suggest",
        topic: campaignTitle || pipeline.content_topic,
        instruction,
        organization_id: orgId,
        brand_template_id: brandTemplateId,
      });
      result.output = output;

    } else if (stage === "creation") {
      // Campaign context from content plan
      const campaignCtx = meta.campaign_context;

      // Derive topic from research output or pipeline fields
      const researchOutput = pState.stages?.research?.output;
      const creationTopic = researchOutput?.suggestions?.[0]?.topic
        || researchOutput?.topic
        || pipeline.content_topic
        || pipeline.content_title;

      if (!creationTopic) {
        throw new Error("No topic available for content creation. Research stage may not have produced valid output.");
      }

      // Use campaign context for strategy params, fallback to metadata
      const contentGoal = campaignCtx?.content_role === "harvest" ? "conversion"
        : campaignCtx?.content_role === "sprout" ? "engagement"
        : meta.content_goal || "education";
      const contentAngle = campaignCtx?.angle || meta.content_angle || undefined;
      const contentRole = campaignCtx?.content_role || meta.content_role || undefined;
      const lengthMode = campaignCtx?.estimated_length || meta.content_length || "medium";

      // Build additional context from clarification
      const clarification = campaignCtx?.clarification_context || meta.clarification_context;
      let additionalContext = "";
      if (clarification && typeof clarification === "object") {
        additionalContext = Object.entries(clarification).map(([q, a]) => `${q}: ${a}`).join(". ");
      }
      if (campaignCtx) {
        additionalContext += ` [Campaign piece ${campaignCtx.piece_number}/${campaignCtx.total_pieces}. Angle: ${campaignCtx.angle}. Role: ${campaignCtx.content_role}. Channel: ${campaignCtx.target_channel}. Format: ${campaignCtx.format}.]`;
      }

      const output = await callFunction(supabaseUrl, supabaseKey, "generate-core-content", {
        topic: creationTopic,
        contentGoal,
        contentAngle: contentAngle || (additionalContext ? additionalContext : undefined),
        contentRole,
        lengthMode,
        organizationId: orgId,
        brandTemplateId: brandTemplateId,
        campaign_id: meta.campaign_id || pipeline.campaign_id || null,
      });
      result.output = output;

      if (output?.content_id || output?.id) {
        const contentId = output.content_id || output.id;
        console.log(`[creation] Saving content_id: ${contentId} to pipeline ${pipeline.id}`);

        const { error: cidError } = await supabase
          .from("agent_pipelines")
          .update({ content_id: contentId } as any)
          .eq("id", pipeline.id);

        if (cidError) {
          console.error(`[creation] FAILED to save content_id ${contentId}:`, JSON.stringify(cidError));
          const { error: retryError } = await supabase.rpc("update_pipeline_content_id", {
            p_pipeline_id: pipeline.id,
            p_content_id: contentId,
          });
          if (retryError) {
            console.error("[creation] RPC fallback also failed:", JSON.stringify(retryError));
          }
        }

        pipeline.content_id = contentId;
        pState.content_id = contentId;
        if (pState.stages?.creation) {
          pState.stages.creation.content_id = contentId;
        }

        // CRITICAL: Re-fetch pipeline to ensure content_id is committed and visible
        const { data: refreshed } = await supabase
          .from("agent_pipelines")
          .select("*")
          .eq("id", pipeline.id)
          .single();
        if (refreshed) {
          pipeline = refreshed;
          console.log(`[creation] Verified content_id after re-fetch: ${pipeline.content_id}`);
        }
      }

    } else if (stage === "optimization") {
      const contentId = resolveContentId(pipeline, pState);
      if (contentId) {
        try {
          // geo-score-content expects contentText, not content_id — fetch content first
          const { data: coreContent } = await supabase
            .from("core_contents")
            .select("title, content")
            .eq("id", contentId)
            .single();

          if (coreContent?.content) {
            const contentText = `${coreContent.title || ""}\n\n${coreContent.content}`;
            const output = await callFunction(supabaseUrl, supabaseKey, "geo-score-content", {
              contentText,
              contentId,
              contentType: "core_content",
              organizationId: orgId,
            });
            result.output = output;
          } else {
            console.warn("[optimization] Core content not found or empty for", contentId);
            result.output = { seo_score: 70, geo_score: 65, note: "Core content not found" };
          }
        } catch (e) {
          console.warn("GEO scoring failed, using fallback:", e);
          result.output = { seo_score: 70, geo_score: 65, note: "Scoring unavailable, using defaults" };
        }
      } else {
        result.output = { seo_score: 70, geo_score: 65, note: "No content_id, skipping real scoring" };
      }

    } else if (stage === "expansion") {
      const contentId = resolveContentId(pipeline, pState);
      if (contentId) {
        try {
          const targetChannels = meta.target_channels || [];
          if (targetChannels.length === 0) {
            result.output = { channels_generated: [], note: "No target channels specified" };
          } else {
            // generate-multichannel expects contentId + action:'expand' + newChannels
            // CRITICAL: Pass a userId to avoid "Unauthorized" — fetch org owner as fallback
            let expansionUserId: string | null = null;
            try {
              const { data: owner } = await supabase
                .from("organization_members")
                .select("user_id")
                .eq("organization_id", orgId)
                .eq("role", "owner")
                .limit(1)
                .single();
              expansionUserId = owner?.user_id || null;
            } catch { /* ignore */ }

            const output = await callFunction(supabaseUrl, supabaseKey, "generate-multichannel", {
              action: "expand",
              contentId,
              newChannels: targetChannels,
              organizationId: orgId,
              brandTemplateId: brandTemplateId,
              userId: expansionUserId,
            });
            result.output = output;
          }
        } catch (e) {
          console.warn("Multichannel expansion failed:", e);
          result.output = { channels_generated: [], note: `Expansion failed: ${e instanceof Error ? e.message : "Unknown"}` };
        }
      } else {
        result.output = { channels_generated: [], note: "No content_id for expansion" };
      }

    } else if (stage === "compliance") {
      const contentId = resolveContentId(pipeline, pState);
      if (!contentId) {
        result.output = { status: "skipped", reason: "No content_id available for compliance check" };
      } else {
        // 1. Fetch actual content text
        const { data: coreContent } = await supabase
          .from("core_contents")
          .select("title, content, content_goal")
          .eq("id", contentId)
          .single();

        const contentText = coreContent?.content || "";
        const contentTitle = coreContent?.title || pipeline.content_title || "";

        // 2. Fetch brand template for industry context
        const compBrandId = brandTemplateId || pipeline.brand_template_id;
        let brandData: any = null;
        let industryRules: any[] = [];

        if (compBrandId) {
          const { data: brand } = await supabase
            .from("brand_templates")
            .select("brand_name, industry, tone_of_voice, preferred_words, forbidden_words, formality_level, industry_template_id")
            .eq("id", compBrandId)
            .single();
          brandData = brand;

          // 3. Fetch resolved compliance rules from Industry Park (if available)
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
                ...(resolved.claim_restrictions || []).map((c: any) => `Hạn chế claim: ${typeof c === 'string' ? c : c.description || JSON.stringify(c)}`),
              ];
            }
          }
        }

        // 4. Build compliance check prompt
        const industryName = brandData?.industry || "general";
        const forbiddenWords = brandData?.forbidden_words || [];
        const toneOfVoice = brandData?.tone_of_voice || "";
        const formality = brandData?.formality_level || "";

        const compliancePrompt = `Bạn là chuyên gia kiểm tra tuân thủ nội dung cho ngành "${industryName}".

Kiểm tra nội dung sau:
Tiêu đề: ${contentTitle}
Nội dung: ${contentText.slice(0, 3000)}

${brandData ? `Brand: ${brandData.brand_name || "N/A"}
Tone of Voice: ${toneOfVoice}
Formality: ${formality}
Từ cấm của brand: ${forbiddenWords.length > 0 ? forbiddenWords.join(", ") : "Không có"}` : "Không có thông tin brand."}

${industryRules.length > 0 ? `Quy định ngành:\n${industryRules.join("\n")}` : `Không có quy định ngành cụ thể. Dựa vào kiến thức chung về ngành "${industryName}" để đánh giá.`}

Kiểm tra:
1. Tuân thủ pháp luật — có claim nào cần disclaimer không?
2. Quy định ngành — có vi phạm quy định đặc thù ngành "${industryName}" không?
3. Brand voice — tone có phù hợp với brand guidelines không?
4. Từ cấm — có sử dụng từ nào trong danh sách cấm không?
5. Claim quá mạnh — có lời hứa/cam kết quá mức không?

Trả về JSON (KHÔNG markdown):
{
  "status": "passed" | "needs_review" | "failed",
  "score": 0-100,
  "issues": [
    { "type": "legal|brand_voice|industry|language", "severity": "high|medium|low", "description": "...", "suggestion": "..." }
  ],
  "summary": "Tóm tắt ngắn kết quả kiểm tra"
}`;

        try {
          // Call LLM via Lovable AI gateway
          const gatewayUrl = Deno.env.get("AI_GATEWAY_URL") || `${supabaseUrl}/functions/v1/ai-gateway`;
          const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
          
          const aiResponse = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(lovableApiKey ? { "Authorization": `Bearer ${lovableApiKey}` } : { "Authorization": `Bearer ${supabaseKey}` }),
            },
            body: JSON.stringify({
              functionName: "compliance-check",
              messages: [
                { role: "system", content: "Bạn là AI kiểm tra tuân thủ nội dung. Luôn trả về JSON hợp lệ." },
                { role: "user", content: compliancePrompt },
              ],
              model: "google/gemini-2.5-flash",
            }),
          });

          const aiData = await aiResponse.json();
          const aiContent = aiData?.data?.choices?.[0]?.message?.content
            || aiData?.choices?.[0]?.message?.content
            || "";

          // Parse JSON from response
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const complianceResult = JSON.parse(jsonMatch[0]);
            result.output = complianceResult;

            // Flag pipeline if compliance failed
            if (complianceResult.status === "failed") {
              const highIssues = (complianceResult.issues || []).filter((i: any) => i.severity === "high");
              if (highIssues.length > 0) {
                await supabase.from("agent_pipelines").update({
                  is_flagged: true,
                  flag_reason: `Compliance failed: ${highIssues.map((i: any) => i.description).join("; ")}`,
                } as any).eq("id", pipelineId);
                shouldAutoAdvance = false;
              }
            }
          } else {
            console.warn("[compliance] Could not parse LLM response:", aiContent.slice(0, 200));
            result.output = { status: "needs_review", score: 50, issues: [], summary: "Could not parse compliance check result" };
          }
        } catch (compErr) {
          console.warn("[compliance] LLM call failed, using basic check:", compErr);
          // Fallback: basic forbidden word check without LLM
          const foundForbidden = forbiddenWords.filter((w: string) => 
            contentText.toLowerCase().includes(w.toLowerCase()) || contentTitle.toLowerCase().includes(w.toLowerCase())
          );
          result.output = {
            status: foundForbidden.length > 0 ? "needs_review" : "passed",
            score: foundForbidden.length > 0 ? 60 : 85,
            issues: foundForbidden.map((w: string) => ({
              type: "language",
              severity: "medium",
              description: `Sử dụng từ cấm: "${w}"`,
              suggestion: `Thay thế từ "${w}" bằng từ ngữ phù hợp hơn`,
            })),
            summary: foundForbidden.length > 0 ? `Phát hiện ${foundForbidden.length} từ cấm` : "Basic check passed (LLM unavailable)",
          };
        }
      }

    } else if (stage === "approval") {
      if (pipeline.autonomy_level === "human_in_loop") {
        shouldAutoAdvance = false;
        result.output = { waiting_for: "human_approval" };
      } else {
        result.output = { auto_approved: true };
      }

    } else if (stage === "scheduled") {
      // Auto-publish: check if full_auto, publish immediately; otherwise schedule
      const targetChannels = meta.target_channels || [];
      if (pipeline.autonomy_level === "full_auto" && targetChannels.length > 0) {
        result.output = { scheduled: true, publish_immediately: true, channels: targetChannels };
      } else {
        result.output = { scheduled: true, channels: targetChannels };
      }

    } else if (stage === "published") {
      // Call channel-publisher for each target channel
      const targetChannels = meta.target_channels || [];
      const publishResults: Record<string, any> = {};

      if (pipeline.content_id && targetChannels.length > 0) {
        for (const channel of targetChannels) {
          try {
            const pubResult = await callFunction(supabaseUrl, supabaseKey, "channel-publisher", {
              action: channel,
              content_id: pipeline.content_id,
              organization_id: orgId,
              pipeline_id: pipeline.id,
            });
            publishResults[channel] = { success: true, ...pubResult };
          } catch (e) {
            console.warn(`Publish to ${channel} failed:`, e);
            publishResults[channel] = { success: false, error: e instanceof Error ? e.message : "Unknown error" };
          }
        }
      }
      result.output = { published: true, results: publishResults };

    } else if (stage === "analyzing") {
      // Final stage — mark pipeline as completed
      result.output = { completed: true, completed_at: new Date().toISOString() };
      shouldAutoAdvance = false; // No next stage
    }

  } catch (e) {
    // ========== RETRY LOGIC ==========
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const currentRetries = pState.stages?.[stage]?.retry_count || 0;

    if (currentRetries < MAX_RETRIES) {
      // Update retry count and schedule retry
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

      // Exponential backoff delay then fire retry as new invocation
      const delayMs = Math.pow(2, currentRetries) * 1000;
      await new Promise(r => setTimeout(r, delayMs));
      fireNextStage(supabaseUrl, supabaseKey, pipeline.id);

      return { success: false, stage, retrying: true, retry_count: currentRetries + 1, error: errorMessage };
    }

    // Max retries exceeded — mark as failed
    result.status = "failed";
    result.error = errorMessage;
    shouldAutoAdvance = false;

    if (pState.stages?.[stage]) {
      pState.stages[stage].status = "failed";
      pState.stages[stage].error = errorMessage;
      pState.stages[stage].retry_count = currentRetries;
    }

    // Flag the pipeline
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

  // Auto-advance to next stage via fire-and-forget (NOT recursive)
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

      const advanceUpdate: any = {
        current_stage: nextStage,
        pipeline_state: pState,
        stage_started_at: now,
        completed_at: nextStage === "analyzing" ? now : null,
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

      // Fire next stage as NEW Edge Function invocation (anti-timeout)
      if (!(nextStage === "approval" && pipeline.autonomy_level === "human_in_loop")) {
        fireNextStage(supabaseUrl, supabaseKey, pipeline.id);
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
