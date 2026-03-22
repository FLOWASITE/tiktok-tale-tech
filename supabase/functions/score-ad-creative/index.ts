import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { getOutputLanguage, getLanguageConfig, buildLocalizedDateContext, getLocalizedPromptLabels } from "../_shared/country-language-map.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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
  countryCode?: string;
  outputLanguage?: string;
}

// Localized scoring prompts per language
function buildScoringPrompt(lang: string) {
  const prompts: Record<string, { system: string; userTemplate: (parts: string[], platform: string, objective: string) => string }> = {
    vi: {
      system: `Bạn là chuyên gia đánh giá chất lượng quảng cáo digital.

Hãy đánh giá theo các tiêu chí sau (mỗi tiêu chí 0-100 điểm):
1. **Headline Score** (nếu có): Đánh giá sức thu hút, độ rõ ràng, power words
2. **Primary Text Score** (nếu có): Đánh giá storytelling, benefit focus, emotional appeal
3. **CTA Score** (nếu có): Đánh giá action-oriented, urgency, clarity
4. **Emotional Appeal Score**: Mức độ kết nối cảm xúc với người đọc
5. **Clarity Score**: Độ rõ ràng, dễ hiểu của thông điệp
6. **Urgency Score**: Tính cấp bách, FOMO
7. **Relevance Score**: Độ phù hợp với platform và objective

Grade mapping:
- A+: 95-100, A: 85-94, B: 70-84, C: 55-69, D: 40-54, F: 0-39`,
      userTemplate: (parts, platform, objective) => `Hãy phân tích và chấm điểm nội dung ad copy sau:

${parts.join('\n')}

Platform: ${platform}
Objective: ${objective}

Cũng xác định:
- **Strengths**: 2-4 điểm mạnh chính (tiếng Việt)
- **Weaknesses**: 2-4 điểm yếu cần cải thiện (tiếng Việt)
- **Optimization Priority**: Thành phần cần ưu tiên tối ưu nhất`,
    },
    th: {
      system: `คุณเป็นผู้เชี่ยวชาญด้านการประเมินคุณภาพโฆษณาดิจิทัล

ประเมินตามเกณฑ์ต่อไปนี้ (แต่ละเกณฑ์ 0-100 คะแนน):
1. **Headline Score** (ถ้ามี): ประเมินความดึงดูด ความชัดเจน power words
2. **Primary Text Score** (ถ้ามี): ประเมิน storytelling, benefit focus, emotional appeal
3. **CTA Score** (ถ้ามี): ประเมิน action-oriented, urgency, clarity
4. **Emotional Appeal Score**: ระดับการเชื่อมต่อทางอารมณ์กับผู้อ่าน
5. **Clarity Score**: ความชัดเจน เข้าใจง่ายของข้อความ
6. **Urgency Score**: ความเร่งด่วน FOMO
7. **Relevance Score**: ความเหมาะสมกับ platform และ objective

Grade mapping:
- A+: 95-100, A: 85-94, B: 70-84, C: 55-69, D: 40-54, F: 0-39`,
      userTemplate: (parts, platform, objective) => `วิเคราะห์และให้คะแนนเนื้อหาโฆษณาต่อไปนี้:

${parts.join('\n')}

Platform: ${platform}
Objective: ${objective}

ระบุด้วย:
- **Strengths**: 2-4 จุดแข็งหลัก (ภาษาไทย)
- **Weaknesses**: 2-4 จุดอ่อนที่ต้องปรับปรุง (ภาษาไทย)
- **Optimization Priority**: องค์ประกอบที่ต้องเพิ่มประสิทธิภาพก่อน`,
    },
    en: {
      system: `You are an expert in evaluating digital advertising quality.

Evaluate based on these criteria (each 0-100 points):
1. **Headline Score** (if applicable): Attractiveness, clarity, power words
2. **Primary Text Score** (if applicable): Storytelling, benefit focus, emotional appeal
3. **CTA Score** (if applicable): Action-oriented, urgency, clarity
4. **Emotional Appeal Score**: Emotional connection with the reader
5. **Clarity Score**: Message clarity and comprehension
6. **Urgency Score**: Urgency, FOMO
7. **Relevance Score**: Relevance to platform and objective

Grade mapping:
- A+: 95-100, A: 85-94, B: 70-84, C: 55-69, D: 40-54, F: 0-39`,
      userTemplate: (parts, platform, objective) => `Analyze and score the following ad copy:

${parts.join('\n')}

Platform: ${platform}
Objective: ${objective}

Also identify:
- **Strengths**: 2-4 key strengths
- **Weaknesses**: 2-4 areas for improvement
- **Optimization Priority**: Component to prioritize for optimization`,
    },
  };
  return prompts[lang] || prompts['en'];
}

Deno.serve(withPerf({ functionName: 'score-ad-creative', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ScoreRequest = await req.json();
    const { headline, primaryText, description, ctaButton, platform, objective, countryCode, outputLanguage } = request;

    // Determine output language
    const lang = outputLanguage || getOutputLanguage(countryCode);

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

    // Get localized scoring prompt
    const scoringPrompt = buildScoringPrompt(lang);

    // Try to fetch system prompt from registry with fallback
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserId(req, supabase);


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
    const finalSystemPrompt = systemPrompt || scoringPrompt.system;

    const jsonFormatInstruction = lang === 'vi' 
      ? 'Chỉ trả về JSON, không có text khác.'
      : lang === 'th'
      ? 'ส่งกลับเฉพาะ JSON เท่านั้น ไม่มีข้อความอื่น'
      : 'Return JSON only, no other text.';

    const prompt = `${scoringPrompt.userTemplate(contentParts, platform || 'Facebook', objective || 'conversions')}

Return JSON in this format:
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

${jsonFormatInstruction}`;

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

    // Non-blocking metrics
    const model = "google/gemini-2.5-flash";
    const inputTokens = estimateTokens(finalSystemPrompt + prompt);
    const outputTokens = estimateTokens(text);
    saveMetrics(supabase, {
      traceId: generateTraceId(),
      functionName: 'score-ad-creative',
      userId,
      totalDurationMs: 0,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: outputTokens,
      estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
      modelsUsed: { text: model },
      hadError: false,
      contextSources: [],
      actionType: 'content_analysis',
    }).catch(() => {});

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
}));
