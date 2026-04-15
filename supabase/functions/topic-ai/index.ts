/**
 * topic-ai - Unified Topic Discovery Edge Function
 * 
 * Merges 4 previous functions into one with action-based routing:
 * - generate-topic-suggestions (suggest, refine)
 * - recommend-topics (next_best, weekly_plan, conflict_check, learning)
 * - discover-trending-topics (trending)
 * - analyze-topic-gaps (gap_analysis, cluster, keywords)
 */

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { buildLocalizedDateContext } from "../_shared/country-language-map.ts";
import { callAI, callAIWithMetrics } from "../_shared/ai-provider.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import {
  corsHeaders,
  createErrorResponse,
  createRateLimitResponse,
  createCreditsExhaustedResponse,
  fetchTopicBrandContext,
  buildBrandContextString,
  fetchTopicHistory,
  buildTopicHistoryContext,
  checkTopicCache,
  saveTopicCache,
  searchIndustryData,
  searchAudienceQuestions,
  searchTrendingTopics,
  fetchTrendingTopicsFromDB,
  buildTrendingContext,
  inferSearchIntent,
  inferContentTier,
  inferMediaOwnership,
  inferJourneyStage,
  semanticMatchPersona,
  shouldSkipWebSearch,
  hashContextData,
  type TopicBrandContext,
  type TopicHistoryItem,
  type SemanticMatchResult,
  type WebSearchDecision,
} from "../_shared/topic-utils.ts";
import { 
  buildCoTSection, 
  buildFewShotExamples, 
  buildLearningSection,
  buildSelfCorrectionRules,
  buildExtendedBrandPrompt,
  buildProductPersonaMappingContext,
} from "../_shared/prompt-utils.ts";
import { fetchLearningContext } from "../_shared/learning-context.ts";
import {
  buildContentMatrixSection,
  buildDiversityCheckSection,
  buildEnhancedScoringGuidance,
} from "../_shared/marketing-frameworks.ts";

// ========== Types ==========
type TopicAIAction = 
  | 'suggest'           // Generate topic suggestions
  | 'refine'            // Refine a single topic
  | 'refine_intel'      // Intelligence-based topic refinement
  | 'next_best'         // Get single best topic recommendation
  | 'weekly_plan'       // Get weekly content plan
  | 'conflict_check'    // Check topic conflicts
  | 'learning'          // Submit learning feedback
  | 'trending'          // Discover trending topics
  | 'gap_analysis'      // Analyze content gaps
  | 'cluster'           // Cluster similar topics
  | 'keywords'          // Expand keywords
  | 'suggest_compliant' // Suggest compliant topic alternative
  | 'suggest_audience'; // Suggest best audience/persona for a topic


interface TopicAIRequest {
  action?: TopicAIAction;
  // Common params
  brandTemplateId?: string;
  organizationId?: string;
  contentGoal?: string;
  industry?: string;
  format?: 'carousel' | 'script' | 'multichannel' | 'all';
  forceRefresh?: boolean;
  // Phase 3: Cost optimization flag
  skipWebSearch?: boolean;     // Explicitly skip Perplexity API calls
  // Category hint from quick-action chips (e.g. "Viral tuần này", "Theo trend")
  categoryHint?: string;
  // Action-specific params
  rawTopic?: string;           // for 'refine'
  videoType?: string;          // for 'refine'
  topics?: string[];           // for 'conflict_check'
  topicToRefine?: string;      // for 'gap_analysis' refine mode
  recentTopics?: string[];     // for 'suggest'
  seasonality?: string;        // for 'suggest'
  feedbackData?: {             // for 'learning'
    topicId: string;
    feedback: 'positive' | 'negative';
    reason?: string;
  };
  // For suggest_compliant action
  topic?: string;              // for 'suggest_compliant' and 'suggest_audience'
  issues?: Array<{             // for 'suggest_compliant'
    type: string;
    term: string;
    reason: string;
  }>;
  // Agent pipeline model override
  model_override?: string;     // from ai_agent_model_configs
  temperature?: number;        // from ai_agent_model_configs
}

// ========== Main Handler ==========
Deno.serve(withPerf({ functionName: 'topic-ai', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: TopicAIRequest = await req.json();
    // Action resolution: body first, then URL search param (backward compat)
    const url = new URL(req.url);
    const actionFromBody = request.action;
    const actionFromQuery = url.searchParams.get('action') as TopicAIAction | null;
    const action: TopicAIAction = actionFromBody || actionFromQuery || 'suggest';
    const { action: _unused, ...params } = request;

    console.log(`[topic-ai] Action: ${action} (source: ${actionFromBody ? 'body' : actionFromQuery ? 'query' : 'default'}), Brand: ${params.brandTemplateId?.substring(0, 8) || 'none'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve userId from auth header for cost tracking
    const userId = await resolveUserId(req, supabase);

    // Fetch shared brand context once (used by most actions)
    let brandContext: TopicBrandContext | null = null;
    if (params.brandTemplateId) {
      brandContext = await fetchTopicBrandContext(supabase, params.brandTemplateId);
    }

    // Inject userId into params for metrics tracking
    const paramsWithUser = { ...params, _userId: userId };

    // Route to appropriate handler
    switch (action) {
      case 'suggest':
        return await handleSuggest(supabase, brandContext, paramsWithUser, startTime);
      case 'refine':
        return await handleRefine(supabase, brandContext, paramsWithUser, startTime);
      case 'next_best':
      case 'weekly_plan':
      case 'conflict_check':
      case 'learning':
        return await handleRecommendation(action, supabase, brandContext, paramsWithUser, startTime);
      case 'trending':
        return await handleTrending(supabase, brandContext, paramsWithUser, startTime);
      case 'gap_analysis':
      case 'cluster':
      case 'keywords':
      case 'refine_intel':
        return await handleAnalysis(action, supabase, brandContext, paramsWithUser, startTime);
      case 'suggest_compliant':
        return await handleSuggestCompliant(supabase, brandContext, paramsWithUser, startTime);
      case 'suggest_audience':
        return await handleSuggestAudience(supabase, brandContext, paramsWithUser, startTime);
      default:
        return createErrorResponse(`Invalid action: ${action}`, 400);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[topic-ai] Error:', errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
}));

// ========== Handler: Suggest ==========
async function handleSuggest(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { contentGoal, format, organizationId, brandTemplateId, recentTopics, seasonality, forceRefresh, skipWebSearch, categoryHint, query, topic, instruction } = params as TopicAIRequest & { query?: string; instruction?: string };

  console.log(`[topic-ai:suggest] categoryHint: ${categoryHint || 'none'}`);

  // Phase 4: Enhanced cache key with context hash + query hash for unique results per query
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 4)); // 4-hour buckets (reduced from 8h for freshness)
  const contextHash = hashContextData(brandContext);
  const queryHash = query ? hashContextData({ q: query }) : 'no-query';
  const categoryHash = categoryHint ? hashContextData({ cat: categoryHint }) : 'no-cat';
  const cacheKey = `topic-suggestions-v9:${organizationId || 'global'}:${brandContext?.industry?.[0] || params.industry || 'general'}:${contentGoal || 'education'}:${brandTemplateId || 'none'}:${format || 'all'}:${contextHash}:${queryHash}:${categoryHash}:${hourBucket}`;
  
  // Parallel: Check cache + fetch learning context simultaneously
  const [cachedResult, learningContext] = await Promise.all([
    forceRefresh ? Promise.resolve(null) : checkTopicCache(supabase, cacheKey),
    brandTemplateId ? fetchLearningContext(supabase, brandTemplateId, null) : Promise.resolve(null),
  ]);

  // Return early if cache hit
  let cacheHitTimestamp: number | undefined;
  if (cachedResult) {
    console.log('[topic-ai:suggest] Cache hit');
    return new Response(JSON.stringify({
      suggestions: cachedResult,
      source: 'cache'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Phase 3: Smart parallel calls - determine if web search should be skipped
  const industryToSearch = brandContext?.industry?.[0] || params.industry || '';
  const learningContextSize = learningContext?.totalTopicsUsed || 0;
  
  const webSearchDecision: WebSearchDecision = shouldSkipWebSearch({
    skipWebSearch,
    learningContextSize,
    cacheHitTimestamp,
    forceRefresh,
    hasIndustry: !!industryToSearch,
  });

  console.log(`[topic-ai:suggest] Web search decision: ${webSearchDecision.reason}, skip industry: ${webSearchDecision.shouldSkipIndustrySearch}, skip QA: ${webSearchDecision.shouldSkipAudienceQA}`);

  // Fetch industry data from Perplexity ONLY if needed (conditional parallel calls)
  let industryInsight = null;
  let audienceQA = null;

  if (!webSearchDecision.shouldSkipIndustrySearch || !webSearchDecision.shouldSkipAudienceQA) {
    const parallelTasks: Promise<any>[] = [];
    const taskMapping: string[] = [];

    if (!webSearchDecision.shouldSkipIndustrySearch) {
      parallelTasks.push(searchIndustryData(industryToSearch, brandContext?.brandName || ''));
      taskMapping.push('industry');
    }
    
    if (!webSearchDecision.shouldSkipAudienceQA) {
      parallelTasks.push(searchAudienceQuestions(industryToSearch, brandContext?.industryContext?.targetAudience));
      taskMapping.push('audience');
    }

    if (parallelTasks.length > 0) {
      const results = await Promise.all(parallelTasks);
      taskMapping.forEach((task, index) => {
        if (task === 'industry') industryInsight = results[index];
        if (task === 'audience') audienceQA = results[index];
      });
      console.log(`[topic-ai:suggest] Executed ${parallelTasks.length} Perplexity API call(s)`);
    }
  } else {
    console.log('[topic-ai:suggest] Skipped all Perplexity API calls - cost optimization');
  }

  // Build prompts — inject query, categoryHint, topic, instruction into prompt context for relevance
  const { systemPrompt, userPrompt } = buildSuggestPrompts({
    brandContext,
    contentGoal,
    format,
    recentTopics: recentTopics || learningContext?.recentTopics || [],
    seasonality,
    learningContext,
    industryInsight,
    audienceQA,
    query,
    categoryHint,
    topic,
    instruction,
  });

  // Call AI with metrics tracking
  const config = await getAIConfig('topic-ai', organizationId);
  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    brandTemplateId,
    actionType: 'suggest',
    ...(params.model_override && { modelOverride: params.model_override }),
    ...(params.temperature && { temperatureOverride: params.temperature }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  if (!result.success) {
    if (result.error?.includes('Rate limit')) {
      return createRateLimitResponse();
    }
    if (result.error?.includes('Payment')) {
      return createCreditsExhaustedResponse();
    }
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  // Parse response
  const content = result.data?.choices?.[0]?.message?.content || '';
  let suggestions = parseTopicSuggestions(content, industryInsight);

  // === POST-GENERATION BRAND + GOAL FILTERING ===
  if (brandContext && suggestions.length > 0) {
    const beforeCount = suggestions.length;
    suggestions = filterByBrandAndGoal(suggestions, brandContext, contentGoal || 'education');
    if (suggestions.length < beforeCount) {
      console.log(`[topic-ai:suggest] Brand/Goal filter: ${beforeCount} → ${suggestions.length} topics`);
    }
  }

  if (suggestions.length === 0) {
    suggestions = getDefaultSuggestions(contentGoal);
  }

  // OPTIMIZATION: Increased cache TTL from 12h to 24h for better cost savings
  await saveTopicCache(supabase, cacheKey, suggestions, 24, {
    functionName: 'topic-ai',
    organizationId,
    brandTemplateId,
  });

  console.log(`[topic-ai:suggest] Generated ${suggestions.length} suggestions in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    suggestions,
    source: 'ai',
    brandContextUsed: !!brandContext,
    perplexityUsed: !!industryInsight || !!audienceQA,
    webSearchDecision: webSearchDecision.reason,
    costOptimization: {
      skippedIndustrySearch: webSearchDecision.shouldSkipIndustrySearch,
      skippedAudienceQA: webSearchDecision.shouldSkipAudienceQA,
      learningContextSize,
    },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Refine ==========
async function handleRefine(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { rawTopic, videoType, brandTemplateId, organizationId, contentGoal } = params;

  if (!rawTopic || rawTopic.trim().length < 5) {
    return createErrorResponse('rawTopic is required (min 5 chars)', 400);
  }

  // Fetch learning context
  let learningContext = null;
  if (brandTemplateId) {
    learningContext = await fetchLearningContext(supabase, brandTemplateId, null);
  }

  // Language-neutral video type labels (used as metadata, AI interprets them)
  const videoTypeLabel = videoType || 'video marketing';

  // Try to fetch system prompt from registry, fallback to hardcoded
  let systemPrompt = '';
  try {
    const promptManager = createPromptManager(supabase, 'topic-ai', organizationId);
    systemPrompt = await promptManager.get('system_refine');
  } catch (err) {
    console.warn('[topic-ai:refine] Failed to fetch prompt from registry, using hardcoded');
  }

  // Build prompt
  const promptParts: string[] = [];
  const basePrompt = systemPrompt || `You are a professional Content Strategist. Improve a raw topic into 3 better, more specific, more engaging versions.

## IMPROVEMENT PRINCIPLES:
1. Be specific: Add data points, timeframes, specific audiences
2. Fresh angles: ${allowedAngles.join(', ')}
3. Hook-friendly: Title can be immediately turned into a video hook
4. Brand-aligned: Do not violate brand tone and guidelines

Respond in the same language as the raw topic provided.`;

  // Topic Anchoring + Content Goal constraints
  promptParts.push(`## ⚠️ CRITICAL: TOPIC ANCHORING
The refined topics MUST be about the SAME subject/industry as the raw topic.
- Raw topic mentions "${rawTopic}" → ALL 3 refined topics MUST be about this exact subject
- You are IMPROVING the angle/hook/specificity, NOT changing the subject
- VIOLATION: Raw topic is about "kế toán" but refined topic is about "marketing" → REJECTED

## WRONG vs RIGHT EXAMPLES
❌ WRONG: Raw="dịch vụ kế toán" → Refined="Cách bán hàng online hiệu quả" (changed subject)
✅ RIGHT: Raw="dịch vụ kế toán" → Refined="5 lý do doanh nghiệp mất tiền vì không thuê kế toán chuyên nghiệp" (same subject, conversion angle)
❌ WRONG: Raw="yoga cho người mới" → Refined="10 mẹo giảm cân nhanh" (changed subject)
✅ RIGHT: Raw="yoga cho người mới" → Refined="3 bài tập yoga đơn giản ai cũng làm được ngay tại nhà" (same subject, education angle)`);

  // Goal-Locked Angles: Map each contentGoal to allowed/forbidden angles
  const allAngles = ['practical', 'controversial', 'educational', 'storytelling', 'solution', 'sales', 'data'];
  const goalAngles: Record<string, string[]> = {
    conversion: ['sales', 'solution', 'practical'],
    education: ['educational', 'practical', 'data'],
    awareness: ['storytelling', 'controversial', 'data'],
    engagement: ['controversial', 'storytelling', 'practical'],
    expertise: ['data', 'educational', 'solution'],
  };
  const allowedAngles = contentGoal ? (goalAngles[contentGoal] || ['practical', 'sales', 'educational']) : allAngles;
  const forbiddenAngles = allAngles.filter(a => !allowedAngles.includes(a));

  // Inject content goal linked to raw topic
  if (contentGoal) {
    const goalGuidance: Record<string, string> = {
      conversion: `Apply CONVERSION angles specifically to "${rawTopic}". Focus on sales angles, pain points, pricing objections, offers, urgency, CTA, case studies, ROI proof — ALL related to "${rawTopic}". Topics MUST drive purchase decisions about "${rawTopic}".`,
      education: `Apply EDUCATION angles specifically to "${rawTopic}". Focus on tips, how-to, knowledge sharing, tutorials, step-by-step guides — ALL related to "${rawTopic}". Topics MUST educate the audience about "${rawTopic}".`,
      awareness: `Apply AWARENESS angles specifically to "${rawTopic}". Focus on brand story, introduction, viral potential, industry trends — ALL related to "${rawTopic}". Topics MUST increase recognition around "${rawTopic}".`,
      engagement: `Apply ENGAGEMENT angles specifically to "${rawTopic}". Focus on interaction, debate, community building, polls, questions — ALL related to "${rawTopic}". Topics MUST encourage audience participation about "${rawTopic}".`,
      expertise: `Apply EXPERTISE angles specifically to "${rawTopic}". Focus on authority, data-driven insights, research, deep analysis — ALL related to "${rawTopic}". Topics MUST establish thought leadership about "${rawTopic}".`,
    };
    promptParts.push(`## ⚠️ MANDATORY CONTENT GOAL: "${contentGoal}"
${goalGuidance[contentGoal] || `Align refined topics with "${contentGoal}" goal, applied specifically to "${rawTopic}".`}
This is the PRIMARY constraint. Every refined topic MUST serve this goal WHILE staying on the subject of "${rawTopic}".
Topics that don't align with "${contentGoal}" OR drift away from "${rawTopic}" will be REJECTED.

## ⚠️ FORBIDDEN ANGLES for "${contentGoal}": ${forbiddenAngles.join(', ')}
Do NOT use these angles: ${forbiddenAngles.join(', ')}.
ONLY use these angles: ${allowedAngles.join(', ')}.
${contentGoal === 'conversion' ? 'Do NOT use educational/informational angles when the goal is CONVERSION. The user wants to SELL, not teach.' : ''}`);
  }

  promptParts.push(`${basePrompt}

## RAW TOPIC
"${rawTopic}"
Video type: ${videoTypeLabel}`);

  if (brandContext) {
    promptParts.push(buildBrandContextString(brandContext));
    
    if (brandContext.industryContext) {
      promptParts.push(`\n## 🔒 INDUSTRY MEMORY (MUST NOT VIOLATE)
${brandContext.industryContext.targetAudience ? `Target Audience: ${brandContext.industryContext.targetAudience}` : ''}
${brandContext.industryContext.forbiddenTerms?.length ? `Forbidden Terms: ${brandContext.industryContext.forbiddenTerms.slice(0, 10).join(', ')}` : ''}`);
    }
  }

  if (learningContext) {
    const learningSection = buildLearningSection(learningContext);
    if (learningSection) promptParts.push(learningSection);
  }

  // Inject date context to prevent outdated year references
  const lang = brandContext?.languageCode || 'vi';
  const dateContext = buildLocalizedDateContext(lang);
  promptParts.push(dateContext);

  promptParts.push(`
## OUTPUT FORMAT
Return EXACTLY a JSON array with 3 items (respond in the same language as the raw topic):
[
  {
    "topic": "Improved topic title (15-50 words)",
    "angle": "MUST be one of: ${allowedAngles.join(', ')}"${brandContext?.personas?.length ? `,
    "targetPersona": "Best matching persona name (if clear)"` : ''}${brandContext?.products?.length ? `,
    "productFit": "Related product name (if any)"` : ''}
  }
]
RETURN JSON ONLY, NO ADDITIONAL EXPLANATION.

## FINAL REMINDER:
1. Content goal is "${contentGoal || 'general'}" — apply this goal TO the topic "${rawTopic}"
2. ALL 3 refined topics MUST be about "${rawTopic}" — do NOT change the subject
3. You are refining the ANGLE/HOOK, not the TOPIC SUBJECT`);
  const finalPrompt = promptParts.join('\n\n');

  // Call AI with metrics — use Gemini 2.5 Pro for stronger goal-aligned reasoning
  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    brandTemplateId,
    actionType: 'refine',
    modelOverride: params.model_override || 'google/gemini-2.5-pro',
    ...(params.temperature && { temperatureOverride: params.temperature }),
    messages: [{ role: 'user', content: finalPrompt }],
  });

  if (!result.success) {
    return new Response(JSON.stringify({
      refinedTopics: [],
      error: result.error || 'AI error',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Parse response
  const content = result.data?.choices?.[0]?.message?.content || '';
  const refinedTopics = parseRefinedTopics(content, brandContext);

  console.log(`[topic-ai:refine] Generated ${refinedTopics.length} refined topics in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    refinedTopics,
    source: 'ai',
    contextUsed: {
      hasBrand: !!brandContext,
      hasIndustryMemory: !!brandContext?.industryContext,
      hasLearningContext: !!learningContext,
    },
    processingTime: Date.now() - startTime,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Recommendation ==========
async function handleRecommendation(
  action: 'next_best' | 'weekly_plan' | 'conflict_check' | 'learning',
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { contentGoal, organizationId, brandTemplateId, topics, feedbackData } = params;

  // Fetch topic history
  const topicHistory = await fetchTopicHistory(supabase, organizationId, brandTemplateId, 50);
  const topicHistoryContext = buildTopicHistoryContext(topicHistory);

  // Fetch trending topics for context (next_best and weekly_plan)
  let trendingContext = '';
  if (action === 'next_best' || action === 'weekly_plan') {
    const trendingTopics = await fetchTrendingTopicsFromDB(supabase, organizationId || '');
    if (trendingTopics.length > 0) {
      trendingContext = buildTrendingContext(trendingTopics);
    }
  }

  // Build brand context string
  const brandContextStr = brandContext ? buildBrandContextString(brandContext) : '';
  const contentPillars = brandContext?.contentPillars?.map(p => p.name) || [];

  // Build prompts based on action
  let systemPrompt = '';
  let userPrompt = '';

  switch (action) {
    case 'next_best':
      systemPrompt = `You are an expert content strategist. Analyze the brand context, topic history, and REAL-TIME TRENDING DATA to recommend the SINGLE best topic to create next.
Return JSON with: { "topic": string, "reason": string, "confidence": number (0-100), "pillar": string, "suggestedFormat": string, "timing": string, "trendingMatch": { "topic": string, "velocityScore": number, "source": string } | null }`;
      userPrompt = `${brandContextStr}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}
${trendingContext}

What is the SINGLE best topic to create next? PRIORITIZE trending topics if they fit the brand. Respond in Vietnamese.`;
      break;

    case 'weekly_plan':
      systemPrompt = `You are an expert content strategist. Create a balanced weekly content plan with 5-7 topic suggestions.
Return JSON with: { "weeklyPlan": [{ "day": string, "topic": string, "pillar": string, "format": string, "reason": string, "priority": number (1-10), "isTrendingBased": boolean, "trendingSource": string | null }], "weekTheme": string, "insights": string, "trendingTopicsUsed": number }`;
      userPrompt = `${brandContextStr}

Content Goal: ${contentGoal || 'engagement'}
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}

Recent Topic History:
${topicHistoryContext}
${trendingContext}

Create a weekly content plan with 5-7 diverse topics. INTEGRATE trending topics where appropriate. Respond in Vietnamese.`;
      break;

    case 'conflict_check':
      systemPrompt = `You are a content conflict detector. Analyze the given topics for potential conflicts.
Return JSON with: { "conflicts": [{ "topics": string[], "type": "duplicate" | "contradiction" | "cannibalization" | "timing", "severity": "high" | "medium" | "low", "explanation": string, "resolution": string }], "summary": string }`;
      userPrompt = `${brandContextStr}

Topics to check for conflicts:
${(topics || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Recent published topics:
${topicHistoryContext}

Identify any conflicts. Respond in Vietnamese.`;
      break;

    case 'learning':
      systemPrompt = `You are an AI learning from user feedback to improve future recommendations.
Return JSON with: { "learnings": string[], "adjustments": { "preferMore": string[], "preferLess": string[], "avoidPatterns": string[] }, "confidenceBoost": number }`;
      userPrompt = `${brandContextStr}

User just provided feedback:
- Topic: ${feedbackData?.topicId}
- Feedback: ${feedbackData?.feedback}
- Reason: ${feedbackData?.reason || 'Not specified'}

Topic history with feedback:
${topicHistoryContext}

What should we learn from this to improve future recommendations? Respond in Vietnamese.`;
      break;
  }

  // Call AI with metrics
  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    brandTemplateId,
    actionType: action,
    ...(params.model_override && { modelOverride: params.model_override }),
    ...(params.temperature && { temperatureOverride: params.temperature }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  if (!result.success) {
    if (result.error?.includes('Rate limit')) {
      return createRateLimitResponse();
    }
    if (result.error?.includes('Payment')) {
      return createCreditsExhaustedResponse();
    }
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  // Parse response
  const content = result.data?.choices?.[0]?.message?.content || '';
  let parsedResult;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    parsedResult = getDefaultRecommendationResult(action);
  }

  console.log(`[topic-ai:${action}] Completed in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    success: true,
    result: parsedResult,
    type: action,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Trending ==========
async function handleTrending(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { organizationId, forceRefresh } = params;
  const industry = brandContext?.industry?.[0] || params.industry || '';

  // Check cache first
  if (!forceRefresh && organizationId) {
    const { data: cached } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .order('velocity_score', { ascending: false })
      .limit(15);

    if (cached && cached.length > 0) {
      console.log('[topic-ai:trending] Cache hit');
      return new Response(JSON.stringify({
        success: true,
        data: cached,
        source: 'cache',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Fetch curated events and news
  const now = new Date();
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [eventsResult, newsResult] = await Promise.all([
    supabase
      .from('curated_events')
      .select('id, name, description, event_date, event_type, suggested_topics, suggested_angles, priority')
      .eq('is_active', true)
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', fourteenDaysLater.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5),
    supabase
      .from('curated_news')
      .select('id, title, summary, source_url, news_date, relevance_score, suggested_angles')
      .eq('is_active', true)
      .gt('expires_at', now.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(10),
  ]);

  const curatedEvents = eventsResult.data || [];
  const curatedNews = newsResult.data || [];

  // Search Perplexity for real-time trends
  const perplexityResult = await searchTrendingTopics(industry, brandContext?.brandName || '');

  // Build context for AI analysis
  let curatedContext = '';
  if (curatedEvents.length > 0) {
    curatedContext += `\n## SỰ KIỆN GẤP (trong 14 ngày tới):\n`;
    curatedEvents.forEach((event: any) => {
      const daysUntil = Math.ceil((new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      curatedContext += `- 🔴 ${event.name} (còn ${daysUntil} ngày): ${event.description || ''}\n`;
    });
  }

  if (curatedNews.length > 0) {
    curatedContext += `\n## TIN TỨC NGÀNH:\n`;
    curatedNews.forEach((news: any) => {
      curatedContext += `- ${news.title}: ${news.summary || 'N/A'}\n`;
    });
  }

  let webSearchContext = '';
  if (perplexityResult && perplexityResult.trends.length > 0) {
    webSearchContext = `\n## XU HƯỚNG WEB SEARCH REAL-TIME:\n`;
    perplexityResult.trends.forEach((trend: string, index: number) => {
      webSearchContext += `${index + 1}. ${trend}\n`;
    });
  }

  const brandContextStr = brandContext ? buildBrandContextString(brandContext) : '';

  // Fetch recent trending topics to avoid repetition
  const { data: recentTrending } = await supabase
    .from('trending_topics')
    .select('topic')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(30);
  
  const avoidTopics = recentTrending?.map((t: any) => t.topic) || [];

  // Generate random seed for variation
  const randomSeed = Math.random().toString(36).substring(2, 8);
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().toLocaleDateString('vi-VN', { weekday: 'long' });

  // Call AI for analysis with randomization - language-neutral instructions
  const systemPrompt = `You are an expert social media content trend analyst.
Analyze REAL DATA and generate a list of 10-12 trending topics relevant to the brand's market.

🎲 Variation Seed: ${randomSeed}
📅 Current time: ${dayOfWeek}, ${currentHour}h

IMPORTANT - AVOID REPETITION:
- Each generation must create a FRESH MIX from available data sources
- Prioritize NEW angles for hot trends
- Creatively combine different sources
- DO NOT reuse exact topics already generated

Respond in the same language as the brand context provided.

Return JSON array with format:
[{
  "topic": "Short trending topic name",
  "category": "seasonal" | "news" | "social_trend" | "industry_trend" | "viral",
  "velocity_score": 0-100,
  "peak_status": "rising" | "peaking" | "declining",
  "peak_prediction": "predicted peak time (e.g. '3-5 days')",
  "related_keywords": ["keyword1", "keyword2", "keyword3"],
  "engagement_potential": 0-100,
  "competition_level": "low" | "medium" | "high",
  "suggested_angles": ["angle 1", "angle 2", "angle 3"],
  "source": "curated_event" | "curated_news" | "web_search" | "ai"
}]`;

  // Build exclusion context if there are recent topics
  let exclusionContext = '';
  if (avoidTopics.length > 0) {
    exclusionContext = `\n⚠️ AVOID REPEATING (recently generated, CREATE ENTIRELY NEW TOPICS):\n${avoidTopics.slice(0, 15).join(', ')}\n`;
  }

  const userPrompt = `${brandContextStr}
${curatedContext}
${webSearchContext}
${exclusionContext}

Analyze and generate a list of NEW trending topics.`;

  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    actionType: 'trending',
    ...(params.model_override && { modelOverride: params.model_override }),
    ...(params.temperature && { temperatureOverride: params.temperature }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  if (!result.success) {
    if (result.error?.includes('Rate limit')) {
      return createRateLimitResponse();
    }
    if (result.error?.includes('Payment')) {
      return createCreditsExhaustedResponse();
    }
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  // Parse response
  const content = result.data?.choices?.[0]?.message?.content || '';
  let trendingTopics: any[] = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      trendingTopics = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('[topic-ai:trending] Failed to parse AI response');
  }

  // Save to database
  if (organizationId && trendingTopics.length > 0) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6);

    // Clear old trends and insert new ones
    await supabase
      .from('trending_topics')
      .delete()
      .eq('organization_id', organizationId)
      .lt('expires_at', now.toISOString());

    const recordsToInsert = trendingTopics.map(t => ({
      organization_id: organizationId,
      topic: t.topic,
      category: t.category,
      velocity_score: t.velocity_score,
      peak_status: t.peak_status,
      peak_prediction: t.peak_prediction,
      related_keywords: t.related_keywords,
      engagement_potential: t.engagement_potential,
      competition_level: t.competition_level,
      suggested_angles: t.suggested_angles,
      source: t.source,
      expires_at: expiresAt.toISOString(),
    }));

    await supabase.from('trending_topics').insert(recordsToInsert);
  }

  console.log(`[topic-ai:trending] Generated ${trendingTopics.length} trends in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    success: true,
    data: trendingTopics,
    source: 'ai',
    debug: {
      curatedEvents: curatedEvents.length,
      curatedNews: curatedNews.length,
      perplexityTrends: perplexityResult?.trends?.length || 0,
    },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Analysis ==========
async function handleAnalysis(
  action: 'gap_analysis' | 'cluster' | 'keywords' | 'refine_intel',
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { organizationId, brandTemplateId, contentGoal, topicToRefine } = params;

  // Fetch topic history
  const topicHistory = await fetchTopicHistory(supabase, organizationId, brandTemplateId, 100);
  const existingTopics = topicHistory.map(t => ({
    topic: t.topic,
    category: t.category,
    pillar: t.pillar,
    wasUsed: t.was_used,
    performance: t.performance_score,
  }));

  const contentPillars = brandContext?.contentPillars || [];

  // Build prompts based on analysis type
  let systemPrompt = `You are a content marketing analysis expert. Analyze data and return valid JSON. Respond in the same language as the brand/topic context provided.`;
  let userPrompt = '';

  if (action === 'gap_analysis') {
    userPrompt = `Phân tích GAP trong content strategy:

Brand: ${brandContext?.brandName || 'Unknown'}
Positioning: ${brandContext?.brandPositioning || 'N/A'}
Content Pillars: ${JSON.stringify(contentPillars)}
Content Goal: ${contentGoal}

Các topics đã có (${existingTopics.length}):
${existingTopics.slice(0, 30).map(t => `- ${t.topic} (pillar: ${t.pillar || 'none'}, perf: ${t.performance || 'N/A'})`).join('\n')}

Trả về JSON: { "gaps": [{ "pillar": string, "gapType": "missing|underperforming|overdue", "severity": "high|medium|low", "reason": string, "suggestedTopics": string[], "priority": number }], "insights": string, "recommendations": string[] }`;
  } else if (action === 'cluster') {
    userPrompt = `Phân cụm (cluster) các topics theo semantic similarity:

Các topics (${existingTopics.length}):
${existingTopics.slice(0, 50).map(t => `- ${t.topic}`).join('\n')}

Trả về JSON: { "clusters": [{ "clusterId": string, "clusterName": string, "topics": string[], "topKeywords": string[], "avgPerformance": number }], "unclustered": string[], "summary": string }`;
  } else if (action === 'keywords') {
    userPrompt = `Mở rộng từ khóa cho content strategy:

Brand: ${brandContext?.brandName || 'Unknown'}
Industry: ${JSON.stringify(brandContext?.industry || [])}
Content Goal: ${contentGoal}

Keywords đã có từ topics:
${existingTopics.slice(0, 30).map(t => t.topic).join(', ')}

Trả về JSON: { "lsiKeywords": string[], "trendingKeywords": string[], "longTailKeywords": string[], "competitorKeywords": string[], "keywordClusters": [{ "theme": string, "keywords": string[] }] }`;
  } else if (action === 'refine_intel') {
    if (!topicToRefine) {
      return createErrorResponse('topicToRefine is required for refine_intel action', 400);
    }
    userPrompt = `Tinh chỉnh và cải thiện topic sau theo nhiều góc độ khác nhau:

Brand: ${brandContext?.brandName || 'Unknown'}
Industry: ${JSON.stringify(brandContext?.industry || [])}
Content Goal: ${contentGoal}
Content Pillars: ${JSON.stringify(contentPillars)}

Topic gốc: "${topicToRefine}"

Context từ các topics đã có (${existingTopics.length}):
${existingTopics.slice(0, 10).map(t => `- ${t.topic}`).join('\n')}

Trả về JSON: { 
  "originalTopic": string,
  "refinedVersions": [{ 
    "topic": string, 
    "angle": string, 
    "targetAudience": string,
    "contentPillar": string,
    "estimatedEngagement": "high|medium|low",
    "differentiator": string
  }],
  "reasoning": string,
  "keywords": string[],
  "avoidDuplicating": string[]
}`;
  }

  // Call AI with metrics
  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    brandTemplateId,
    actionType: action,
    ...(params.model_override && { modelOverride: params.model_override }),
    ...(params.temperature && { temperatureOverride: params.temperature }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  if (!result.success) {
    if (result.error?.includes('Rate limit')) {
      return createRateLimitResponse();
    }
    if (result.error?.includes('Payment')) {
      return createCreditsExhaustedResponse();
    }
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  // Parse response
  const content = result.data?.choices?.[0]?.message?.content || '';
  let parsedResult;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    parsedResult = { error: 'Failed to parse AI response' };
  }

  console.log(`[topic-ai:${action}] Completed in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    success: true,
    analysisType: action,
    result: parsedResult,
    topicsAnalyzed: existingTopics.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Suggest Compliant Topic ==========
async function handleSuggestCompliant(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { topic, issues, organizationId } = params;

  if (!topic || !issues || issues.length === 0) {
    return createErrorResponse('topic and issues are required for suggest_compliant action', 400);
  }

  const issuesList = issues
    .map(i => `- ${i.type}: "${i.term}" - ${i.reason}`)
    .join('\n');

  // Build prompt to suggest compliant topic
  const prompt = `Topic gốc: "${topic}"

Các vấn đề compliance:
${issuesList}

${brandContext ? `Brand: ${brandContext.brandName}\nNgành: ${brandContext.industry?.join(', ') || 'N/A'}` : ''}

Viết lại topic này để:
1. Tránh TẤT CẢ các từ/claim bị cấm được liệt kê ở trên
2. Giữ nguyên ý tưởng chính và mục đích content
3. Tuân thủ quy định ngành
4. Vẫn hấp dẫn và thu hút người đọc

CHỈ TRẢ VỀ TOPIC MỚI, KHÔNG GIẢI THÍCH.`;

  // Call AI with metrics
  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    actionType: 'suggest_compliant',
    messages: [
      { 
        role: 'system', 
        content: 'Bạn là chuyên gia compliance content. Nhiệm vụ của bạn là viết lại topic để tuân thủ quy định mà vẫn giữ được sức hút.' 
      },
      { role: 'user', content: prompt }
    ],
    modelOverride: params.model_override || 'google/gemini-2.5-flash-lite',
    ...(params.temperature && { temperatureOverride: params.temperature }),
  });

  if (!result.success) {
    if (result.error?.includes('Rate limit')) {
      return createRateLimitResponse();
    }
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  const suggestedTopic = result.data?.choices?.[0]?.message?.content?.trim() || null;

  console.log(`[topic-ai:suggest_compliant] Completed in ${Date.now() - startTime}ms, suggested: "${suggestedTopic?.substring(0, 50)}..."`);

  return new Response(JSON.stringify({
    success: true,
    suggestedTopic,
    originalTopic: topic,
    issuesAddressed: issues.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Suggest Audience ==========
async function handleSuggestAudience(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { topic, contentGoal, organizationId, brandTemplateId } = params;

  if (!topic || topic.trim().length < 5) {
    return createErrorResponse('topic is required (min 5 chars)', 400);
  }

  const personas = brandContext?.personas || [];
  console.log(`[topic-ai:suggest_audience] Topic: "${topic.substring(0, 50)}...", Personas: ${personas.length}`);

  // If no personas, generate audience description directly with AI
  if (personas.length === 0) {
    const prompt = `Phân tích chủ đề sau và đề xuất đối tượng mục tiêu phù hợp nhất:

CHỦ ĐỀ: "${topic}"
MỤC TIÊU NỘI DUNG: ${contentGoal || 'engagement'}

Trả về JSON:
{
  "suggestedAudience": "Mô tả đối tượng mục tiêu chi tiết (30-50 từ)",
  "keyCharacteristics": ["đặc điểm 1", "đặc điểm 2", "đặc điểm 3"],
  "reasoning": "Lý do vì sao đối tượng này phù hợp với topic (1-2 câu)"
}`;

    const result = await callAIWithMetrics(supabase, {
      functionName: 'topic-ai',
      organizationId,
      userId: params._userId,
      brandTemplateId,
      actionType: 'suggest_audience',
      ...(params.model_override && { modelOverride: params.model_override }),
      ...(params.temperature && { temperatureOverride: params.temperature }),
      messages: [
        { role: 'system', content: 'Bạn là Content Strategist chuyên phân tích đối tượng mục tiêu cho nội dung marketing.' },
        { role: 'user', content: prompt }
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
    });

    if (!result.success) {
      if (result.error?.includes('Rate limit')) return createRateLimitResponse();
      if (result.error?.includes('Payment')) return createCreditsExhaustedResponse();
      return createErrorResponse(result.error || 'AI call failed', 500);
    }

    let parsed: any = {
      suggestedAudience: 'Không thể phân tích',
      keyCharacteristics: [],
      reasoning: '',
    };

    try {
      const content = result.data?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* Use default */ }

    console.log(`[topic-ai:suggest_audience] No personas, generated description in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      matchedPersonaId: null,
      matchedPersonaName: null,
      matchScore: 0,
      suggestedAudience: parsed.suggestedAudience,
      reasoning: parsed.reasoning || 'Đề xuất dựa trên phân tích nội dung topic',
      keyCharacteristics: parsed.keyCharacteristics || [],
      alternativePersonaIds: [],
      alternativePersonaNames: [],
      matchMethod: 'ai_generate',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ======== PHASE 2: SEMANTIC MATCHING ========
  // Try semantic matching first (fast, no AI cost)
  const semanticMatches = await semanticMatchPersona(topic, personas, {
    minScore: 50, // Lower threshold for semantic
    maxResults: 5,
  });

  console.log(`[topic-ai:suggest_audience] Semantic matches: ${semanticMatches.length}`);

  // If semantic matching found good matches (score >= 70), use them directly
  const bestSemanticMatch = semanticMatches.length > 0 ? semanticMatches[0] : null;
  const hasStrongSemanticMatch = bestSemanticMatch && bestSemanticMatch.score >= 70;

  if (hasStrongSemanticMatch) {
    // Build audience description from matched persona
    const matchedPersona = personas.find(p => p.id === bestSemanticMatch.personaId);
    const suggestedAudience = matchedPersona 
      ? `${matchedPersona.name}${matchedPersona.occupation ? ` (${matchedPersona.occupation})` : ''}: ${(matchedPersona.pain_points || []).slice(0, 2).join(', ')} - ${(matchedPersona.desires || []).slice(0, 2).join(', ')}`
      : bestSemanticMatch.personaName;

    const alternatives = semanticMatches.slice(1, 4).filter(m => m.score >= 50);

    console.log(`[topic-ai:suggest_audience] Strong semantic match: ${bestSemanticMatch.personaName} (${bestSemanticMatch.score}%), skipping AI call, took ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      matchedPersonaId: bestSemanticMatch.personaId,
      matchedPersonaName: bestSemanticMatch.personaName,
      matchScore: bestSemanticMatch.score,
      suggestedAudience,
      reasoning: `Semantic matching với ${bestSemanticMatch.matchType}: Nội dung topic phù hợp ${bestSemanticMatch.score}% với pain points và desires của ${bestSemanticMatch.personaName}`,
      keyCharacteristics: matchedPersona 
        ? [
            matchedPersona.occupation || '',
            matchedPersona.age_range || '',
            ...(matchedPersona.pain_points || []).slice(0, 2),
          ].filter(Boolean)
        : [],
      alternativePersonaIds: alternatives.map(a => a.personaId),
      alternativePersonaNames: alternatives.map(a => a.personaName),
      matchMethod: bestSemanticMatch.matchType,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ======== FALLBACK: AI MATCHING ========
  // Semantic matching didn't find strong match, use AI for detailed analysis
  const personasInfo = personas.map(p => ({
    id: p.id,
    name: p.name,
    occupation: p.occupation || 'N/A',
    age_range: p.age_range || 'N/A',
    pain_points: (p.pain_points || []).slice(0, 5),
    desires: (p.desires || []).slice(0, 5),
    buying_triggers: (p.buying_triggers || []).slice(0, 3),
    typical_funnel_stage: p.typical_funnel_stage || 'awareness',
  }));

  // Include semantic matches as hints for AI
  const semanticHint = semanticMatches.length > 0
    ? `\nGỢI Ý TỪ SEMANTIC MATCHING (có thể tham khảo):\n${semanticMatches.slice(0, 3).map(m => `- ${m.personaName}: ${m.score}%`).join('\n')}\n`
    : '';

  const prompt = `Phân tích chủ đề nội dung và matching với customer personas:

CHỦ ĐỀ: "${topic}"
MỤC TIÊU: ${contentGoal || 'engagement'}
${semanticHint}
DANH SÁCH PERSONAS:
${personasInfo.map((p, i) => `
${i + 1}. ${p.name} (ID: ${p.id})
   - Nghề nghiệp: ${p.occupation}, Tuổi: ${p.age_range}
   - Pain points: ${p.pain_points.join(', ')}
   - Desires: ${p.desires.join(', ')}
   - Funnel stage: ${p.typical_funnel_stage}
`).join('')}

NHIỆM VỤ:
1. Đánh giá mức độ phù hợp của topic với từng persona (0-100)
2. Xác định persona PHÙ HỢP NHẤT (score > 70 = match tốt)
3. Giải thích ngắn gọn lý do matching

Trả về JSON:
{
  "matches": [
    { "personaId": "uuid", "personaName": "tên", "score": 0-100, "reason": "lý do ngắn" }
  ],
  "bestMatchId": "uuid hoặc null nếu không có match > 70",
  "bestMatchName": "tên hoặc null",
  "bestMatchScore": 0-100,
  "suggestedAudience": "Mô tả đối tượng tổng hợp dựa trên personas phù hợp",
  "reasoning": "Giải thích chi tiết vì sao đây là đối tượng tốt nhất",
  "keyCharacteristics": ["đặc điểm 1", "đặc điểm 2", "đặc điểm 3"]
}`;

  const result = await callAIWithMetrics(supabase, {
    functionName: 'topic-ai',
    organizationId,
    userId: params._userId,
    brandTemplateId,
    actionType: 'suggest_audience',
    messages: [
      { role: 'system', content: 'Bạn là Content Strategist chuyên nghiệp, giỏi phân tích target audience và matching content với personas.' },
      { role: 'user', content: prompt }
    ],
    modelOverride: params.model_override || 'google/gemini-2.5-flash',
    ...(params.temperature && { temperatureOverride: params.temperature }),
  });

  if (!result.success) {
    // If AI fails but we have semantic matches, use them as fallback
    if (semanticMatches.length > 0) {
      const fallbackMatch = semanticMatches[0];
      const fallbackPersona = personas.find(p => p.id === fallbackMatch.personaId);
      
      console.log(`[topic-ai:suggest_audience] AI failed, using semantic fallback: ${fallbackMatch.personaName}`);
      
      return new Response(JSON.stringify({
        success: true,
        matchedPersonaId: fallbackMatch.score >= 60 ? fallbackMatch.personaId : null,
        matchedPersonaName: fallbackMatch.score >= 60 ? fallbackMatch.personaName : null,
        matchScore: fallbackMatch.score,
        suggestedAudience: fallbackPersona?.name || fallbackMatch.personaName,
        reasoning: `Semantic matching (AI fallback): Score ${fallbackMatch.score}%`,
        keyCharacteristics: fallbackPersona?.pain_points?.slice(0, 3) || [],
        alternativePersonaIds: semanticMatches.slice(1, 4).map(m => m.personaId),
        alternativePersonaNames: semanticMatches.slice(1, 4).map(m => m.personaName),
        matchMethod: 'semantic_fallback',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (result.error?.includes('Rate limit')) return createRateLimitResponse();
    if (result.error?.includes('Payment')) return createCreditsExhaustedResponse();
    return createErrorResponse(result.error || 'AI call failed', 500);
  }

  let parsed: any = {
    matches: [],
    bestMatchId: null,
    bestMatchName: null,
    bestMatchScore: 0,
    suggestedAudience: '',
    reasoning: '',
    keyCharacteristics: [],
  };

  try {
    const content = result.data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { /* Use default */ }

  // Get alternative persona IDs (top 3 with score > 50, excluding best match)
  const alternatives = (parsed.matches || [])
    .filter((m: any) => m.personaId !== parsed.bestMatchId && m.score >= 50)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  console.log(`[topic-ai:suggest_audience] AI matched: ${parsed.bestMatchName || 'none'} (${parsed.bestMatchScore}%), alternatives: ${alternatives.length}, took ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    success: true,
    matchedPersonaId: parsed.bestMatchScore >= 70 ? parsed.bestMatchId : null,
    matchedPersonaName: parsed.bestMatchScore >= 70 ? parsed.bestMatchName : null,
    matchScore: parsed.bestMatchScore || 0,
    suggestedAudience: parsed.suggestedAudience || '',
    reasoning: parsed.reasoning || '',
    keyCharacteristics: parsed.keyCharacteristics || [],
    alternativePersonaIds: alternatives.map((a: any) => a.personaId),
    alternativePersonaNames: alternatives.map((a: any) => a.personaName),
    matchMethod: 'ai',
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Helper Functions ==========

function buildSuggestPrompts(params: {
  brandContext: TopicBrandContext | null;
  contentGoal?: string;
  format?: string;
  recentTopics?: string[];
  seasonality?: string;
  learningContext?: any;
  industryInsight?: any;
  audienceQA?: any;
  query?: string;
  categoryHint?: string;
  topic?: string;
  instruction?: string;
}): { systemPrompt: string; userPrompt: string } {
  const { brandContext, contentGoal, format, recentTopics, seasonality, learningContext, industryInsight, audienceQA, query, categoryHint, topic, instruction } = params;

  const goalLabels: Record<string, string> = {
    education: 'giáo dục, chia sẻ kiến thức chuyên môn',
    awareness: 'tăng nhận diện thương hiệu',
    engagement: 'tăng tương tác',
    expertise: 'xây dựng hình ảnh chuyên gia',
    conversion: 'thúc đẩy chuyển đổi',
  };

  // Mandatory content goal constraints — maps each goal to strict topic guidelines
  const goalConstraints: Record<string, string> = {
    education: `- Ưu tiên TOFU (60%): How-to, hướng dẫn, tips, kiến thức nền tảng, giải thích thuật ngữ
- Topics PHẢI mang tính giáo dục: dạy kiến thức, chia sẻ kinh nghiệm, phân tích chuyên sâu
- Funnel balance: 60% TOFU, 25% MOFU, 15% BOFU
- TRÁNH: Topics bán hàng trực tiếp, CTA mạnh, so sánh giá`,
    awareness: `- Ưu tiên brand storytelling, câu chuyện thương hiệu, giá trị cốt lõi
- Topics PHẢI giúp khách hàng MỚI biết đến và nhớ thương hiệu
- Funnel balance: 50% TOFU, 30% MOFU, 20% BOFU
- Ưu tiên: Behind-the-scenes, founder story, brand values, social proof rộng`,
    engagement: `- Ưu tiên tương tác: poll, câu hỏi, thử thách, trend, UGC, debate
- Topics PHẢI kích thích comment, share, save — không chỉ đọc rồi lướt
- Funnel balance: 45% TOFU, 35% MOFU, 20% BOFU
- Ưu tiên: Controversial (nhẹ), so sánh, "bạn thuộc team nào?", meme ngành`,
    expertise: `- Ưu tiên xây dựng thought leadership, chuyên gia đầu ngành
- Topics PHẢI thể hiện chiều sâu chuyên môn: phân tích, case study, framework, dự đoán xu hướng
- Funnel balance: 40% TOFU, 40% MOFU, 20% BOFU
- Ưu tiên: Data-driven insights, industry reports, myth-busting, chuyên gia review`,
    conversion: `- Ưu tiên BOFU (60%): So sánh sản phẩm, testimonial, offer, pricing, CTA rõ ràng
- Topics PHẢI hướng đến hành động mua/đăng ký/liên hệ
- Funnel balance: 15% TOFU, 25% MOFU, 60% BOFU
- Ưu tiên: "X lý do chọn [brand]", trước-sau, demo, limited offer, social proof mua hàng`,
  };

  // Build brand section
  let brandSection = '';
  let mandatoryBrandSection = '';
  if (brandContext) {
    brandSection = buildBrandContextString(brandContext);
    
    // Extract brand signals for MANDATORY BRAND ALIGNMENT
    const pillars = brandContext.contentPillars?.map(p => p.name).filter(Boolean) || [];
    const products = brandContext.products?.map(p => p.name).filter(Boolean) || [];
    const painPoints = brandContext.personas?.flatMap(p => p.pain_points || []).filter(Boolean).slice(0, 8) || [];
    const desires = brandContext.personas?.flatMap(p => p.desires || []).filter(Boolean).slice(0, 5) || [];
    const evergreenThemes = brandContext.evergreenThemes || [];
    const uvp = brandContext.uniqueValueProposition || '';
    
    mandatoryBrandSection = `
## 🔒 MANDATORY BRAND ALIGNMENT (ĐỌC TRƯỚC MỌI THỨ)
Thương hiệu: "${brandContext.brandName}"
${uvp ? `USP: "${uvp}"` : ''}
${pillars.length ? `Content Pillars: ${pillars.join(', ')}` : ''}
${products.length ? `Sản phẩm/dịch vụ: ${products.join(', ')}` : ''}
${painPoints.length ? `Pain points khách hàng: ${painPoints.join('; ')}` : ''}
${desires.length ? `Desires khách hàng: ${desires.join('; ')}` : ''}
${evergreenThemes.length ? `Chủ đề evergreen: ${evergreenThemes.join(', ')}` : ''}

### QUY TẮC KHÓA BRAND:
- MỌI topic PHẢI liên quan TRỰC TIẾP đến sản phẩm/dịch vụ, chuyên môn hoặc content pillars của "${brandContext.brandName}"
- CẤM topic chỉ "đúng ngành" nhưng KHÔNG gắn được với offerings cụ thể của Brand
- CẤM topic trend chung chung nếu không nối được về sản phẩm/dịch vụ/góc chuyên môn của Brand
- Mỗi topic PHẢI trả lời được: "Điều này giúp ${brandContext.brandName} bán/giáo dục/kết nối khách hàng thế nào?"

### VÍ DỤ ĐÚNG/SAI:
${products.length ? `✅ ĐÚNG: Topic liên quan "${products[0]}" — nối trực tiếp về sản phẩm Brand
❌ SAI: Topic chung về ngành mà không nhắc đến sản phẩm/dịch vụ cụ thể của "${brandContext.brandName}"` : `✅ ĐÚNG: Topic xoay quanh content pillars: ${pillars.slice(0, 2).join(', ')}
❌ SAI: Topic chung ngành mà không gắn với chuyên môn đặc thù của Brand`}
`;
  }

  // Build industry data section
  let realDataSection = '';
  if (industryInsight) {
    realDataSection = `\n## DỮ LIỆU THỰC TẾ TỪ WEB SEARCH (CHỈ LÀ THAM KHẢO — KHÔNG override Brand rules):`;
    if (industryInsight.insights?.length) {
      realDataSection += `\n### Industry Insights:\n${industryInsight.insights.slice(0, 3).map((i: string) => `- ${i}`).join('\n')}`;
    }
    if (industryInsight.statistics?.length) {
      realDataSection += `\n### Thống kê số liệu:\n${industryInsight.statistics.slice(0, 3).map((s: string) => `- ${s}`).join('\n')}`;
    }
    realDataSection += `\n→ Chỉ dùng dữ liệu web nếu nối được về sản phẩm/dịch vụ của Brand. KHÔNG tạo topic chỉ vì có data.`;
  }

  // Build audience Q&A section
  let audienceQASection = '';
  if (audienceQA?.questions?.length) {
    audienceQASection = `\n## CÂU HỎI THỰC TẾ TỪ KHÁCH HÀNG:\n${audienceQA.questions.slice(0, 8).map((q: string, i: number) => `${i+1}. ${q}`).join('\n')}

→ ƯU TIÊN CAO: Tạo 2-3 topics TRỰC TIẾP trả lời các câu hỏi trên (nhưng vẫn phải gắn với Brand)`;
  }

  // Build learning section
  let learningSection = '';
  if (learningContext) {
    learningSection = buildLearningSection(learningContext) || '';
  }

  const now = new Date();
  const currentDate = now.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const currentMonth = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  // Build topic anchoring section (HIGHEST PRIORITY — prevents topic drift)
  let topicAnchoringSection = '';
  if (topic) {
    topicAnchoringSection = `
## ⛔ ABSOLUTE RULE — READ THIS FIRST:
The user has specified a SPECIFIC topic for their content: "${topic}".
${instruction ? `Additional context: ${instruction}` : ''}

ALL your topic suggestions MUST be directly about "${topic}".
You may suggest different ANGLES or HOOKS for this topic, but the CORE SUBJECT must match.

FORBIDDEN: Do NOT suggest unrelated trending topics like AI trends, marketing trends,
or any topic that is NOT about "${topic}".

GOOD examples for "${topic}":
- Different angles of "${topic}" (educational, comparison, case study, tips)
- Specific sub-topics within "${topic}"
- Pain points related to "${topic}"

BAD examples (NEVER suggest these):
- Topics about unrelated industries or trends
- Generic trending topics that don't mention "${topic}"

→ If you suggest ANY topic not directly related to "${topic}", the output is INVALID.
`;
  }

  // Build mandatory content goal section
  const effectiveGoal = contentGoal || 'education';
  const mandatoryGoalSection = `
## ⚠️ MỤC TIÊU NỘI DUNG BẮT BUỘC: "${goalLabels[effectiveGoal]}"
${goalConstraints[effectiveGoal] || goalConstraints.education}
- TẤT CẢ topics PHẢI phục vụ mục tiêu "${goalLabels[effectiveGoal]}"
- Topics KHÔNG phù hợp mục tiêu sẽ bị LOẠI BỎ

### MA TRẬN GOAL × TOPIC TYPE:
${effectiveGoal === 'education' ? '✅ Nên: how-to, hướng dẫn, tips, giải thích, "X điều cần biết"\n❌ Tránh: sales pitch, offer, giá cả' : ''}${effectiveGoal === 'awareness' ? '✅ Nên: brand story, values, behind-the-scenes, founder journey, culture\n❌ Tránh: hard-sell, technical deep-dive' : ''}${effectiveGoal === 'engagement' ? '✅ Nên: câu hỏi, poll, "team nào?", trend, debate nhẹ, UGC\n❌ Tránh: bài giảng dài, báo cáo khô khan' : ''}${effectiveGoal === 'expertise' ? '✅ Nên: phân tích chuyên sâu, case study, framework, dự đoán, myth-busting\n❌ Tránh: content hời hợt, listicle đơn giản' : ''}${effectiveGoal === 'conversion' ? '✅ Nên: so sánh sản phẩm, testimonial, offer, trước-sau, "X lý do chọn Brand"\n❌ Tránh: content thuần giáo dục không có CTA' : ''}
`;

  const systemPrompt = `Bạn là Content Strategist chuyên nghiệp với 10+ năm kinh nghiệm content marketing tại Việt Nam.
${mandatoryBrandSection}
${topicAnchoringSection}
${mandatoryGoalSection}
⚠️ NGÀY HIỆN TẠI: ${currentDate}. Chúng ta đang ở ${currentMonth}.
- TẤT CẢ topics PHẢI phản ánh thời điểm hiện tại (${now.getFullYear()}).
- TUYỆT ĐỐI KHÔNG đề cập năm cũ (2024, 2025) trừ khi so sánh với hiện tại.
- Nếu đề cập năm, PHẢI dùng ${now.getFullYear()} hoặc ${now.getFullYear() + 1}.
${brandSection}
${realDataSection}
${audienceQASection}
${learningSection}

## OUTPUT FORMAT:
Trả về JSON array với ${topic ? '3-5' : '8-10'} topics:
[{
  "topic": "Tiêu đề chi tiết (15-50 từ)",
  "category": "evergreen" | "trending" | "seasonal" | "reactive",
  "pillar": "Tên content pillar phù hợp",
  "reasoning": "Lý do ngắn gọn (1-2 câu)",
  "formats": ["carousel", "script", "multichannel"],
  "relatedKeywords": ["kw1", "kw2", "kw3"],
  "scores": { "brandFit": 0-100, "trend": 0-100, "competition": 0-100, "engagement": 0-100 },
  "estimatedEngagement": "high" | "medium" | "low",
  "topicType": "problem" | "solution" | "story" | "data",
  "funnelStage": "tofu" | "mofu" | "bofu",
  "emotionalTone": "inspire" | "educate" | "entertain" | "convince",
  "searchIntent": "informational" | "navigational" | "commercial" | "transactional",
  "contentTier": "hero" | "hub" | "hygiene",
  "mediaOwnership": "owned" | "earned" | "paid",
  "journeyStage": "awareness" | "consideration" | "decision" | "loyalty"
}]

## BALANCE theo mục tiêu "${effectiveGoal}" (xem phần MỤC TIÊU BẮT BUỘC ở trên)`;

  // Build category hint guidance
  const categoryHintMap: Record<string, string> = {
    'Viral tuần này': '🔥 HƯỚNG VIRAL: Tập trung vào các chủ đề có khả năng viral cao trong tuần này. Ưu tiên: gây tranh luận nhẹ, số liệu bất ngờ, trend mạng xã hội, câu chuyện gây sốc, so sánh gây tò mò. Tất cả topics PHẢI có tiềm năng chia sẻ cao.',
    'Theo trend': '📈 THEO TREND: Tập trung vào xu hướng đang hot và trending hiện tại. Ưu tiên: tin tức nóng trong ngành, trend TikTok/Reels, sự kiện đang được bàn tán, hashtag trending. Topics phải bắt kịp xu hướng mới nhất.',
    'Mùa lễ hội': '🎁 MÙA LỄ HỘI: Tập trung vào các chủ đề liên quan đến mùa lễ, sự kiện, ngày kỷ niệm sắp tới. Ưu tiên: khuyến mãi theo mùa, quà tặng, tips mùa lễ, chia sẻ kỷ niệm, content cảm xúc theo dịp.',
    'So sánh A vs B': '⚡ SO SÁNH A vs B: Tập trung vào dạng content so sánh, đối chiếu. Ưu tiên: so sánh sản phẩm/dịch vụ, trước vs sau, cách cũ vs cách mới, myth vs fact, expectation vs reality. Format phải dạng đối lập rõ ràng.',
  };
  const categoryGuidance = categoryHint ? (categoryHintMap[categoryHint] || `🎯 HƯỚNG ĐI: Tập trung gợi ý các chủ đề theo hướng "${categoryHint}". Tất cả topics phải phù hợp với hướng đi này.`) : '';

  const userPrompt = `Gợi ý ${topic ? '3-5' : '8-10'} chủ đề content cho:
- Mục tiêu: ${goalLabels[contentGoal || 'education']}
- Format: ${format || 'all'}
${brandContext ? `- Brand: ${brandContext.brandName}` : ''}
${topic ? `\n🎯 CHỦ ĐỀ BẮT BUỘC: "${topic}"\n→ TẤT CẢ topics PHẢI xoay quanh chủ đề này. Gợi ý các góc tiếp cận khác nhau (educational, comparison, case study, tips & tricks, storytelling, myth-busting).` : ''}
${categoryGuidance ? `\n${categoryGuidance}` : ''}
${query ? `\n🎯 YÊU CẦU CỤ THỂ CỦA USER: "${query}"\n→ ƯU TIÊN CAO: Các topic phải liên quan trực tiếp đến yêu cầu trên.` : ''}
${recentTopics?.length ? `\nTRÁNH topics tương tự: ${recentTopics.slice(0, 5).join('; ')}` : ''}

Trả về JSON array theo format đã định nghĩa.`;

  return { systemPrompt, userPrompt };
}

function parseTopicSuggestions(content: string, industryInsight?: any): any[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: any) => {
      const hasDataPattern = /\d+%|\d+\s*(triệu|tỷ|nghìn|K|M)/i.test(item.topic);
      const usedPerplexity = !!(industryInsight && industryInsight.insights?.length > 0);

      return {
        topic: item.topic || '',
        category: item.category || 'evergreen',
        pillar: item.pillar,
        reasoning: item.reasoning || '',
        formats: item.formats || ['multichannel'],
        relatedKeywords: item.relatedKeywords || [],
        scores: {
          brandFit: Math.min(100, Math.max(0, item.scores?.brandFit || 50)),
          trend: Math.min(100, Math.max(0, item.scores?.trend || 50)),
          competition: Math.min(100, Math.max(0, item.scores?.competition || 50)),
          engagement: Math.min(100, Math.max(0, item.scores?.engagement || 50)),
        },
        estimatedEngagement: item.estimatedEngagement || 'medium',
        topicType: item.topicType || 'solution',
        funnelStage: item.funnelStage || 'tofu',
        emotionalTone: item.emotionalTone || 'educate',
        searchIntent: item.searchIntent || inferSearchIntent(item.funnelStage, item.topicType),
        contentTier: item.contentTier || inferContentTier(item.category, item.searchIntent, item.funnelStage),
        mediaOwnership: item.mediaOwnership || inferMediaOwnership(item.formats, item.contentTier, item.category, item.topicType),
        journeyStage: item.journeyStage || inferJourneyStage(item.funnelStage, item.category, item.topicType),
        dataSources: {
          hasRealData: usedPerplexity && hasDataPattern,
          perplexity: usedPerplexity,
          statistics: [],
          citations: industryInsight?.citations?.slice(0, 3) || [],
        },
      };
    });
  } catch {
    return [];
  }
}

/**
 * Post-generation filtering: validate each topic against Brand signals and Content Goal
 * Uses heuristic matching (not AI self-scores) to remove misaligned topics
 */
function filterByBrandAndGoal(
  suggestions: any[],
  brandContext: TopicBrandContext,
  contentGoal: string
): any[] {
  // Build brand signal keywords for matching
  const brandSignals: string[] = [];
  
  // Brand name variations
  if (brandContext.brandName) {
    brandSignals.push(brandContext.brandName.toLowerCase());
  }
  
  // Industry keywords — CRITICAL for filtering cross-industry topics
  const industryKeywords: string[] = [];
  if (brandContext.industry?.length) {
    for (const ind of brandContext.industry) {
      // Split industry name into meaningful words (>2 chars)
      const words = ind.toLowerCase().split(/[\s&,\/]+/).filter(w => w.length > 2);
      industryKeywords.push(...words);
      industryKeywords.push(ind.toLowerCase());
    }
  }
  
  // Content pillars
  if (brandContext.contentPillars?.length) {
    for (const p of brandContext.contentPillars) {
      if (p.name) brandSignals.push(p.name.toLowerCase());
      if (p.keywords?.length) brandSignals.push(...p.keywords.map(k => k.toLowerCase()));
    }
  }
  
  // Products/services
  if (brandContext.products?.length) {
    for (const p of brandContext.products) {
      if (p.name) brandSignals.push(p.name.toLowerCase());
      if (p.category) brandSignals.push(p.category.toLowerCase());
      // Add USPs and pain_points_solved as signals
      if (p.unique_selling_points?.length) {
        for (const usp of p.unique_selling_points) {
          const words = usp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          brandSignals.push(...words.slice(0, 3));
        }
      }
    }
  }
  
  // Persona pain points and desires
  if (brandContext.personas?.length) {
    for (const p of brandContext.personas) {
      if (p.pain_points?.length) brandSignals.push(...p.pain_points.map(pp => pp.toLowerCase().substring(0, 40)));
      if (p.desires?.length) brandSignals.push(...p.desires.map(d => d.toLowerCase().substring(0, 40)));
    }
  }
  
  // Evergreen themes
  if (brandContext.evergreenThemes?.length) {
    brandSignals.push(...brandContext.evergreenThemes.map(t => t.toLowerCase()));
  }
  
  // UVP keywords — only specific words (>5 chars to avoid generic matches like "giải", "pháp")
  if (brandContext.uniqueValueProposition) {
    const uvpWords = brandContext.uniqueValueProposition.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 5 && !['chúng', 'không', 'những', 'được', 'trong', 'nhưng', 'cùng', 'mang', 'tạo'].includes(w));
    brandSignals.push(...uvpWords.slice(0, 8));
  }

  // Deduplicate signals
  const uniqueSignals = [...new Set(brandSignals)].filter(s => s.length >= 3);
  const uniqueIndustryKw = [...new Set(industryKeywords)].filter(s => s.length >= 2);
  
  console.log(`[filterByBrandAndGoal] Brand: "${brandContext.brandName}", signals: ${uniqueSignals.length}, industry kw: ${uniqueIndustryKw.length}`);

  // Goal-funnel validation
  const goalFunnelMap: Record<string, string[]> = {
    education: ['tofu', 'mofu'],
    awareness: ['tofu', 'mofu'],
    engagement: ['tofu', 'mofu'],
    expertise: ['tofu', 'mofu'],
    conversion: ['mofu', 'bofu'],
  };
  const allowedFunnels = goalFunnelMap[contentGoal] || ['tofu', 'mofu', 'bofu'];

  // Score each topic
  const scored = suggestions.map(s => {
    const topicLower = (s.topic || '').toLowerCase();
    const reasoningLower = (s.reasoning || '').toLowerCase();
    const pillarLower = (s.pillar || '').toLowerCase();
    const combined = topicLower + ' ' + reasoningLower + ' ' + pillarLower;
    
    // Brand fit: how many brand signals match
    let brandMatches = 0;
    for (const signal of uniqueSignals) {
      if (combined.includes(signal)) {
        brandMatches++;
      }
    }
    
    // Industry fit: how many industry keywords match
    let industryMatches = 0;
    for (const kw of uniqueIndustryKw) {
      if (combined.includes(kw)) {
        industryMatches++;
      }
    }
    
    // Funnel fit
    const funnelFit = allowedFunnels.includes(s.funnelStage || 'tofu');
    
    // Topic is relevant if it matches brand signals OR industry keywords
    // NO longer trust AI self-reported brandFit scores — they are unreliable
    const hasBrandRelevance = brandMatches >= 1 || industryMatches >= 1;
    const relevanceScore = brandMatches * 2 + industryMatches;
    
    return { ...s, _brandMatches: brandMatches, _industryMatches: industryMatches, _funnelFit: funnelFit, _hasBrandRelevance: hasBrandRelevance, _relevanceScore: relevanceScore };
  });

  // Filter: keep topics with brand/industry relevance
  const passing = scored.filter(s => s._hasBrandRelevance);
  
  let result: any[];
  if (passing.length >= 3) {
    // Sort by relevance score desc
    result = passing.sort((a, b) => b._relevanceScore - a._relevanceScore);
  } else {
    // Fallback: sort by relevance and take top 8 — but log warning
    result = scored.sort((a, b) => b._relevanceScore - a._relevanceScore).slice(0, 8);
    console.warn(`[filterByBrandAndGoal] Only ${passing.length}/${scored.length} passed brand filter for "${brandContext.brandName}". Keeping top 8 by relevance.`);
  }
  
  // Clean internal scoring fields
  return result.map(({ _brandMatches, _industryMatches, _funnelFit, _hasBrandRelevance, _relevanceScore, ...rest }) => rest);
}

function parseRefinedTopics(content: string, brandContext: TopicBrandContext | null): any[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    const angleToJourneyMap: Record<string, string> = {
      'educational': 'awareness',
      'storytelling': 'awareness',
      'controversial': 'awareness',
      'practical': 'consideration',
      'solution': 'consideration',
      'data': 'consideration',
    };

    return parsed.map((item: any) => {
      const result: any = {
        topic: item.topic || '',
        angle: item.angle || 'general',
        hook: item.hook || '',
        targetPersona: item.targetPersona,
        productFit: item.productFit,
        suggestedJourneyStage: angleToJourneyMap[item.angle?.toLowerCase()] || 'awareness',
      };

      // Match persona ID (with null-safe checks)
      if (item.targetPersona && brandContext?.personas?.length) {
        const targetLower = item.targetPersona.toLowerCase();
        const matchedPersona = brandContext.personas.find((p: any) => {
          const personaName = p.name?.toLowerCase() || '';
          return personaName.includes(targetLower) || targetLower.includes(personaName);
        });
        if (matchedPersona) result.targetPersonaId = matchedPersona.id;
      }

      // Match product ID (with null-safe checks)
      if (item.productFit && brandContext?.products?.length) {
        const fitLower = item.productFit.toLowerCase();
        const matchedProduct = brandContext.products.find((p: any) => {
          const productName = p.name?.toLowerCase() || '';
          return productName.includes(fitLower) || fitLower.includes(productName);
        });
        if (matchedProduct) result.productFitId = matchedProduct.id;
      }

      return result;
    });
  } catch {
    return [];
  }
}

function getDefaultSuggestions(contentGoal?: string): any[] {
  return [
    {
      topic: 'Hướng dẫn từng bước cho người mới bắt đầu',
      category: 'evergreen',
      reasoning: 'Nội dung hướng dẫn luôn có giá trị lâu dài',
      formats: ['carousel', 'script', 'multichannel'],
      relatedKeywords: ['hướng dẫn', 'bắt đầu', 'cơ bản'],
      scores: { brandFit: 80, trend: 65, competition: 75, engagement: 80 },
      estimatedEngagement: 'high',
      topicType: 'solution',
      funnelStage: 'tofu',
      emotionalTone: 'educate',
      searchIntent: 'informational',
      contentTier: 'hygiene',
      mediaOwnership: 'owned',
      journeyStage: 'awareness',
    },
    {
      topic: '5 sai lầm phổ biến và cách tránh',
      category: 'evergreen',
      reasoning: 'Người dùng luôn muốn tránh sai lầm',
      formats: ['carousel', 'multichannel'],
      relatedKeywords: ['sai lầm', 'tránh', 'kinh nghiệm'],
      scores: { brandFit: 75, trend: 70, competition: 65, engagement: 85 },
      estimatedEngagement: 'high',
      topicType: 'problem',
      funnelStage: 'tofu',
      emotionalTone: 'educate',
      searchIntent: 'informational',
      contentTier: 'hygiene',
      mediaOwnership: 'owned',
      journeyStage: 'awareness',
    },
  ];
}

function getDefaultRecommendationResult(action: string): any {
  switch (action) {
    case 'next_best':
      return { topic: 'Không thể tạo đề xuất', reason: 'Hãy thử lại sau', confidence: 0, pillar: 'general', suggestedFormat: 'post', timing: 'anytime' };
    case 'weekly_plan':
      return { weeklyPlan: [], weekTheme: '', insights: 'Không thể tạo kế hoạch' };
    case 'conflict_check':
      return { conflicts: [], summary: 'Không phát hiện xung đột' };
    case 'learning':
      return { learnings: [], adjustments: { preferMore: [], preferLess: [], avoidPatterns: [] }, confidenceBoost: 0 };
    default:
      return {};
  }
}
