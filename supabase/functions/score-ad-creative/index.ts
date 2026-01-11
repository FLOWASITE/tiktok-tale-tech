import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

serve(async (req) => {
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

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia đánh giá chất lượng quảng cáo digital.

Hãy đánh giá theo các tiêu chí sau (mỗi tiêu chí 0-100 điểm):
1. **Headline Score** (nếu có): Đánh giá sức thu hút, độ rõ ràng, power words
2. **Primary Text Score** (nếu có): Đánh giá storytelling, benefit focus, emotional appeal
3. **CTA Score** (nếu có): Đánh giá action-oriented, urgency, clarity
4. **Emotional Appeal Score**: Mức độ kết nối cảm xúc với người đọc
5. **Clarity Score**: Độ rõ ràng, dễ hiểu của thông điệp
6. **Urgency Score**: Tính cấp bách, FOMO
7. **Relevance Score**: Độ phù hợp với platform và objective

Grade mapping:
- A+: 95-100, A: 85-94, B: 70-84, C: 55-69, D: 40-54, F: 0-39`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'score-ad-creative');
      systemPrompt = await promptManager.get('system_score', { 
        platform: platform || 'Facebook',
        objective: objective || 'conversions'
      });
      console.log('[score-ad-creative] Using prompt from registry');
    } catch (err) {
      console.warn('[score-ad-creative] Failed to fetch prompt from registry, using hardcoded fallback');
    }
    const finalSystemPrompt = systemPrompt || FALLBACK_SYSTEM;

    const prompt = `Hãy phân tích và chấm điểm nội dung ad copy sau:

${contentParts.join('\n')}

Platform: ${platform || 'Facebook'}
Objective: ${objective || 'conversions'}

Cũng xác định:
- **Strengths**: 2-4 điểm mạnh chính (tiếng Việt)
- **Weaknesses**: 2-4 điểm yếu cần cải thiện (tiếng Việt)
- **Optimization Priority**: Thành phần cần ưu tiên tối ưu nhất

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
  "score_breakdown": {...},
  "strengths": ["string"],
  "weaknesses": ["string"],
  "optimization_priority": "string"
}

Chỉ trả về JSON, không có text khác.`;

    // Use Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI call failed: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const text = result.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to parse AI response');
    }

    const scoreResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(scoreResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Score creative error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
