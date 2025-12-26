import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrendingTopic {
  topic: string;
  category: string;
  velocity_score: number;
  peak_status: 'rising' | 'peaking' | 'declining';
  peak_prediction: string;
  related_keywords: string[];
  engagement_potential: number;
  competition_level: 'low' | 'medium' | 'high';
  suggested_angles: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandTemplateId, organizationId, industry, forceRefresh } = await req.json();

    console.log('Discovering trending topics for:', { brandTemplateId, organizationId, industry });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('trending_topics')
        .select('*')
        .eq('organization_id', organizationId)
        .gt('expires_at', new Date().toISOString())
        .order('velocity_score', { ascending: false })
        .limit(10);

      if (cached && cached.length > 0) {
        console.log('Returning cached trending topics:', cached.length);
        return new Response(JSON.stringify({ 
          success: true, 
          data: cached,
          source: 'cache'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch brand context if available
    let brandContext = '';
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, industry, brand_positioning, content_pillars')
        .eq('id', brandTemplateId)
        .single();

      if (brand) {
        brandContext = `
Brand: ${brand.brand_name}
Industry: ${Array.isArray(brand.industry) ? brand.industry.join(', ') : brand.industry || 'General'}
Positioning: ${brand.brand_positioning || 'N/A'}
Content Pillars: ${JSON.stringify(brand.content_pillars || [])}
`;
      }
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentDate = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `Bạn là chuyên gia phân tích xu hướng nội dung social media tại Việt Nam năm 2024-2025.
Nhiệm vụ: Phân tích và gợi ý 6-8 chủ đề đang TRENDING phù hợp với thương hiệu.

Ngày hiện tại: ${currentDate}

TIÊU CHÍ ĐÁNH GIÁ TRENDING:
1. Velocity Score (0-100): Tốc độ tăng trưởng của topic
   - 80-100: Viral, đang bùng nổ
   - 60-79: Trending mạnh
   - 40-59: Đang lên
   - 20-39: Ổn định
   - 0-19: Đang giảm

2. Peak Status:
   - "rising": Đang tăng, chưa đạt đỉnh
   - "peaking": Đang ở đỉnh, nên làm ngay
   - "declining": Đã qua đỉnh, cẩn thận

3. Peak Prediction: Dự đoán khi nào đạt đỉnh
   - "now": Đang đỉnh
   - "1-2 ngày", "tuần này", "2 tuần tới"

4. Competition Level:
   - "low": Ít đối thủ làm
   - "medium": Có một số đối thủ
   - "high": Nhiều đối thủ đã làm

5. Engagement Potential (0-100): Tiềm năng tương tác

NGUỒN XU HƯỚNG CẦN XEM XÉT:
- Tin tức thời sự Việt Nam
- Sự kiện mùa vụ, lễ hội
- Trend TikTok/Reels Việt Nam
- Hashtag trending
- Chủ đề evergreen có góc nhìn mới`;

    const userPrompt = `${brandContext}

Hãy phân tích và trả về 6-8 trending topics dạng JSON array.
Mỗi topic cần có:
- topic: Chủ đề ngắn gọn (tối đa 10 từ)
- category: "tin_tuc" | "mua_vu" | "tiktok_trend" | "evergreen" | "nganh_chuyen"
- velocity_score: số từ 0-100
- peak_status: "rising" | "peaking" | "declining"
- peak_prediction: thời điểm dự đoán đạt đỉnh
- related_keywords: array 3-5 từ khóa liên quan
- engagement_potential: số từ 0-100
- competition_level: "low" | "medium" | "high"
- suggested_angles: array 2-3 góc tiếp cận gợi ý

Ưu tiên topics có velocity_score cao và competition_level thấp.
Trả về JSON array thuần túy, không markdown.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Credits exhausted',
          errorCode: 'CREDITS_EXHAUSTED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response content:', content.substring(0, 500));

    // Parse JSON from response
    let trendingTopics: TrendingTopic[] = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      trendingTopics = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        trendingTopics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse trending topics from AI response');
      }
    }

    // Clear old cache for this org
    await supabase
      .from('trending_topics')
      .delete()
      .eq('organization_id', organizationId);

    // Save to database
    const topicsToInsert = trendingTopics.map((topic: TrendingTopic) => ({
      organization_id: organizationId,
      brand_template_id: brandTemplateId || null,
      topic: topic.topic,
      category: topic.category,
      velocity_score: topic.velocity_score,
      peak_status: topic.peak_status,
      peak_prediction: topic.peak_prediction,
      related_keywords: topic.related_keywords,
      engagement_potential: topic.engagement_potential,
      competition_level: topic.competition_level,
      suggested_angles: topic.suggested_angles,
      source: 'ai',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('trending_topics')
      .insert(topicsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to cache trending topics:', insertError);
    }

    console.log('Generated and cached', trendingTopics.length, 'trending topics');

    return new Response(JSON.stringify({ 
      success: true, 
      data: inserted || topicsToInsert,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in discover-trending-topics:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
