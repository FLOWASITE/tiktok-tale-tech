import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
}

interface KPILog {
  logged_at: string;
  metrics: Record<string, number>;
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

interface AnalysisResult {
  needsAdjustment: boolean;
  overallAssessment: string;
  suggestions: AdjustmentSuggestion[];
  actionItems: string[];
  analyzedAt: string;
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

  // Calculate velocity from logs
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

  // Project end value based on current velocity
  const projectedEndValue = currentValue + velocity * daysRemaining;

  // Detect trigger conditions
  let trigger: "overperforming" | "underperforming" | "anomaly" | "on_track" = "on_track";

  // Check for anomaly (sudden changes in recent logs)
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

  // Check for over/underperforming only if not anomaly
  if (trigger === "on_track") {
    const expectedProgress = timeElapsedPercent;
    
    // Overperforming: achievement > 120% of expected with > 50% time remaining
    if (achievementRate > expectedProgress * 1.2 && timeElapsedPercent < 50) {
      trigger = "overperforming";
    }
    // Underperforming: achievement < 50% of expected with > 30% time elapsed
    else if (achievementRate < expectedProgress * 0.5 && timeElapsedPercent > 30) {
      trigger = "underperforming";
    }
  }

  return { trigger, projectedEndValue, achievementRate, velocity };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, organizationId, currentGoals, kpiLogs, startDate, endDate, campaignType, campaignName } =
      await req.json();

    if (!campaignId || !currentGoals || !startDate || !endDate) {
      throw new Error("Missing required fields: campaignId, currentGoals, startDate, endDate");
    }

    // Calculate time metrics
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const timeElapsedPercent = Math.min(100, (elapsedDays / totalDays) * 100);

    // Check for dismissed suggestions
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
      
      // Only include if not on_track
      if (analysis.trigger !== "on_track") {
        analyses.push({ metric: goal.metric, goal, analysis });
      }
    }

    // If no adjustments needed, return early
    if (analyses.length === 0) {
      const result: AnalysisResult = {
        needsAdjustment: false,
        overallAssessment: "Tất cả KPI đang trong phạm vi mục tiêu. Không cần điều chỉnh.",
        suggestions: [],
        actionItems: [],
        analyzedAt: now.toISOString(),
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare context for AI
    const analysisContext = analyses.map((a) => ({
      metric: a.metric,
      currentValue: a.goal.current,
      targetValue: a.goal.target,
      achievementRate: a.analysis.achievementRate.toFixed(1) + "%",
      projectedEndValue: Math.round(a.analysis.projectedEndValue),
      trigger: a.analysis.trigger,
      velocity: a.analysis.velocity.toFixed(2) + "/ngày",
    }));

    const systemPrompt = `Bạn là chuyên gia phân tích KPI cho marketing campaigns tại Việt Nam.
Nhiệm vụ: Phân tích performance và đề xuất điều chỉnh KPI targets một cách thông minh.

Quy tắc đề xuất:
1. Overperforming (vượt mục tiêu):
   - Tăng target 20-50% tùy mức độ vượt
   - Confidence "high" nếu > 150% achievement, "medium" nếu 120-150%
   - Priority "recommended" để tối ưu budget

2. Underperforming (thiếu hụt):
   - Giảm target 20-40% nếu trend tiếp tục
   - Hoặc giữ nguyên nếu còn thời gian và có thể cải thiện
   - Confidence dựa trên trend stability
   - Priority "urgent" nếu achievement < 30%

3. Anomaly (biến động bất thường):
   - Cần xem xét nguyên nhân trước khi điều chỉnh
   - Confidence "low" do chưa rõ pattern
   - Priority "recommended" để review

Trả về JSON với format:
{
  "overallAssessment": "Đánh giá tổng quan ngắn gọn (1-2 câu)",
  "suggestions": [
    {
      "metric": "tên metric",
      "suggestedTarget": number,
      "changePercent": number (phần trăm thay đổi so với target cũ),
      "reason": "Lý do ngắn gọn",
      "confidence": "high" | "medium" | "low",
      "priority": "urgent" | "recommended" | "optional",
      "riskNote": "Ghi chú rủi ro nếu có (optional)"
    }
  ],
  "actionItems": ["Hành động cụ thể 1", "Hành động 2"]
}`;

    const userPrompt = `Campaign: ${campaignName || "N/A"}
Loại: ${campaignType || "general"}
Tiến độ thời gian: ${timeElapsedPercent.toFixed(0)}% (còn ${Math.round(daysRemaining)} ngày)

Phân tích KPI cần điều chỉnh:
${JSON.stringify(analysisContext, null, 2)}

Hãy đưa ra đề xuất điều chỉnh phù hợp.`;

    // Use shared callAI utility
    const aiResult = await callAI({
      functionName: 'suggest-kpi-adjustments',
      organizationId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokensOverride: 2000,
      temperatureOverride: 0.3,
    });

    if (!aiResult.success) {
      console.error("AI error:", aiResult.error);
      
      // Return basic analysis without AI enhancement
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
            ? "Performance vượt mục tiêu, nên tăng target" 
            : a.analysis.trigger === "underperforming"
            ? "Performance thấp hơn kỳ vọng, nên điều chỉnh target"
            : "Có biến động bất thường, cần review",
          trigger: a.analysis.trigger,
          confidence: "medium" as const,
          priority: a.analysis.trigger === "underperforming" ? "urgent" as const : "recommended" as const,
          projectedEndValue: Math.round(a.analysis.projectedEndValue),
          achievementRate: a.analysis.achievementRate,
        };
      });

      const result: AnalysisResult = {
        needsAdjustment: true,
        overallAssessment: `Phát hiện ${analyses.length} KPI cần điều chỉnh dựa trên phân tích trend.`,
        suggestions: fallbackSuggestions,
        actionItems: ["Review lại chiến lược content", "Kiểm tra ngân sách và phân bổ"],
        analyzedAt: now.toISOString(),
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = aiResult.data;
    const content = aiData?.choices?.[0]?.message?.content || "";
    
    // Parse AI response
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
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      aiAnalysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      throw new Error("Failed to parse AI analysis");
    }

    // Merge AI suggestions with our analysis
    const finalSuggestions: AdjustmentSuggestion[] = analyses.map((a) => {
      const aiSuggestion = aiAnalysis.suggestions.find((s) => s.metric === a.metric);
      
      return {
        metric: a.metric,
        currentTarget: a.goal.target,
        currentValue: a.goal.current,
        suggestedTarget: aiSuggestion?.suggestedTarget || Math.round(a.goal.target * 1.2),
        changePercent: aiSuggestion?.changePercent || 20,
        reason: aiSuggestion?.reason || "Dựa trên phân tích trend",
        trigger: a.analysis.trigger,
        confidence: aiSuggestion?.confidence || "medium",
        priority: aiSuggestion?.priority || "recommended",
        projectedEndValue: Math.round(a.analysis.projectedEndValue),
        achievementRate: a.analysis.achievementRate,
        riskNote: aiSuggestion?.riskNote,
      };
    });

    const result: AnalysisResult = {
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
  } catch (error) {
    console.error("Error in suggest-kpi-adjustments:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
