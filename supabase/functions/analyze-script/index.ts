import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definition for structured output
const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_script_analysis",
    description: "Submit the structured analysis of a video script",
    parameters: {
      type: "object",
      properties: {
        hookScore: { type: "number", description: "Hook strength score 0-100" },
        clarityScore: { type: "number", description: "Message clarity score 0-100" },
        viralPotential: { type: "number", description: "Viral potential score 0-100" },
        pacingScore: { type: "number", description: "Pacing score 0-100" },
        ctaEffectiveness: { type: "number", description: "CTA effectiveness score 0-100" },
        overallScore: { type: "number", description: "Overall score 0-100" },
        emotionalArc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              prompt: { type: "number" },
              emotion: { type: "string" },
              intensity: { type: "number" },
            },
            required: ["prompt", "emotion", "intensity"],
          },
        },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["hook", "clarity", "pacing", "cta", "engagement"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              message: { type: "string" },
              promptNumber: { type: "number" },
            },
            required: ["type", "priority", "message"],
          },
        },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
      },
      required: ["hookScore", "clarityScore", "viralPotential", "pacingScore", "ctaEffectiveness", "overallScore", "emotionalArc", "suggestions", "strengths", "weaknesses"],
      additionalProperties: false,
    },
  },
};

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

    // Try to fetch system prompt from registry
    let baseSystemPrompt = '';
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const promptManager = createPromptManager(supabase, 'analyze-script');
      baseSystemPrompt = await promptManager.get('system_analyze', {
        topic: topic || 'Không xác định',
        duration: duration || 60,
        videoType: videoType || 'Không xác định',
      });
    } catch (err) {
      console.warn('[analyze-script] Failed to fetch prompt from registry, using hardcoded');
    }

    const systemPrompt = baseSystemPrompt || `Bạn là chuyên gia phân tích kịch bản video với hơn 10 năm kinh nghiệm.
Phân tích kịch bản video và đánh giá theo các tiêu chí:
- hookScore: Hook có gây tò mò không? Có giữ chân người xem trong 3 giây đầu không?
- clarityScore: Thông điệp có rõ ràng không? Có bị lan man không?
- viralPotential: Có yếu tố khiến người xem muốn chia sẻ không?
- pacingScore: Nhịp điệu có phù hợp với độ dài video không?
- ctaEffectiveness: CTA có rõ ràng và thúc đẩy hành động không?
Hãy đánh giá khách quan, chính xác. Đưa ra gợi ý cụ thể và hữu ích bằng tiếng Việt.`;

    const userPrompt = `Phân tích kịch bản video sau:

Chủ đề: ${topic || 'Không xác định'}
Thời lượng: ${duration || 60} giây
Thể loại: ${videoType || 'Không xác định'}
Nhân vật: ${characterType || 'Không xác định'}

NỘI DUNG KỊCH BẢN:
${scriptContent}`;

    console.log('Calling AI for script analysis with tool calling...');

    const aiConfig = await getAIConfig('analyze-script');
    const adminModel = aiConfig?.model || undefined;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const aiResult = await callAIWithMetrics(supabase, {
      functionName: 'analyze-script',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [ANALYSIS_TOOL],
      toolChoice: { type: "function", function: { name: "submit_script_analysis" } },
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

    // Extract from tool_calls first, fallback to content parsing
    const message = aiResult.data?.choices?.[0]?.message;
    let analysis: any = null;

    // Primary: tool_calls
    if (message?.tool_calls?.[0]?.function?.arguments) {
      try {
        analysis = JSON.parse(message.tool_calls[0].function.arguments);
        console.log('[analyze-script] Parsed from tool_calls successfully');
      } catch (e) {
        console.warn('[analyze-script] Failed to parse tool_calls arguments:', e);
      }
    }

    // Fallback: try content (some models return JSON in content even with tool_choice)
    if (!analysis && message?.content) {
      try {
        const jsonMatch = message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
          console.log('[analyze-script] Parsed from content fallback');
        }
      } catch (e) {
        console.warn('[analyze-script] Content fallback parse failed:', e);
      }
    }

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'AI không trả về kết quả phân tích hợp lệ. Vui lòng thử lại.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
