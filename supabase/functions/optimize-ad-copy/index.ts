import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeRequest {
  variationId: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaButton?: string;
  platform?: string;
  objective?: string;
  optimizationGoal?: 'ctr' | 'conversion' | 'engagement';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OptimizeRequest = await req.json();
    const { 
      headline, 
      primaryText, 
      description, 
      ctaButton, 
      platform = 'facebook', 
      objective = 'conversions',
      optimizationGoal = 'ctr'
    } = request;

    // Build the content to optimize
    const contentParts = [];
    if (headline) contentParts.push(`Headline hiện tại: "${headline}"`);
    if (primaryText) contentParts.push(`Primary Text hiện tại: "${primaryText}"`);
    if (description) contentParts.push(`Description hiện tại: "${description}"`);
    if (ctaButton) contentParts.push(`CTA hiện tại: "${ctaButton}"`);

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content to optimize' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia tối ưu hóa quảng cáo digital với 10+ năm kinh nghiệm.

**Các nguyên tắc tối ưu:**
- Power Words: Sử dụng từ ngữ mạnh (Miễn phí, Độc quyền, Bí mật, Khám phá...)
- Urgency: Tạo cảm giác cấp bách (Chỉ còn 24h, Số lượng có hạn...)
- Social Proof: Bằng chứng xã hội (10.000+ khách hàng, Được tin dùng...)
- Benefit Focus: Tập trung lợi ích cho khách hàng, không feature
- Question Hook: Đặt câu hỏi kích thích tò mò
- Number Specificity: Số liệu cụ thể tạo tin tưởng
- Emotional Trigger: Kích hoạt cảm xúc
- Scarcity: Tạo sự khan hiếm`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'optimize-ad-copy');
      systemPrompt = await promptManager.get('system_optimize', { 
        platform,
        objective,
        current_score: '0'
      });
      console.log('[optimize-ad-copy] Using prompt from registry');
    } catch (err) {
      console.warn('[optimize-ad-copy] Failed to fetch prompt from registry, using hardcoded fallback');
    }
    const finalSystemPrompt = systemPrompt || FALLBACK_SYSTEM;

    const prompt = `Hãy phân tích và đề xuất cải tiến cho ad copy sau:

${contentParts.join('\n')}

**Context:**
- Platform: ${platform}
- Objective: ${objective}
- Mục tiêu tối ưu: ${optimizationGoal === 'ctr' ? 'Tăng CTR' : optimizationGoal === 'conversion' ? 'Tăng Conversion Rate' : 'Tăng Engagement'}

**Yêu cầu:**
Đề xuất 2-4 cải tiến cụ thể, mỗi cải tiến cần:
1. Chỉ rõ field cần cải tiến (headline, primary_text, description, cta)
2. Nội dung đề xuất mới
3. Dự đoán % cải thiện (realistic: 5-25%)
4. Metric sẽ được cải thiện (ctr, conversion_rate, engagement)
5. Độ tin cậy (low/medium/high)
6. Lý do tại sao cải tiến này hiệu quả
7. Technique sử dụng: power_words, urgency, social_proof, benefit_focus, question_hook, number_specificity, emotional_trigger, scarcity

Trả về JSON theo format:
{
  "suggestions": [
    {
      "field": "headline" | "primary_text" | "description" | "cta",
      "original": "nội dung hiện tại",
      "suggested": "nội dung đề xuất mới",
      "predicted_improvement": number (5-25),
      "improvement_metric": "ctr" | "conversion_rate" | "engagement",
      "confidence": "low" | "medium" | "high",
      "reason": "Lý do cải tiến bằng tiếng Việt, 1-2 câu",
      "technique": "string"
    }
  ]
}

Chỉ trả về JSON, không có text khác.`;

    // Get AI config from Admin Panel
    const aiConfig = await getAIConfig('optimize-ad-copy');
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system
    const aiResult = await callAIProvider({
      functionName: 'optimize-ad-copy',
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: prompt }
      ],
      modelOverride: adminModel,
      temperatureOverride: aiConfig?.temperature,
    });

    if (!aiResult.success) {
      console.error("AI error:", aiResult.error);
      throw new Error(aiResult.error || 'AI call failed');
    }

    const text = aiResult.data?.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to parse AI response');
    }

    const optimizeResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(optimizeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Optimize ad copy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
