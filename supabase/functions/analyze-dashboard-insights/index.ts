import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentStats {
  scripts: { total: number; recent: number };
  carousels: { total: number; recent: number; avgSlides: number };
  multiChannel: { total: number; recent: number; topChannels: string[] };
  topicHistory: {
    total: number;
    avgPerformance: number;
    topPerformers: { topic: string; score: number }[];
    feedback: { positive: number; negative: number };
  };
  postingPatterns: {
    lastContentDate: string | null;
    daysSinceLastContent: number;
    weeklyAverage: number;
    channelGaps: { channel: string; days: number }[];
  };
  brandContext: {
    activeBrand: string | null;
    contentPillars: string[];
  };
}

const insightsTool = {
  type: "function",
  function: {
    name: "generate_insights",
    description: "Generate 3-5 personalized dashboard insights based on user data",
    parameters: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["trend", "tip", "reminder", "achievement"] },
              title: { type: "string", description: "Short title in Vietnamese" },
              description: { type: "string", description: "Detailed description in Vietnamese, max 100 chars" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              action: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Button label in Vietnamese" },
                  href: { type: "string", description: "Navigation path" }
                },
                required: ["label", "href"]
              }
            },
            required: ["type", "title", "description", "priority"]
          },
          minItems: 3,
          maxItems: 5
        }
      },
      required: ["insights"]
    }
  }
};

async function fetchContentStats(supabase: any, organizationId: string, userId: string): Promise<ContentStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel
  const [scriptsResult, carouselsResult, multiChannelResult, topicHistoryResult, brandResult] = await Promise.all([
    // Scripts stats
    supabase
      .from("scripts")
      .select("id, created_at")
      .eq("organization_id", organizationId),
    
    // Carousels stats
    supabase
      .from("carousels")
      .select("id, created_at, slide_count")
      .eq("organization_id", organizationId),
    
    // Multi-channel stats
    supabase
      .from("multi_channel_contents")
      .select("id, created_at, selected_channels")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    
    // Topic history with performance
    supabase
      .from("topic_history")
      .select("topic, performance_score, feedback, created_at, category")
      .eq("organization_id", organizationId)
      .order("performance_score", { ascending: false, nullsFirst: false })
      .limit(50),
    
    // Brand templates
    supabase
      .from("brand_templates")
      .select("brand_name, content_pillars")
      .eq("organization_id", organizationId)
      .eq("is_default", true)
      .single()
  ]);

  const scripts = scriptsResult.data || [];
  const carousels = carouselsResult.data || [];
  const multiChannel = multiChannelResult.data || [];
  const topicHistory = topicHistoryResult.data || [];
  const brand = brandResult.data;

  // Calculate scripts stats
  const recentScripts = scripts.filter((s: any) => s.created_at >= sevenDaysAgo);

  // Calculate carousels stats
  const recentCarousels = carousels.filter((c: any) => c.created_at >= sevenDaysAgo);
  const avgSlides = carousels.length > 0 
    ? carousels.reduce((sum: number, c: any) => sum + (c.slide_count || 0), 0) / carousels.length 
    : 0;

  // Calculate multi-channel stats
  const recentMultiChannel = multiChannel.filter((m: any) => m.created_at >= sevenDaysAgo);
  const channelCounts: Record<string, number> = {};
  multiChannel.forEach((m: any) => {
    const channels = m.selected_channels || [];
    channels.forEach((ch: string) => {
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });
  });
  const topChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ch]) => ch);

  // Calculate topic history stats
  const topicsWithScore = topicHistory.filter((t: any) => t.performance_score != null);
  const avgPerformance = topicsWithScore.length > 0
    ? topicsWithScore.reduce((sum: number, t: any) => sum + t.performance_score, 0) / topicsWithScore.length
    : 0;
  const topPerformers = topicsWithScore.slice(0, 5).map((t: any) => ({
    topic: t.topic,
    score: t.performance_score
  }));
  const positiveFeedback = topicHistory.filter((t: any) => t.feedback === 'positive').length;
  const negativeFeedback = topicHistory.filter((t: any) => t.feedback === 'negative').length;

  // Calculate posting patterns
  const allContents = [
    ...scripts.map((s: any) => ({ date: s.created_at, channel: 'script' })),
    ...carousels.map((c: any) => ({ date: c.created_at, channel: 'carousel' })),
    ...multiChannel.flatMap((m: any) => 
      (m.selected_channels || []).map((ch: string) => ({ date: m.created_at, channel: ch }))
    )
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastContentDate = allContents[0]?.date || null;
  const daysSinceLastContent = lastContentDate 
    ? Math.floor((Date.now() - new Date(lastContentDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Weekly average (last 30 days)
  const last30DaysContents = allContents.filter(c => c.date >= thirtyDaysAgo);
  const weeklyAverage = last30DaysContents.length / 4;

  // Channel gaps - find channels not used recently
  const channelLastUsed: Record<string, string> = {};
  allContents.forEach(c => {
    if (!channelLastUsed[c.channel]) {
      channelLastUsed[c.channel] = c.date;
    }
  });
  const channelGaps = Object.entries(channelLastUsed)
    .map(([channel, date]) => ({
      channel,
      days: Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    }))
    .filter(g => g.days >= 3)
    .sort((a, b) => b.days - a.days);

  // Content pillars
  const contentPillars = brand?.content_pillars 
    ? (Array.isArray(brand.content_pillars) 
        ? brand.content_pillars.map((p: any) => typeof p === 'string' ? p : p.name || p.title || '')
        : [])
    : [];

  return {
    scripts: { total: scripts.length, recent: recentScripts.length },
    carousels: { total: carousels.length, recent: recentCarousels.length, avgSlides: Math.round(avgSlides * 10) / 10 },
    multiChannel: { total: multiChannel.length, recent: recentMultiChannel.length, topChannels },
    topicHistory: {
      total: topicHistory.length,
      avgPerformance: Math.round(avgPerformance),
      topPerformers,
      feedback: { positive: positiveFeedback, negative: negativeFeedback }
    },
    postingPatterns: {
      lastContentDate,
      daysSinceLastContent,
      weeklyAverage: Math.round(weeklyAverage * 10) / 10,
      channelGaps
    },
    brandContext: {
      activeBrand: brand?.brand_name || null,
      contentPillars
    }
  };
}

function buildPrompt(stats: ContentStats): string {
  const topTopics = stats.topicHistory.topPerformers.map(t => `${t.topic} (${t.score}đ)`).join(', ');
  const channelGapsText = stats.postingPatterns.channelGaps.map(g => `${g.channel}: ${g.days} ngày`).join(', ');
  
  return `Bạn là AI Content Strategist. Phân tích dữ liệu hoạt động của user và đưa ra 3-5 insights cá nhân hóa bằng tiếng Việt.

## Dữ liệu user:

### Content đã tạo:
- Scripts: ${stats.scripts.total} tổng, ${stats.scripts.recent} bài trong 7 ngày qua
- Carousels: ${stats.carousels.total} tổng, trung bình ${stats.carousels.avgSlides} slides/carousel
- Multi-channel: ${stats.multiChannel.total} tổng, ${stats.multiChannel.recent} bài trong 7 ngày qua
- Kênh hay dùng nhất: ${stats.multiChannel.topChannels.join(', ') || 'Chưa có'}

### Performance:
- Điểm performance trung bình: ${stats.topicHistory.avgPerformance}/100
- Topics có performance cao nhất: ${topTopics || 'Chưa có dữ liệu'}
- Feedback: ${stats.topicHistory.feedback.positive} positive, ${stats.topicHistory.feedback.negative} negative

### Posting patterns:
- Ngày tạo content gần nhất: ${stats.postingPatterns.lastContentDate ? new Date(stats.postingPatterns.lastContentDate).toLocaleDateString('vi-VN') : 'Chưa có'}
- Số ngày chưa tạo content: ${stats.postingPatterns.daysSinceLastContent}
- Trung bình content/tuần (30 ngày qua): ${stats.postingPatterns.weeklyAverage}
- Kênh bị bỏ quên: ${channelGapsText || 'Không có'}

### Brand context:
- Brand đang dùng: ${stats.brandContext.activeBrand || 'Chưa setup'}
- Content Pillars: ${stats.brandContext.contentPillars.join(', ') || 'Chưa có'}

## Quy tắc generate insights:

1. **Ưu tiên actionable insights** - Mỗi insight phải có action cụ thể
2. **Achievement type** dùng khi có thành tích đáng khen (performance cao, đăng đều)
3. **Reminder type** dùng khi có gaps rõ ràng (lâu không đăng, kênh bị bỏ quên)
4. **Tip type** cho suggestions cải thiện (tăng slides, thử content pillar mới)
5. **Trend type** cho topics đang hot hoặc có engagement cao

## Action hrefs hợp lệ:
- /scripts - Tạo video script
- /carousels - Tạo carousel
- /multichannel - Tạo nội dung đa kênh
- /topics - Xem gợi ý topics
- /brands - Quản lý brand

## Priority guidelines:
- high: Cần action ngay (gaps > 5 ngày, achievements mới)
- medium: Nên làm sớm (tips cải thiện, trends)
- low: Nice to have (suggestions dài hạn)

Hãy analyze dữ liệu và generate insights phù hợp với tình trạng thực tế của user.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization - try membership first, fallback to content tables
    let organizationId: string | null = null;
    
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      organizationId = membership.organization_id;
    } else {
      // Fallback: check brand_templates for organization
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      
      organizationId = brand?.organization_id || null;
    }

    // If still no org, return starter insights for new users
    if (!organizationId) {
      console.log(`[analyze-dashboard-insights] No organization found for user ${user.id}, returning starter insights`);
      
      const starterInsights = [
        {
          id: "starter-1",
          type: "tip",
          title: "Bắt đầu với Brand của bạn",
          description: "Setup Brand Voice để AI tạo nội dung phù hợp với phong cách thương hiệu.",
          priority: "high",
          action: { label: "Setup Brand", href: "/brands" }
        },
        {
          id: "starter-2",
          type: "trend",
          title: "Thử tạo nội dung đầu tiên",
          description: "Multi-channel giúp bạn tạo content cho nhiều kênh cùng lúc, tiết kiệm 80% thời gian.",
          priority: "high",
          action: { label: "Tạo nội dung", href: "/multichannel" }
        },
        {
          id: "starter-3",
          type: "tip",
          title: "Khám phá gợi ý Topics",
          description: "AI sẽ gợi ý topics trending và phù hợp với ngành của bạn.",
          priority: "medium",
          action: { label: "Xem Topics", href: "/topics" }
        }
      ];

      return new Response(JSON.stringify({ insights: starterInsights, fromCache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[analyze-dashboard-insights] Fetching stats for org: ${organizationId}`);

    // Parse request body for forceRefresh flag
    const { forceRefresh } = await req.json().catch(() => ({ forceRefresh: false }));

    // Fetch content stats first to generate hash
    const stats = await fetchContentStats(supabase, organizationId, user.id);
    
    console.log(`[analyze-dashboard-insights] Stats:`, JSON.stringify(stats, null, 2));

    // Generate hash from stats to detect data changes
    const statsHash = btoa(`${stats.scripts.total}-${stats.carousels.total}-${stats.multiChannel.total}-${stats.topicHistory.total}`);

    // Check cache (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_response_cache")
        .select("id, response_data, created_at, input_hash, hit_count")
        .eq("function_name", "analyze-dashboard-insights")
        .eq("organization_id", organizationId)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cached) {
        // Check if data has changed
        if (cached.input_hash === statsHash) {
          // Data unchanged - extend cache and return cached result
          console.log(`[analyze-dashboard-insights] Cache hit, extending TTL`);
          
          await supabase
            .from("ai_response_cache")
            .update({ 
              hit_count: (cached.hit_count || 0) + 1, 
              last_hit_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Extend 2 hours
            })
            .eq("id", cached.id);

          return new Response(JSON.stringify({ 
            insights: cached.response_data.insights, 
            fromCache: true,
            cachedAt: cached.created_at
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          console.log(`[analyze-dashboard-insights] Data changed (hash mismatch), regenerating insights`);
        }
      }
    }

    // Check if user has any content - provide starter insights if new user
    const totalContent = stats.scripts.total + stats.carousels.total + stats.multiChannel.total;
    
    if (totalContent === 0) {
      // New user - return onboarding insights
      const starterInsights = [
        {
          id: "starter-1",
          type: "tip",
          title: "Bắt đầu với Brand của bạn",
          description: "Setup Brand Voice để AI tạo nội dung phù hợp với phong cách thương hiệu.",
          priority: "high",
          action: { label: "Setup Brand", href: "/brands" }
        },
        {
          id: "starter-2",
          type: "trend",
          title: "Thử tạo nội dung đầu tiên",
          description: "Multi-channel giúp bạn tạo content cho nhiều kênh cùng lúc, tiết kiệm 80% thời gian.",
          priority: "high",
          action: { label: "Tạo nội dung", href: "/multichannel" }
        },
        {
          id: "starter-3",
          type: "tip",
          title: "Khám phá gợi ý Topics",
          description: "AI sẽ gợi ý topics trending và phù hợp với ngành của bạn.",
          priority: "medium",
          action: { label: "Xem Topics", href: "/topics" }
        }
      ];

      return new Response(JSON.stringify({ insights: starterInsights, fromCache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt and call AI
    const prompt = buildPrompt(stats);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[analyze-dashboard-insights] Calling AI...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Analyze dữ liệu và generate insights cho user này." }
        ],
        tools: [insightsTool],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[analyze-dashboard-insights] AI error:`, aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log(`[analyze-dashboard-insights] AI response:`, JSON.stringify(aiData, null, 2));

    // Extract insights from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_insights") {
      throw new Error("Invalid AI response format");
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const insights = parsedArgs.insights.map((insight: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      ...insight
    }));

    console.log(`[analyze-dashboard-insights] Generated ${insights.length} insights, caching result`);

    // Store in cache
    await supabase.from("ai_response_cache").upsert({
      function_name: "analyze-dashboard-insights",
      organization_id: organizationId,
      cache_key: `insights-${organizationId}`,
      cache_scope: "org",
      input_hash: statsHash,
      response_data: { insights },
      response_schema_version: "1.0",
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      hit_count: 0
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({ insights, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[analyze-dashboard-insights] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
