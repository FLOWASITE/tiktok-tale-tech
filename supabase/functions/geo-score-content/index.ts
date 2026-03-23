import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 8 GEO scoring factors
const GEO_FACTORS = [
  { key: "answer_first", label: "Answer-First Structure", weight: 15, description: "Câu trả lời trực tiếp ngay đầu bài" },
  { key: "citation_signals", label: "Citation Signals", weight: 15, description: "Dữ liệu, thống kê, nguồn tham khảo" },
  { key: "structured_data", label: "Structured Data", weight: 12, description: "Schema markup, JSON-LD" },
  { key: "entity_clarity", label: "Entity Clarity", weight: 13, description: "Định nghĩa rõ ràng thực thể, brand" },
  { key: "heading_hierarchy", label: "Heading Hierarchy", weight: 10, description: "Cấu trúc tiêu đề H1-H4 logic" },
  { key: "content_depth", label: "Content Depth", weight: 15, description: "Chiều sâu, chi tiết, đa góc nhìn" },
  { key: "freshness", label: "Freshness", weight: 8, description: "Tính cập nhật, thời sự" },
  { key: "extractability", label: "Extractability", weight: 12, description: "Dễ trích xuất cho AI snippet" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, contentType, contentText, organizationId } = await req.json();
    if (!contentText || !organizationId) throw new Error("contentText and organizationId required");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Use AI to score the content
    const scoringPrompt = `Bạn là chuyên gia GEO (Generative Engine Optimization). Phân tích nội dung sau và chấm điểm theo 8 yếu tố.

## Nội dung cần phân tích:
${contentText.substring(0, 6000)}

## 8 Yếu tố chấm điểm (0-100 cho mỗi yếu tố):
1. answer_first: Có câu trả lời trực tiếp ngay đầu bài không?
2. citation_signals: Có dữ liệu, thống kê, nguồn tham khảo không?
3. structured_data: Có schema markup, dữ liệu cấu trúc không?
4. entity_clarity: Thực thể (brand, sản phẩm) có được định nghĩa rõ ràng?
5. heading_hierarchy: Tiêu đề có logic, phân cấp tốt?
6. content_depth: Nội dung có chiều sâu, đa góc nhìn?
7. freshness: Có dữ liệu/thông tin cập nhật, thời sự?
8. extractability: AI có dễ trích xuất snippet từ nội dung?

## Issues cần phát hiện:
- Critical (đỏ): Vấn đề nghiêm trọng cần sửa ngay
- Important (cam): Cần cải thiện
- Improvement (xanh): Gợi ý tối ưu thêm`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Bạn là GEO scoring engine. Trả về kết quả chấm điểm." },
          { role: "user", content: scoringPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_geo_score",
              description: "Submit GEO score results",
              parameters: {
                type: "object",
                properties: {
                  factor_scores: {
                    type: "object",
                    properties: {
                      answer_first: { type: "number" },
                      citation_signals: { type: "number" },
                      structured_data: { type: "number" },
                      entity_clarity: { type: "number" },
                      heading_hierarchy: { type: "number" },
                      content_depth: { type: "number" },
                      freshness: { type: "number" },
                      extractability: { type: "number" },
                    },
                    required: ["answer_first", "citation_signals", "structured_data", "entity_clarity", "heading_hierarchy", "content_depth", "freshness", "extractability"],
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["critical", "important", "improvement"] },
                        factor: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["severity", "factor", "title", "description", "suggestion"],
                    },
                  },
                },
                required: ["factor_scores", "issues"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_geo_score" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, thử lại sau" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credits, vui lòng nạp thêm" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let factorScores: Record<string, number> = {};
    let issues: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      factorScores = parsed.factor_scores || {};
      issues = parsed.issues || [];
    }

    // Calculate overall score (weighted average)
    let overallScore = 0;
    let totalWeight = 0;
    GEO_FACTORS.forEach(f => {
      const score = factorScores[f.key] || 0;
      overallScore += score * f.weight;
      totalWeight += f.weight;
    });
    overallScore = Math.round(overallScore / totalWeight);

    // Upsert into geo_content_scores
    if (contentId) {
      const { error: upsertErr } = await supabase
        .from("geo_content_scores")
        .upsert(
          {
            content_id: contentId,
            content_type: contentType || "multi_channel",
            organization_id: organizationId,
            overall_score: overallScore,
            factor_scores: factorScores,
            issues,
            suggestions: issues.filter((i: any) => i.suggestion).map((i: any) => ({
              factor: i.factor,
              suggestion: i.suggestion,
              severity: i.severity,
            })),
            last_scored_at: new Date().toISOString(),
          },
          { onConflict: "content_id,content_type" }
        );

      if (upsertErr) console.error("Upsert error:", upsertErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overall_score: overallScore,
        factor_scores: factorScores,
        issues,
        factors_meta: GEO_FACTORS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geo-score-content error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
