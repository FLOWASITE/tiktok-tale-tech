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
    console.log('[Perplexity] API not configured, skipping web search');
    return null;
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const searchQuery = `Trending topics content marketing ${industry || 'social media'} Việt Nam tuần này ${currentDate}. 
Liệt kê:
1. Top 5 hashtags đang viral trên TikTok Việt Nam
2. Chủ đề hot nhất trên Facebook, Instagram tuần này
3. Xu hướng mới nổi trong ngành ${industry || 'marketing'}
4. Tin tức nóng đang được bàn tán nhiều nhất`;

    console.log('[Perplexity] Searching:', searchQuery.substring(0, 150));
    const startTime = Date.now();

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
            content: `Bạn là chuyên gia phân tích xu hướng social media tại Việt Nam. 
Nhiệm vụ: Liệt kê 6-10 xu hướng đang HOT NHẤT tuần này.
Mỗi xu hướng cần ngắn gọn (dưới 10 từ).
Ưu tiên: TikTok trends, viral hashtags, tin tức nóng, sự kiện đang được quan tâm.
KHÔNG đưa ra lời khuyên, chỉ liệt kê xu hướng.` 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'week',
        temperature: 0.3,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[Perplexity] Response in ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] API error:', response.status, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('[Perplexity] Response length:', content.length, 'Citations:', citations.length);
    console.log('[Perplexity] Preview:', content.substring(0, 300));

    // Extract trends from response - improved parsing
    const lines = content.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // Skip empty lines and headers
        if (!line || line.startsWith('#') || line.startsWith('##')) return false;
        // Keep numbered or bulleted items
        return /^[\d\.\-\*\•]/.test(line) || line.length > 10;
      })
      .map((line: string) => {
        // Clean up line prefixes
        return line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
      })
      .filter((line: string) => line.length > 5 && line.length < 100);

    const trends = lines.slice(0, 10);
    console.log('[Perplexity] Extracted trends:', trends.length);

    return {
      trends,
      citations
    };
  } catch (error) {
    console.error('[Perplexity] Search error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandTemplateId, organizationId, industry, forceRefresh } = await req.json();
    const requestStartTime = Date.now();

    console.log('[discover-trending-topics] START', { 
      brandTemplateId: brandTemplateId?.substring(0, 8) || 'none', 
      organizationId: organizationId?.substring(0, 8) || 'none', 
      industry, 
      forceRefresh,
      timestamp: new Date().toISOString()
    });

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
        console.log('[Cache] HIT - Returning', cached.length, 'cached topics');
        return new Response(JSON.stringify({ 
          success: true, 
          data: cached,
          source: 'cache',
          debug: {
            cacheHit: true,
            cachedCount: cached.length,
            duration: Date.now() - requestStartTime
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('[Cache] MISS - No valid cache found');
    }

    // ========== PHASE 1: Fetch Curated Data ==========
    console.log('[Phase 1] Fetching curated data...');
    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Fetch urgent events (next 14 days) - these become "seasonal" category
    const { data: urgentEvents } = await supabase
      .from('curated_events')
      .select('id, name, description, event_date, event_type, suggested_topics, suggested_angles, priority')
      .eq('is_active', true)
      .gte('event_date', now.toISOString().split('T')[0])
      .lte('event_date', fourteenDaysLater.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5);

    // Fetch upcoming events (14-60 days)
    const { data: upcomingEvents } = await supabase
      .from('curated_events')
      .select('id, name, description, event_date, event_type, suggested_topics, suggested_angles, priority')
      .eq('is_active', true)
      .gt('event_date', fourteenDaysLater.toISOString().split('T')[0])
      .lte('event_date', sixtyDaysLater.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5);

    // Fetch active curated news (not expired)
    const { data: curatedNews } = await supabase
      .from('curated_news')
      .select('id, title, summary, source_url, news_date, relevance_score, suggested_angles')
      .eq('is_active', true)
      .gt('expires_at', now.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(10);

    const curatedEvents = [...(urgentEvents || []), ...(upcomingEvents || [])];

    console.log('[Phase 1] Curated data fetched:', {
      urgentEvents: urgentEvents?.length || 0,
      upcomingEvents: upcomingEvents?.length || 0,
      news: curatedNews?.length || 0
    });

    // ========== PHASE 2: Fetch Extended Brand Context + Perplexity ==========
    console.log('[Phase 2] Fetching extended brand context + Perplexity...');
    let brandName = '';
    let brandIndustry = industry || '';
    let extendedBrandContext = '';
    let personasContext = '';
    let productsContext = '';
    
    if (brandTemplateId) {
      // Fetch brand with extended fields + personas + products in parallel
      const [brandResult, personasResult, productsResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, industry, brand_positioning, content_pillars,
            unique_value_proposition, target_age_range, target_gender,
            evergreen_themes, brand_hashtags, main_competitors
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select(`
            name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style, typical_funnel_stage,
            journey_map, priority_score, content_preferences
          `)
          .eq('brand_template_id', brandTemplateId)
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('name, category, description, unique_selling_points, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5)
      ]);

      if (brandResult.data) {
        const brand = brandResult.data;
        brandName = brand.brand_name;
        brandIndustry = Array.isArray(brand.industry) ? brand.industry.join(', ') : brand.industry || '';
        
        extendedBrandContext = `
Brand: ${brand.brand_name}
Industry: ${brandIndustry || 'General'}
Positioning: ${brand.brand_positioning || 'N/A'}
UVP: ${brand.unique_value_proposition || 'N/A'}
Target: ${brand.target_age_range || ''} ${brand.target_gender || ''}
Content Pillars: ${JSON.stringify(brand.content_pillars || [])}
Evergreen Themes: ${(brand.evergreen_themes || []).join(', ')}
Competitors: ${(brand.main_competitors || []).join(', ')}
`;
      }

      // Build personas context with enhanced fields
      if (personasResult.data?.length) {
        const primary = personasResult.data.find((p: any) => p.is_primary) || personasResult.data[0];
        personasContext = `
## CUSTOMER PERSONAS:
${personasResult.data.map((p: any) => `
- ${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})
  Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}
  Desires: ${(p.desires || []).slice(0, 3).join(', ')}
  Buying Triggers: ${(p.buying_triggers || []).slice(0, 3).join(', ')}
  Device: ${p.device_usage || 'mobile-first'} | Tech: ${p.tech_savviness || 'medium'}
  Motivation: ${(p.buying_motivation || []).slice(0, 2).join(', ')}`).join('\n')}

### PRIMARY PERSONA INSIGHTS:
- Communication: ${primary?.communication_style || 'balanced'}
- Device: ${primary?.device_usage || 'mobile-first'} → ${primary?.device_usage === 'mobile-first' ? 'Optimize for mobile consumption' : 'Can include longer content'}
- Tech Level: ${primary?.tech_savviness || 'medium'} → Adjust complexity accordingly
- Journey Stage: ${primary?.typical_funnel_stage || 'awareness'}
→ Trending topics phải GIẢI QUYẾT pain points hoặc khơi gợi desires, phù hợp device và tech level`;
        console.log('[Phase 2] Loaded', personasResult.data.length, 'personas with enhanced fields');
      }

      // Build products context
      if (productsResult.data?.length) {
        const featured = productsResult.data.filter((p: any) => p.is_featured);
        productsContext = `
## PRODUCTS/SERVICES:
${productsResult.data.map((p: any) => `
- ${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}
  ${p.description ? p.description.slice(0, 100) + '...' : ''}
  Content Angles: ${(p.suggested_content_angles || []).slice(0, 3).join(', ')}`).join('\n')}
→ Topics có thể gắn với sản phẩm cụ thể để tăng relevance`;
        console.log('[Phase 2] Loaded', productsResult.data.length, 'products');
      }
    }

    // Call Perplexity for real-time web search
    const perplexityResult = await searchWithPerplexity(brandIndustry, brandName);
    console.log('[Phase 2] Perplexity result:', perplexityResult ? `${perplexityResult.trends.length} trends found` : 'No result');

    // ========== PHASE 3: Build Context for AI ==========
    console.log('[Phase 3] Building AI context with extended brand data...');
    const brandContext = extendedBrandContext + personasContext + productsContext;

    // Build curated context - separate urgent vs upcoming events
    let curatedContext = '';
    
    if (urgentEvents && urgentEvents.length > 0) {
      curatedContext += `\n## SỰ KIỆN GẤP (trong 14 ngày tới - CATEGORY: "seasonal"):\n`;
      urgentEvents.forEach((event: CuratedEvent) => {
        const daysUntil = Math.ceil((new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        curatedContext += `- 🔴 ${event.name} (còn ${daysUntil} ngày): ${event.description || ''}\n`;
        if (event.suggested_topics?.length) {
          curatedContext += `  Gợi ý: ${event.suggested_topics.join(', ')}\n`;
        }
      });
    }

    if (upcomingEvents && upcomingEvents.length > 0) {
      curatedContext += `\n## SỰ KIỆN SẮP TỚI (14-60 ngày - CATEGORY: "mua_vu"):\n`;
      upcomingEvents.forEach((event: CuratedEvent) => {
        const daysUntil = Math.ceil((new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        curatedContext += `- ${event.name} (còn ${daysUntil} ngày): ${event.description || ''}\n`;
        if (event.suggested_topics?.length) {
          curatedContext += `  Gợi ý: ${event.suggested_topics.join(', ')}\n`;
        }
      });
    }

    if (curatedNews && curatedNews.length > 0) {
      curatedContext += `\n## TIN TỨC NGÀNH GẦN ĐÂY (VERIFIED):\n`;
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
    console.log('[Phase 4] Calling AI for analysis...');
    const aiStartTime = Date.now();

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
3. Sự kiện GẤP (<14 ngày) → category: "seasonal", velocity: 85-100
4. Sự kiện sắp tới (14-60 ngày) → category: "mua_vu", velocity: 60-84
5. Chỉ tạo topics "ai" nếu không đủ từ các nguồn verified

CATEGORY MAPPING:
- "seasonal": Sự kiện trong 14 ngày tới (Tết, Valentine, etc.)
- "mua_vu": Sự kiện xa hơn, theo mùa vụ
- "tin_tuc": Tin tức nóng từ curated news
- "tiktok_trend": Xu hướng viral từ Perplexity
- "web_trending": Xu hướng từ web search
- "nganh_chuyen": Chủ đề chuyên ngành
- "evergreen": Chủ đề bền vững

TIÊU CHÍ ĐÁNH GIÁ:
- velocity_score (0-100): 
  * Web search trends = 75-95
  * Sự kiện <7 ngày = 90-100
  * Sự kiện 7-14 ngày = 80-89
  * Sự kiện 14-30 ngày = 65-79
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
- category: "seasonal" | "tin_tuc" | "mua_vu" | "tiktok_trend" | "web_trending" | "evergreen" | "nganh_chuyen"
- velocity_score: số từ 0-100 (web_search/seasonal nên có 80-95)
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

    // Count sources and categories for logging
    const sourceCount = {
      web_search: trendingTopics.filter(t => t.source === 'web_search').length,
      curated_event: trendingTopics.filter(t => t.source === 'curated_event').length,
      curated_news: trendingTopics.filter(t => t.source === 'curated_news').length,
      ai: trendingTopics.filter(t => t.source === 'ai').length,
    };

    const categoryCount = trendingTopics.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDuration = Date.now() - requestStartTime;
    const aiDuration = Date.now() - aiStartTime;

    console.log('[discover-trending-topics] COMPLETE', {
      topicsGenerated: trendingTopics.length,
      sourceBreakdown: sourceCount,
      categoryBreakdown: categoryCount,
      perplexityUsed: perplexityResult !== null,
      curatedEventsUsed: curatedEvents?.length || 0,
      curatedNewsUsed: curatedNews?.length || 0,
      aiDuration: `${aiDuration}ms`,
      totalDuration: `${totalDuration}ms`
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: inserted || topicsToInsert,
      source: 'hybrid_perplexity',
      curatedDataUsed: {
        urgentEvents: urgentEvents?.length || 0,
        upcomingEvents: upcomingEvents?.length || 0,
        news: curatedNews?.length || 0
      },
      perplexityUsed: perplexityResult !== null,
      sourceBreakdown: sourceCount,
      categoryBreakdown: categoryCount,
      debug: {
        totalDuration,
        aiDuration,
        perplexityTrends: perplexityResult?.trends.length || 0
      }
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
