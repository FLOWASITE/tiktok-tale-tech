import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_GEN_AI_URL = Deno.env.get("GOOGLE_GEN_AI_URL");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreRequest {
  variationId: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaButton?: string;
  platform?: string;
  objective?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ScoreRequest = await req.json();
    const { headline, primaryText, description, ctaButton, platform, objective } = request;

    // Build the content to analyze
    const contentParts = [];
    if (headline) contentParts.push(`Headline: ${headline}`);
    if (primaryText) contentParts.push(`Primary Text: ${primaryText}`);
    if (description) contentParts.push(`Description: ${description}`);
    if (ctaButton) contentParts.push(`CTA: ${ctaButton}`);

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content to score' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Bạn là chuyên gia đánh giá chất lượng quảng cáo digital. Hãy phân tích và chấm điểm nội dung ad copy sau:

${contentParts.join('\n')}

Platform: ${platform || 'Facebook'}
Objective: ${objective || 'conversions'}

Hãy đánh giá theo các tiêu chí sau (mỗi tiêu chí 0-100 điểm):

1. **Headline Score** (nếu có): Đánh giá sức thu hút, độ rõ ràng, power words
2. **Primary Text Score** (nếu có): Đánh giá storytelling, benefit focus, emotional appeal
3. **CTA Score** (nếu có): Đánh giá action-oriented, urgency, clarity
4. **Emotional Appeal Score**: Mức độ kết nối cảm xúc với người đọc
5. **Clarity Score**: Độ rõ ràng, dễ hiểu của thông điệp
6. **Urgency Score**: Tính cấp bách, FOMO
7. **Relevance Score**: Độ phù hợp với platform và objective

Cũng xác định:
- **Strengths**: 2-4 điểm mạnh chính (tiếng Việt)
- **Weaknesses**: 2-4 điểm yếu cần cải thiện (tiếng Việt)
- **Optimization Priority**: Thành phần cần ưu tiên tối ưu nhất ('headline', 'primary_text', 'cta', hoặc 'overall')

Trả về JSON theo format:
{
  "overall_score": number (0-100),
  "grade": "A+" | "A" | "B" | "C" | "D" | "F",
  "headline_score": number | null,
  "primary_text_score": number | null,
  "cta_score": number | null,
  "emotional_appeal_score": number,
  "clarity_score": number,
  "urgency_score": number,
  "relevance_score": number,
  "score_breakdown": {
    "headline": {
      "score": number,
      "factors": [{"name": "string", "score": number, "feedback": "string"}]
    },
    "primary_text": {
      "score": number,
      "factors": [{"name": "string", "score": number, "feedback": "string"}]
    },
    "cta": {
      "score": number,
      "factors": [{"name": "string", "score": number, "feedback": "string"}]
    }
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "optimization_priority": "string"
}

Grade mapping:
- A+: 95-100
- A: 85-94
- B: 70-84
- C: 55-69
- D: 40-54
- F: 0-39

Chỉ trả về JSON, không có text khác.`;

    // Use Lovable AI
    const aiResponse = await fetch(`${GOOGLE_GEN_AI_URL}/models/gemini-2.5-flash:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    const result = await aiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const scoreResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(scoreResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Score creative error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
