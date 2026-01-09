/**
 * topic-ai - Unified Topic Discovery Edge Function
 * 
 * Merges 4 previous functions into one with action-based routing:
 * - generate-topic-suggestions (suggest, refine)
 * - recommend-topics (next_best, weekly_plan, conflict_check, learning)
 * - discover-trending-topics (trending)
 * - analyze-topic-gaps (gap_analysis, cluster, keywords)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";
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
  type TopicBrandContext,
  type TopicHistoryItem,
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
  | 'next_best'         // Get single best topic recommendation
  | 'weekly_plan'       // Get weekly content plan
  | 'conflict_check'    // Check topic conflicts
  | 'learning'          // Submit learning feedback
  | 'trending'          // Discover trending topics
  | 'gap_analysis'      // Analyze content gaps
  | 'cluster'           // Cluster similar topics
  | 'keywords';         // Expand keywords

interface TopicAIRequest {
  action?: TopicAIAction;
  // Common params
  brandTemplateId?: string;
  organizationId?: string;
  contentGoal?: string;
  industry?: string;
  format?: 'carousel' | 'script' | 'multichannel' | 'all';
  forceRefresh?: boolean;
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
}

// ========== Main Handler ==========
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: TopicAIRequest = await req.json();
    const { action = 'suggest', ...params } = request;

    console.log(`[topic-ai] Action: ${action}, Brand: ${params.brandTemplateId?.substring(0, 8) || 'none'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch shared brand context once (used by most actions)
    let brandContext: TopicBrandContext | null = null;
    if (params.brandTemplateId) {
      brandContext = await fetchTopicBrandContext(supabase, params.brandTemplateId);
    }

    // Route to appropriate handler
    switch (action) {
      case 'suggest':
        return await handleSuggest(supabase, brandContext, params, startTime);
      case 'refine':
        return await handleRefine(supabase, brandContext, params, startTime);
      case 'next_best':
      case 'weekly_plan':
      case 'conflict_check':
      case 'learning':
        return await handleRecommendation(action, supabase, brandContext, params, startTime);
      case 'trending':
        return await handleTrending(supabase, brandContext, params, startTime);
      case 'gap_analysis':
      case 'cluster':
      case 'keywords':
        return await handleAnalysis(action, supabase, brandContext, params, startTime);
      default:
        return createErrorResponse(`Invalid action: ${action}`, 400);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[topic-ai] Error:', errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
});

// ========== Handler: Suggest ==========
async function handleSuggest(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { contentGoal, format, organizationId, brandTemplateId, recentTopics, seasonality, forceRefresh } = params;

  // Build cache key
  const cacheKey = `topic-suggestions-v5:${organizationId || 'global'}:${brandContext?.industry?.[0] || params.industry || 'general'}:${contentGoal || 'education'}:${brandTemplateId || 'none'}:${format || 'all'}`;
  
  // Check cache first
  if (!forceRefresh) {
    const cached = await checkTopicCache(supabase, cacheKey);
    if (cached) {
      console.log('[topic-ai:suggest] Cache hit');
      return new Response(JSON.stringify({
        suggestions: cached,
        source: 'cache'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Fetch learning context
  let learningContext = null;
  if (brandTemplateId) {
    learningContext = await fetchLearningContext(supabase, brandTemplateId, null);
  }

  // Fetch industry data from Perplexity in parallel
  const industryToSearch = brandContext?.industry?.[0] || params.industry || '';
  const [industryInsight, audienceQA] = await Promise.all([
    industryToSearch ? searchIndustryData(industryToSearch, brandContext?.brandName || '') : null,
    industryToSearch ? searchAudienceQuestions(industryToSearch, brandContext?.industryContext?.targetAudience) : null,
  ]);

  // Build prompts
  const { systemPrompt, userPrompt } = buildSuggestPrompts({
    brandContext,
    contentGoal,
    format,
    recentTopics: recentTopics || learningContext?.recentTopics || [],
    seasonality,
    learningContext,
    industryInsight,
    audienceQA,
  });

  // Call AI
  const config = await getAIConfig('topic-ai', organizationId);
  const result = await callAI({
    functionName: 'topic-ai',
    organizationId,
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

  if (suggestions.length === 0) {
    suggestions = getDefaultSuggestions(contentGoal);
  }

  // Cache result
  await saveTopicCache(supabase, cacheKey, suggestions, 12, {
    functionName: 'topic-ai',
    organizationId,
    brandTemplateId,
  });

  console.log(`[topic-ai:suggest] Generated ${suggestions.length} suggestions in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify({
    suggestions,
    source: 'ai',
    brandContextUsed: !!brandContext,
    perplexityUsed: !!industryInsight,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ========== Handler: Refine ==========
async function handleRefine(
  supabase: any,
  brandContext: TopicBrandContext | null,
  params: TopicAIRequest,
  startTime: number
): Promise<Response> {
  const { rawTopic, videoType, brandTemplateId, organizationId } = params;

  if (!rawTopic || rawTopic.trim().length < 5) {
    return createErrorResponse('rawTopic is required (min 5 chars)', 400);
  }

  // Fetch learning context
  let learningContext = null;
  if (brandTemplateId) {
    learningContext = await fetchLearningContext(supabase, brandTemplateId, null);
  }

  const videoTypeLabel = videoType === 'expert_share' ? 'chia sẻ chuyên gia' :
                        videoType === 'analyze_explain' ? 'phân tích giải thích' :
                        videoType === 'warning_mistake' ? 'cảnh báo sai lầm' :
                        videoType === 'quick_qa' ? 'hỏi đáp nhanh' : 'video marketing';

  // Build prompt
  const promptParts: string[] = [];
  promptParts.push(`Bạn là Content Strategist chuyên nghiệp. Cải thiện chủ đề thô thành 3 phiên bản hay hơn, cụ thể hơn, hấp dẫn hơn.

## CHỦ ĐỀ THÔ
"${rawTopic}"
Thể loại: ${videoTypeLabel}`);

  if (brandContext) {
    promptParts.push(buildBrandContextString(brandContext));
    
    if (brandContext.industryContext) {
      promptParts.push(`\n## 🔒 INDUSTRY MEMORY (KHÔNG ĐƯỢC VI PHẠM)
${brandContext.industryContext.targetAudience ? `Target Audience: ${brandContext.industryContext.targetAudience}` : ''}
${brandContext.industryContext.forbiddenTerms?.length ? `TỪ CẤM: ${brandContext.industryContext.forbiddenTerms.slice(0, 10).join(', ')}` : ''}`);
    }
  }

  if (learningContext) {
    const learningSection = buildLearningSection(learningContext);
    if (learningSection) promptParts.push(learningSection);
  }

  promptParts.push(`
## OUTPUT FORMAT
Trả về CHÍNH XÁC JSON array với 3 items:
[
  {
    "topic": "Tiêu đề chủ đề cải thiện (15-50 từ)",
    "angle": "Góc tiếp cận (practical, controversial, educational, storytelling, solution, data)",
    "hook": "1 câu gợi ý hook mở đầu cho video"${brandContext?.personas?.length ? `,
    "targetPersona": "Tên persona phù hợp nhất (nếu rõ ràng)"` : ''}${brandContext?.products?.length ? `,
    "productFit": "Tên sản phẩm liên quan (nếu có)"` : ''}
  }
]
CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH THÊM.`);

  const finalPrompt = promptParts.join('\n\n');

  // Call AI
  const result = await callAI({
    functionName: 'topic-ai',
    organizationId,
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

  // Call AI
  const result = await callAI({
    functionName: 'topic-ai',
    organizationId,
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

  // Call AI for analysis
  const systemPrompt = `Bạn là chuyên gia phân tích xu hướng content social media tại Việt Nam.
Phân tích DỮ LIỆU THỰC TẾ và tạo danh sách 10-12 trending topics.

Trả về JSON array với format:
[{
  "topic": "Tên xu hướng/chủ đề ngắn gọn",
  "category": "seasonal" | "news" | "social_trend" | "industry_trend" | "viral",
  "velocity_score": 0-100,
  "peak_status": "rising" | "peaking" | "declining",
  "peak_prediction": "thời gian dự đoán peak (VD: '3-5 ngày tới')",
  "related_keywords": ["keyword1", "keyword2", "keyword3"],
  "engagement_potential": 0-100,
  "competition_level": "low" | "medium" | "high",
  "suggested_angles": ["góc 1", "góc 2", "góc 3"],
  "source": "curated_event" | "curated_news" | "web_search" | "ai"
}]`;

  const userPrompt = `${brandContextStr}
${curatedContext}
${webSearchContext}

Phân tích và tạo danh sách trending topics. Respond in Vietnamese.`;

  const result = await callAI({
    functionName: 'topic-ai',
    organizationId,
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
  action: 'gap_analysis' | 'cluster' | 'keywords',
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
  let systemPrompt = `Bạn là chuyên gia phân tích content marketing. Phân tích dữ liệu và trả về JSON hợp lệ.`;
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
  }

  // Call AI
  const result = await callAI({
    functionName: 'topic-ai',
    organizationId,
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
}): { systemPrompt: string; userPrompt: string } {
  const { brandContext, contentGoal, format, recentTopics, seasonality, learningContext, industryInsight, audienceQA } = params;

  const goalLabels: Record<string, string> = {
    education: 'giáo dục, chia sẻ kiến thức chuyên môn',
    awareness: 'tăng nhận diện thương hiệu',
    engagement: 'tăng tương tác',
    expertise: 'xây dựng hình ảnh chuyên gia',
    conversion: 'thúc đẩy chuyển đổi',
  };

  // Build brand section
  let brandSection = '';
  if (brandContext) {
    brandSection = buildBrandContextString(brandContext);
  }

  // Build industry data section
  let realDataSection = '';
  if (industryInsight) {
    realDataSection = `\n## DỮ LIỆU THỰC TẾ TỪ WEB SEARCH (Perplexity):`;
    if (industryInsight.insights?.length) {
      realDataSection += `\n### Industry Insights:\n${industryInsight.insights.slice(0, 3).map((i: string) => `- ${i}`).join('\n')}`;
    }
    if (industryInsight.statistics?.length) {
      realDataSection += `\n### Thống kê số liệu:\n${industryInsight.statistics.slice(0, 3).map((s: string) => `- ${s}`).join('\n')}`;
    }
  }

  // Build audience Q&A section
  let audienceQASection = '';
  if (audienceQA?.questions?.length) {
    audienceQASection = `\n## CÂU HỎI THỰC TẾ TỪ KHÁCH HÀNG:\n${audienceQA.questions.slice(0, 8).map((q: string, i: number) => `${i+1}. ${q}`).join('\n')}

→ ƯU TIÊN CAO: Tạo 2-3 topics TRỰC TIẾP trả lời các câu hỏi trên`;
  }

  // Build learning section
  let learningSection = '';
  if (learningContext) {
    learningSection = buildLearningSection(learningContext) || '';
  }

  const systemPrompt = `Bạn là Content Strategist chuyên nghiệp với 10+ năm kinh nghiệm content marketing tại Việt Nam.
${brandSection}
${realDataSection}
${audienceQASection}
${learningSection}

## OUTPUT FORMAT:
Trả về JSON array với 8-10 topics:
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

## BALANCE: ~40% TOFU, ~35% MOFU, ~25% BOFU | 1 Hero, 2-3 Hub, 5-6 Hygiene`;

  const userPrompt = `Gợi ý 8-10 chủ đề content cho:
- Mục tiêu: ${goalLabels[contentGoal || 'education']}
- Format: ${format || 'all'}
${brandContext ? `- Brand: ${brandContext.brandName}` : ''}
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

      // Match persona ID
      if (item.targetPersona && brandContext?.personas?.length) {
        const matchedPersona = brandContext.personas.find((p: any) =>
          p.name?.toLowerCase().includes(item.targetPersona.toLowerCase()) ||
          item.targetPersona.toLowerCase().includes(p.name?.toLowerCase())
        );
        if (matchedPersona) result.targetPersonaId = matchedPersona.id;
      }

      // Match product ID
      if (item.productFit && brandContext?.products?.length) {
        const matchedProduct = brandContext.products.find((p: any) =>
          p.name?.toLowerCase().includes(item.productFit.toLowerCase()) ||
          item.productFit.toLowerCase().includes(p.name?.toLowerCase())
        );
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
