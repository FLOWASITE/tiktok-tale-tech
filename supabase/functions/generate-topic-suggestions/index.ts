import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface TopicGenerationInput {
  industry?: string;
  contentGoal?: string;
  brandTemplateId?: string;
  // Extended brand context
  format?: 'carousel' | 'script' | 'multichannel' | 'all';
  recentTopics?: string[];
  seasonality?: 'holiday' | 'event' | 'normal';
}

interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  industry?: string[];
  formality?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
}

interface IndustryContext {
  targetAudience?: string;
  forbiddenTerms?: string[];
  complianceRules?: { rule: string; description: string }[];
  brandVoice?: {
    tone?: string[];
    formality?: string;
    language_style?: string[];
  };
}

interface EnhancedTopicSuggestion {
  topic: string;
  category: 'evergreen' | 'trending' | 'seasonal' | 'reactive';
  reasoning: string;
  formats: string[];
  engagementPotential: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: TopicGenerationInput = await req.json();
    const { industry, contentGoal, brandTemplateId, format, recentTopics, seasonality } = input;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build cache key with extended parameters
    const cacheKey = `topic-suggestions-v2:${industry || 'general'}:${contentGoal || 'education'}:${brandTemplateId || 'none'}:${format || 'all'}`;
    
    // Check cache first
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log('Cache hit for topic suggestions v2');
      await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
      
      return new Response(JSON.stringify({
        suggestions: cached.response_data,
        source: 'cache'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch brand context if brandTemplateId provided
    let brandContext: BrandContext | null = null;
    let industryContext: IndustryContext | null = null;

    if (brandTemplateId) {
      console.log('Fetching brand template:', brandTemplateId);
      
      const { data: brandTemplate, error: brandError } = await supabase
        .from('brand_templates')
        .select(`
          brand_name,
          brand_positioning,
          tone_of_voice,
          preferred_words,
          forbidden_words,
          industry,
          formality_level,
          language_style,
          allow_emoji,
          industry_template_id
        `)
        .eq('id', brandTemplateId)
        .single();

      if (brandTemplate && !brandError) {
        brandContext = {
          brandName: brandTemplate.brand_name,
          brandPositioning: brandTemplate.brand_positioning,
          toneOfVoice: brandTemplate.tone_of_voice,
          preferredWords: brandTemplate.preferred_words,
          forbiddenWords: brandTemplate.forbidden_words,
          industry: brandTemplate.industry,
          formality: brandTemplate.formality_level,
          languageStyle: brandTemplate.language_style,
          allowEmoji: brandTemplate.allow_emoji,
        };

        console.log('Brand context loaded:', brandContext.brandName);

        // Fetch industry memory if linked
        if (brandTemplate.industry_template_id) {
          console.log('Fetching industry memory:', brandTemplate.industry_template_id);
          
          const { data: industryTemplate, error: industryError } = await supabase
            .from('industry_templates')
            .select(`
              target_audience,
              forbidden_terms,
              compliance_rules,
              brand_voice
            `)
            .eq('id', brandTemplate.industry_template_id)
            .single();

          if (industryTemplate && !industryError) {
            industryContext = {
              targetAudience: industryTemplate.target_audience,
              forbiddenTerms: industryTemplate.forbidden_terms,
              complianceRules: industryTemplate.compliance_rules as { rule: string; description: string }[],
              brandVoice: industryTemplate.brand_voice as IndustryContext['brandVoice'],
            };
            console.log('Industry context loaded, target audience:', industryContext.targetAudience);
          }
        }
      }
    }

    // Build the enhanced prompt
    const prompt = buildEnhancedPrompt({
      industry: brandContext?.industry?.[0] || industry,
      contentGoal,
      brandContext,
      industryContext,
      format,
      recentTopics,
      seasonality,
    });

    console.log('Generating enhanced topic suggestions...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ 
          error: response.status === 429 
            ? 'Rate limit exceeded. Please try again later.'
            : 'Payment required. Please add credits.',
          suggestions: getDefaultSuggestions(contentGoal),
          source: 'fallback'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse enhanced JSON response
    let suggestions: EnhancedTopicSuggestion[] | string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Check if it's enhanced format or simple strings
        if (parsed[0] && typeof parsed[0] === 'object' && parsed[0].topic) {
          suggestions = parsed as EnhancedTopicSuggestion[];
        } else {
          suggestions = parsed as string[];
        }
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      suggestions = content
        .split('\n')
        .filter((line: string) => line.trim().length > 10)
        .map((line: string) => line.replace(/^[\d\.\-\*\s]+/, '').trim())
        .slice(0, 8);
    }

    if (suggestions.length === 0) {
      suggestions = getDefaultSuggestions(contentGoal);
    }

    // Cache the result for 12 hours (shorter for personalized content)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (brandTemplateId ? 12 : 24));

    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'generate-topic-suggestions',
      input_hash: cacheKey,
      response_data: suggestions,
      cache_scope: brandTemplateId ? 'org' : 'global',
      brand_template_id: brandTemplateId || null,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'cache_key'
    });

    console.log('Generated and cached', suggestions.length, 'enhanced suggestions');

    return new Response(JSON.stringify({
      suggestions,
      source: 'ai',
      brandContextUsed: !!brandContext,
      industryContextUsed: !!industryContext,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    
    let contentGoal = 'education';
    try {
      const body = await req.clone().json();
      contentGoal = body.contentGoal || 'education';
    } catch {}
    
    return new Response(JSON.stringify({
      suggestions: getDefaultSuggestions(contentGoal),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEnhancedPrompt(params: {
  industry?: string;
  contentGoal?: string;
  brandContext: BrandContext | null;
  industryContext: IndustryContext | null;
  format?: string;
  recentTopics?: string[];
  seasonality?: string;
}): { system: string; user: string } {
  const { industry, contentGoal, brandContext, industryContext, format, recentTopics, seasonality } = params;

  const goalLabels: Record<string, string> = {
    education: 'giáo dục, chia sẻ kiến thức chuyên môn',
    awareness: 'tăng nhận diện thương hiệu, xây dựng brand presence',
    engagement: 'tăng tương tác, tạo conversation với khách hàng',
    expertise: 'xây dựng hình ảnh chuyên gia, thought leadership',
    conversion: 'thúc đẩy chuyển đổi, bán hàng, lead generation',
  };

  const formatLabels: Record<string, string> = {
    carousel: 'carousel slides (visual, educational)',
    script: 'video script (engaging, storytelling)',
    multichannel: 'multi-channel posts (adaptable across platforms)',
    all: 'đa dạng formats',
  };

  // Build brand section
  let brandSection = '';
  if (brandContext) {
    brandSection = `
## BRAND CONTEXT:
- Tên thương hiệu: ${brandContext.brandName}
${brandContext.brandPositioning ? `- Định vị: ${brandContext.brandPositioning}` : ''}
${brandContext.toneOfVoice?.length ? `- Tone of Voice: ${brandContext.toneOfVoice.join(', ')}` : ''}
${brandContext.formality ? `- Mức độ formal: ${brandContext.formality}` : ''}
${brandContext.languageStyle?.length ? `- Phong cách ngôn ngữ: ${brandContext.languageStyle.join(', ')}` : ''}
${brandContext.preferredWords?.length ? `- Từ khóa ưu tiên sử dụng: ${brandContext.preferredWords.join(', ')}` : ''}
${brandContext.forbiddenWords?.length ? `- Từ KHÔNG được sử dụng: ${brandContext.forbiddenWords.join(', ')}` : ''}
${brandContext.allowEmoji !== undefined ? `- Cho phép emoji: ${brandContext.allowEmoji ? 'Có' : 'Không'}` : ''}`;
  }

  // Build industry section
  let industrySection = '';
  if (industryContext) {
    industrySection = `
## INDUSTRY COMPLIANCE:
${industryContext.targetAudience ? `- Đối tượng mục tiêu: ${industryContext.targetAudience}` : ''}
${industryContext.forbiddenTerms?.length ? `- Thuật ngữ CẤM sử dụng (compliance): ${industryContext.forbiddenTerms.slice(0, 10).join(', ')}` : ''}
${industryContext.complianceRules?.length ? `- Quy tắc tuân thủ: ${industryContext.complianceRules.slice(0, 3).map(r => r.rule).join('; ')}` : ''}
${industryContext.brandVoice?.tone?.length ? `- Industry tone baseline: ${industryContext.brandVoice.tone.join(', ')}` : ''}`;
  }

  // Build constraints section
  let constraintsSection = '';
  if (recentTopics?.length) {
    constraintsSection = `
## CONSTRAINTS:
- KHÔNG gợi ý các chủ đề tương tự với: ${recentTopics.slice(0, 5).join('; ')}
- Tránh lặp lại góc nhìn hoặc format đã dùng gần đây`;
  }

  // Seasonality hints
  let seasonalityHint = '';
  if (seasonality === 'holiday') {
    seasonalityHint = '\n- Ưu tiên chủ đề liên quan đến mùa lễ hội, Tết, khuyến mãi cuối năm';
  } else if (seasonality === 'event') {
    seasonalityHint = '\n- Ưu tiên chủ đề reactive với sự kiện/tin tức nóng trong ngành';
  }

  const systemPrompt = `Bạn là Content Strategist chuyên nghiệp với 10+ năm kinh nghiệm trong content marketing tại Việt Nam.

Nhiệm vụ: Gợi ý các chủ đề content có chiến lược, phù hợp với brand và mục tiêu kinh doanh.
${brandSection}
${industrySection}
${constraintsSection}
${seasonalityHint}

## OUTPUT FORMAT:
Trả về JSON array với mỗi item có cấu trúc:
{
  "topic": "Tiêu đề chủ đề chi tiết (15-50 từ)",
  "category": "evergreen" | "trending" | "seasonal" | "reactive",
  "reasoning": "Lý do ngắn gọn tại sao chủ đề này phù hợp với brand (1-2 câu)",
  "formats": ["carousel", "script", "multichannel"],
  "engagementPotential": "high" | "medium" | "low"
}

## GUIDELINES:
- Mỗi chủ đề phải CỤ THỂ và ACTIONABLE, không chung chung
- Đảm bảo phù hợp với tone of voice và positioning của brand
- Cân bằng: 40% evergreen, 30% trending, 20% seasonal, 10% reactive
- Mỗi chủ đề phải có góc nhìn độc đáo, không generic
- Ưu tiên chủ đề có potential viral hoặc shareable cao`;

  const userPrompt = `Hãy gợi ý 8-10 chủ đề content cho:

- Ngành: ${brandContext?.industry?.[0] || industry || 'kinh doanh nói chung'}
- Mục tiêu content: ${goalLabels[contentGoal || 'education'] || goalLabels.education}
- Format ưu tiên: ${formatLabels[format || 'all'] || formatLabels.all}
${brandContext ? `- Brand: ${brandContext.brandName}` : ''}
${industryContext?.targetAudience ? `- Target: ${industryContext.targetAudience}` : ''}

Trả về JSON array theo format đã định nghĩa.`;

  return { system: systemPrompt, user: userPrompt };
}

function getDefaultSuggestions(contentGoal?: string): string[] {
  const defaultsByGoal: Record<string, string[]> = {
    education: [
      'Hướng dẫn từng bước cho người mới bắt đầu',
      '5 sai lầm phổ biến và cách tránh',
      'Kiến thức cơ bản cần nắm vững',
      'Checklist hoàn chỉnh cho năm 2024',
      'So sánh các phương pháp phổ biến',
      'Giải đáp thắc mắc thường gặp',
    ],
    awareness: [
      'Câu chuyện đằng sau thương hiệu',
      'Giá trị cốt lõi mà chúng tôi theo đuổi',
      'Điều gì làm nên sự khác biệt',
      'Hành trình phát triển của chúng tôi',
      'Sứ mệnh và tầm nhìn doanh nghiệp',
      'Văn hóa công ty độc đáo',
    ],
    engagement: [
      'Bạn nghĩ gì về xu hướng này?',
      'Chia sẻ trải nghiệm của bạn với chúng tôi',
      'Thử thách 7 ngày: Bạn có dám thử?',
      'Vote cho lựa chọn yêu thích của bạn',
      'Caption hay nhất nhận quà hot',
      'Kể tên 3 điều bạn muốn thay đổi',
    ],
    expertise: [
      'Phân tích chuyên sâu: Xu hướng thị trường 2024',
      'Case study thành công từ thực tế',
      'Bí quyết chỉ chuyên gia mới biết',
      'Dự báo: Điều gì sẽ thay đổi trong năm tới',
      'Góc nhìn chuyên gia về vấn đề nóng',
      'Nghiên cứu mới nhất trong ngành',
    ],
    conversion: [
      'Ưu đãi độc quyền: Chỉ còn 24 giờ',
      'Vì sao khách hàng chọn chúng tôi',
      'So sánh: Tại sao giải pháp này tốt hơn',
      'Khách hàng nói gì sau khi sử dụng',
      'Miễn phí trải nghiệm: Bắt đầu ngay',
      'Kết quả thực tế sau 30 ngày sử dụng',
    ],
  };

  return defaultsByGoal[contentGoal || 'education'] || defaultsByGoal.education;
}
