import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'generate-brand-voice', slowThresholdMs: 30000 }, async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      // New inputs: accept full Brand Template data
      brand_name,
      brand_guideline,
      // Backward-compatible inputs (older clients)
      description,
      industry,
      primary_color,
      brand_positioning,
      tone_of_voice,
      formality_level,
      language_style,
      preferred_words,
      forbidden_words,
    } = await req.json();

    // Prefer brand_guideline; fallback to description for backward compatibility
    const effectiveGuideline = (brand_guideline || '').trim() || (description || '').trim();

    // Validate: require guideline (or legacy description)
    if (!effectiveGuideline) {
      return new Response(
        JSON.stringify({ error: 'Vui lòng tạo Brand Guideline trước khi tạo Brand Voice' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from existing Brand Template data
    const industryStr = Array.isArray(industry) ? industry.join(', ') : (industry || 'Chưa xác định');
    const toneStr = Array.isArray(tone_of_voice) ? tone_of_voice.join(', ') : '';
    const styleStr = Array.isArray(language_style) ? language_style.join(', ') : '';
    const preferredStr = Array.isArray(preferred_words) ? preferred_words.join(', ') : '';
    const forbiddenStr = Array.isArray(forbidden_words) ? forbidden_words.join(', ') : '';

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia về Brand Voice và Content Strategy. 

NHIỆM VỤ: Dựa trên Brand Guideline đã có, tinh chỉnh và bổ sung Brand Voice cho thương hiệu.

NGUYÊN TẮC:
1. KHÔNG đề xuất lại những gì đã có trong Brand Guideline
2. BỔ SUNG chi tiết cụ thể hơn cho việc viết content
3. preferred_words: Đề xuất 5-10 từ/cụm từ ĐẶC THÙ NGÀNH
4. forbidden_words: Đề xuất 3-5 từ cần TRÁNH (chung chung, sáo rỗng)
5. Tất cả phải bằng tiếng Việt
6. Emoji policy dựa trên mức độ trang trọng và ngành

VÍ DỤ TỐT preferred_words cho ngành Kế toán:
- "tuân thủ thuế", "tối ưu thuế", "deadline nộp hồ sơ", "quyết toán", "sổ sách kế toán"

VÍ DỤ TỐT forbidden_words:
- "số 1", "hàng đầu", "uy tín nhất", "cam kết 100%", "giá rẻ nhất"`;

    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'generate-brand-voice');
      systemPrompt = await promptManager.get('system_brand_voice', { 
        brand_name: brand_name || '', 
        industry: industryStr, 
        description: effectiveGuideline 
      });
      console.log('[generate-brand-voice] Using prompt from registry');
    } catch (err) {
      console.warn('[generate-brand-voice] Failed to fetch prompt from registry, using hardcoded fallback');
    }
    const finalSystemPrompt = systemPrompt || FALLBACK_SYSTEM;

    const userPrompt = `Phân tích và bổ sung Brand Voice cho thương hiệu:

BRAND GUIDELINE ĐÃ CÓ:
${brand_guideline}

THÔNG TIN BỔ SUNG:
- Tên thương hiệu: ${brand_name || 'Chưa đặt tên'}
- Ngành: ${industryStr}
- Màu chủ đạo: ${primary_color || 'Chưa chọn'}
- Định vị: ${brand_positioning || 'Chưa có'}
- Tone đã chọn: ${toneStr || 'Chưa chọn'}
- Phong cách: ${styleStr || 'Chưa chọn'}
- Mức trang trọng: ${formality_level || 'Chưa chọn'}
- Từ ưu tiên hiện tại: ${preferredStr || 'Chưa có'}
- Từ cấm hiện tại: ${forbiddenStr || 'Chưa có'}

Hãy sử dụng function suggest_brand_voice để trả về kết quả bổ sung.`;

    console.log("Calling Lovable AI for brand voice refinement based on guideline...");

    // Use tool calling to ensure structured JSON output
    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_brand_voice",
          description: "Bổ sung và tinh chỉnh Brand Voice dựa trên Brand Guideline",
          parameters: {
            type: "object",
            properties: {
              brand_positioning: {
                type: "string",
                description: "Câu định vị thương hiệu được tinh chỉnh (1-2 câu, tiếng Việt). Chỉ cập nhật nếu cần cải thiện."
              },
              tone_of_voice: {
                type: "array",
                items: { type: "string" },
                description: "Danh sách 2-4 tone phù hợp: professional, friendly, authoritative, playful, empathetic, inspirational, educational, conversational"
              },
              formality_level: {
                type: "string",
                enum: ["formal", "semi_formal", "casual", "friendly"],
                description: "Mức độ trang trọng phù hợp nhất"
              },
              language_style: {
                type: "array",
                items: { type: "string" },
                description: "Danh sách 2-3 phong cách: simple, technical, storytelling, data_driven, emotional, humorous, direct, poetic"
              },
              preferred_words: {
                type: "array",
                items: { type: "string" },
                description: "5-10 từ/cụm từ ĐẶC THÙ NGÀNH nên dùng (tiếng Việt)"
              },
              forbidden_words: {
                type: "array",
                items: { type: "string" },
                description: "3-5 từ CHUNG CHUNG cần tránh (tiếng Việt)"
              },
              allow_emoji: {
                type: "boolean",
                description: "Có nên dùng emoji không - dựa vào formality và ngành"
              },
              pronoun_suggestion: {
                type: "string",
                description: "Gợi ý cách xưng hô: 'mình/bạn', 'chúng tôi/quý khách', 'tôi/anh chị', etc."
              },
              reasoning: {
                type: "string",
                description: "Giải thích ngắn gọn lý do cho các đề xuất bổ sung (tiếng Việt)"
              }
            },
            required: [
              "brand_positioning",
              "tone_of_voice",
              "formality_level",
              "language_style",
              "preferred_words",
              "forbidden_words",
              "allow_emoji",
              "pronoun_suggestion",
              "reasoning"
            ],
            additionalProperties: false
          }
        }
      }
    ];

    const userId = await resolveUserId(req, supabase);

    const aiResponse = await callAIWithMetrics(supabase, {
      functionName: 'generate-brand-voice',
      userId,
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools,
      toolChoice: { type: 'function', function: { name: 'suggest_brand_voice' } },
      actionType: 'content_generation',
    });

    if (!aiResponse.success) {
      console.error('AI call failed:', aiResponse.error);
      if (aiResponse.error?.includes('Rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.error?.includes('Payment')) {
        return new Response(
          JSON.stringify({ error: 'Vui lòng nạp thêm credits để sử dụng tính năng AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received via', aiResponse.provider);
    
    // Extract from tool call response
    const toolCall = aiResponse.data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "suggest_brand_voice") {
      // Fallback: try to parse content as JSON
      const content = aiResponse.data?.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
          const suggestions = JSON.parse(jsonStr);
          console.log("Brand voice generated from content fallback");
          return new Response(
            JSON.stringify({ suggestions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch {
          console.error("No valid tool call or parseable content in response");
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'AI không thể tạo đề xuất. Vui lòng thử lại.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let suggestions;
    try {
      suggestions = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool call arguments:", parseError, toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Brand voice refined successfully via tool call");

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-brand-voice function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
