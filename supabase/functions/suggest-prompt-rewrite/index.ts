import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromptRewriteSuggestion {
  type: 'add_data' | 'add_urgency' | 'add_emotion' | 'simplify' | 'strengthen_cta' | 'improve_flow';
  label: string;
  suggestion: string;
  reason: string;
}

interface SuggestPromptRewriteRequest {
  promptContent: string;
  promptNumber: number;
  totalPrompts: number;
  videoType?: string;
  characterType?: string;
  scriptPurpose?: string;
  fullScriptContext?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      promptContent, 
      promptNumber, 
      totalPrompts,
      videoType,
      characterType,
      scriptPurpose,
      fullScriptContext
    }: SuggestPromptRewriteRequest = await req.json();

    if (!promptContent) {
      return new Response(
        JSON.stringify({ error: 'Prompt content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Vietnam time for date context
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currentYear = vnTime.getUTCFullYear();

    const systemPrompt = `Bạn là chuyên gia viết kịch bản video ngắn với hơn 10 năm kinh nghiệm.
Nhiệm vụ: Phân tích đoạn kịch bản và đưa ra 3-5 gợi ý cải thiện cụ thể.

## THÔNG TIN THỜI GIAN
- Năm hiện tại: ${currentYear}
- Luôn dùng năm ${currentYear} cho số liệu, xu hướng

## NGUYÊN TẮC GỢI Ý
1. Mỗi gợi ý phải CỤ THỂ - viết ra câu thay thế hoàn chỉnh, không chung chung
2. Giữ nguyên phong cách nhân vật và thể loại video
3. Ưu tiên các cải tiến có impact cao:
   - Thêm số liệu cụ thể tăng credibility
   - Tăng urgency nếu là prompt đầu/cuối
   - Thêm emotional hook nếu đoạn khô khan
   - Đơn giản hóa nếu quá phức tạp
   - Cải thiện flow chuyển đoạn

## OUTPUT FORMAT (JSON)
Trả về JSON array với 3-5 suggestions, mỗi suggestion có:
{
  "type": "add_data" | "add_urgency" | "add_emotion" | "simplify" | "strengthen_cta" | "improve_flow",
  "label": "Tên ngắn gọn của gợi ý (2-4 từ)",
  "suggestion": "Câu viết lại hoàn chỉnh có thể thay thế ngay",
  "reason": "Lý do tại sao cải thiện này hiệu quả (1 câu)"
}

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ TEXT KHÁC.`;

    const userPrompt = `## CONTEXT
- Prompt số: ${promptNumber}/${totalPrompts}
- Vị trí: ${promptNumber === 1 ? 'HOOK (mở đầu)' : promptNumber === totalPrompts ? 'CTA (kết thúc)' : 'BODY (thân bài)'}
${videoType ? `- Thể loại video: ${videoType}` : ''}
${characterType ? `- Nhân vật: ${characterType}` : ''}
${scriptPurpose ? `- Mục đích: ${scriptPurpose}` : ''}

## NỘI DUNG CẦN CẢI THIỆN
${promptContent}

${fullScriptContext ? `## CONTEXT TOÀN BỘ KỊCH BẢN (để hiểu flow)\n${fullScriptContext.substring(0, 1000)}...` : ''}

Hãy đưa ra 3-5 gợi ý cải thiện cụ thể cho đoạn này.`;

    console.log('[suggest-prompt-rewrite] Generating suggestions for prompt', promptNumber);

    // Get AI config
    const aiConfig = await getAIConfig('suggest-prompt-rewrite');
    const model = aiConfig?.model || 'google/gemini-2.5-flash';

    const aiResult = await callAIProvider({
      functionName: 'suggest-prompt-rewrite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      modelOverride: model,
      temperatureOverride: aiConfig?.temperature || 0.7,
    });

    if (!aiResult.success) {
      console.error('[suggest-prompt-rewrite] AI error:', aiResult.error);
      throw new Error(aiResult.error || 'AI call failed');
    }

    const content = aiResult.data?.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let suggestions: PromptRewriteSuggestion[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('[suggest-prompt-rewrite] Parse error:', parseError);
      // Return default suggestions if parsing fails
      suggestions = [
        {
          type: 'add_data',
          label: 'Thêm số liệu',
          suggestion: promptContent.replace(/nhiều người/g, '73% người'),
          reason: 'Số liệu cụ thể tăng độ tin cậy'
        },
        {
          type: 'add_urgency',
          label: 'Tăng urgency',
          suggestion: `${promptContent} - Đừng bỏ lỡ!`,
          reason: 'Tạo cảm giác cấp bách thúc đẩy hành động'
        }
      ];
    }

    console.log('[suggest-prompt-rewrite] Generated', suggestions.length, 'suggestions');

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-prompt-rewrite] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
