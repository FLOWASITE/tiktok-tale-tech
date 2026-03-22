import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI, callAIWithMetrics } from "../_shared/ai-provider.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= SHARED TYPES =============

interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
  label?: string;
}

interface KPILog {
  logged_at: string;
  metrics: Record<string, number>;
}

// ============= SUGGEST ACTION TYPES =============

interface SuggestRequest {
  campaignType: string;
  budget: number;
  budgetCurrency: string;
  startDate: string;
  endDate: string;
  targetChannels: string[];
  industries: string[];
  organizationId: string;
}

interface HistoricalCampaign {
  campaign_type: string;
  budget_total: number;
  goals: CampaignGoal[];
}

interface AISuggestion {
  metric: string;
  label: string;
  target: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  comparisonNote?: string;
  industryBenchmark?: number;
  historicalAvg?: number;
}

interface SuggestResponse {
  suggestions: AISuggestion[];
  analysis: string;
  recommendations: string[];
}

// ============= ADJUST ACTION TYPES =============

interface AdjustRequest {
  campaignId: string;
  organizationId: string;
  currentGoals: CampaignGoal[];
  kpiLogs: KPILog[];
  startDate: string;
  endDate: string;
  campaignType?: string;
  campaignName?: string;
}

interface AdjustmentSuggestion {
  metric: string;
  currentTarget: number;
  currentValue: number;
  suggestedTarget: number;
  changePercent: number;
  reason: string;
  trigger: "overperforming" | "underperforming" | "anomaly" | "on_track";
  confidence: "high" | "medium" | "low";
  priority: "urgent" | "recommended" | "optional";
  projectedEndValue: number;
  achievementRate: number;
  riskNote?: string;
}

interface AdjustResponse {
  needsAdjustment: boolean;
  overallAssessment: string;
  suggestions: AdjustmentSuggestion[];
  actionItems: string[];
  analyzedAt: string;
}

// ============= CONSTANTS =============

const INDUSTRY_BENCHMARKS: Record<string, { avgCPM: number; avgCPC: number; engagementRate: number; ctr: number }> = {
  default: { avgCPM: 15000, avgCPC: 3000, engagementRate: 3.5, ctr: 1.2 },
  'e-commerce': { avgCPM: 12000, avgCPC: 2500, engagementRate: 4.0, ctr: 1.8 },
  'food-beverage': { avgCPM: 10000, avgCPC: 2000, engagementRate: 5.5, ctr: 1.5 },
  beauty: { avgCPM: 18000, avgCPC: 3500, engagementRate: 4.5, ctr: 1.4 },
  technology: { avgCPM: 25000, avgCPC: 5000, engagementRate: 2.5, ctr: 0.9 },
  healthcare: { avgCPM: 20000, avgCPC: 4000, engagementRate: 3.0, ctr: 1.0 },
  education: { avgCPM: 15000, avgCPC: 3000, engagementRate: 4.0, ctr: 1.3 },
  finance: { avgCPM: 28000, avgCPC: 6000, engagementRate: 2.2, ctr: 0.7 },
};

const KPI_METRICS: Record<string, { label: string; unit?: string }> = {
  reach: { label: 'Reach' },
  impressions: { label: 'Impressions' },
  brand_mentions: { label: 'Brand Mentions' },
  likes: { label: 'Likes' },
  comments: { label: 'Comments' },
  shares: { label: 'Shares' },
  saves: { label: 'Saves' },
  engagement_rate: { label: 'Engagement Rate', unit: '%' },
  clicks: { label: 'Clicks' },
  ctr: { label: 'CTR', unit: '%' },
  leads: { label: 'Leads' },
  sales: { label: 'Sales' },
  revenue: { label: 'Revenue' },
};

// ============= UTILITY FUNCTIONS =============

function getBudgetRange(budget: number): string {
  if (budget < 5_000_000) return 'micro';
  if (budget < 20_000_000) return 'small';
  if (budget < 100_000_000) return 'medium';
  if (budget < 500_000_000) return 'large';
  return 'enterprise';
}

function getSeasonalContext(startDate: string): string {
  const date = new Date(startDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month === 1 && day >= 15) || (month === 2 && day <= 15)) return 'Tết Nguyên Đán - Mùa cao điểm';
  if ((month === 11 && day >= 1 && day <= 15) || (month === 12 && day >= 1 && day <= 15)) return '11.11/12.12 Sale Season';
  if (month === 8 || month === 9) return 'Back to School';
  if (month === 6 || month === 7) return 'Summer Season';
  if (month === 2 && day >= 7 && day <= 14) return "Valentine's Day";
  if (month === 3 && day >= 1 && day <= 8) return "Women's Day";
  return 'Regular Season';
}

function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B VND`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M VND`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K VND`;
  return `${amount} VND`;
}

function calculateMetricAnalysis(
  metric: string,
  goal: CampaignGoal,
  logs: KPILog[],
  timeElapsedPercent: number,
  daysRemaining: number
): {
  trigger: "overperforming" | "underperforming" | "anomaly" | "on_track";
  projectedEndValue: number;
  achievementRate: number;
  velocity: number;
} {
  const currentValue = goal.current || 0;
  const target = goal.target || 1;
  const achievementRate = (currentValue / target) * 100;

  const metricLogs = logs
    .filter((log) => log.metrics && log.metrics[metric] !== undefined)
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

  let velocity = 0;
  if (metricLogs.length >= 2) {
    const firstLog = metricLogs[0];
    const lastLog = metricLogs[metricLogs.length - 1];
    const daysDiff = Math.max(
      1,
      (new Date(lastLog.logged_at).getTime() - new Date(firstLog.logged_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const valueDiff = (lastLog.metrics[metric] || 0) - (firstLog.metrics[metric] || 0);
    velocity = valueDiff / daysDiff;
  }

  const projectedEndValue = currentValue + velocity * daysRemaining;
  let trigger: "overperforming" | "underperforming" | "anomaly" | "on_track" = "on_track";

  if (metricLogs.length >= 3) {
    const recentLogs = metricLogs.slice(-3);
    const recentChanges = recentLogs.slice(1).map((log, i) => {
      const prevValue = recentLogs[i].metrics[metric] || 0;
      const currValue = log.metrics[metric] || 0;
      return prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
    });
    
    if (recentChanges.some((change) => Math.abs(change) > 50)) {
      trigger = "anomaly";
    }
  }

  if (trigger === "on_track") {
    const expectedProgress = timeElapsedPercent;
    if (achievementRate > expectedProgress * 1.2 && timeElapsedPercent < 50) {
      trigger = "overperforming";
    } else if (achievementRate < expectedProgress * 0.5 && timeElapsedPercent > 30) {
      trigger = "underperforming";
    }
  }

  return { trigger, projectedEndValue, achievementRate, velocity };
}

// ============= ACTION HANDLERS =============

async function handleSuggest(
  supabase: AnySupabaseClient,
  data: SuggestRequest,
  userId?: string
): Promise<Response> {
  const { campaignType, budget, startDate, endDate, targetChannels, industries, organizationId } = data;

  console.log('KPI suggest request:', { campaignType, budget, organizationId });

  // Check cache first
  const budgetRange = getBudgetRange(budget);
  const cacheKey = `kpi-suggest-${organizationId}-${campaignType}-${budgetRange}`;
  
  const { data: cachedData } = await supabase
    .from('ai_response_cache')
    .select('response_data, created_at')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cachedData) {
    console.log('Returning cached KPI suggestions');
    await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
    return new Response(JSON.stringify({
      ...cachedData.response_data,
      fromCache: true,
      cachedAt: cachedData.created_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch historical campaigns
  const { data: historicalCampaigns } = await supabase
    .from('campaigns')
    .select('campaign_type, budget_total, goals')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .not('goals', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Analyze historical data
  let historicalSummary = 'No completed campaign data available yet.';
  const historicalStats: Record<string, { totalTarget: number; totalCurrent: number; count: number }> = {};
  
  if (historicalCampaigns && historicalCampaigns.length > 0) {
    const similarCampaigns = historicalCampaigns.filter(
      (c: HistoricalCampaign) => c.campaign_type === campaignType
    );
    
    for (const campaign of historicalCampaigns) {
      const goals = campaign.goals as HistoricalCampaign['goals'] | null;
      if (!goals || !Array.isArray(goals)) continue;
      
      for (const goal of goals) {
        if (!historicalStats[goal.metric]) {
          historicalStats[goal.metric] = { totalTarget: 0, totalCurrent: 0, count: 0 };
        }
        historicalStats[goal.metric].totalTarget += goal.target || 0;
        historicalStats[goal.metric].totalCurrent += goal.current || 0;
        historicalStats[goal.metric].count += 1;
      }
    }

    const summaryParts: string[] = [];
    summaryParts.push(`Tổng ${historicalCampaigns.length} campaigns hoàn thành`);
    summaryParts.push(`${similarCampaigns.length} campaigns cùng loại "${campaignType}"`);
    
    for (const [metric, stats] of Object.entries(historicalStats)) {
      if (stats.count > 0) {
        const avgTarget = Math.round(stats.totalTarget / stats.count);
        const avgCurrent = Math.round(stats.totalCurrent / stats.count);
        const achievementRate = stats.totalTarget > 0 
          ? Math.round((stats.totalCurrent / stats.totalTarget) * 100) 
          : 0;
        summaryParts.push(`${metric}: avg target ${avgTarget.toLocaleString()}, achievement ${achievementRate}%`);
      }
    }
    
    historicalSummary = summaryParts.join('\n');
  }

  // Get benchmarks
  const industry = industries?.[0]?.toLowerCase().replace(/\s+/g, '-') || 'default';
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;
  
  const duration = calculateDuration(startDate, endDate);
  const seasonalContext = getSeasonalContext(startDate);

  // Try to fetch system prompt from registry
  let baseSystemPrompt = '';
  try {
    const promptManager = createPromptManager(supabase, 'kpi-ai', organizationId);
    baseSystemPrompt = await promptManager.get('system_suggest', {
      campaignType,
      budget: budget.toString(),
      industry: industries?.[0] || 'General',
    });
  } catch (err) {
    console.warn('[kpi-ai:suggest] Failed to fetch prompt from registry, using hardcoded');
  }

  const systemPrompt = baseSystemPrompt || `You are a marketing KPI analysis expert. Suggest realistic and suitable KPI targets.

## Rules:
1. Confidence level:
   - HIGH: Clear historical data or similar campaigns with proven results
   - MEDIUM: Based on industry benchmarks, no specific historical data
   - LOW: Estimated, targets may need adjustment

2. Reasoning must be concise, under 50 words

3. Calculate based on:
   - Budget divided by CPM/CPC for reach/clicks estimation
   - Engagement rate by industry benchmark
   - Seasonal multiplier for peak seasons
   - Historical achievement rate if available

4. Maximum 3 strategic recommendations

Respond in the same language as the campaign context provided.`;

  const userPrompt = `## Campaign Context:
- Campaign type: ${campaignType}
- Budget: ${formatBudget(budget)}
- Duration: ${startDate} to ${endDate} (${duration} ngày)
- Target channels: ${targetChannels.join(', ') || 'Chưa xác định'}
- Industry: ${industries?.join(', ') || 'General'}
- Season: ${seasonalContext}

## Industry Benchmarks (Vietnam market):
- CPM: ${benchmarks.avgCPM.toLocaleString()} VND
- CPC: ${benchmarks.avgCPC.toLocaleString()} VND
- Engagement Rate: ${benchmarks.engagementRate}%
- CTR: ${benchmarks.ctr}%

## Historical Data từ Organization:
${historicalSummary}

## Task:
Đề xuất 5-8 KPI targets phù hợp với campaign type "${campaignType}".

QUAN TRỌNG: Return JSON với format CHÍNH XÁC như sau (không thêm markdown formatting):
{
  "suggestions": [
    {
      "metric": "reach",
      "label": "Reach",
      "target": 50000,
      "confidence": "high",
      "reasoning": "Dựa trên budget 10M với CPM 15K, ước tính reach 666K impressions / 3 frequency",
      "comparisonNote": "Cao hơn 20% so với campaign tương tự",
      "industryBenchmark": 45000,
      "historicalAvg": 42000
    }
  ],
  "analysis": "Campaign awareness phù hợp với budget trung bình, nên focus vào reach và engagement",
  "recommendations": [
    "Tăng cường nội dung video để boost engagement",
    "Phân bổ 60% budget cho Facebook, 40% cho TikTok"
  ]
}`;

  console.log('Calling AI for KPI suggestions...');

  // Wrap AI call with semantic cache
  const serviceSupabase = getServiceClient();
  const semanticCacheInput = `kpi-suggest:${campaignType}:${budgetRange}:${industries?.join(',')}:${duration}`;

  const semanticResult = await withSemanticCache(
    serviceSupabase,
    semanticCacheInput,
    { functionName: 'kpi-ai', organizationId, similarityThreshold: 0.93 },
    async () => {
      return await callAIWithMetrics(supabase, {
        functionName: 'kpi-ai',
        organizationId,
        userId,
        actionType: 'suggest',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        maxTokensOverride: 2000,
        temperatureOverride: 0.7,
      });
    },
    3, // TTL 3 days for KPI data
  );

  if (semanticResult.fromCache) {
    console.log(`[kpi-ai:suggest] Semantic cache hit (similarity: ${semanticResult.similarity?.toFixed(3)})`);
  }

  const aiResult = semanticResult.data;

  if (!aiResult.success) {
    console.error("AI error:", aiResult.error);
    
    if (aiResult.error?.includes('Rate limit')) {
      return new Response(JSON.stringify({ 
        error: "Rate limits exceeded, please try again later." 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResult.error?.includes('Payment')) {
      return new Response(JSON.stringify({ 
        error: "Payment required, please add funds to your workspace." 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw new Error(`AI error: ${aiResult.error}`);
  }

  const content = aiResult.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");

  console.log('AI response received via', aiResult.provider);

  let parsedResponse: SuggestResponse;
  try {
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsedResponse = JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    throw new Error('Invalid AI response format');
  }

  const enrichedSuggestions = parsedResponse.suggestions.map((suggestion: AISuggestion) => {
    const metricConfig = KPI_METRICS[suggestion.metric];
    return {
      ...suggestion,
      label: metricConfig?.label || suggestion.label,
      unit: metricConfig?.unit,
      current: 0,
    };
  });

  const result = {
    suggestions: enrichedSuggestions,
    analysis: parsedResponse.analysis,
    recommendations: parsedResponse.recommendations,
    metadata: {
      campaignType,
      budget,
      budgetRange,
      industry: industries?.[0] || 'General',
      seasonalContext,
      historicalCampaignsCount: historicalCampaigns?.length || 0,
      benchmarks,
    },
    fromCache: false,
  };

  // Cache result
  const inputHash = JSON.stringify({ campaignType, budgetRange, industries });
  await supabase.from('ai_response_cache').upsert({
    cache_key: cacheKey,
    function_name: 'kpi-ai',
    input_hash: inputHash,
    response_data: result,
    cache_scope: 'org',
    organization_id: organizationId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'cache_key' });

  console.log('KPI suggestions generated and cached');

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAdjust(
  supabase: AnySupabaseClient,
  data: AdjustRequest,
  userId?: string
): Promise<Response> {
  const { campaignId, organizationId, currentGoals, kpiLogs, startDate, endDate, campaignType, campaignName } = data;

  if (!campaignId || !currentGoals || !startDate || !endDate) {
    throw new Error("Missing required fields: campaignId, currentGoals, startDate, endDate");
  }

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const timeElapsedPercent = Math.min(100, (elapsedDays / totalDays) * 100);

  // Check dismissed suggestions
  const { data: dismissals } = await supabase
    .from("kpi_adjustment_dismissals")
    .select("metric, dismissed_until")
    .eq("campaign_id", campaignId)
    .gt("dismissed_until", now.toISOString());

  const dismissedMetrics = new Set((dismissals || []).map((d) => d.metric));

  // Analyze each goal
  const analyses: Array<{
    metric: string;
    goal: CampaignGoal;
    analysis: ReturnType<typeof calculateMetricAnalysis>;
  }> = [];

  for (const goal of currentGoals) {
    if (dismissedMetrics.has(goal.metric)) continue;
    
    const analysis = calculateMetricAnalysis(goal.metric, goal, kpiLogs || [], timeElapsedPercent, daysRemaining);
    
    if (analysis.trigger !== "on_track") {
      analyses.push({ metric: goal.metric, goal, analysis });
    }
  }

  // If no adjustments needed
  if (analyses.length === 0) {
    const result: AdjustResponse = {
      needsAdjustment: false,
      overallAssessment: "All KPIs are within target range. No adjustments needed.",
      suggestions: [],
      actionItems: [],
      analyzedAt: now.toISOString(),
    };
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const analysisContext = analyses.map((a) => ({
    metric: a.metric,
    currentValue: a.goal.current,
    targetValue: a.goal.target,
    achievementRate: a.analysis.achievementRate.toFixed(1) + "%",
    projectedEndValue: Math.round(a.analysis.projectedEndValue),
    trigger: a.analysis.trigger,
    velocity: a.analysis.velocity.toFixed(2) + "/ngày",
  }));

  const systemPrompt = `You are a KPI analysis expert for marketing campaigns.
Task: Analyze performance and suggest smart KPI target adjustments.

Suggestion Rules:
1. Overperforming (exceeding target):
   - Increase target 20-50% depending on how much exceeded
   - Confidence "high" if > 150% achievement, "medium" if 120-150%
   - Priority "recommended" to optimize budget

2. Underperforming (falling short):
   - Reduce target 20-40% if trend continues
   - Or keep unchanged if there's still time and improvement is possible
   - Confidence based on trend stability
   - Priority "urgent" if achievement < 30%

3. Anomaly (unusual fluctuation):
   - Need to investigate cause before adjusting
   - Confidence "low" due to unclear pattern
   - Priority "recommended" for review

Respond in the same language as the campaign context provided.

Return JSON with format:
{
  "overallAssessment": "Brief overall assessment (1-2 sentences)",
  "suggestions": [
    {
      "metric": "metric name",
      "suggestedTarget": number,
      "changePercent": number,
      "reason": "Brief reason",
      "confidence": "high" | "medium" | "low",
      "priority": "urgent" | "recommended" | "optional",
      "riskNote": "Risk note if any (optional)"
    }
  ],
  "actionItems": ["Specific action 1", "Action 2"]
}`;

  const userPrompt = `Campaign: ${campaignName || "N/A"}
Loại: ${campaignType || "general"}
Tiến độ thời gian: ${timeElapsedPercent.toFixed(0)}% (còn ${Math.round(daysRemaining)} ngày)

Phân tích KPI cần điều chỉnh:
${JSON.stringify(analysisContext, null, 2)}

Hãy đưa ra đề xuất điều chỉnh phù hợp.`;

  const aiResult = await callAIWithMetrics(supabase, {
    functionName: 'kpi-ai',
    organizationId,
    userId,
    actionType: 'adjust',
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokensOverride: 2000,
    temperatureOverride: 0.3,
  });

  if (!aiResult.success) {
    console.error("AI error:", aiResult.error);
    
    // Fallback suggestions
    const fallbackSuggestions: AdjustmentSuggestion[] = analyses.map((a) => {
      const changePercent = a.analysis.trigger === "overperforming" ? 30 : -25;
      const suggestedTarget = Math.round(a.goal.target * (1 + changePercent / 100));
      
      return {
        metric: a.metric,
        currentTarget: a.goal.target,
        currentValue: a.goal.current,
        suggestedTarget,
        changePercent,
        reason: a.analysis.trigger === "overperforming" 
          ? "Performance exceeds target, should increase" 
          : a.analysis.trigger === "underperforming"
          ? "Performance below expectations, should adjust target"
           : "Unusual fluctuation detected, needs review",
        trigger: a.analysis.trigger,
        confidence: "medium" as const,
        priority: a.analysis.trigger === "underperforming" ? "urgent" as const : "recommended" as const,
        projectedEndValue: Math.round(a.analysis.projectedEndValue),
        achievementRate: a.analysis.achievementRate,
      };
    });

    const result: AdjustResponse = {
      needsAdjustment: true,
      overallAssessment: `Found ${analyses.length} KPIs that need adjustment based on trend analysis.`,
      suggestions: fallbackSuggestions,
      actionItems: ["Review content strategy", "Check budget allocation"],
      analyzedAt: now.toISOString(),
    };
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const content = aiResult.data?.choices?.[0]?.message?.content || "";
  
  let aiAnalysis: {
    overallAssessment: string;
    suggestions: Array<{
      metric: string;
      suggestedTarget: number;
      changePercent: number;
      reason: string;
      confidence: "high" | "medium" | "low";
      priority: "urgent" | "recommended" | "optional";
      riskNote?: string;
    }>;
    actionItems: string[];
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    aiAnalysis = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError, content);
    throw new Error("Failed to parse AI analysis");
  }

  const finalSuggestions: AdjustmentSuggestion[] = analyses.map((a) => {
    const aiSuggestion = aiAnalysis.suggestions.find((s) => s.metric === a.metric);
    
    return {
      metric: a.metric,
      currentTarget: a.goal.target,
      currentValue: a.goal.current,
      suggestedTarget: aiSuggestion?.suggestedTarget || Math.round(a.goal.target * 1.2),
      changePercent: aiSuggestion?.changePercent || 20,
      reason: aiSuggestion?.reason || "Based on trend analysis",
      trigger: a.analysis.trigger,
      confidence: aiSuggestion?.confidence || "medium",
      priority: aiSuggestion?.priority || "recommended",
      projectedEndValue: Math.round(a.analysis.projectedEndValue),
      achievementRate: a.analysis.achievementRate,
      riskNote: aiSuggestion?.riskNote,
    };
  });

  const result: AdjustResponse = {
    needsAdjustment: true,
    overallAssessment: aiAnalysis.overallAssessment,
    suggestions: finalSuggestions,
    actionItems: aiAnalysis.actionItems || [],
    analyzedAt: now.toISOString(),
  };

  console.log("KPI adjustment analysis completed:", {
    campaignId,
    suggestionsCount: finalSuggestions.length,
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============= MAIN HANDLER =============

Deno.serve(withPerf({ functionName: 'kpi-ai' }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, ...data } = body;

    // Resolve userId for cost tracking
    const userId = await resolveUserId(req, supabase);

    console.log('KPI-AI request:', { action });

    switch (action) {
      case 'suggest':
        return await handleSuggest(supabase, data as SuggestRequest, userId);
      
      case 'adjust':
        return await handleAdjust(supabase, data as AdjustRequest, userId);
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: suggest, adjust` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in kpi-ai:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
