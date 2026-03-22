import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { resolveUserId } from "../_shared/logger.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  mappingId: string;
  productId: string;
  personaId: string;
  brandTemplateId?: string;
  organizationId?: string;
  targetStages?: ('awareness' | 'consideration' | 'decision' | 'loyalty')[];
}

interface JourneyStageMessaging {
  journey_stage: 'awareness' | 'consideration' | 'decision' | 'loyalty';
  headline: string;
  hook: string;
  key_message: string;
  pain_points_focus: string[];
  benefits_highlight: string[];
  cta_template: string;
  emotional_tone: 'curiosity' | 'urgency' | 'trust' | 'delight' | 'empathy' | 'authority';
  objection_response: string;
  content_types: string[];
  avoid_messages: string[];
}

Deno.serve(withPerf({ functionName: 'generate-journey-messaging', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserId(req, supabase);


    const body: RequestBody = await req.json();
    const { mappingId, productId, personaId, brandTemplateId, organizationId, targetStages } = body;

    if (!mappingId || !productId || !personaId) {
      return new Response(
        JSON.stringify({ error: 'mappingId, productId, and personaId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating journey messaging for mapping:', mappingId);

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('brand_products')
      .select('name, description, unique_selling_points, benefits, pain_points_solved, suggested_content_angles, category')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product fetch error:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch persona data
    const { data: persona, error: personaError } = await supabase
      .from('customer_personas')
      .select('name, pain_points, desires, objections, communication_style, response_tone_hints, content_preferences, buying_motivation, typical_funnel_stage, age_range, occupation')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      console.error('Persona fetch error:', personaError);
      return new Response(
        JSON.stringify({ error: 'Persona not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing mapping data
    const { data: mapping } = await supabase
      .from('product_persona_mappings')
      .select('custom_pitch, key_benefits, objection_handlers, content_angles, topics_to_avoid')
      .eq('id', mappingId)
      .single();

    // Fetch brand data if provided
    let brandContext = '';
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, tone_of_voice, formality_level, preferred_words, forbidden_words')
        .eq('id', brandTemplateId)
        .single();
      
      if (brand) {
        brandContext = `
BRAND CONTEXT:
- Tên thương hiệu: ${brand.brand_name}
- Giọng điệu: ${brand.tone_of_voice?.join(', ') || 'Chuyên nghiệp'}
- Mức độ trang trọng: ${brand.formality_level || 'Cân bằng'}
- Từ ưu tiên: ${brand.preferred_words?.join(', ') || 'N/A'}
- Từ tránh dùng: ${brand.forbidden_words?.join(', ') || 'N/A'}
`;
      }
    }

    const stages = targetStages || ['awareness', 'consideration', 'decision', 'loyalty'];

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia Customer Journey Mapping và Content Strategy cho thị trường Việt Nam.

NHIỆM VỤ: Tạo messaging riêng biệt và chiến lược cho từng giai đoạn customer journey dựa trên Product và Persona context cụ thể.

QUY TẮC BẮT BUỘC:
1. Mỗi stage có emotional tone MẶC ĐỊNH nhưng có thể điều chỉnh:
   - AWARENESS: curiosity (tò mò, muốn tìm hiểu)
   - CONSIDERATION: trust (tin tưởng, uy tín)
   - DECISION: urgency (khẩn cấp, cần hành động)
   - LOYALTY: delight (vui vẻ, thích thú)

2. Pain points focus PHẢI match với persona's pain_points VÀ product's pain_points_solved
3. Benefits highlight PHẢI match với product's benefits VÀ USP

4. CTA templates theo stage:
   - AWARENESS: "Tìm hiểu thêm", "Xem ngay", "Khám phá"
   - CONSIDERATION: "So sánh ngay", "Nhận tư vấn", "Xem đánh giá"
   - DECISION: "Đăng ký ngay", "Mua ngay", "Nhận ưu đãi"
   - LOYALTY: "Ưu đãi VIP", "Nâng cấp", "Giới thiệu bạn bè"

5. Hook PHẢI gây tò mò, tối đa 2 câu, viết cho người Việt Nam
6. Key message PHẢI rõ ràng, 2-3 câu, không chung chung
7. Headline ngắn gọn 5-15 từ, tránh từ ngữ marketing generic`;

    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'generate-journey-messaging', organizationId, brandTemplateId);
      systemPrompt = await promptManager.get('system_journey', { 
        journey_stage: stages.join(', '),
        brand_context: brandContext,
        audience: persona.name
      });
      console.log('[generate-journey-messaging] Using prompt from registry');
    } catch (err) {
      console.warn('[generate-journey-messaging] Failed to fetch prompt from registry, using hardcoded fallback');
    }

    // Build full context prompt
    const contextPrompt = `${systemPrompt || FALLBACK_SYSTEM}

PRODUCT CONTEXT:
- Tên sản phẩm: ${product.name}
- Mô tả: ${product.description || 'N/A'}
- Danh mục: ${product.category || 'N/A'}
- USP (Điểm bán hàng độc đáo): ${product.unique_selling_points?.join(', ') || 'N/A'}
- Lợi ích: ${product.benefits?.join(', ') || 'N/A'}
- Pain points giải quyết: ${product.pain_points_solved?.join(', ') || 'N/A'}
- Góc content gợi ý: ${product.suggested_content_angles?.join(', ') || 'N/A'}

PERSONA CONTEXT:
- Tên persona: ${persona.name}
- Độ tuổi: ${persona.age_range || 'N/A'}
- Nghề nghiệp: ${persona.occupation || 'N/A'}
- Pain points: ${persona.pain_points?.join(', ') || 'N/A'}
- Mong muốn: ${persona.desires?.join(', ') || 'N/A'}
- Objections (phản đối thường gặp): ${persona.objections?.join(', ') || 'N/A'}
- Communication style: ${persona.communication_style || 'N/A'}
- Buying motivation: ${persona.buying_motivation?.join(', ') || 'N/A'}
- Giai đoạn funnel điển hình: ${persona.typical_funnel_stage || 'N/A'}

${mapping ? `EXISTING MAPPING DATA:
- Custom pitch: ${mapping.custom_pitch || 'N/A'}
- Key benefits: ${mapping.key_benefits?.join(', ') || 'N/A'}
- Objection handlers: ${mapping.objection_handlers?.join(', ') || 'N/A'}
- Content angles: ${mapping.content_angles?.join(', ') || 'N/A'}
- Topics to avoid: ${mapping.topics_to_avoid?.join(', ') || 'N/A'}
` : ''}

${brandContext}`;

    const userPrompt = `Hãy tạo messaging cho các giai đoạn sau: ${stages.join(', ')}

Lưu ý:
- Mỗi stage messaging phải KHÁC BIỆT và phù hợp với mục tiêu của stage đó
- Sử dụng ngôn ngữ phù hợp với persona ${persona.name}
- Tập trung vào sản phẩm ${product.name}`;

    console.log('Calling AI for journey messaging generation...');

    const tools = [{
      type: "function",
      function: {
        name: "generate_journey_messaging",
        description: "Generate journey stage messaging for each stage",
        parameters: {
          type: "object",
          properties: {
            stages: {
              type: "array",
              description: "Messaging for each journey stage",
              items: {
                type: "object",
                properties: {
                  journey_stage: {
                    type: "string",
                    enum: ["awareness", "consideration", "decision", "loyalty"],
                    description: "Giai đoạn journey"
                  },
                  headline: {
                    type: "string",
                    description: "Headline chính cho stage, 5-15 từ, thu hút"
                  },
                  hook: {
                    type: "string",
                    description: "Hook mở đầu, 1-2 câu ngắn gây tò mò"
                  },
                  key_message: {
                    type: "string",
                    description: "Message chính, 2-3 câu súc tích"
                  },
                  pain_points_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 pain points ưu tiên cho stage này"
                  },
                  benefits_highlight: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 benefits cần nhấn mạnh"
                  },
                  cta_template: {
                    type: "string",
                    description: "CTA gợi ý cho stage"
                  },
                  emotional_tone: {
                    type: "string",
                    enum: ["curiosity", "urgency", "trust", "delight", "empathy", "authority"],
                    description: "Emotional tone phù hợp"
                  },
                  objection_response: {
                    type: "string",
                    description: "Cách handle 1 objection phổ biến của persona"
                  },
                  content_types: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 loại content phù hợp cho stage"
                  },
                  avoid_messages: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 điều KHÔNG nên nói ở stage này"
                  }
                },
                required: ["journey_stage", "headline", "hook", "key_message", "pain_points_focus", "benefits_highlight", "cta_template", "emotional_tone", "content_types"]
              }
            }
          },
          required: ["stages"]
        }
      }
    }];

    const aiResponse = await callAIWithMetrics(supabase, {
      functionName: 'generate-journey-messaging',
      organizationId,
      brandTemplateId,
      userId,
      messages: [
        { role: "system", content: contextPrompt },
        { role: "user", content: userPrompt }
      ],
      tools,
      toolChoice: { type: "function", function: { name: "generate_journey_messaging" } },
      actionType: 'content_generation',
    });

    if (!aiResponse.success) {
      console.error('AI call failed:', aiResponse.error);
      if (aiResponse.error?.includes('Rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.error?.includes('Payment')) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(aiResponse.error || 'AI call failed');
    }

    console.log('AI response received via', aiResponse.provider);

    // Extract tool call result
    const toolCall = aiResponse.data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response:', aiResponse.data);
      throw new Error('Invalid AI response: no tool call');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const generatedStages: JourneyStageMessaging[] = result.stages || [];

    console.log(`Generated messaging for ${generatedStages.length} stages`);

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedStages,
        product: product.name,
        persona: persona.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-journey-messaging:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
