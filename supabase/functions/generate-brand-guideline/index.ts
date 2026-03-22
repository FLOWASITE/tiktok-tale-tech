import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { resolveUserId } from "../_shared/logger.ts";
import {
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
  detectTargetAudience,
  getColorToneSuggestion,
  checkBrandCompleteness,
  buildInsufficientDataResponse,
  buildCompletenessMetadata,
} from "../_shared/brand-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'generate-brand-guideline', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      brand_name,
      industry,
      primary_color,
      has_logo,
      tone_of_voice,
      formality_level,
      brand_positioning,
      language_style,
      preferred_words,
      forbidden_words,
      // New fields for richer context
      products,
      customer_personas,
      selected_channels,
      brand_template_id,
    } = await req.json();

    // Fetch products if brand_template_id provided but no products passed
    let productList = products || [];
    if (brand_template_id && productList.length === 0) {
      const { data: fetchedProducts } = await supabase
        .from('brand_products')
        .select(`
          name, 
          description, 
          category, 
          sku,
          price_display,
          benefits, 
          unique_selling_points, 
          target_audience,
          pain_points_solved,
          keywords,
          suggested_content_angles,
          best_channels,
          is_featured
        `)
        .eq('brand_template_id', brand_template_id)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(10);
      
      if (fetchedProducts) {
        productList = fetchedProducts;
      }
    }

    // Fetch customer personas if brand_template_id provided
    let personaList = customer_personas || [];
    if (brand_template_id && personaList.length === 0) {
      const { data: fetchedPersonas } = await supabase
        .from('customer_personas')
        .select(`
          name, 
          age_range, 
          gender,
          occupation, 
          income_level,
          location,
          pain_points, 
          desires, 
          interests,
          values,
          objections,
          buying_triggers,
          preferred_channels,
          information_sources,
          typical_funnel_stage,
          is_primary
        `)
        .eq('brand_template_id', brand_template_id)
        .order('is_primary', { ascending: false })
        .limit(5);
      
      if (fetchedPersonas) {
        personaList = fetchedPersonas;
      }
    }

    // ===== CHECK BRAND COMPLETENESS =====
    const completeness = checkBrandCompleteness({
      brand_name,
      tone_of_voice,
      industry,
      brand_positioning,
      formality_level,
      products: productList,
      customer_personas: personaList,
      preferred_words,
      forbidden_words,
      primary_color,
      selected_channels,
      language_style,
    });

    console.log(`Brand completeness: score=${completeness.score}, level=${completeness.level}, canGenerate=${completeness.canGenerate}`);

    // If insufficient data, return early with helpful response
    if (!completeness.canGenerate) {
      console.log('Insufficient brand data, returning early without AI call');
      return new Response(
        JSON.stringify(buildInsufficientDataResponse(completeness)),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Detect target audience from industry (now from database)
    const targetAudience = await detectTargetAudience(industry || [], supabase);
    
    // Get color tone suggestion
    const colorToneSuggestion = getColorToneSuggestion(primary_color || '');

    // Separate featured and regular products
    const featuredProducts = productList.filter((p: any) => p.is_featured);
    const regularProducts = productList.filter((p: any) => !p.is_featured);

    // Build detailed product context
    const buildProductDetail = (p: any, isFeatured: boolean) => {
      const lines = [
        `${isFeatured ? '⭐ ' : '• '}${p.name}${p.category ? ` [${p.category}]` : ''}${isFeatured ? ' (SẢN PHẨM CHỦ LỰC)' : ''}`,
      ];
      
      if (p.description) {
        lines.push(`   Mô tả: ${p.description}`);
      }
      if (p.unique_selling_points?.length) {
        lines.push(`   USP: ${p.unique_selling_points.join('; ')}`);
      }
      if (p.benefits?.length) {
        lines.push(`   Lợi ích: ${p.benefits.join('; ')}`);
      }
      if (p.pain_points_solved?.length) {
        lines.push(`   Vấn đề giải quyết: ${p.pain_points_solved.join('; ')}`);
      }
      if (p.target_audience) {
        lines.push(`   Đối tượng: ${p.target_audience}`);
      }
      if (p.keywords?.length) {
        lines.push(`   Từ khóa: ${p.keywords.join(', ')}`);
      }
      if (p.suggested_content_angles?.length) {
        lines.push(`   Góc content gợi ý: ${p.suggested_content_angles.join(', ')}`);
      }
      if (p.price_display) {
        lines.push(`   Giá: ${p.price_display}`);
      }
      
      return lines.join('\n');
    };

    const productContext = productList.length > 0 
      ? [
          ...(featuredProducts.length > 0 ? ['--- SẢN PHẨM CHỦ LỰC ---'] : []),
          ...featuredProducts.map((p: any) => buildProductDetail(p, true)),
          ...(regularProducts.length > 0 ? ['\n--- SẢN PHẨM KHÁC ---'] : []),
          ...regularProducts.map((p: any) => buildProductDetail(p, false)),
        ].join('\n\n')
      : 'Chưa có thông tin sản phẩm/dịch vụ';

    // Build detailed persona context
    const buildPersonaDetail = (p: any, isPrimary: boolean) => {
      const lines = [
        `${isPrimary ? '⭐ ' : '• '}${p.name}${isPrimary ? ' (PERSONA CHÍNH)' : ''}`,
      ];
      
      const demographics = [
        p.age_range,
        p.gender,
        p.occupation,
        p.income_level,
        p.location,
      ].filter(Boolean);
      if (demographics.length) {
        lines.push(`   Nhân khẩu học: ${demographics.join(', ')}`);
      }
      if (p.pain_points?.length) {
        lines.push(`   Pain points: ${p.pain_points.join('; ')}`);
      }
      if (p.desires?.length) {
        lines.push(`   Mong muốn: ${p.desires.join('; ')}`);
      }
      if (p.objections?.length) {
        lines.push(`   Rào cản mua hàng: ${p.objections.join('; ')}`);
      }
      if (p.buying_triggers?.length) {
        lines.push(`   Trigger mua hàng: ${p.buying_triggers.join('; ')}`);
      }
      if (p.interests?.length) {
        lines.push(`   Sở thích: ${p.interests.join(', ')}`);
      }
      if (p.values?.length) {
        lines.push(`   Giá trị quan trọng: ${p.values.join(', ')}`);
      }
      if (p.information_sources?.length) {
        lines.push(`   Nguồn thông tin: ${p.information_sources.join(', ')}`);
      }
      if (p.preferred_channels?.length) {
        lines.push(`   Kênh ưa thích: ${p.preferred_channels.join(', ')}`);
      }
      if (p.typical_funnel_stage) {
        lines.push(`   Giai đoạn funnel: ${p.typical_funnel_stage}`);
      }
      
      return lines.join('\n');
    };

    const primaryPersonas = personaList.filter((p: any) => p.is_primary);
    const otherPersonas = personaList.filter((p: any) => !p.is_primary);

    const personaContext = personaList.length > 0
      ? [
          ...(primaryPersonas.length > 0 ? ['--- PERSONA CHÍNH ---'] : []),
          ...primaryPersonas.map((p: any) => buildPersonaDetail(p, true)),
          ...(otherPersonas.length > 0 ? ['\n--- PERSONA PHỤ ---'] : []),
          ...otherPersonas.map((p: any) => buildPersonaDetail(p, false)),
        ].join('\n\n')
      : null;

    // Build channels context
    const channelsContext = selected_channels?.length > 0
      ? selected_channels.join(', ')
      : 'Facebook, Instagram, Website';
    
    // Extract key product insights for system prompt
    const allUSPs = productList.flatMap((p: any) => p.unique_selling_points || []).filter(Boolean);
    const allBenefits = productList.flatMap((p: any) => p.benefits || []).filter(Boolean);
    const allPainPoints = productList.flatMap((p: any) => p.pain_points_solved || []).filter(Boolean);
    const featuredProductNames = featuredProducts.map((p: any) => p.name);
    const allContentAngles = productList.flatMap((p: any) => p.suggested_content_angles || []).filter(Boolean);

    // Build product highlight summary for system prompt
    const productHighlightSummary = productList.length > 0 ? `
THÔNG TIN SẢN PHẨM CẦN TÍCH HỢP:
${featuredProductNames.length > 0 ? `• Sản phẩm chủ lực: ${featuredProductNames.join(', ')}` : ''}
${allUSPs.length > 0 ? `• USP chính: ${[...new Set(allUSPs)].slice(0, 5).join('; ')}` : ''}
${allBenefits.length > 0 ? `• Lợi ích: ${[...new Set(allBenefits)].slice(0, 5).join('; ')}` : ''}
${allPainPoints.length > 0 ? `• Vấn đề giải quyết: ${[...new Set(allPainPoints)].slice(0, 5).join('; ')}` : ''}
${allContentAngles.length > 0 ? `• Góc content gợi ý: ${[...new Set(allContentAngles)].slice(0, 5).join('; ')}` : ''}
` : '';

    // Build persona summary for system prompt
    const primaryPersona = personaList.find((p: any) => p.is_primary) || personaList[0];
    const personaSummary = primaryPersona ? `
KHÁCH HÀNG MỤC TIÊU CHÍNH:
• Persona: ${primaryPersona.name}
${primaryPersona.pain_points?.length ? `• Pain points: ${primaryPersona.pain_points.slice(0, 3).join('; ')}` : ''}
${primaryPersona.desires?.length ? `• Mong muốn: ${primaryPersona.desires.slice(0, 3).join('; ')}` : ''}
${primaryPersona.objections?.length ? `• Rào cản: ${primaryPersona.objections.slice(0, 2).join('; ')}` : ''}
${primaryPersona.buying_triggers?.length ? `• Trigger mua: ${primaryPersona.buying_triggers.slice(0, 2).join('; ')}` : ''}
` : '';

    // Enhanced system prompt with product integration instructions
    const systemPrompt = `BẠN LÀ CHUYÊN GIA BRAND STRATEGIST VIỆT NAM với 15 năm kinh nghiệm xây dựng Brand Voice cho doanh nghiệp.

NHIỆM VỤ: Tạo Brand Writing Guideline STRUCTURED và ACTIONABLE bằng tiếng Việt.

QUY TẮC BẮT BUỘC:
1. KHÔNG dùng từ chung chung: "năng động", "sáng tạo", "hiệu quả", "chất lượng cao", "uy tín", "chuyên nghiệp" nếu không gắn với hành động cụ thể
2. Mỗi nguyên tắc phải là HÀNH ĐỘNG RÕ RÀNG mà copywriter/AI có thể làm theo ngay
3. Guideline phải phản ánh ĐẶC THÙ NGÀNH + SẢN PHẨM + ĐỐI TƯỢNG KHÁCH HÀNG cụ thể
4. Ưu tiên các quy tắc thực tế về: Cách xưng hô, Cấu trúc câu, CTA, Từ ngữ nên/cấm dùng, Emoji/hashtag

QUAN TRỌNG - TÍCH HỢP SẢN PHẨM VÀO GUIDELINE:
1. Guideline PHẢI phản ánh đặc thù của sản phẩm/dịch vụ (USP, benefits, pain points)
2. Ví dụ content (examples) PHẢI đề cập đến sản phẩm cụ thể của brand, KHÔNG được dùng ví dụ chung chung
3. CTA templates PHẢI liên quan đến hành động mua/dùng thử sản phẩm thực tế
4. Nếu có sản phẩm ⭐ CHỦ LỰC, ưu tiên tạo ví dụ về sản phẩm này
5. Các nguyên tắc DOS phải hướng dẫn cách highlight USP và benefits trong content
6. Phải có hướng dẫn cách address pain points của khách hàng thông qua sản phẩm
${productHighlightSummary}${personaSummary}
CÁCH VIẾT GUIDELINE TỐT:
- ❌ "Viết content chuyên nghiệp" → ✅ "Mở đầu bằng số liệu/fact cụ thể, không dùng câu cảm thán"
- ❌ "Thể hiện sự uy tín" → ✅ "Đề cập năm kinh nghiệm/số lượng khách hàng trong mỗi bài"
- ❌ "Tạo sự gần gũi" → ✅ "Xưng 'mình/bạn', thêm câu hỏi tương tác cuối bài"
- ❌ "Giới thiệu sản phẩm" → ✅ "Mở đầu bằng pain point, giải pháp bằng USP cụ thể, kết bằng CTA rõ ràng"

OUTPUT STRUCTURE:
- core_principle: Nguyên tắc cốt lõi liên quan đến SẢN PHẨM và GIÁ TRỊ mang lại
- writing_style: Mô tả cách viết tổng quan (tone, sentence length, vocabulary level)
- dos: 4-6 điều NÊN làm cụ thể, trong đó ít nhất 2 điều về cách highlight sản phẩm
- donts: 3-5 điều KHÔNG NÊN làm
- examples: Ví dụ tốt và xấu ĐỀ CẬP SẢN PHẨM CỤ THỂ
- cta_templates: 2-3 mẫu CTA phù hợp với SẢN PHẨM CỤ THỂ
- product_messaging: Hướng dẫn cách nhắc đến sản phẩm trong content`;

    // Enhanced user prompt with more context
    const userPrompt = `TẠO BRAND WRITING GUIDELINE CHO:

═══ THÔNG TIN THƯƠNG HIỆU ═══
• Tên: ${brand_name}
• Ngành: ${(industry || []).join(', ') || 'Chưa xác định'}
• Đối tượng: ${targetAudience === 'B2B' ? 'Doanh nghiệp (B2B)' : targetAudience === 'B2C' ? 'Người tiêu dùng (B2C)' : 'Cả B2B và B2C'}
• Định vị: ${brand_positioning || 'Chưa xác định'}

═══ BRAND VOICE HIỆN TẠI ═══
• Tone of Voice: ${(tone_of_voice || []).join(', ') || 'Chưa xác định'}
• Mức độ trang trọng: ${formality_level === 'formal' ? 'Trang trọng' : formality_level === 'semi_formal' ? 'Bán trang trọng' : formality_level === 'casual' ? 'Thân mật' : formality_level === 'friendly' ? 'Gần gũi' : 'Chưa xác định'}
• Phong cách ngôn ngữ: ${(language_style || []).join(', ') || 'Chưa xác định'}
• Từ nên dùng: ${(preferred_words || []).slice(0, 10).join(', ') || 'Chưa có'}
• Từ cấm: ${(forbidden_words || []).slice(0, 10).join(', ') || 'Chưa có'}

═══ SẢN PHẨM/DỊCH VỤ (QUAN TRỌNG - PHẢI TÍCH HỢP VÀO GUIDELINE) ═══
${productContext}

⚠️ LƯU Ý: Guideline PHẢI giúp viết content HIGHLIGHT các USP và benefits ở trên. Ví dụ content PHẢI đề cập đến sản phẩm cụ thể, KHÔNG được dùng ví dụ chung chung!

═══ KHÁCH HÀNG MỤC TIÊU ═══
${personaContext || `Đối tượng ${targetAudience === 'B2B' ? 'doanh nghiệp cần giải pháp chuyên nghiệp' : 'người tiêu dùng cần sản phẩm/dịch vụ phù hợp nhu cầu cá nhân'}`}

═══ KÊNH TRUYỀN THÔNG CHÍNH ═══
${channelsContext}

═══ VISUAL IDENTITY ═══
• Màu chủ đạo: ${primary_color || 'Chưa có'} ${colorToneSuggestion ? `→ Gợi ý tone: ${colorToneSuggestion}` : ''}
• Có logo: ${has_logo ? 'Có (cần hướng dẫn đặt logo)' : 'Không'}

═══ YÊU CẦU ═══
Tạo guideline CHI TIẾT với:
1. core_principle: Nguyên tắc cốt lõi GẮN VỚI SẢN PHẨM/GIÁ TRỊ mang lại
2. writing_style: Mô tả phong cách viết phù hợp với ngành và đối tượng
3. dos: 4-6 nguyên tắc NÊN làm (ít nhất 2 điều về cách highlight sản phẩm)
4. donts: 3-5 điều KHÔNG NÊN làm (với lý do)
5. examples: 1 ví dụ tốt + 1 ví dụ xấu ĐỀ CẬP SẢN PHẨM CỤ THỂ
6. cta_templates: 2-3 mẫu CTA phù hợp VỚI SẢN PHẨM
7. product_messaging: Hướng dẫn cách nhắc sản phẩm tự nhiên trong content`;

    console.log('Calling AI for enhanced brand guideline generation...');

    const tools = [{
      type: 'function',
      function: {
        name: 'generate_brand_guideline',
        description: 'Tạo Brand Writing Guideline có cấu trúc với dos/donts và ví dụ',
        parameters: {
          type: 'object',
          properties: {
            core_principle: {
              type: 'string',
              description: 'Nguyên tắc cốt lõi 1-2 câu định hướng toàn bộ content (VD: "Trở thành người bạn đồng hành đáng tin cậy trong hành trình...")'
            },
            writing_style: {
              type: 'object',
              description: 'Phong cách viết tổng quan',
              properties: {
                tone: { type: 'string', description: 'Mô tả tone voice chính (VD: "Thân thiện như nói chuyện với bạn bè, không lên lớp")' },
                sentence_structure: { type: 'string', description: 'Cấu trúc câu (VD: "Ngắn gọn, tối đa 20 từ/câu, ưu tiên câu chủ động")' },
                vocabulary_level: { type: 'string', description: 'Cấp độ từ vựng (VD: "Đơn giản, tránh thuật ngữ chuyên môn trừ khi cần thiết")' },
                addressing: { type: 'string', description: 'Cách xưng hô (VD: "Xưng mình/bạn với B2C, tôi/quý vị với B2B")' }
              },
              required: ['tone', 'sentence_structure', 'vocabulary_level', 'addressing'],
              additionalProperties: false
            },
            dos: {
              type: 'array',
              items: { type: 'string' },
              description: '4-6 điều NÊN làm cụ thể (VD: "Mở đầu bằng số liệu hoặc câu hỏi kích thích tò mò")'
            },
            donts: {
              type: 'array',
              items: { type: 'string' },
              description: '3-5 điều KHÔNG NÊN làm với lý do (VD: "Không dùng từ \'giá rẻ\' - thay bằng \'tiết kiệm\' hoặc \'hợp lý\'")'
            },
            examples: {
              type: 'object',
              description: 'Ví dụ đối chiếu - PHẢI đề cập đến sản phẩm cụ thể của brand',
              properties: {
                good: { type: 'string', description: '1 đoạn content mẫu ĐÚNG theo guideline, ĐỀ CẬP SẢN PHẨM CỤ THỂ (50-100 từ)' },
                bad: { type: 'string', description: '1 đoạn content mẫu SAI để đối chiếu (50-100 từ)' },
                good_explanation: { type: 'string', description: 'Giải thích ngắn gọn tại sao ví dụ tốt' },
                bad_explanation: { type: 'string', description: 'Giải thích ngắn gọn tại sao ví dụ xấu' }
              },
              required: ['good', 'bad', 'good_explanation', 'bad_explanation'],
              additionalProperties: false
            },
            cta_templates: {
              type: 'array',
              items: { type: 'string' },
              description: '2-3 mẫu CTA phù hợp với SẢN PHẨM CỤ THỂ (VD: "Đặt lịch tư vấn [tên sản phẩm] miễn phí", "Nhận báo giá [dịch vụ] trong 5 phút")'
            },
            product_messaging: {
              type: 'object',
              description: 'Hướng dẫn cách nhắc đến sản phẩm trong content',
              properties: {
                key_benefits_to_highlight: { 
                  type: 'array', 
                  items: { type: 'string' }, 
                  description: '3-5 lợi ích/USP cần nhấn mạnh trong mọi content'
                },
                product_mention_rules: { 
                  type: 'string',
                  description: 'Cách đề cập sản phẩm tự nhiên (VD: "Đề cập USP trong 50 từ đầu, không hard-sell")'
                },
                pain_point_addressing: {
                  type: 'string',
                  description: 'Cách address pain points của khách hàng (VD: "Mở đầu bằng pain point, giải pháp ở giữa, CTA cuối")'
                },
                benefit_framing: {
                  type: 'string',
                  description: 'Cách frame lợi ích (VD: "Nói về kết quả khách hàng đạt được, không nói về tính năng")'
                },
                featured_product_priority: {
                  type: 'string',
                  description: 'Cách ưu tiên sản phẩm chủ lực trong content'
                }
              },
              required: ['key_benefits_to_highlight', 'product_mention_rules', 'pain_point_addressing'],
              additionalProperties: false
            },
            emoji_guide: {
              type: 'object',
              description: 'Hướng dẫn sử dụng emoji (nếu allow_emoji)',
              properties: {
                recommended: { type: 'array', items: { type: 'string' }, description: 'Emoji nên dùng (3-5 emoji)' },
                max_per_post: { type: 'number', description: 'Số emoji tối đa mỗi post' },
                placement: { type: 'string', description: 'Vị trí đặt emoji (VD: "Đầu tiêu đề, cuối CTA")' }
              },
              required: ['recommended', 'max_per_post', 'placement'],
              additionalProperties: false
            },
            hashtag_strategy: {
              type: 'object',
              description: 'Chiến lược hashtag',
              properties: {
                brand_hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtag thương hiệu gợi ý' },
                content_hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtag nội dung phổ biến' },
                max_hashtags: { type: 'number', description: 'Số hashtag tối đa' }
              },
              required: ['brand_hashtags', 'content_hashtags', 'max_hashtags'],
              additionalProperties: false
            },
            suggested_brand_positioning: {
              type: 'string',
              enum: ['business', 'expert', 'community', 'personal'],
              description: 'Gợi ý định vị thương hiệu'
            },
            suggested_formality_level: {
              type: 'string',
              enum: ['formal', 'semi_formal', 'casual', 'friendly'],
              description: 'Gợi ý mức độ trang trọng'
            }
          },
          required: ['core_principle', 'writing_style', 'dos', 'donts', 'examples', 'cta_templates', 'product_messaging', 'suggested_brand_positioning', 'suggested_formality_level'],
          additionalProperties: false
        }
      }
    }];

    const userId = await resolveUserId(req, supabase);

    const aiResponse = await callAIWithMetrics(supabase, {
      functionName: 'generate-brand-guideline',
      brandTemplateId: brand_template_id,
      userId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools,
      toolChoice: { type: 'function', function: { name: 'generate_brand_guideline' } },
      actionType: 'content_generation',
    });

    if (!aiResponse.success) {
      console.error('AI call failed:', aiResponse.error);
      if (aiResponse.error?.includes('Rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Đã vượt giới hạn request, vui lòng thử lại sau.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.error?.includes('Payment')) {
        return new Response(
          JSON.stringify({ error: 'Vui lòng nạp thêm credits để tiếp tục sử dụng AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(aiResponse.error || 'AI call failed');
    }

    console.log('AI response received via', aiResponse.provider);

    // Extract tool call result
    const toolCall = aiResponse.data?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log('Enhanced brand guideline generated successfully');
      
      // Build legacy guideline text from structured data for backward compatibility
      const legacyGuideline = [
        result.core_principle,
        result.writing_style?.tone ? `Tone: ${result.writing_style.tone}` : '',
        result.writing_style?.addressing ? `Xưng hô: ${result.writing_style.addressing}` : '',
        ...(result.dos?.slice(0, 3).map((d: string) => `• ${d}`) || []),
      ].filter(Boolean).join('. ');
      
      return new Response(
        JSON.stringify({
          // Legacy fields for backward compatibility
          guideline: legacyGuideline,
          example_good: result.examples?.good || '',
          example_bad: result.examples?.bad || '',
          key_principles: result.dos?.slice(0, 5) || [],
          suggested_brand_positioning: result.suggested_brand_positioning,
          suggested_formality_level: result.suggested_formality_level,
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
          
          // New structured fields
          structured_guideline: {
            core_principle: result.core_principle,
            writing_style: result.writing_style,
            dos: result.dos,
            donts: result.donts,
            examples: result.examples,
            cta_templates: result.cta_templates,
            product_messaging: result.product_messaging,
            emoji_guide: result.emoji_guide,
            hashtag_strategy: result.hashtag_strategy,
          },
          
          // Product integration metadata
          product_context: {
            featured_products: featuredProductNames,
            all_usps: [...new Set(allUSPs)].slice(0, 10),
            all_benefits: [...new Set(allBenefits)].slice(0, 10),
            all_pain_points: [...new Set(allPainPoints)].slice(0, 10),
            content_angles: [...new Set(allContentAngles)].slice(0, 10),
          },
          
          // Brand completeness metadata
          completeness: buildCompletenessMetadata(completeness),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to content if no tool call
    const content = aiResponse.data?.choices?.[0]?.message?.content;
    if (content) {
      return new Response(
        JSON.stringify({
          guideline: content,
          example_good: '',
          example_bad: '',
          key_principles: [],
          suggested_brand_positioning: 'business',
          suggested_formality_level: 'semi_formal',
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
          structured_guideline: null,
          completeness: buildCompletenessMetadata(completeness),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No valid response from AI');

  } catch (error) {
    console.error('Error in generate-brand-guideline:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi không xác định' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
