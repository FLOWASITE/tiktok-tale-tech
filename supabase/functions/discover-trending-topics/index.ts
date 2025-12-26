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
  source?: 'curated_event' | 'curated_news' | 'web_search' | 'ai';
  source_id?: string;
  source_url?: string;
}

interface CuratedEvent {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_type: string;
  suggested_topics: string[];
  suggested_angles: string[];
  priority: number;
}

interface CuratedNews {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  news_date: string;
  relevance_score: number;
  suggested_angles: string[];
}

interface PerplexityResult {
  trends: string[];
  citations: string[];
}

// ========== PERPLEXITY WEB SEARCH ==========
async function searchWithPerplexity(industry: string, brandName: string): Promise<PerplexityResult | null> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!perplexityApiKey) {
    console.log('Perplexity API not configured, skipping web search');
    return null;
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const searchQuery = `Xu hướng content marketing ${industry || 'social media'} Việt Nam ${currentDate}. Top trending topics, hashtags phổ biến trên TikTok, Facebook, Instagram tuần này.`;

    console.log('Searching Perplexity:', searchQuery.substring(0, 100));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'Bạn là chuyên gia phân tích xu hướng social media tại Việt Nam. Trả lời ngắn gọn, liệt kê 5-8 xu hướng đang hot nhất.' 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('Perplexity response:', content.substring(0, 300));
    console.log('Citations:', citations.length);

    // Extract trends from response
    const lines = content.split('\n').filter((line: string) => line.trim());
    const trends = lines.slice(0, 8);

    return {
      trends,
      citations
    };
  } catch (error) {
    console.error('Perplexity search error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandTemplateId, organizationId, industry, forceRefresh } = await req.json();

    console.log('Discovering trending topics (Hybrid + Perplexity mode) for:', { brandTemplateId, organizationId, industry });

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
        .limit(15);

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

    // ========== PHASE 1: Fetch Curated Data ==========
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch upcoming curated events (next 30 days)
    const { data: curatedEvents } = await supabase
      .from('curated_events')
      .select('id, name, description, event_date, event_type, suggested_topics, suggested_angles, priority')
      .eq('is_active', true)
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', thirtyDaysLater.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10);

    // Fetch active curated news (not expired)
    const { data: curatedNews } = await supabase
      .from('curated_news')
      .select('id, title, summary, source_url, news_date, relevance_score, suggested_angles')
      .eq('is_active', true)
      .gt('expires_at', now.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(10);

    console.log('Curated data fetched:', {
      events: curatedEvents?.length || 0,
      news: curatedNews?.length || 0
    });

    // ========== PHASE 2: Perplexity Web Search ==========
    let brandName = '';
    let brandIndustry = industry || '';
    
    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('brand_name, industry, brand_positioning, content_pillars')
        .eq('id', brandTemplateId)
        .single();

      if (brand) {
        brandName = brand.brand_name;
        brandIndustry = Array.isArray(brand.industry) ? brand.industry.join(', ') : brand.industry || '';
      }
    }

    // Call Perplexity for real-time web search
    const perplexityResult = await searchWithPerplexity(brandIndustry, brandName);

    // ========== PHASE 3: Build Context for AI ==========
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

    // Build curated context
    let curatedContext = '';
    
    if (curatedEvents && curatedEvents.length > 0) {
      curatedContext += `\n## SỰ KIỆN SẮP TỚI (VERIFIED - Đã xác minh):\n`;
      curatedEvents.forEach((event: CuratedEvent) => {
        const daysUntil = Math.ceil((new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        curatedContext += `- ${event.name} (${event.event_date}, còn ${daysUntil} ngày): ${event.description || ''}\n`;
        if (event.suggested_topics?.length) {
          curatedContext += `  Gợi ý: ${event.suggested_topics.join(', ')}\n`;
        }
      });
    }

    if (curatedNews && curatedNews.length > 0) {
      curatedContext += `\n## TIN TỨC NGÀNH GẦN ĐÂY (VERIFIED - Đã xác minh):\n`;
      curatedNews.forEach((news: CuratedNews) => {
        curatedContext += `- ${news.title}: ${news.summary || 'N/A'}\n`;
        if (news.source_url) {
          curatedContext += `  Nguồn: ${news.source_url}\n`;
        }
      });
    }

    // Build Perplexity context
    let webSearchContext = '';
    if (perplexityResult && perplexityResult.trends.length > 0) {
      webSearchContext = `\n## XU HƯỚNG WEB SEARCH REAL-TIME (từ Perplexity - Đã xác minh từ internet):\n`;
      perplexityResult.trends.forEach((trend, index) => {
        webSearchContext += `${index + 1}. ${trend}\n`;
      });
      if (perplexityResult.citations.length > 0) {
        webSearchContext += `\nNguồn tham khảo:\n`;
        perplexityResult.citations.slice(0, 5).forEach((citation, index) => {
          webSearchContext += `- ${citation}\n`;
        });
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

    // ========== PHASE 4: AI Analysis with Full Hybrid Context ==========
    const systemPrompt = `Bạn là chuyên gia phân tích xu hướng nội dung social media tại Việt Nam.
Nhiệm vụ: Phân tích DỮ LIỆU THỰC TẾ đã được cung cấp và tạo danh sách 10-12 trending topics.

Ngày hiện tại: ${currentDate}

NGUỒN DỮ LIỆU (theo thứ tự ưu tiên):
1. WEB SEARCH REAL-TIME (Perplexity) - Ưu tiên cao nhất, đây là dữ liệu live từ internet
2. CURATED EVENTS - Sự kiện đã được xác minh, rất đáng tin cậy
3. CURATED NEWS - Tin tức ngành đã được kiểm duyệt
4. AI SUPPLEMENT - Chỉ bổ sung 1-2 topic nếu cần thiết

NGUYÊN TẮC QUAN TRỌNG:
1. ƯU TIÊN CAO NHẤT cho Web Search (Perplexity) - đây là dữ liệu thực tế từ internet
2. Topics từ web search có velocity_score cao (80-95) vì đang trending thực sự
3. Sự kiện sắp tới còn <7 ngày = velocity 90+
4. Chỉ tạo topics "ai" nếu không đủ từ các nguồn verified

TIÊU CHÍ ĐÁNH GIÁ:
- velocity_score (0-100): Web search trends = 75-95, Events <7 ngày = 90+, <14 ngày = 70-89
- peak_status: "peaking" nếu đang hot/sự kiện trong tuần, "rising" nếu sắp tới
- competition_level: Đánh giá dựa trên mức độ phổ biến

SOURCE FIELD - CỰC KỲ QUAN TRỌNG (phải chính xác):
- "web_search": Nếu topic dựa trên dữ liệu Perplexity web search
- "curated_event": Nếu topic dựa trên sự kiện curated
- "curated_news": Nếu topic dựa trên tin tức curated
- "ai": CHỈ khi là xu hướng AI tự bổ sung (hạn chế dùng)`;

    const userPrompt = `${brandContext}
${webSearchContext}
${curatedContext}

Hãy phân tích và trả về 10-12 trending topics dạng JSON array.
ƯU TIÊN CAO cho topics từ Web Search và Curated Data (đây là dữ liệu thực tế).

Mỗi topic cần có:
- topic: Chủ đề ngắn gọn (tối đa 10 từ)
- category: "tin_tuc" | "mua_vu" | "tiktok_trend" | "evergreen" | "nganh_chuyen" | "web_trending"
- velocity_score: số từ 0-100 (web_search topics nên có 75-95)
- peak_status: "rising" | "peaking" | "declining"
- peak_prediction: thời điểm dự đoán đạt đỉnh
- related_keywords: array 3-5 từ khóa liên quan
- engagement_potential: số từ 0-100
- competition_level: "low" | "medium" | "high"
- suggested_angles: array 2-3 góc tiếp cận gợi ý
- source: "web_search" | "curated_event" | "curated_news" | "ai" (BẮT BUỘC CHÍNH XÁC)
- source_url: URL nguồn nếu có từ Perplexity citations (optional)

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
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      trendingTopics = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        trendingTopics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse trending topics from AI response');
      }
    }

    // Ensure source field exists
    trendingTopics = trendingTopics.map(topic => ({
      ...topic,
      source: topic.source || 'ai'
    }));

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
      source: topic.source || 'ai',
      source_url: topic.source_url || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('trending_topics')
      .insert(topicsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to cache trending topics:', insertError);
    }

    // Count sources for logging
    const sourceCount = {
      web_search: trendingTopics.filter(t => t.source === 'web_search').length,
      curated_event: trendingTopics.filter(t => t.source === 'curated_event').length,
      curated_news: trendingTopics.filter(t => t.source === 'curated_news').length,
      ai: trendingTopics.filter(t => t.source === 'ai').length,
    };

    console.log('Generated and cached', trendingTopics.length, 'trending topics (hybrid + perplexity mode)');
    console.log('Source breakdown:', sourceCount);

    return new Response(JSON.stringify({ 
      success: true, 
      data: inserted || topicsToInsert,
      source: 'hybrid_perplexity',
      curatedDataUsed: {
        events: curatedEvents?.length || 0,
        news: curatedNews?.length || 0
      },
      perplexityUsed: perplexityResult !== null,
      sourceBreakdown: sourceCount
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
