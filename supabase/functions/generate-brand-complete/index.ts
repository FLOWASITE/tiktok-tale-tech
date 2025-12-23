import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Color to tone mapping
const COLOR_TONE_MAP: Record<string, string> = {
  '#FF0000': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF4500': 'CTA mạnh, tạo cảm giác cấp bách, năng lượng cao',
  '#FF6347': 'Thân thiện nhưng mạnh mẽ, khuyến khích hành động',
  '#FFA500': 'Thân thiện, lạc quan, dễ tiếp cận',
  '#FF8C00': 'Năng động, tích cực, khuyến khích hành động',
  '#0000FF': 'Tin cậy, chuyên nghiệp, ưu tiên dữ liệu và số liệu',
  '#1E90FF': 'Tin cậy, hiện đại, chuyên nghiệp',
  '#4169E1': 'Tin cậy, uy tín, chuyên nghiệp cao',
  '#000080': 'Uy quyền, cao cấp, chuyên nghiệp truyền thống',
  '#87CEEB': 'Nhẹ nhàng, an tâm, thân thiện',
  '#008000': 'An toàn, tăng trưởng, bền vững, tin cậy',
  '#228B22': 'Tự nhiên, bền vững, tăng trưởng',
  '#32CD32': 'Tích cực, phát triển, năng động',
  '#00FF00': 'Mới mẻ, sáng tạo, năng động',
  '#2E8B57': 'Ổn định, đáng tin cậy, chuyên nghiệp',
  '#000000': 'Cao cấp, tối giản, uy quyền, chuyên nghiệp',
  '#333333': 'Cao cấp, chuyên nghiệp, sang trọng',
  '#666666': 'Trung tính, chuyên nghiệp, dễ kết hợp',
  '#808080': 'Trung tính, ổn định, chuyên nghiệp',
  '#800080': 'Sang trọng, sáng tạo, độc đáo',
  '#9932CC': 'Sáng tạo, độc đáo, cao cấp',
  '#8B008B': 'Cao cấp, bí ẩn, thu hút',
  '#FFD700': 'Lạc quan, thân thiện, thu hút chú ý',
  '#FFFF00': 'Năng động, vui vẻ, thu hút',
  '#FFA07A': 'Ấm áp, thân thiện, dễ gần',
  '#FFC0CB': 'Nhẹ nhàng, thân thiện, ấm áp',
  '#FF69B4': 'Năng động, trẻ trung, thu hút',
  '#8B4513': 'Truyền thống, đáng tin cậy, chắc chắn',
  '#A0522D': 'Tự nhiên, ấm áp, đáng tin cậy',
};

let cachedIndustryTargetMap: Map<string, 'B2B' | 'B2C' | 'both'> | null = null;

async function fetchIndustryTargetMap(supabase: any): Promise<Map<string, 'B2B' | 'B2C' | 'both'>> {
  if (cachedIndustryTargetMap) {
    return cachedIndustryTargetMap;
  }

  const targetMap = new Map<string, 'B2B' | 'B2C' | 'both'>();
  
  try {
    const { data: templates, error } = await supabase
      .from('industry_templates')
      .select(`code, target_audience, industry_template_translations(name, language_code)`)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching industry templates:', error);
      return targetMap;
    }
    
    if (templates) {
      for (const template of templates) {
        const target = template.target_audience as 'B2B' | 'B2C' | 'both';
        targetMap.set(template.code, target);
        const translations = template.industry_template_translations as { name: string; language_code: string }[] | null;
        if (translations) {
          for (const trans of translations) {
            targetMap.set(trans.name, target);
          }
        }
      }
    }
    
    cachedIndustryTargetMap = targetMap;
  } catch (err) {
    console.error('Failed to fetch industry target map:', err);
  }
  
  return targetMap;
}

async function detectTargetAudience(industries: string[], supabase: any): Promise<'B2B' | 'B2C' | 'both'> {
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
    else b2bCount++;
  }
  
  if (b2bCount > b2cCount && b2bCount > bothCount) return 'B2B';
  if (b2cCount > b2bCount && b2cCount > bothCount) return 'B2C';
  return 'both';
}

function getColorToneSuggestion(color: string): string {
  if (!color) return '';
  const normalizedColor = color.toUpperCase();
  if (COLOR_TONE_MAP[normalizedColor]) return COLOR_TONE_MAP[normalizedColor];
  
  const hex = normalizedColor.replace('#', '');
  if (hex.length !== 6) return '';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
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
      stream = false,
    } = await req.json();

    if (!brand_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Tên thương hiệu là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetAudience = await detectTargetAudience(industry || [], supabase);
    const colorToneSuggestion = getColorToneSuggestion(primary_color || '');

    const systemPrompt = `BẠN LÀ CHUYÊN GIA BRAND STRATEGIST VIỆT NAM với 15 năm kinh nghiệm.

NHIỆM VỤ: Tạo HOÀN CHỈNH Brand Guideline VÀ Brand Voice Profile cho thương hiệu.

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG dùng từ chung chung như: "năng động", "sáng tạo", "hiệu quả", "chất lượng cao", "uy tín", "chuyên nghiệp" nếu không có ngữ cảnh cụ thể
2. Mỗi câu trong guideline phải là 1 NGUYÊN TẮC VIẾT RÕ RÀNG mà AI khác đọc có thể làm theo
3. Guideline phải phản ánh ĐẶC THÙ NGÀNH và ĐỐI TƯỢNG KHÁCH HÀNG
4. Ưu tiên các quy tắc về: Tone, Cách mở đầu/kết thúc, Cấu trúc câu, CTA, Từ ngữ cấm/nên dùng
5. preferred_words: Đề xuất 5-10 từ/cụm từ ĐẶC THÙ NGÀNH
6. forbidden_words: Đề xuất 3-5 từ cần TRÁNH (chung chung, sáo rỗng)
7. Tất cả phải bằng tiếng Việt

VÍ DỤ GUIDELINE TỐT (Ngành Kế toán - B2B):
"Mở đầu bằng số liệu hoặc deadline thuế cụ thể (VD: 'Trước 30/01/2025'). Câu không quá 25 từ, tránh thuật ngữ kỹ thuật khi không cần thiết. Kết thúc bằng CTA rõ ràng như 'Đặt lịch tư vấn miễn phí' thay vì 'Liên hệ ngay'. Luôn đề cập lợi ích tài chính cụ thể khi có thể."`;

    const userPrompt = `TẠO BRAND COMPLETE CHO:

THÔNG TIN THƯƠNG HIỆU:
- Tên: ${brand_name}
- Ngành: ${(industry || []).join(', ') || 'Chưa xác định'}
- Đối tượng: ${targetAudience === 'B2B' ? 'Doanh nghiệp (B2B)' : targetAudience === 'B2C' ? 'Người tiêu dùng (B2C)' : 'Cả B2B và B2C'}
- Màu chủ đạo: ${primary_color || 'Chưa có'} ${colorToneSuggestion ? `→ Tone phù hợp: ${colorToneSuggestion}` : ''}
- Có logo: ${has_logo ? 'Có' : 'Không'}
- Định vị hiện tại: ${brand_positioning || 'Chưa xác định'}
- Tone of Voice hiện tại: ${(tone_of_voice || []).join(', ') || 'Chưa xác định'}
- Mức độ trang trọng: ${formality_level || 'semi_formal'}
- Phong cách ngôn ngữ: ${(language_style || []).join(', ') || 'Chưa xác định'}
- Từ nên dùng hiện tại: ${(preferred_words || []).join(', ') || 'Chưa có'}
- Từ cấm hiện tại: ${(forbidden_words || []).join(', ') || 'Chưa có'}

YÊU CẦU:
1. Tạo Brand Writing Guideline 3-5 câu
2. Tạo ví dụ content MẪU ĐÚNG và MẪU SAI
3. Bổ sung đầy đủ Brand Voice Profile`;

    console.log('Calling Lovable AI for complete brand generation...');

    const tools = [{
      type: 'function',
      function: {
        name: 'generate_brand_complete',
        description: 'Tạo hoàn chỉnh Brand Guideline và Brand Voice Profile',
        parameters: {
          type: 'object',
          properties: {
            guideline: {
              type: 'string',
              description: 'Brand writing guideline 3-5 câu, mỗi câu là 1 nguyên tắc viết content cụ thể và actionable'
            },
            example_good: {
              type: 'string',
              description: '1 câu/đoạn content mẫu ĐÚNG theo guideline'
            },
            example_bad: {
              type: 'string',
              description: '1 câu/đoạn content mẫu SAI (chung chung, sáo rỗng)'
            },
            key_principles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Danh sách 3-5 nguyên tắc chính dạng bullet points ngắn gọn'
            },
            brand_positioning: {
              type: 'string',
              description: 'Câu định vị thương hiệu được tinh chỉnh (1-2 câu, tiếng Việt)'
            },
            tone_of_voice: {
              type: 'array',
              items: { type: 'string' },
              description: 'Danh sách 2-4 tone: professional, friendly, authoritative, playful, empathetic, inspirational, educational, conversational'
            },
            formality_level: {
              type: 'string',
              enum: ['formal', 'semi_formal', 'casual', 'friendly'],
              description: 'Mức độ trang trọng phù hợp nhất'
            },
            language_style: {
              type: 'array',
              items: { type: 'string' },
              description: 'Danh sách 2-3 phong cách: simple, technical, storytelling, data_driven, emotional, humorous, direct, poetic'
            },
            preferred_words: {
              type: 'array',
              items: { type: 'string' },
              description: '5-10 từ/cụm từ ĐẶC THÙ NGÀNH nên dùng (tiếng Việt)'
            },
            forbidden_words: {
              type: 'array',
              items: { type: 'string' },
              description: '3-5 từ CHUNG CHUNG cần tránh (tiếng Việt)'
            },
            allow_emoji: {
              type: 'boolean',
              description: 'Có nên dùng emoji không - dựa vào formality và ngành'
            },
            pronoun_suggestion: {
              type: 'string',
              description: 'Gợi ý cách xưng hô: mình/bạn, chúng tôi/quý khách, etc.'
            }
          },
          required: [
            'guideline', 'example_good', 'example_bad', 'key_principles',
            'brand_positioning', 'tone_of_voice', 'formality_level', 'language_style',
            'preferred_words', 'forbidden_words', 'allow_emoji', 'pronoun_suggestion'
          ],
          additionalProperties: false
        }
      }
    }];

    // Streaming response
    if (stream) {
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
          tools,
          tool_choice: { type: 'function', function: { name: 'generate_brand_complete' } },
          stream: true,
        }),
      });

      if (!response.ok) {
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

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Non-streaming response
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
        tools,
        tool_choice: { type: 'function', function: { name: 'generate_brand_complete' } },
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

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log('Brand complete generated successfully');
      
      return new Response(
        JSON.stringify({
          ...result,
          target_audience: targetAudience,
          color_tone_suggestion: colorToneSuggestion,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No valid response from AI');

  } catch (error) {
    console.error('Error in generate-brand-complete:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Lỗi không xác định' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
