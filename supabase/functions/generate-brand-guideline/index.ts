import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Color to tone mapping
const COLOR_TONE_MAP: Record<string, string> = {
  // Reds & Oranges - Urgency, energy
  '#FF0000': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF4500': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF6347': 'Thân thiện nhưng mạnh mẽ, khuyến khích hành động',
  '#FFA500': 'Thân thiện, lạc quan, dễ tiếp cận',
  '#FF8C00': 'Năng động, tích cực, khuyến khích hành động',
  
  // Blues - Trust, professionalism
  '#0000FF': 'Tin cậy, chuyên nghiệp, ưu tiên dữ liệu và số liệu',
  '#1E90FF': 'Tin cậy, hiện đại, chuyên nghiệp',
  '#4169E1': 'Tin cậy, uy tín, chuyên nghiệp cao',
  '#000080': 'Uy quyền, cao cấp, chuyên nghiệp truyền thống',
  '#87CEEB': 'Nhẹ nhàng, an tâm, thân thiện',
  
  // Greens - Growth, safety
  '#008000': 'An toàn, tăng trưởng, bền vững, tin cậy',
  '#228B22': 'Tự nhiên, bền vững, tăng trưởng',
  '#32CD32': 'Tích cực, phát triển, năng động',
  '#00FF00': 'Mới mẻ, sáng tạo, năng động',
  '#2E8B57': 'Ổn định, đáng tin cậy, chuyên nghiệp',
  
  // Blacks & Grays - Premium, minimal
  '#000000': 'Cao cấp, tối giản, uy quyền, chuyên nghiệp',
  '#333333': 'Cao cấp, chuyên nghiệp, sang trọng',
  '#666666': 'Trung tính, chuyên nghiệp, dễ kết hợp',
  '#808080': 'Trung tính, ổn định, chuyên nghiệp',
  
  // Purples - Luxury, creativity
  '#800080': 'Sang trọng, sáng tạo, độc đáo',
  '#9932CC': 'Sáng tạo, độc đáo, cao cấp',
  '#8B008B': 'Cao cấp, bí ẩn, thu hút',
  
  // Yellows - Friendly, optimistic
  '#FFD700': 'Lạc quan, thân thiện, thu hút chú ý',
  '#FFFF00': 'Năng động, vui vẻ, thu hút',
  '#FFA07A': 'Ấm áp, thân thiện, dễ gần',
  
  // Pinks - Warm, approachable
  '#FFC0CB': 'Nhẹ nhàng, thân thiện, ấm áp',
  '#FF69B4': 'Năng động, trẻ trung, thu hút',
  
  // Browns - Earthy, reliable
  '#8B4513': 'Truyền thống, đáng tin cậy, chắc chắn',
  '#A0522D': 'Tự nhiên, ấm áp, đáng tin cậy',
};

interface IndustryTargetData {
  code: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  translations: { name: string; language_code: string }[];
}

// Cache for industry target mapping (per-request caching)
let cachedIndustryTargetMap: Map<string, 'B2B' | 'B2C' | 'both'> | null = null;

// Fetch industry target mapping from database with caching
async function fetchIndustryTargetMap(supabase: any): Promise<Map<string, 'B2B' | 'B2C' | 'both'>> {
  // Return cached map if available
  if (cachedIndustryTargetMap) {
    console.log(`Using cached industry target map (${cachedIndustryTargetMap.size} entries)`);
    return cachedIndustryTargetMap;
  }

  const targetMap = new Map<string, 'B2B' | 'B2C' | 'both'>();
  
  try {
    // Fetch all industry templates with their translations
    const { data: templates, error } = await supabase
      .from('industry_templates')
      .select(`
        code,
        target_audience,
        industry_template_translations(name, language_code)
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching industry templates:', error);
      return targetMap;
    }
    
    if (templates) {
      for (const template of templates) {
        const target = template.target_audience as 'B2B' | 'B2C' | 'both';
        
        // Map by code
        targetMap.set(template.code, target);
        
        // Map by translated names
        const translations = template.industry_template_translations as { name: string; language_code: string }[] | null;
        if (translations) {
          for (const trans of translations) {
            targetMap.set(trans.name, target);
          }
        }
      }
    }
    
    console.log(`Loaded ${targetMap.size} industry target mappings from database`);
    
    // Cache the result
    cachedIndustryTargetMap = targetMap;
  } catch (err) {
    console.error('Failed to fetch industry target map:', err);
  }
  
  return targetMap;
}

// Clear cache (call at start of each request)
function clearIndustryTargetCache() {
  cachedIndustryTargetMap = null;
}

async function detectTargetAudience(
  industries: string[],
  supabase: any
): Promise<'B2B' | 'B2C' | 'both'> {
  if (!industries || industries.length === 0) return 'B2B';
  
  const industryTargetMap = await fetchIndustryTargetMap(supabase);
  
  let b2bCount = 0;
  let b2cCount = 0;
  let bothCount = 0;
  
  for (const industry of industries) {
    const target = industryTargetMap.get(industry);
    if (target === 'B2B') b2bCount++;
    else if (target === 'B2C') b2cCount++;
    else if (target === 'both') bothCount++;
    else b2bCount++; // Default to B2B for unknown industries
  }
  
  if (b2bCount > b2cCount && b2bCount > bothCount) return 'B2B';
  if (b2cCount > b2bCount && b2cCount > bothCount) return 'B2C';
  return 'both';
}

function getColorToneSuggestion(color: string): string {
  if (!color) return '';
  
  // Normalize color to uppercase
  const normalizedColor = color.toUpperCase();
  
  // Direct match
  if (COLOR_TONE_MAP[normalizedColor]) {
    return COLOR_TONE_MAP[normalizedColor];
  }
  
  // Parse hex to RGB for approximate matching
  const hex = normalizedColor.replace('#', '');
  if (hex.length !== 6) return '';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Approximate color category
  if (r > 200 && g < 100 && b < 100) return 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao';
  if (r > 200 && g > 150 && b < 100) return 'Thân thiện, lạc quan, dễ tiếp cận';
  if (r < 100 && g < 100 && b > 150) return 'Tin cậy, chuyên nghiệp, ưu tiên dữ liệu và số liệu';
  if (r < 100 && g > 150 && b < 100) return 'An toàn, tăng trưởng, bền vững, tin cậy';
  if (r < 80 && g < 80 && b < 80) return 'Cao cấp, tối giản, uy quyền, chuyên nghiệp';
  if (r > 200 && g > 200 && b < 100) return 'Lạc quan, thân thiện, thu hút chú ý';
  if (r > 150 && g < 100 && b > 150) return 'Sang trọng, sáng tạo, độc đáo';
  
  return 'Chuyên nghiệp, cân bằng';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

    // Validate required fields
    if (!brand_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Tên thương hiệu là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch products if brand_template_id provided but no products passed
    let productList = products || [];
    if (brand_template_id && productList.length === 0) {
      const { data: fetchedProducts } = await supabase
        .from('brand_products')
        .select('name, description, category, benefits, unique_selling_points, target_audience')
        .eq('brand_template_id', brand_template_id)
        .eq('is_active', true)
        .limit(5);
      
      if (fetchedProducts) {
        productList = fetchedProducts;
      }
    }

    // Fetch customer personas if brand_template_id provided
    let personaList = customer_personas || [];
    if (brand_template_id && personaList.length === 0) {
      const { data: fetchedPersonas } = await supabase
        .from('customer_personas')
        .select('name, age_range, occupation, pain_points, desires, preferred_channels')
        .eq('brand_template_id', brand_template_id)
        .limit(3);
      
      if (fetchedPersonas) {
        personaList = fetchedPersonas;
      }
    }

    // Detect target audience from industry (now from database)
    const targetAudience = await detectTargetAudience(industry || [], supabase);
    
    // Get color tone suggestion
    const colorToneSuggestion = getColorToneSuggestion(primary_color || '');

    // Build product context
    const productContext = productList.length > 0 
      ? productList.map((p: any) => 
          `• ${p.name}${p.category ? ` (${p.category})` : ''}: ${p.description || ''}${p.unique_selling_points?.length ? ` | USP: ${p.unique_selling_points.join(', ')}` : ''}`
        ).join('\n')
      : 'Chưa có thông tin sản phẩm/dịch vụ';

    // Build persona context
    const personaContext = personaList.length > 0
      ? personaList.map((p: any) =>
          `• ${p.name}${p.age_range ? ` (${p.age_range})` : ''}${p.occupation ? `, ${p.occupation}` : ''}: ${p.pain_points?.slice(0, 2).join(', ') || 'N/A'}`
        ).join('\n')
      : null;

    // Build channels context
    const channelsContext = selected_channels?.length > 0
      ? selected_channels.join(', ')
      : 'Facebook, Instagram, Website';

    // Enhanced system prompt
    const systemPrompt = `BẠN LÀ CHUYÊN GIA BRAND STRATEGIST VIỆT NAM với 15 năm kinh nghiệm xây dựng Brand Voice cho doanh nghiệp.

NHIỆM VỤ: Tạo Brand Writing Guideline STRUCTURED và ACTIONABLE bằng tiếng Việt.

QUY TẮC BẮT BUỘC:
1. KHÔNG dùng từ chung chung: "năng động", "sáng tạo", "hiệu quả", "chất lượng cao", "uy tín", "chuyên nghiệp" nếu không gắn với hành động cụ thể
2. Mỗi nguyên tắc phải là HÀNH ĐỘNG RÕ RÀNG mà copywriter/AI có thể làm theo ngay
3. Guideline phải phản ánh ĐẶC THÙ NGÀNH + SẢN PHẨM + ĐỐI TƯỢNG KHÁCH HÀNG cụ thể
4. Ưu tiên các quy tắc thực tế về: Cách xưng hô, Cấu trúc câu, CTA, Từ ngữ nên/cấm dùng, Emoji/hashtag

CÁCH VIẾT GUIDELINE TỐT:
- ❌ "Viết content chuyên nghiệp" → ✅ "Mở đầu bằng số liệu/fact cụ thể, không dùng câu cảm thán"
- ❌ "Thể hiện sự uy tín" → ✅ "Đề cập năm kinh nghiệm/số lượng khách hàng trong mỗi bài"
- ❌ "Tạo sự gần gũi" → ✅ "Xưng 'mình/bạn', thêm câu hỏi tương tác cuối bài"

OUTPUT STRUCTURE:
- writing_style: Mô tả cách viết tổng quan (tone, sentence length, vocabulary level)
- dos: 4-6 điều NÊN làm cụ thể
- donts: 3-5 điều KHÔNG NÊN làm
- examples: Ví dụ tốt và xấu đối chiếu
- cta_templates: 2-3 mẫu CTA phù hợp với brand`;

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

═══ SẢN PHẨM/DỊCH VỤ ═══
${productContext}

═══ KHÁCH HÀNG MỤC TIÊU ═══
${personaContext || `Đối tượng ${targetAudience === 'B2B' ? 'doanh nghiệp cần giải pháp chuyên nghiệp' : 'người tiêu dùng cần sản phẩm/dịch vụ phù hợp nhu cầu cá nhân'}`}

═══ KÊNH TRUYỀN THÔNG CHÍNH ═══
${channelsContext}

═══ VISUAL IDENTITY ═══
• Màu chủ đạo: ${primary_color || 'Chưa có'} ${colorToneSuggestion ? `→ Gợi ý tone: ${colorToneSuggestion}` : ''}
• Có logo: ${has_logo ? 'Có (cần hướng dẫn đặt logo)' : 'Không'}

═══ YÊU CẦU ═══
Tạo guideline CHI TIẾT với:
1. writing_style: Mô tả phong cách viết phù hợp với ngành và đối tượng
2. dos: 4-6 nguyên tắc NÊN làm (hành động cụ thể)
3. donts: 3-5 điều KHÔNG NÊN làm (với lý do)
4. examples: 1 ví dụ tốt + 1 ví dụ xấu để đối chiếu
5. cta_templates: 2-3 mẫu CTA phù hợp`;

    console.log('Calling Lovable AI for enhanced brand guideline generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
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
                  description: 'Ví dụ đối chiếu',
                  properties: {
                    good: { type: 'string', description: '1 đoạn content mẫu ĐÚNG theo guideline (50-100 từ)' },
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
                  description: '2-3 mẫu CTA phù hợp với brand (VD: "Đặt lịch tư vấn miễn phí", "Nhận báo giá trong 5 phút")'
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
              required: ['core_principle', 'writing_style', 'dos', 'donts', 'examples', 'cta_templates', 'suggested_brand_positioning', 'suggested_formality_level'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_brand_guideline' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Đã vượt giới hạn request, vui lòng thử lại sau.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Vui lòng nạp thêm credits để tiếp tục sử dụng AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
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
            emoji_guide: result.emoji_guide,
            hashtag_strategy: result.hashtag_strategy,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to content if no tool call
    const content = data.choices?.[0]?.message?.content;
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
});
