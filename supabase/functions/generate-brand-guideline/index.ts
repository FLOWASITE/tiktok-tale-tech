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
    } = await req.json();

    // Validate required fields
    if (!brand_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Tên thương hiệu là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect target audience from industry (now from database)
    const targetAudience = await detectTargetAudience(industry || [], supabase);
    
    // Get color tone suggestion
    const colorToneSuggestion = getColorToneSuggestion(primary_color || '');

    // Build the prompt with all context
    const systemPrompt = `BẠN LÀ CHUYÊN GIA BRAND STRATEGIST VIỆT NAM với 15 năm kinh nghiệm.

NHIỆM VỤ: Viết Brand Writing Guideline 3-5 câu bằng tiếng Việt, CỤ THỂ và ACTIONABLE.

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG dùng từ chung chung như: "năng động", "sáng tạo", "hiệu quả", "chất lượng cao", "uy tín", "chuyên nghiệp" nếu không có ngữ cảnh cụ thể
2. Mỗi câu trong guideline phải là 1 NGUYÊN TẮC VIẾT RÕ RÀNG mà AI khác đọc có thể làm theo
3. Guideline phải phản ánh ĐẶC THÙ NGÀNH và ĐỐI TƯỢNG KHÁCH HÀNG
4. Ưu tiên các quy tắc về: Tone, Cách mở đầu/kết thúc, Cấu trúc câu, CTA, Từ ngữ cấm/nên dùng
5. Nếu có logo, đề cập cách sử dụng trong content

VÍ DỤ GUIDELINE TỐT (Ngành Kế toán - B2B):
"Mở đầu bằng số liệu hoặc deadline thuế cụ thể (VD: 'Trước 30/01/2025'). Câu không quá 25 từ, tránh thuật ngữ kỹ thuật khi không cần thiết. Kết thúc bằng CTA rõ ràng như 'Đặt lịch tư vấn miễn phí' thay vì 'Liên hệ ngay'. Luôn đề cập lợi ích tài chính cụ thể khi có thể. Logo đặt góc dưới phải với khoảng cách 16px."

VÍ DỤ GUIDELINE TỐT (Ngành F&B - B2C):
"Dùng ngôn ngữ gần gũi, xưng 'mình/bạn'. Mô tả món ăn bằng cảm giác (giòn, thơm, béo ngậy) thay vì chỉ liệt kê nguyên liệu. Story thay vì quảng cáo trực tiếp. Emoji phù hợp: 🍜🥢✨ (tối đa 2 emoji/post). Hashtag địa phương + trend."

VÍ DỤ GUIDELINE XẤU (TRÁNH):
"Viết content chuyên nghiệp, sáng tạo và hiệu quả. Thể hiện giá trị thương hiệu. Tạo sự khác biệt với đối thủ."`;

    const userPrompt = `TẠO BRAND WRITING GUIDELINE CHO:

THÔNG TIN THƯƠNG HIỆU:
- Tên: ${brand_name}
- Ngành: ${(industry || []).join(', ') || 'Chưa xác định'}
- Đối tượng: ${targetAudience === 'B2B' ? 'Doanh nghiệp (B2B)' : targetAudience === 'B2C' ? 'Người tiêu dùng (B2C)' : 'Cả B2B và B2C'}
- Màu chủ đạo: ${primary_color || 'Chưa có'} ${colorToneSuggestion ? `→ Tone phù hợp: ${colorToneSuggestion}` : ''}
- Có logo: ${has_logo ? 'Có' : 'Không'}
- Định vị: ${brand_positioning || 'Chưa xác định'}
- Tone of Voice: ${(tone_of_voice || []).join(', ') || 'Chưa xác định'}
- Mức độ trang trọng: ${formality_level || 'semi_formal'}
- Phong cách ngôn ngữ: ${(language_style || []).join(', ') || 'Chưa xác định'}
- Từ nên dùng: ${(preferred_words || []).join(', ') || 'Chưa có'}
- Từ cấm: ${(forbidden_words || []).join(', ') || 'Chưa có'}

YÊU CẦU:
1. Viết guideline 3-5 câu, mỗi câu là 1 nguyên tắc viết content cụ thể
2. Tạo 1 ví dụ câu content MẪU ĐÚNG theo guideline
3. Tạo 1 ví dụ câu content MẪU SAI (chung chung, sáo rỗng) để đối chiếu`;

    console.log('Calling Lovable AI for brand guideline generation...');

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
            description: 'Tạo Brand Writing Guideline chi tiết với ví dụ đối chiếu và gợi ý Brand Voice settings',
            parameters: {
              type: 'object',
              properties: {
                guideline: {
                  type: 'string',
                  description: 'Brand writing guideline 3-5 câu, mỗi câu là 1 nguyên tắc viết content cụ thể và actionable'
                },
                example_good: {
                  type: 'string',
                  description: '1 câu/đoạn content mẫu ĐÚNG theo guideline, phù hợp với ngành và tone'
                },
                example_bad: {
                  type: 'string',
                  description: '1 câu/đoạn content mẫu SAI (chung chung, sáo rỗng, không theo guideline)'
                },
                key_principles: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Danh sách 3-5 nguyên tắc chính dạng bullet points ngắn gọn'
                },
                suggested_brand_positioning: {
                  type: 'string',
                  enum: ['business', 'expert', 'community', 'personal'],
                  description: 'Gợi ý định vị thương hiệu phù hợp: business (Doanh nghiệp), expert (Chuyên gia), community (Cộng đồng), personal (Cá nhân)'
                },
                suggested_formality_level: {
                  type: 'string',
                  enum: ['formal', 'semi_formal', 'casual', 'friendly'],
                  description: 'Gợi ý mức độ trang trọng: formal (Trang trọng), semi_formal (Bán trang trọng), casual (Thân mật), friendly (Gần gũi)'
                }
              },
              required: ['guideline', 'example_good', 'example_bad', 'key_principles', 'suggested_brand_positioning', 'suggested_formality_level'],
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
      console.log('Brand guideline generated successfully via tool call');
      
      return new Response(
        JSON.stringify({
          guideline: result.guideline,
          example_good: result.example_good,
          example_bad: result.example_bad,
          key_principles: result.key_principles,
          suggested_brand_positioning: result.suggested_brand_positioning,
          suggested_formality_level: result.suggested_formality_level,
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
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
