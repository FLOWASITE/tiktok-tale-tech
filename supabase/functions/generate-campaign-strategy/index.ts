import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { callAIWithMetrics, getProviderFromModel } from "../_shared/ai-provider.ts";
import { isCircuitOpen } from "../_shared/circuit-breaker.ts";
import { getGatewayConfig } from "../_shared/lovable-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIECE_HARD_CAP = 200;

function calculatePieceCount(
  durationDays: number,
  targetCount?: number | null,
): { min: number; max: number } {
  if (typeof targetCount === "number" && Number.isFinite(targetCount) && targetCount >= 1) {
    const clamped = Math.min(PIECE_HARD_CAP, Math.max(1, Math.round(targetCount)));
    // ±10% tolerance, but at least ±2 to give AI breathing room
    const tol = Math.max(2, Math.round(clamped * 0.1));
    return { min: Math.max(1, clamped - tol), max: Math.min(PIECE_HARD_CAP, clamped + tol) };
  }
  if (durationDays <= 7) return { min: 3, max: 4 };
  if (durationDays <= 14) return { min: 5, max: 7 };
  if (durationDays <= 30) return { min: 8, max: 12 };
  return { min: 10, max: 15 };
}

function buildStrategyPrompt(params: {
  title: string;
  description: string;
  clarificationContext: Record<string, unknown> | null;
  brandName: string;
  industry: string;
  brandVoice: string;
  channels: string[];
  durationDays: number;
  startDate: string;
  pieceCount: { min: number; max: number };
  existingTitles: string[];
  targetPostCount?: number | null;
  perChannelTargets?: Record<string, number> | null;
  topicPool?: Array<{
    title: string;
    hook?: string;
    key_message?: string;
    pillar?: string;
    category?: string;
    scores?: Record<string, number>;
  }> | null;
}): string {
  const clarificationStr = params.clarificationContext
    ? Object.entries(params.clarificationContext)
        .filter(([k]) => !['key_messages', 'primary_cta', 'pillar_allocation', 'objectives', 'primary_objective', 'secondary_objectives', 'objective', 'objective_weights'].includes(k))
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "Không có thông tin bổ sung";

  // Extract brief fields from clarification context
  const ctx = params.clarificationContext || {};
  const keyMessages = Array.isArray(ctx.key_messages) ? ctx.key_messages as string[] : [];
  const primaryCta = typeof ctx.primary_cta === 'string' ? ctx.primary_cta : '';
  const pillarAllocation = (ctx.pillar_allocation && typeof ctx.pillar_allocation === 'object' && !Array.isArray(ctx.pillar_allocation))
    ? ctx.pillar_allocation as Record<string, number>
    : null;

  // Multi-objective with Primary 70% / Secondary 30% weighting
  const objectivesArr = Array.isArray(ctx.objectives) ? ctx.objectives as string[] : [];
  const primaryObjective = typeof ctx.primary_objective === 'string' && ctx.primary_objective
    ? ctx.primary_objective
    : (objectivesArr[0] || (typeof ctx.objective === 'string' ? ctx.objective : ''));
  const secondaryObjectives = Array.isArray(ctx.secondary_objectives)
    ? ctx.secondary_objectives as string[]
    : objectivesArr.slice(1);

  let briefSection = '';
  if (keyMessages.length > 0) {
    briefSection += `\nKEY MESSAGES (weave these into content naturally):\n${keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n`;
  }
  if (primaryCta) {
    briefSection += `\nPRIMARY CTA (use in harvest/conversion pieces): "${primaryCta}"\n`;
  }
  if (pillarAllocation) {
    const totalPieces = Math.round((params.pieceCount.min + params.pieceCount.max) / 2);
    const pillarLines = Object.entries(pillarAllocation)
      .map(([name, pct]) => `- ${name}: ${pct}% (~${Math.round(totalPieces * (pct as number) / 100)} pieces)`)
      .join("\n");
    briefSection += `\nCONTENT PILLAR DISTRIBUTION (MUST follow these percentages):\n${pillarLines}\nEach piece MUST have a "pillar" field matching one of these pillar names.\n`;
  }

  // Build OBJECTIVE WEIGHTING block + dynamic role tilt
  let objectivesSection = '';
  let roleDistributionHint = 'Seed ~40% / Sprout ~35% / Harvest ~25%';
  if (primaryObjective) {
    const norm = primaryObjective.toLowerCase();
    if (norm.includes('aware') || norm.includes('nhận biết') || norm.includes('engage') || norm.includes('tương tác')) {
      roleDistributionHint = 'Seed ~50% / Sprout ~35% / Harvest ~15% (top-funnel tilt)';
    } else if (norm.includes('traffic') || norm.includes('lead') || norm.includes('thu thập')) {
      roleDistributionHint = 'Seed ~30% / Sprout ~35% / Harvest ~35% (mid-funnel balance)';
    } else if (norm.includes('revenue') || norm.includes('doanh thu') || norm.includes('conversion') || norm.includes('chuyển đổi')) {
      roleDistributionHint = 'Seed ~25% / Sprout ~30% / Harvest ~45% (bottom-funnel tilt)';
    } else if (norm.includes('retention') || norm.includes('giữ chân')) {
      roleDistributionHint = 'Seed ~20% / Sprout ~50% / Harvest ~30% (loyalty tilt)';
    }
    objectivesSection = `\nCAMPAIGN OBJECTIVES (weighted):
- PRIMARY: ${primaryObjective} → drives 70% of pieces (tone, CTA strength, content_role distribution)
- SECONDARY: ${secondaryObjectives.length ? secondaryObjectives.join(', ') + ' → 30% as supporting angles' : '(none)'}

OBJECTIVE WEIGHTING RULES:
- ~70% of pieces MUST directly serve the PRIMARY objective in hook + CTA.
- ~30% may serve secondary objectives as bridge content (awareness → engagement → conversion funnel logic).
- NEVER let secondary objectives dilute the primary message.
- Recommended content_role split for THIS primary: ${roleDistributionHint}
`;
  }
  briefSection += objectivesSection;

  const dedupStr = params.existingTitles.length > 0
    ? `\n\nDEDUPLICATION — These topics ALREADY EXIST (do NOT suggest similar ones):\n${params.existingTitles.join("\n")}\nSuggest DIFFERENT angles.`
    : "";

  return `You are a content strategist. Create a content campaign plan based on:

Campaign: ${params.title}
Description: ${params.description || "Không có mô tả chi tiết"}
Target audience context:
${clarificationStr}
Brand: ${params.brandName} in ${params.industry}
Available channels: ${params.channels.join(", ")}
Duration: ${params.durationDays} days starting ${params.startDate}
Brand voice: ${params.brandVoice || "professional, friendly"}
${briefSection}
${(() => {
  const tgt = params.targetPostCount;
  const perCh = params.perChannelTargets;
  if (!tgt || tgt < 1) return '';
  const lines: string[] = [];
  lines.push(`\nPOST COUNT TARGET (CRITICAL — must follow):`);
  lines.push(`- Total pieces: EXACTLY ${tgt} (acceptable range ${params.pieceCount.min}-${params.pieceCount.max}).`);
  lines.push(`- Do NOT return fewer than ${params.pieceCount.min} or more than ${params.pieceCount.max} pieces.`);
  if (perCh && Object.keys(perCh).length > 0) {
    lines.push(`\nCHANNEL DISTRIBUTION (MUST match these counts ±1):`);
    Object.entries(perCh).forEach(([ch, n]) => lines.push(`- ${ch}: ${n} pieces`));
  }
  return lines.join('\n') + '\n';
})()}
${(() => {
  const pool = params.topicPool;
  if (!pool || pool.length === 0) return '';
  const lines: string[] = [];
  lines.push(`\nTOPIC POOL (CRITICAL — MUST pick titles FROM THIS POOL):`);
  lines.push(`These topics were curated by Topic AI (scoring, trending, brand context). They are the source of truth for "title" of each piece.`);
  lines.push(`Rules:`);
  lines.push(`- For each piece, set "title" = a topic from the pool below (use verbatim; light copy-edit ≤15% words OK).`);
  lines.push(`- Set "pool_index" = the [NN] number of the topic you picked.`);
  lines.push(`- Prefer each pool topic AT MOST ONCE. If pool < total pieces, you MAY reuse a topic with a DIFFERENT angle/channel (same pool_index, distinct title wording).`);
  lines.push(`- DO NOT invent titles outside the pool. If a topic doesn't fit, skip it.`);
  lines.push(`- If pool key_message exists, use it as a strong hint for the piece's key_message.`);
  lines.push(`\nPool (${pool.length} topics, sorted by quality):`);
  pool.forEach((t, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const score = t.scores?.overall ?? t.scores?.score ?? null;
    const scorePart = typeof score === 'number' ? ` [score ${Math.round(score)}]` : '';
    const hookPart = t.hook ? ` — hook: ${t.hook}` : '';
    const kmPart = t.key_message ? ` — km: ${t.key_message}` : '';
    const pillarPart = t.pillar ? ` — pillar: ${t.pillar}` : '';
    lines.push(`[${idx}]${scorePart} ${t.title}${hookPart}${kmPart}${pillarPart}`);
  });
  return lines.join('\n') + '\n';
})()}
RULES:
1. Create EXACTLY ${params.targetPostCount ?? `${params.pieceCount.min}-${params.pieceCount.max}`} content pieces spread across the campaign duration${params.targetPostCount ? ` (tolerance ${params.pieceCount.min}-${params.pieceCount.max})` : ''}.${params.topicPool && params.topicPool.length > 0 ? ' Every piece title MUST come from the TOPIC POOL above.' : ''}

2. Each piece must have a DIFFERENT angle/hook — never repeat the same approach.
   Angle types: educational, comparison, case_study, behind_the_scenes,
   tips_tricks, myth_busting, testimonial, seasonal_hook, cta_offer, storytelling

3. Apply content role distribution:
   - Seed (attract attention): ~40% of pieces
   - Sprout (build engagement): ~35% of pieces
   - Harvest (convert): ~25% of pieces
   - Start campaign with Seed, end with Harvest

4. Choose content_type strategically for each piece:
   - "multichannel": For long-form educational content, articles, deep dives → best for LinkedIn, Facebook, Blog, Email
   - "video_script": For short video scripts (TikTok, Reels, YouTube Shorts) → best for TikTok, Instagram
   - "carousel": For visual carousel posts with multiple slides → best for Instagram, LinkedIn, Facebook
   Each campaign should have a MIX of content types. Aim for at least 2 different types.

5. Distribute across channels strategically:
   - Educational/long-form → multichannel → LinkedIn, Facebook, Website
   - Visual/short → carousel or video_script → Instagram, TikTok
   - Direct response → multichannel → Email, Zalo
   - Each channel should get at least 1 piece if selected

6. Schedule pieces with 2-3 day gaps minimum
   - Avoid weekends for B2B content
   - Tuesday-Thursday are best for LinkedIn
   - ALSO assign each piece a "recommended_time" (HH:mm 24h) at the platform's golden hour:
     facebook 19:30, instagram 20:00, linkedin 09:00, threads 12:00, twitter 09:30,
     bluesky 11:00, pinterest 21:00, tiktok 19:00, telegram 20:30, zalo 11:30,
     email 09:30, website/blogger/wordpress/shopify/wix/medium 09:30, google_maps 10:00.
${pillarAllocation ? '\n7. PILLAR ALLOCATION is MANDATORY — distribute pieces according to the specified percentages above.\n   Every piece must be assigned to a pillar.\n' : ''}
7${pillarAllocation ? '' : ''}. ALL pieces must be directly related to: "${params.title}"
   Do NOT suggest unrelated trending topics.
${dedupStr}

Respond in the same language as the campaign title.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = getGatewayConfig().apiKey;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      goal_id,
      campaign_title,
      campaign_description,
      target_channels,
      campaign_duration_days,
      campaign_start_date,
      approval_mode,
      brand_template_id,
      clarification_context,
      organization_id,
      preview,            // if true → don't insert, return pieces only
      pre_generated_plan, // if array → skip AI, use these pieces directly
      target_post_count,  // FE-estimated total pieces
      per_channel_targets,// FE-estimated per-channel pieces
      topic_pool,         // FE-curated topic pool from topic-ai
    } = await req.json();

    const isPreview = !!preview;
    const hasPrePlan = Array.isArray(pre_generated_plan) && pre_generated_plan.length > 0;

    if (!campaign_title || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: campaign_title, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!isPreview && !goal_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: goal_id (non-preview)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch agent model config for strategy stage
    let strategyModel = "deepseek-v4-pro"; // safer default (Lovable Gateway gemini-3-flash hay 402)
    let strategyTemperature: number | undefined;
    let strategyFallbackModel: string | undefined;
    try {
      // Try org-specific config first, then fall back to global (organization_id IS NULL)
      const { data: agentConfigs } = await supabase
        .from("ai_agent_model_configs")
        .select("model_override, temperature, fallback_model, is_enabled, organization_id")
        .eq("agent_name", "strategy")
        .eq("is_enabled", true)
        .or(`organization_id.eq.${organization_id},organization_id.is.null`);
      // Prefer org-specific row over global
      const agentConfig = (agentConfigs || []).sort((a: any, b: any) => {
        if (a.organization_id && !b.organization_id) return -1;
        if (!a.organization_id && b.organization_id) return 1;
        return 0;
      })[0];
      if (agentConfig?.model_override) {
        strategyModel = agentConfig.model_override;
        console.log(`[generate-campaign-strategy] Using agent config model: ${strategyModel} (org=${agentConfig.organization_id ?? 'GLOBAL'})`);
      }
      if (agentConfig?.temperature) {
        strategyTemperature = agentConfig.temperature;
      }
      if (agentConfig?.fallback_model) {
        strategyFallbackModel = agentConfig.fallback_model;
      }
    } catch (e) {
      console.warn("[generate-campaign-strategy] Failed to fetch agent config, using default:", e);
    }

    // Fetch brand context
    let brandName = "";
    let industry = "";
    let brandVoice = "";
    if (brand_template_id) {
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("brand_name, industry, tone_of_voice, brand_positioning")
        .eq("id", brand_template_id)
        .single();
      if (brand) {
        brandName = brand.brand_name || "";
        industry = brand.industry || "";
        brandVoice = [brand.tone_of_voice, brand.brand_positioning].filter(Boolean).join(". ");
      }
    }

    // Fetch existing titles for dedup
    let existingTitles: string[] = [];
    try {
      const { data: existingContent } = await supabase
        .from("multi_channel_contents")
        .select("title")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(30);
      const { data: recentPipelines } = await supabase
        .from("agent_pipelines")
        .select("content_title")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(15);
      existingTitles = [
        ...(existingContent || []).map((c: any) => c.title).filter(Boolean),
        ...(recentPipelines || []).map((p: any) => p.content_title).filter(Boolean),
      ].slice(0, 30);
    } catch { /* ignore dedup errors */ }

    const durationDays = campaign_duration_days || 14;
    const startDate = campaign_start_date || new Date().toISOString().split("T")[0];
    const channels = target_channels?.length ? target_channels : ["facebook"];
    const effectiveApprovalMode = approval_mode || "approve_plan";

    // Normalize target count
    let normalizedTarget: number | null = null;
    let planWarning: string | null = null;
    if (typeof target_post_count === "number" && Number.isFinite(target_post_count) && target_post_count >= 1) {
      const raw = Math.round(target_post_count);
      if (raw > PIECE_HARD_CAP) {
        normalizedTarget = PIECE_HARD_CAP;
        planWarning = `Đã giới hạn ở ${PIECE_HARD_CAP} bài (yêu cầu ${raw}). Hãy giảm tần suất hoặc rút ngắn thời gian chiến dịch nếu cần nhiều hơn.`;
      } else {
        normalizedTarget = raw;
      }
    }
    // Normalize per-channel targets (filter to selected channels only, clamp ≥1)
    let normalizedPerChannel: Record<string, number> | null = null;
    if (per_channel_targets && typeof per_channel_targets === "object") {
      const entries = Object.entries(per_channel_targets as Record<string, unknown>)
        .filter(([ch, n]) => channels.includes(ch) && typeof n === "number" && Number.isFinite(n) && (n as number) >= 1)
        .map(([ch, n]) => [ch, Math.min(PIECE_HARD_CAP, Math.max(1, Math.round(n as number)))] as const);
      if (entries.length > 0) normalizedPerChannel = Object.fromEntries(entries);
    }

    // Normalize topic_pool (light validation; cap at 60 entries)
    let normalizedPool: Array<{ title: string; hook?: string; key_message?: string; pillar?: string; category?: string; scores?: Record<string, number> }> | null = null;
    if (Array.isArray(topic_pool) && topic_pool.length > 0) {
      const cleaned = topic_pool
        .filter((t: any) => t && typeof t === 'object' && typeof t.title === 'string' && t.title.trim().length > 0)
        .slice(0, 60)
        .map((t: any) => ({
          title: String(t.title).trim().slice(0, 400),
          hook: typeof t.hook === 'string' ? t.hook.trim().slice(0, 240) : undefined,
          key_message: typeof t.key_message === 'string' ? t.key_message.trim().slice(0, 240) : undefined,
          pillar: typeof t.pillar === 'string' ? t.pillar.trim().slice(0, 80) : undefined,
          category: typeof t.category === 'string' ? t.category.trim().slice(0, 80) : undefined,
          scores: t.scores && typeof t.scores === 'object' ? t.scores : undefined,
        }));
      if (cleaned.length > 0) normalizedPool = cleaned;
    }
    console.log(`[generate-campaign-strategy] topic_pool size: ${normalizedPool?.length || 0}`);

    const pieceCount = calculatePieceCount(durationDays, normalizedTarget);

    let planData: { plan: any[]; strategy_summary: string; content_mix: Record<string, number> };

    if (hasPrePlan) {
      const validPieces = (pre_generated_plan as any[]).filter(
        (p) => p && typeof p === 'object' && p.title && p.scheduled_date && p.target_channel,
      );
      if (validPieces.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "pre_generated_plan invalid: no valid pieces" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const mix: Record<string, number> = { seed: 0, sprout: 0, harvest: 0 };
      validPieces.forEach((p) => {
        const r = p.content_role || 'seed';
        mix[r] = (mix[r] || 0) + 1;
      });
      planData = {
        plan: validPieces,
        strategy_summary: typeof clarification_context?.strategy_summary === 'string'
          ? clarification_context.strategy_summary
          : `Lịch ${validPieces.length} bài do người dùng tinh chỉnh`,
        content_mix: mix,
      };
    } else {
    const systemPrompt = buildStrategyPrompt({
      title: campaign_title,
      description: campaign_description || "",
      clarificationContext: clarification_context,
      brandName,
      industry,
      brandVoice,
      channels,
      durationDays,
      startDate,
      pieceCount,
      existingTitles,
      targetPostCount: normalizedTarget,
      perChannelTargets: normalizedPerChannel,
      topicPool: normalizedPool,
    });

    // Call AI via callAIWithMetrics — routes to correct provider based on model prefix.
    // Provider-aware short-circuit: if the configured strategyModel goes to Lovable Gateway
    // and that gateway's circuit is OPEN (e.g. recent 402 'Not enough credits'), skip it
    // and use the dashscope fallback (qwen-plus) directly to avoid a wasted round-trip.
    let activeStrategyModel = strategyModel;
    try {
      const strategyProvider = getProviderFromModel(strategyModel);
      // Only use qwen-plus as automatic fallback if explicitly configured.
      // DashScope key currently 400s — avoid blind fallback to it.
      const fallbackCandidate = strategyFallbackModel;
      if (
        (strategyProvider === "lovable" || strategyProvider === "openrouter") &&
        fallbackCandidate &&
        fallbackCandidate !== strategyModel &&
        (await isCircuitOpen(strategyModel))
      ) {
        console.warn(
          `[generate-campaign-strategy] ${strategyModel} (${strategyProvider}) circuit OPEN — skipping straight to fallback ${fallbackCandidate}`
        );
        activeStrategyModel = fallbackCandidate;
      }
    } catch (err) {
      console.warn(`[generate-campaign-strategy] circuit check failed:`, err);
    }

    console.log(`[generate-campaign-strategy] Calling AI with model: ${activeStrategyModel}`);
    let aiResult = await callAIWithMetrics(supabase, {
      functionName: 'generate-campaign-strategy',
      organizationId: organization_id,
      actionType: 'strategy',
      modelOverride: activeStrategyModel,
      ...(strategyTemperature && { temperatureOverride: strategyTemperature }),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a detailed content plan for the campaign "${campaign_title}". Return the plan using the generate_campaign_plan tool.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_campaign_plan",
            description: "Generate a structured content campaign plan",
            parameters: {
              type: "object",
              properties: {
                plan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      piece_number: { type: "number" },
                      title: { type: "string" },
                      angle: {
                        type: "string",
                        enum: [
                          "educational", "comparison", "case_study",
                          "behind_the_scenes", "tips_tricks", "myth_busting",
                          "testimonial", "seasonal_hook", "cta_offer", "storytelling",
                        ],
                      },
                      content_type: {
                        type: "string",
                        enum: ["multichannel", "video_script", "carousel"],
                        description: "Type of content to generate. multichannel=article/post, video_script=short video, carousel=multi-slide visual",
                      },
                      target_channel: { type: "string" },
                      content_role: { type: "string", enum: ["seed", "sprout", "harvest"] },
                      format: { type: "string", enum: ["post", "carousel", "video_script", "email"] },
                      scheduled_date: { type: "string", description: "YYYY-MM-DD" },
                      recommended_time: { type: "string", description: "HH:mm 24h, golden hour for the target_channel" },
                      key_message: { type: "string" },
                      estimated_length: { type: "string", enum: ["short", "medium", "long"] },
                      pillar: { type: "string", description: "Content pillar this piece belongs to (must match pillar names from brief)" },
                      pool_index: { type: "number", description: "If TOPIC POOL is provided, the [NN] index (1-based) of the pool topic this piece was picked from." },
                    },
                    required: [
                      "piece_number", "title", "angle", "content_type", "target_channel",
                      "content_role", "format", "scheduled_date", "key_message",
                    ],
                  },
                },
                strategy_summary: { type: "string" },
                content_mix: {
                  type: "object",
                  properties: {
                    seed: { type: "number" },
                    sprout: { type: "number" },
                    harvest: { type: "number" },
                  },
                  required: ["seed", "sprout", "harvest"],
                },
              },
              required: ["plan", "strategy_summary", "content_mix"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "generate_campaign_plan" } },
    });

    // Graceful fallback for exhausted workspace credits on primary provider
    if (!aiResult.success) {
      const primaryError = aiResult.error || "AI call failed";
      const isCreditsError =
        primaryError.includes("Payment") ||
        primaryError.includes("402") ||
        primaryError.includes("Not enough credits");

      // Only fall back to explicitly-configured model. ai-provider.ts has its own last-resort fallback.
      const fallbackModel = strategyFallbackModel;

      if (isCreditsError && fallbackModel && fallbackModel !== activeStrategyModel) {
        console.warn(`[generate-campaign-strategy] Primary model credits exhausted, retrying with fallback model: ${fallbackModel}`);
        const fallbackResult = await callAIWithMetrics(supabase, {
          functionName: 'generate-campaign-strategy',
          organizationId: organization_id,
          actionType: 'strategy',
          modelOverride: fallbackModel,
          ...(strategyTemperature && { temperatureOverride: strategyTemperature }),
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Create a detailed content plan for the campaign "${campaign_title}". Return the plan using the generate_campaign_plan tool.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_campaign_plan",
                description: "Generate a structured content campaign plan",
                parameters: {
                  type: "object",
                  properties: {
                    plan: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          piece_number: { type: "number" },
                          title: { type: "string" },
                          angle: {
                            type: "string",
                            enum: [
                              "educational", "comparison", "case_study",
                              "behind_the_scenes", "tips_tricks", "myth_busting",
                              "testimonial", "seasonal_hook", "cta_offer", "storytelling",
                            ],
                          },
                          content_type: {
                            type: "string",
                            enum: ["multichannel", "video_script", "carousel"],
                            description: "Type of content to generate. multichannel=article/post, video_script=short video, carousel=multi-slide visual",
                          },
                          target_channel: { type: "string" },
                          content_role: { type: "string", enum: ["seed", "sprout", "harvest"] },
                          format: { type: "string", enum: ["post", "carousel", "video_script", "email"] },
                          scheduled_date: { type: "string", description: "YYYY-MM-DD" },
                          recommended_time: { type: "string", description: "HH:mm 24h, golden hour for the target_channel" },
                          key_message: { type: "string" },
                          estimated_length: { type: "string", enum: ["short", "medium", "long"] },
                          pillar: { type: "string", description: "Content pillar this piece belongs to (must match pillar names from brief)" },
                          pool_index: { type: "number", description: "If TOPIC POOL is provided, the [NN] index (1-based) of the pool topic this piece was picked from." },
                        },
                        required: [
                          "piece_number", "title", "angle", "content_type", "target_channel",
                          "content_role", "format", "scheduled_date", "key_message",
                        ],
                      },
                    },
                    strategy_summary: { type: "string" },
                    content_mix: {
                      type: "object",
                      properties: {
                        seed: { type: "number" },
                        sprout: { type: "number" },
                        harvest: { type: "number" },
                      },
                      required: ["seed", "sprout", "harvest"],
                    },
                  },
                  required: ["plan", "strategy_summary", "content_mix"],
                },
              },
            },
          ],
          toolChoice: { type: "function", function: { name: "generate_campaign_plan" } },
        });

        if (fallbackResult.success) {
          aiResult = fallbackResult;
        } else {
          console.error("Fallback AI call error:", fallbackResult.error);
        }
      }
    }

    if (!aiResult.success) {
      const errorMsg = aiResult.error || "AI call failed";
      console.error("AI call error:", errorMsg);

      if (errorMsg.includes("Rate limit") || errorMsg.includes("429")) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Vui lòng thử lại sau.", errorCode: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMsg.includes("Payment") || errorMsg.includes("402")) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI call failed: ${errorMsg}`);
    }

    const toolCall = aiResult.data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured plan data");
    }

    try {
      planData = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI strategy output");
    }
    } // ── end if(!hasPrePlan) branch ──

    // Add default statuses, ensure content_type, and pipeline_id to each piece
    const pieces = planData.plan.map((piece: any, idx: number) => ({
      ...piece,
      piece_number: idx + 1,
      content_type: piece.content_type || (piece.format === "video_script" ? "video_script" : piece.format === "carousel" ? "carousel" : "multichannel"),
      pipeline_id: null,
      status: "planned",
      estimated_length: piece.estimated_length || "medium",
    }));

    // Calculate campaign end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const campaignEndDate = endDate.toISOString().split("T")[0];

    // ── Preview mode: return pieces without persisting ──
    if (isPreview) {
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          plan: pieces,
          strategy_summary: planData.strategy_summary,
          content_mix: planData.content_mix,
          total_pieces: pieces.length,
          target_post_count: normalizedTarget,
          plan_warning: planWarning,
          campaign_start_date: startDate,
          campaign_end_date: campaignEndDate,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert into campaign_content_plans
    const { data: plan, error: planError } = await supabase
      .from("campaign_content_plans")
      .insert({
        goal_id,
        organization_id,
        plan_data: pieces,
        total_pieces: pieces.length,
        completed_pieces: 0,
        campaign_start_date: startDate,
        campaign_end_date: campaignEndDate,
        campaign_duration_days: durationDays,
        approval_mode: effectiveApprovalMode,
        clarification_context,
        strategy_summary: planData.strategy_summary || null,
        status: effectiveApprovalMode === "full_auto" ? "approved" : "planned",
        plan_approved: effectiveApprovalMode === "full_auto",
        plan_approved_at: effectiveApprovalMode === "full_auto" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (planError) throw new Error(`Failed to save plan: ${planError.message}`);

    // If full_auto, create pipelines immediately via create_from_plan action
    let pipelinesCreated = 0;
    if (effectiveApprovalMode === "full_auto" && plan) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const res = await fetch(`${supabaseUrl}/functions/v1/agent-pipeline`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_from_plan", plan_id: plan.id }),
        });
        const result = await res.json().catch(() => ({}));
        pipelinesCreated = result.pipeline_count || 0;
      } catch (e) {
        console.error("Failed to auto-create pipelines:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan_id: plan.id,
        plan: pieces,
        strategy_summary: planData.strategy_summary,
        content_mix: planData.content_mix,
        total_pieces: pieces.length,
        target_post_count: normalizedTarget,
        plan_warning: planWarning,
        pipelines_created: pipelinesCreated,
        approval_mode: effectiveApprovalMode,
        used_pre_generated: hasPrePlan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-campaign-strategy error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
