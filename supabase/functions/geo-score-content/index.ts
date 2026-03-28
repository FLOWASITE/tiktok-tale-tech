import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 8 GEO scoring factors
const GEO_FACTORS = [
  { key: "answer_first", label: "Answer-First Structure", weight: 15, description: "Câu trả lời trực tiếp ngay đầu bài" },
  { key: "citation_signals", label: "Citation Signals", weight: 15, description: "Dữ liệu, thống kê, nguồn tham khảo" },
  { key: "structured_data", label: "Structured Content", weight: 12, description: "Lists, bảng, FAQ, cấu trúc rõ ràng" },
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Use AI to score the content — upgraded prompt with detailed rubric
    const scoringPrompt = `Bạn là chuyên gia GEO (Generative Engine Optimization). Phân tích nội dung sau và chấm điểm CHÍNH XÁC theo 8 yếu tố.

## Nội dung cần phân tích:
${contentText.substring(0, 10000)}

## 8 Yếu tố chấm điểm (0-100 cho mỗi yếu tố):

### 1. answer_first (trọng số 15%)
Câu trả lời trực tiếp ngay đầu mỗi section.
- **90-100**: Mỗi section/đoạn mở đầu bằng câu trả lời rõ ràng, có số liệu cụ thể. Không có câu hỏi tu từ hay giới thiệu dài dòng.
- **70-89**: Phần lớn sections có answer-first nhưng 1-2 đoạn vẫn mở đầu bằng giới thiệu.
- **50-69**: Khoảng nửa nội dung có answer-first, nửa còn lại mở đầu bằng câu hỏi/giới thiệu.
- **Dưới 50**: Hầu hết sections thiếu answer-first, mở đầu bằng câu hỏi tu từ hoặc giới thiệu chung chung.

### 2. citation_signals (trọng số 15%)
Số liệu, thống kê, nguồn tham khảo cụ thể.
- **90-100**: ≥5 citations cụ thể (số %, con số, năm, nguồn), dùng cụm "theo nghiên cứu/báo cáo/dữ liệu cho thấy".
- **70-89**: 3-4 citations, có số liệu nhưng đôi khi thiếu nguồn cụ thể.
- **50-69**: 1-2 citations, chủ yếu nói chung chung "nhiều nghiên cứu cho thấy" mà không có số.
- **Dưới 50**: Không có hoặc gần như không có số liệu/thống kê.

### 3. structured_data (trọng số 12%)
⚠️ QUAN TRỌNG: Đánh giá CẤU TRÚC NỘI DUNG (lists, bảng, FAQ), KHÔNG phải JSON-LD hay schema markup kỹ thuật.
- **90-100**: Có bullet/numbered lists, bảng so sánh, và/hoặc FAQ format. Dữ liệu được tổ chức rõ ràng.
- **70-89**: Có lists hoặc bảng nhưng không đầy đủ. Thiếu FAQ format.
- **50-69**: Có 1-2 lists đơn giản nhưng phần lớn là paragraph dài.
- **Dưới 50**: Chỉ có paragraph, không có cấu trúc lists/bảng.

### 4. entity_clarity (trọng số 13%)
Định nghĩa rõ brand, sản phẩm, khái niệm chuyên ngành.
- **90-100**: Mọi thuật ngữ/brand được định nghĩa rõ khi nhắc lần đầu. Viết tắt có giải thích đầy đủ.
- **70-89**: Phần lớn entities rõ ràng, 1-2 thuật ngữ chưa được giải thích.
- **50-69**: Nhiều thuật ngữ dùng mà không giải thích, entities mơ hồ.
- **Dưới 50**: Entities không được định nghĩa, đọc khó hiểu.

### 5. heading_hierarchy (trọng số 10%)
Cấu trúc heading H1→H2→H3 logic.
- **90-100**: Heading phân cấp logic, chứa keyword tự nhiên, là câu hỏi/statement rõ ràng.
- **70-89**: Có heading nhưng đôi khi nhảy cấp hoặc heading quá chung chung.
- **50-69**: Heading ít, không có phân cấp rõ ràng.
- **Dưới 50**: Không có heading hoặc heading không logic.

### 6. content_depth (trọng số 15%)
Chiều sâu, phân tích đa góc, ví dụ cụ thể.
- **90-100**: Phân tích đa góc (nguyên nhân, hệ quả, giải pháp, so sánh), có framework rõ ràng, cả pros & cons.
- **70-89**: Có chiều sâu nhưng thiếu 1-2 góc nhìn, ví dụ chưa đủ cụ thể.
- **50-69**: Phân tích hời hợt, chỉ liệt kê không giải thích sâu.
- **Dưới 50**: Nội dung nông, chỉ lướt qua bề mặt.

### 7. freshness (trọng số 8%)
Tính cập nhật, thời sự.
- **90-100**: Đề cập năm 2025/2026, xu hướng mới nhất, dữ liệu gần đây.
- **70-89**: Có 1-2 tham chiếu thời gian nhưng không nhất quán.
- **50-69**: Không rõ thời điểm, thông tin có thể đã cũ.
- **Dưới 50**: Thông tin rõ ràng lỗi thời.

### 8. extractability (trọng số 12%)
AI có thể trích xuất snippet độc lập.
- **90-100**: Mỗi đoạn 2-4 câu, tự chứa (self-contained), không dùng đại từ mơ hồ. AI có thể trích riêng mỗi đoạn.
- **70-89**: Phần lớn đoạn tự chứa nhưng đôi khi dùng "nó", "điều này" mơ hồ.
- **50-69**: Đoạn dài, phụ thuộc context trước đó để hiểu.
- **Dưới 50**: Nội dung liền mạch, không thể trích riêng đoạn nào.

## Issues cần phát hiện:
- Critical (đỏ): Vấn đề nghiêm trọng cần sửa ngay
- Important (cam): Cần cải thiện
- Improvement (xanh): Gợi ý tối ưu thêm

## LƯU Ý QUAN TRỌNG:
- Chấm điểm CHÍNH XÁC, KHÔNG cho điểm "safe" quanh 70-80
- Nội dung tốt thực sự phải được 90+
- Nội dung kém phải dưới 60
- Phân biệt rõ ràng giữa các mức điểm`;

    const tools = [
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
    ];

    // Use centralized callAI — respects Admin model config & auto-fallback
    const result = await callAI({
      functionName: "geo-score-content",
      organizationId,
      messages: [
        { role: "system", content: "Bạn là GEO scoring engine chuyên nghiệp. Chấm điểm CHÍNH XÁC và KHÁCH QUAN. Không cho điểm an toàn — nội dung tốt phải được điểm cao, nội dung kém phải điểm thấp." },
        { role: "user", content: scoringPrompt },
      ],
      tools,
      toolChoice: { type: "function", function: { name: "submit_geo_score" } },
    });

    if (!result.success) {
      const isCredits = result.error?.includes("402") || result.error?.includes("Payment");
      if (isCredits) {
        return new Response(
          JSON.stringify({ success: false, error: "Hết credits AI", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (result.error?.includes("429") || result.error?.includes("Rate limit")) {
        return new Response(JSON.stringify({ error: "Rate limited, thử lại sau" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(result.error || "AI call failed");
    }

    const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
    
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

    console.log(`[geo-score-content] Scored via ${result.provider}/${result.model}${result.fromFallback ? ' (fallback)' : ''}`);

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
