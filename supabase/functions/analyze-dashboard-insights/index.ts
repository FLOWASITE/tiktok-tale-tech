import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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
  comparison: {
    scripts: { thisWeek: number; lastWeek: number };
    carousels: { thisWeek: number; lastWeek: number };
    multiChannel: { thisWeek: number; lastWeek: number };
    performanceChange: number;
    streak: number;
    longestStreak: number;
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
              title: { type: "string", description: "Short title matching user's language" },
              description: { type: "string", description: "Detailed description matching user's language, max 100 chars" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              action: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Button label matching user's language" },
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
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
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

  // Week-over-week comparison
  const thisWeekScripts = scripts.filter((s: any) => s.created_at >= sevenDaysAgo).length;
  const lastWeekScripts = scripts.filter((s: any) => 
    s.created_at >= fourteenDaysAgo && s.created_at < sevenDaysAgo
  ).length;
  const thisWeekCarousels = carousels.filter((c: any) => c.created_at >= sevenDaysAgo).length;
  const lastWeekCarousels = carousels.filter((c: any) => 
    c.created_at >= fourteenDaysAgo && c.created_at < sevenDaysAgo
  ).length;
  const thisWeekMulti = multiChannel.filter((m: any) => m.created_at >= sevenDaysAgo).length;
  const lastWeekMulti = multiChannel.filter((m: any) => 
    m.created_at >= fourteenDaysAgo && m.created_at < sevenDaysAgo
  ).length;

  // Calculate performance change
  const thisWeekTopics = topicHistory.filter((t: any) => t.created_at >= sevenDaysAgo);
  const lastWeekTopics = topicHistory.filter((t: any) => 
    t.created_at >= fourteenDaysAgo && t.created_at < sevenDaysAgo
  );
  const thisWeekAvg = thisWeekTopics.length > 0 
    ? thisWeekTopics.reduce((sum: number, t: any) => sum + (t.performance_score || 0), 0) / thisWeekTopics.length 
    : 0;
  const lastWeekAvg = lastWeekTopics.length > 0 
    ? lastWeekTopics.reduce((sum: number, t: any) => sum + (t.performance_score || 0), 0) / lastWeekTopics.length 
    : 0;
  const performanceChange = lastWeekAvg > 0 ? Math.round((thisWeekAvg - lastWeekAvg) / lastWeekAvg * 100) : 0;

  // Calculate streak (consecutive days with content)
  const sortedDates = [...new Set(allContents.map(c => 
    new Date(c.date).toISOString().split('T')[0]
  ))].sort().reverse();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (i === 0 && date === today) {
      currentStreak = 1;
    } else if (date === expectedDate || (i === 0 && date === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Calculate longest streak
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

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
    },
    comparison: {
      scripts: { thisWeek: thisWeekScripts, lastWeek: lastWeekScripts },
      carousels: { thisWeek: thisWeekCarousels, lastWeek: lastWeekCarousels },
      multiChannel: { thisWeek: thisWeekMulti, lastWeek: lastWeekMulti },
      performanceChange,
      streak: currentStreak,
      longestStreak
    }
  };
}

function buildPrompt(stats: ContentStats): string {
  const topTopics = stats.topicHistory.topPerformers.map(t => `${t.topic} (${t.score}đ)`).join(', ');
  const channelGapsText = stats.postingPatterns.channelGaps.map(g => `${g.channel}: ${g.days} ngày`).join(', ');
  
  // Format comparison data
  const scriptsChange = stats.comparison.scripts.thisWeek - stats.comparison.scripts.lastWeek;
  const carouselsChange = stats.comparison.carousels.thisWeek - stats.comparison.carousels.lastWeek;
  const multiChange = stats.comparison.multiChannel.thisWeek - stats.comparison.multiChannel.lastWeek;
  
  return `You are an AI Content Strategist. Analyze user activity data and provide 3-5 personalized insights. Respond in the same language as the user's brand context (default: Vietnamese).

## Dữ liệu user:

### Content đã tạo:
- Scripts: ${stats.scripts.total} tổng, ${stats.scripts.recent} bài trong 7 ngày qua
- Carousels: ${stats.carousels.total} tổng, trung bình ${stats.carousels.avgSlides} slides/carousel
- Multi-channel: ${stats.multiChannel.total} tổng, ${stats.multiChannel.recent} bài trong 7 ngày qua
- Kênh hay dùng nhất: ${stats.multiChannel.topChannels.join(', ') || 'Chưa có'}

### So sánh tuần này vs tuần trước:
- Scripts: ${stats.comparison.scripts.thisWeek} vs ${stats.comparison.scripts.lastWeek} (${scriptsChange >= 0 ? '+' : ''}${scriptsChange})
- Carousels: ${stats.comparison.carousels.thisWeek} vs ${stats.comparison.carousels.lastWeek} (${carouselsChange >= 0 ? '+' : ''}${carouselsChange})
- Multi-channel: ${stats.comparison.multiChannel.thisWeek} vs ${stats.comparison.multiChannel.lastWeek} (${multiChange >= 0 ? '+' : ''}${multiChange})
- Performance change: ${stats.comparison.performanceChange >= 0 ? '+' : ''}${stats.comparison.performanceChange}%

### Streak & Consistency:
- Current streak: ${stats.comparison.streak} ngày liên tục
- Longest streak: ${stats.comparison.longestStreak} ngày

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
2. **Achievement type** dùng khi:
   - Streak >= 3 ngày
   - Performance tăng > 10%
   - Tuần này tạo nhiều content hơn tuần trước
   - Đạt milestone (10, 25, 50, 100 content)
3. **Reminder type** dùng khi có gaps rõ ràng (lâu không đăng, kênh bị bỏ quên)
4. **Tip type** cho suggestions cải thiện (tăng slides, thử content pillar mới)
5. **Trend type** cho topics đang hot hoặc có engagement cao

## Action hrefs nâng cao (với query params):
- /scripts?topic={encoded_topic} - Tạo script với topic gợi ý
- /carousels?topic={encoded_topic}&slides=8 - Carousel với số slides recommend
- /multichannel?channel={channel}&topic={topic} - Nội dung cho kênh cụ thể
- /topics?category={category} - Filter topics theo category
- /brands - Quản lý brand

Ví dụ:
- Nếu user chưa đăng LinkedIn 5 ngày: href="/multichannel?channel=linkedin"
- Nếu topic "AI Marketing" performance cao: href="/multichannel?topic=AI%20Marketing"
- Nếu carousel ít slides: href="/carousels?slides=10"

## Priority guidelines:
- high: Cần action ngay (gaps > 5 ngày, achievements mới, streak milestones)
- medium: Nên làm sớm (tips cải thiện, trends)
- low: Nice to have (suggestions dài hạn)

Hãy analyze dữ liệu và generate insights phù hợp với tình trạng thực tế của user.`;
}

Deno.serve(withPerf({ functionName: 'analyze-dashboard-insights', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Client for RLS-scoped DB access
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Validate JWT using service role getUser (bypasses session lookup)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user: authUser }, error: authError } = await serviceClient.auth.getUser(token);

    if (authError || !authUser) {
      console.error("[analyze-dashboard-insights] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message || "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authUser.id;

    // Get organization - try membership first, fallback to content tables
    let organizationId: string | null = null;
    
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (membership) {
      organizationId = membership.organization_id;
    } else {
      // Fallback: check brand_templates for organization
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .single();
      
      organizationId = brand?.organization_id || null;
    }

    // If still no org, return starter insights for new users
    if (!organizationId) {
      console.log(`[analyze-dashboard-insights] No organization found for user ${userId}, returning starter insights`);
      
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
    const stats = await fetchContentStats(supabase, organizationId, userId);
    
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

    // Get AI config from Admin Panel
    const aiConfig = await getAIConfig('analyze-dashboard-insights', organizationId);
    const adminModel = aiConfig?.model || undefined;

    console.log(`[analyze-dashboard-insights] Calling AI with model override: ${adminModel || 'default'}...`);

    // Retry logic for transient AI errors (MALFORMED_FUNCTION_CALL, empty tool_calls)
    const MAX_RETRIES = 2;
    let insights: any[] = [];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Use multi-provider system with auto metrics
        const aiResult = await callAIWithMetrics(supabase, {
          functionName: 'analyze-dashboard-insights',
          organizationId,
          userId,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: "Analyze dữ liệu và generate insights cho user này." }
          ],
          tools: [insightsTool],
          toolChoice: { type: "function", function: { name: "generate_insights" } },
          modelOverride: adminModel,
          temperatureOverride: aiConfig?.temperature,
        });

        if (!aiResult.success) {
          console.error(`[analyze-dashboard-insights] AI error (attempt ${attempt + 1}):`, aiResult.error);
          
          if (aiResult.error?.includes('429') || aiResult.error?.includes('rate')) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later", errorCode: "RATE_LIMIT" }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          // Payment / credits exhausted - return 402 with structured error
          if (aiResult.error?.includes('402') || aiResult.error?.includes('Payment required') || aiResult.error?.includes('credits') || aiResult.error?.includes('payment_required')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.", 
              errorCode: "CREDITS_EXHAUSTED" 
            }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          throw new Error(aiResult.error || 'AI call failed');
        }

        const aiData = aiResult.data;
        console.log(`[analyze-dashboard-insights] AI response (attempt ${attempt + 1}):`, JSON.stringify(aiData, null, 2));

        // Check for malformed function call or missing tool_calls
        const finishReason = aiData?.choices?.[0]?.native_finish_reason || aiData?.choices?.[0]?.finish_reason;
        if (finishReason === "MALFORMED_FUNCTION_CALL") {
          console.warn(`[analyze-dashboard-insights] AI returned MALFORMED_FUNCTION_CALL, retrying...`);
          throw new Error("AI returned malformed function call");
        }

        // Extract insights from tool call
        const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || toolCall.function.name !== "generate_insights") {
          console.warn(`[analyze-dashboard-insights] Missing or invalid tool_calls, retrying...`);
          throw new Error("Invalid AI response format - no tool_calls");
        }

        const parsedArgs = JSON.parse(toolCall.function.arguments);
        insights = parsedArgs.insights.map((insight: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`,
          ...insight
        }));

        // Success - break out of retry loop
        lastError = null;
        break;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[analyze-dashboard-insights] Attempt ${attempt + 1} failed: ${lastError.message}`);
        
        if (attempt < MAX_RETRIES) {
          // Wait before retrying (exponential backoff: 1s, 2s)
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        }
      }
    }

    // If all retries failed, throw the last error
    if (lastError) {
      throw lastError;
    }

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

    // Include metadata in response
    const metadata = {
      currentStreak: stats.comparison.streak,
      longestStreak: stats.comparison.longestStreak,
      weeklyProgress: Math.round((stats.comparison.scripts.thisWeek + stats.comparison.carousels.thisWeek + stats.comparison.multiChannel.thisWeek) / 7 * 100) // % of weekly goal (7 content)
    };

    return new Response(JSON.stringify({ insights, fromCache: false, metadata }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[analyze-dashboard-insights] Error:", error);
    
    // Check if it's a payment/credits error that wasn't caught earlier
    if (errorMessage.includes('Payment required') || errorMessage.includes('402') || errorMessage.includes('credits')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "AI credits exhausted. Please top up.", 
        errorCode: "CREDITS_EXHAUSTED" 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
