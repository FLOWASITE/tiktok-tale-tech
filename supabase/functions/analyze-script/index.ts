import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScriptAnalysis {
  hookScore: number;
  clarityScore: number;
  viralPotential: number;
  pacingScore: number;
  ctaEffectiveness: number;
  overallScore: number;
  emotionalArc: { prompt: number; emotion: string; intensity: number }[];
  suggestions: {
    type: 'hook' | 'clarity' | 'pacing' | 'cta' | 'engagement';
    priority: 'high' | 'medium' | 'low';
    message: string;
    promptNumber?: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptContent, topic, duration, videoType, characterType } = await req.json();

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Bạn là chuyên gia phân tích kịch bản video với hơn 10 năm kinh nghiệm. 
Phân tích kịch bản và trả về JSON với cấu trúc sau:

{
  "hookScore": <số từ 0-100, đánh giá độ mạnh của hook đầu tiên>,
  "clarityScore": <số từ 0-100, độ rõ ràng của thông điệp>,
  "viralPotential": <số từ 0-100, khả năng viral>,
  "pacingScore": <số từ 0-100, nhịp điệu video>,
  "ctaEffectiveness": <số từ 0-100, hiệu quả của CTA>,
  "overallScore": <số từ 0-100, điểm tổng thể>,
  "emotionalArc": [
    {"prompt": 1, "emotion": "tò mò", "intensity": 70},
    {"prompt": 2, "emotion": "hứng thú", "intensity": 80}
  ],
  "suggestions": [
    {"type": "hook", "priority": "high", "message": "Gợi ý cải thiện...", "promptNumber": 1}
  ],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"]
}

Tiêu chí đánh giá:
- hookScore: Hook có gây tò mò không? Có giữ chân người xem trong 3 giây đầu không?
- clarityScore: Thông điệp có rõ ràng không? Có bị lan man không?
- viralPotential: Có yếu tố khiến người xem muốn chia sẻ không?
- pacingScore: Nhịp điệu có phù hợp với độ dài video không?
- ctaEffectiveness: CTA có rõ ràng và thúc đẩy hành động không?

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.`;

    const userPrompt = `Phân tích kịch bản video sau:

Chủ đề: ${topic || 'Không xác định'}
Thời lượng: ${duration || 60} giây
Thể loại: ${videoType || 'Không xác định'}
Nhân vật: ${characterType || 'Không xác định'}

NỘI DUNG KỊCH BẢN:
${scriptContent}`;

    console.log('Calling AI for script analysis...');

    // Get AI config from Admin Panel
    const aiConfig = await getAIConfig('analyze-script');
    const adminModel = aiConfig?.model || undefined;

    // Use multi-provider system
    const aiResult = await callAIProvider({
      functionName: 'analyze-script',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      modelOverride: adminModel,
      temperatureOverride: aiConfig?.temperature,
    });

    if (!aiResult.success) {
      console.error('AI error:', aiResult.error);
      
      if (aiResult.error?.includes('429') || aiResult.error?.includes('rate')) {
        return new Response(
          JSON.stringify({ error: 'Đã vượt quá giới hạn request. Vui lòng thử lại sau.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResult.error?.includes('402')) {
        return new Response(
          JSON.stringify({ error: 'Cần nạp thêm credits. Vui lòng liên hệ admin.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(aiResult.error || 'AI call failed');
    }

    const content = aiResult.data?.choices?.[0]?.message?.content || '';

    console.log('AI response:', content);

    // Parse JSON from response
    let analysis: ScriptAnalysis;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default analysis if parsing fails
      analysis = {
        hookScore: 65,
        clarityScore: 70,
        viralPotential: 55,
        pacingScore: 68,
        ctaEffectiveness: 60,
        overallScore: 64,
        emotionalArc: [
          { prompt: 1, emotion: 'trung tính', intensity: 50 }
        ],
        suggestions: [
          { type: 'hook', priority: 'medium', message: 'Không thể phân tích chi tiết. Hãy thử lại.', promptNumber: 1 }
        ],
        strengths: ['Nội dung có cấu trúc'],
        weaknesses: ['Cần xem xét thêm']
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-script function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
