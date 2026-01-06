import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KPISuggestRequest {
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
  goals: Array<{
    metric: string;
    target: number;
    current: number;
  }>;
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

interface AIResponse {
  suggestions: AISuggestion[];
  analysis: string;
  recommendations: string[];
}

// Industry benchmarks (Vietnamese market)
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

// KPI metric configs
const KPI_METRICS: Record<string, { label: string; unit?: string }> = {
  reach: { label: 'Reach', unit: 'người' },
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
  revenue: { label: 'Revenue', unit: 'VND' },
};

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
  if (month === 2 && day >= 7 && day <= 14) return 'Valentine\'s Day';
  if (month === 3 && day >= 1 && day <= 8) return 'Women\'s Day';
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const requestData: KPISuggestRequest = await req.json();
    const { 
      campaignType, 
      budget, 
      budgetCurrency, 
      startDate, 
      endDate, 
      targetChannels, 
      industries,
      organizationId 
    } = requestData;

    console.log('KPI suggestion request:', { campaignType, budget, organizationId });

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
      // Increment hit count
      await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
      return new Response(JSON.stringify({
        ...cachedData.response_data,
        fromCache: true,
        cachedAt: cachedData.created_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch historical campaigns for context
    const { data: historicalCampaigns } = await supabase
      .from('campaigns')
      .select('campaign_type, budget_total, goals')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .not('goals', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    // Analyze historical data
    let historicalSummary = 'Chưa có dữ liệu campaigns hoàn thành trước đó.';
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

    // Get industry benchmarks
    const industry = industries?.[0]?.toLowerCase().replace(/\s+/g, '-') || 'default';
    const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;
    
    const duration = calculateDuration(startDate, endDate);
    const seasonalContext = getSeasonalContext(startDate);

    // Build AI prompt
    const systemPrompt = `Bạn là chuyên gia marketing phân tích KPI cho thị trường Việt Nam. Hãy đề xuất KPI targets phù hợp và thực tế.

## Quy tắc:
1. Confidence level:
   - HIGH: Có data historical rõ ràng hoặc đã có campaigns tương tự đạt kết quả
   - MEDIUM: Dựa trên industry benchmark, không có historical data cụ thể
   - LOW: Ước tính, target có thể cần điều chỉnh

2. Reasoning phải ngắn gọn, dưới 50 từ, bằng tiếng Việt

3. Tính toán dựa trên:
   - Budget chia cho CPM/CPC để ước tính reach/clicks
   - Engagement rate theo benchmark ngành
   - Seasonal multiplier cho mùa cao điểm
   - Historical achievement rate nếu có

4. Recommendations tối đa 3 gợi ý chiến lược`;

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

    console.log('Calling AI Gateway for KPI suggestions...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds to your workspace." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log('Raw AI response:', content);

    // Parse AI response
    let parsedResponse: AIResponse;
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Validate and enrich suggestions
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

    // Cache the result
    const inputHash = JSON.stringify({ campaignType, budgetRange, industries });
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'suggest-campaign-kpis',
      input_hash: inputHash,
      response_data: result,
      cache_scope: 'org',
      organization_id: organizationId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }, { onConflict: 'cache_key' });

    console.log('KPI suggestions generated and cached');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-campaign-kpis:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
