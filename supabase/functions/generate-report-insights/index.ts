import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getGatewayConfig } from "../_shared/lovable-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportMetrics {
  dateFrom: string;
  dateTo: string;
  contentCreated: number;
  publishedCount: number;
  failedCount: number;
  engagementTotal: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  topChannels: { channel: string; count: number }[];
  topPlatforms: { platform: string; reach: number; likes: number }[];
  failureRate: number;
  engagementRate: number;
}

interface InsightCard {
  type: "trend" | "anomaly" | "recommendation" | "highlight";
  severity: "info" | "warning" | "success" | "critical";
  title: string;
  description: string;
  action?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = getGatewayConfig().apiKey;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY chưa được cấu hình" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate user JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await serviceClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      organizationId,
      dateFrom,
      dateTo,
      brandId,
      brandName,
      metrics,
    }: {
      organizationId: string;
      dateFrom: string;
      dateTo: string;
      brandId?: string | null;
      brandName?: string | null;
      metrics: ReportMetrics;
    } = body;

    if (!organizationId || !metrics) {
      return new Response(
        JSON.stringify({ error: "Thiếu organizationId hoặc metrics" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify org membership
    const { data: membership } = await serviceClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Không có quyền truy cập workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache (1h TTL)
    const cacheKey = `report-insights:${organizationId}:${brandId ?? "all"}:${dateFrom}:${dateTo}`;
    const inputHash = cacheKey;
    const nowIso = new Date().toISOString();
    const { data: cached } = await serviceClient
      .from("ai_response_cache")
      .select("response_data, created_at, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (cached?.response_data) {
      return new Response(
        JSON.stringify({ insights: cached.response_data, cached: true, generatedAt: cached.created_at }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary = {
      period: `${dateFrom.slice(0, 10)} → ${dateTo.slice(0, 10)}`,
      brand: brandName || "Toàn bộ workspace",
      content_created: metrics.contentCreated,
      published: metrics.publishedCount,
      failed: metrics.failedCount,
      failure_rate_pct: metrics.failureRate,
      total_reach: metrics.totalReach,
      total_likes: metrics.totalLikes,
      total_comments: metrics.totalComments,
      total_shares: metrics.totalShares,
      engagement_rate_pct: metrics.engagementRate,
      top_channels: metrics.topChannels.slice(0, 5),
      top_platforms: metrics.topPlatforms.slice(0, 5),
    };

    const systemPrompt = `Bạn là chuyên gia phân tích marketing số ở Việt Nam.
Phân tích báo cáo workspace dựa trên dữ liệu thực tế và đưa ra 4-6 insight ngắn gọn, actionable.
Mỗi insight phải có: type, severity, title (≤60 ký tự), description (≤200 ký tự, tiếng Việt), action (gợi ý cụ thể, ≤120 ký tự).
Type hợp lệ: "trend" | "anomaly" | "recommendation" | "highlight".
Severity: "info" | "warning" | "success" | "critical".
Tập trung vào: hiệu suất theo channel/platform, tỷ lệ thất bại, engagement rate, gợi ý tối ưu nội dung.
Trả lời bằng tool call duy nhất.`;

    const userPrompt = `Dữ liệu báo cáo:\n${JSON.stringify(summary, null, 2)}\n\nHãy phân tích và đề xuất.`;

    const aiResponse = await fetch(
      getGatewayConfig().url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_insights",
                description: "Trả về danh sách insights phân tích báo cáo",
                parameters: {
                  type: "object",
                  properties: {
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["trend", "anomaly", "recommendation", "highlight"] },
                          severity: { type: "string", enum: ["info", "warning", "success", "critical"] },
                          title: { type: "string" },
                          description: { type: "string" },
                          action: { type: "string" },
                        },
                        required: ["type", "severity", "title", "description"],
                        additionalProperties: false,
                      },
                    },
                    summary: { type: "string", description: "Tóm tắt 1 câu về tình hình tổng thể" },
                  },
                  required: ["insights", "summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_insights" } },
        }),
      },
    );

    if (!aiResponse.ok) {
      // Return 200 with structured error so frontend doesn't crash on supabase.functions.invoke
      if (aiResponse.status === 429) {
        await aiResponse.text().catch(() => {});
        return new Response(
          JSON.stringify({
            error: "Đã đạt giới hạn AI requests, vui lòng thử lại sau ít phút.",
            errorCode: "RATE_LIMITED",
            fallback: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        await aiResponse.text().catch(() => {});
        return new Response(
          JSON.stringify({
            error: "Workspace đã hết AI credits. Vui lòng nâng cấp gói để tiếp tục dùng AI Insights.",
            errorCode: "AI_CREDITS_EXHAUSTED",
            fallback: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResponse.text().catch(() => "");
      console.error("[generate-report-insights] AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: "Lỗi tạm thời từ AI gateway, vui lòng thử lại.",
          errorCode: "AI_GATEWAY_ERROR",
          fallback: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI không trả về kết quả hợp lệ" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const result = {
      insights: parsed.insights as InsightCard[],
      summary: parsed.summary as string,
      generatedAt: new Date().toISOString(),
    };

    // Cache 1h
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await serviceClient.from("ai_response_cache").upsert({
      cache_key: cacheKey,
      input_hash: inputHash,
      function_name: "generate-report-insights",
      response_data: result as any,
      cache_scope: "org",
      organization_id: organizationId,
      brand_template_id: brandId ?? null,
      expires_at: expiresAt,
    }, { onConflict: "cache_key" });

    return new Response(
      JSON.stringify({ insights: result, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-report-insights] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
