import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, contentGoal, brandTemplateId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build cache key
    const cacheKey = `topic-suggestions:${industry || 'general'}:${contentGoal || 'education'}:${brandTemplateId || 'none'}`;
    
    // Try to get from cache first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log('Cache hit for topic suggestions');
      // Increment hit count
      await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
      
      return new Response(JSON.stringify({
        suggestions: cached.response_data,
        source: 'cache'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the prompt
    const goalLabels: Record<string, string> = {
      education: 'giáo dục, chia sẻ kiến thức',
      awareness: 'tăng nhận diện thương hiệu',
      engagement: 'tăng tương tác với khách hàng',
      expertise: 'xây dựng hình ảnh chuyên gia',
      conversion: 'thúc đẩy chuyển đổi, bán hàng',
    };

    const goalDescription = goalLabels[contentGoal] || goalLabels.education;
    const industryText = industry || 'kinh doanh nói chung';

    const systemPrompt = `Bạn là chuyên gia marketing content với nhiều năm kinh nghiệm. Nhiệm vụ của bạn là gợi ý các chủ đề nội dung hấp dẫn, phù hợp với ngành nghề và mục tiêu content.

Yêu cầu:
- Gợi ý 6-8 chủ đề cụ thể, thực tế
- Mỗi chủ đề 15-40 từ
- Phù hợp với thị trường Việt Nam
- Có tính trending và thu hút
- Đa dạng về góc nhìn và format`;

    const userPrompt = `Hãy gợi ý 6-8 chủ đề nội dung cho:
- Ngành nghề: ${industryText}
- Mục tiêu: ${goalDescription}

Trả về JSON array với format: ["chủ đề 1", "chủ đề 2", ...]`;

    console.log('Generating topic suggestions for:', { industry: industryText, contentGoal });

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
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
    
    // Parse JSON from response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      // Fall back to splitting by newlines
      suggestions = content
        .split('\n')
        .filter((line: string) => line.trim().length > 10)
        .map((line: string) => line.replace(/^[\d\.\-\*\s]+/, '').trim())
        .slice(0, 8);
    }

    if (suggestions.length === 0) {
      suggestions = getDefaultSuggestions(contentGoal);
    }

    // Cache the result for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'generate-topic-suggestions',
      input_hash: cacheKey,
      response_data: suggestions,
      cache_scope: 'global',
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'cache_key'
    });

    console.log('Generated and cached', suggestions.length, 'suggestions');

    return new Response(JSON.stringify({
      suggestions,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    
    // Return fallback suggestions on error
    const { contentGoal } = await req.json().catch(() => ({ contentGoal: 'education' }));
    
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
