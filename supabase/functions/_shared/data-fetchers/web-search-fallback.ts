// ============================================
// Enhanced Web Search with Fallback Strategies
// v3: Persistent Cache + Analytics + Social Trends
// ============================================

import { withRetry, withFallback, withTimeout, createCircuitBreaker, isRetryableError } from "../error-utils.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSocialTrends, type NormalizedTrend, type MergedTrendResults } from "./social-trend-scraper.ts";
import { callAI as callAIProvider } from "../ai-provider.ts";
import { getAIConfig } from "../ai-config.ts";

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export interface WebSearchResult {
  title: string;
  snippet: string;
  relevance: string;
  content_angle?: string;
  source?: string;
}

export interface WebSearchResponse {
  success: boolean;
  source: 'perplexity' | 'lovable-ai' | 'cached' | 'fallback';
  query: string;
  search_type: string;
  results: WebSearchResult[];
  citations: string[];
  total_results: number;
  message: string;
  fallback_used?: boolean;
  error?: string;
  cache_hit?: boolean;
  latency_ms?: number;
}

// Circuit breakers for each search provider
const perplexityCircuit = createCircuitBreaker('perplexity', {
  failureThreshold: 3,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenMaxCalls: 2,
});

const lovableAICircuit = createCircuitBreaker('lovable-ai-search', {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
});

// TTL by search type (in hours)
const CACHE_TTL_HOURS: Record<string, number> = {
  trending: 2,        // Changes fast
  social_trends: 4,   // Social platform trends
  news: 6,            // Semi-fresh
  competitor: 24,     // Stable
  general: 12,        // Default
};

// In-memory cache as L1 (fast), Supabase as L2 (persistent)
const memoryCache = new Map<string, { data: WebSearchResponse; expires: number }>();
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for memory cache

// ============================================
// Supabase Client for Cache & Analytics
// ============================================

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ============================================
// Cache Key Generation
// ============================================

function getCacheKey(query: string, searchType: string, industry?: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${searchType}:${industry || 'all'}:${normalized}`;
}

// ============================================
// L1 Memory Cache (fast, ephemeral)
// ============================================

function getFromMemoryCache(key: string): WebSearchResponse | null {
  const cached = memoryCache.get(key);
  if (cached && cached.expires > Date.now()) {
    console.log(`[WebSearchFallback] L1 memory cache hit: ${key}`);
    return { ...cached.data, source: 'cached', cache_hit: true };
  }
  if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

function setMemoryCache(key: string, data: WebSearchResponse): void {
  // Limit memory cache size
  if (memoryCache.size > 50) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, expires: Date.now() + MEMORY_CACHE_TTL_MS });
}

// ============================================
// L2 Persistent Cache (Supabase)
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFromPersistentCache(
  supabase: any,
  cacheKey: string
): Promise<WebSearchResponse | null> {
  try {
    const { data, error } = await supabase
      .from('web_search_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Increment hit count asynchronously (fire and forget)
    supabase
      .from('web_search_cache')
      .update({ hit_count: (data.hit_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});

    console.log(`[WebSearchFallback] L2 persistent cache hit: ${cacheKey}`);
    
    return {
      success: true,
      source: 'cached',
      query: data.query,
      search_type: data.search_type,
      results: data.results as WebSearchResult[],
      citations: data.citations || [],
      total_results: (data.results as WebSearchResult[]).length,
      message: `Từ cache (${(data.hit_count || 0) + 1} hits)`,
      cache_hit: true,
    };
  } catch (err) {
    console.warn('[WebSearchFallback] Persistent cache lookup failed:', err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setPersistentCache(
  supabase: any,
  cacheKey: string,
  data: WebSearchResponse,
  searchType: string,
  industry?: string
): Promise<void> {
  try {
    const ttlHours = CACHE_TTL_HOURS[searchType] || CACHE_TTL_HOURS.general;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await supabase
      .from('web_search_cache')
      .upsert({
        cache_key: cacheKey,
        query: data.query,
        search_type: searchType,
        industry: industry || null,
        results: data.results,
        citations: data.citations,
        source: data.source,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });

    console.log(`[WebSearchFallback] Cached to persistent storage: ${cacheKey}, expires: ${ttlHours}h`);
  } catch (err) {
    console.warn('[WebSearchFallback] Failed to set persistent cache:', err);
  }
}

// ============================================
// Analytics Tracking
// ============================================

interface AnalyticsData {
  query: string;
  searchType: string;
  industry?: string;
  source: string;
  resultCount: number;
  latencyMs: number;
  cacheHit: boolean;
  fallbackUsed: boolean;
  error?: string;
  userId?: string;
  organizationId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trackSearchAnalytics(
  supabase: any | null,
  data: AnalyticsData
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('web_search_analytics').insert({
      query: data.query,
      search_type: data.searchType,
      industry: data.industry || null,
      source: data.source,
      result_count: data.resultCount,
      latency_ms: data.latencyMs,
      cache_hit: data.cacheHit,
      fallback_used: data.fallbackUsed,
      error: data.error || null,
      user_id: data.userId || null,
      organization_id: data.organizationId || null,
    });
  } catch (err) {
    // Non-blocking, log and continue
    console.warn('[WebSearchFallback] Failed to track analytics:', err);
  }
}

// ============================================
// Primary: Perplexity Search
// ============================================

function buildPerplexityPrompt(searchType: string, industry?: string): string {
  const industryContext = industry ? ` trong ngành ${industry}` : "";
  
  switch (searchType) {
    case "trending":
      return `Bạn là chuyên gia phân tích xu hướng content${industryContext}. Tìm trending topics, viral content, xu hướng mới nhất trên social media Việt Nam. Trả về JSON array:
[{"title": "Tên trend", "snippet": "Mô tả ngắn", "relevance": "Tại sao trending", "content_angle": "Gợi ý góc content"}]
Tối đa 5-7 kết quả, ưu tiên real-time.`;

    case "news":
      return `Bạn là chuyên gia tin tức ngành${industryContext}. Tìm tin tức mới nhất, sự kiện quan trọng. Trả về JSON array:
[{"title": "Tiêu đề tin", "snippet": "Tóm tắt", "relevance": "Tác động đến ngành", "content_angle": "Cơ hội content"}]
Tối đa 5-7 kết quả, ưu tiên nguồn uy tín.`;

    case "competitor":
      return `Bạn là chuyên gia phân tích competitor${industryContext}. Phân tích chiến lược content đối thủ. Trả về JSON array:
[{"title": "Insight", "snippet": "Chi tiết", "relevance": "Điểm mạnh/yếu", "content_angle": "Cơ hội differentiate"}]
Tối đa 5-7 insights actionable.`;

    default:
      return `Bạn là chuyên gia nghiên cứu content${industryContext}. Tìm thông tin hữu ích cho content marketing. Trả về JSON array có cấu trúc rõ ràng với title, snippet, relevance, content_angle.`;
  }
}

async function searchWithPerplexity(
  query: string,
  searchType: string,
  industry?: string,
  recency?: string
): Promise<WebSearchResponse> {
  // Prefer OpenRouter for Perplexity models (avoids direct quota issues)
  const useOpenRouter = !!OPENROUTER_API_KEY;
  
  if (!useOpenRouter && !PERPLEXITY_API_KEY) {
    throw new Error('Neither OPENROUTER_API_KEY nor PERPLEXITY_API_KEY configured');
  }

  const today = new Date().toISOString().split('T')[0];
  let enhancedQuery = query;
  
  switch (searchType) {
    case 'trending':
      enhancedQuery = `Trending topics viral "${query}" social media content Việt Nam ${today}`;
      break;
    case 'news':
      enhancedQuery = `Tin tức mới nhất ${query} ${industry || ''} Việt Nam ${today}`;
      break;
    case 'competitor':
      enhancedQuery = `Content marketing ${query} competitor strategy chiến lược nội dung`;
      break;
  }

  const apiUrl = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.perplexity.ai/chat/completions';
  const apiKey = useOpenRouter ? OPENROUTER_API_KEY : PERPLEXITY_API_KEY;
  const model = useOpenRouter ? 'perplexity/sonar' : 'sonar';

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (useOpenRouter) {
    headers['HTTP-Referer'] = 'https://flowa.vn';
    headers['X-Title'] = 'Flowa Web Search';
  }

  const bodyPayload: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: buildPerplexityPrompt(searchType, industry) },
      { role: 'user', content: enhancedQuery }
    ],
    temperature: 0.3,
  };
  // search_recency_filter only works with direct Perplexity API
  if (!useOpenRouter) {
    bodyPayload.search_recency_filter = recency || 'week';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`${useOpenRouter ? 'OpenRouter/Perplexity' : 'Perplexity'} API error: ${response.status}`);
    (error as any).statusCode = response.status;
    console.error(`[WebSearchFallback] ${useOpenRouter ? 'OpenRouter' : 'Perplexity'} error:`, response.status, errorText);
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];

  const results = parseSearchResults(content, query, searchType, citations);

  return {
    success: true,
    source: 'perplexity',
    query,
    search_type: searchType,
    results,
    citations,
    total_results: results.length,
    message: `Tìm thấy ${results.length} kết quả từ ${useOpenRouter ? 'OpenRouter/Perplexity' : 'Perplexity'}`,
  };
}

// ============================================
// Fallback: Lovable AI Search
// ============================================

async function searchWithLovableAI(
  query: string,
  searchType: string,
  industry?: string,
  organizationId?: string
): Promise<WebSearchResponse> {
  const today = new Date().toISOString().split('T')[0];
  const industryContext = industry ? ` trong ngành ${industry}` : "";

  const systemPrompt = `Bạn là AI assistant chuyên về content marketing${industryContext}. Hôm nay là ${today}.
Dựa trên kiến thức của bạn, hãy cung cấp thông tin về chủ đề được hỏi.
Trả lời bằng JSON array với format:
[{"title": "Tiêu đề", "snippet": "Mô tả chi tiết", "relevance": "Tại sao quan trọng", "content_angle": "Gợi ý góc content"}]
Tối đa 5 kết quả. Ưu tiên thông tin thực tế và actionable.`;

  const userPrompt = searchType === 'trending' 
    ? `Xu hướng và trends phổ biến liên quan đến: ${query}`
    : searchType === 'news'
    ? `Các sự kiện, tin tức quan trọng gần đây liên quan đến: ${query}`
    : searchType === 'competitor'
    ? `Phân tích chiến lược content marketing của đối thủ trong lĩnh vực: ${query}`
    : `Thông tin về: ${query}`;

  // Get AI config for model override
  const aiConfig = await getAIConfig('web-search-fallback', organizationId);

  const aiResult = await callAIProvider({
    functionName: 'web-search-fallback',
    organizationId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    modelOverride: aiConfig.model || undefined,
    temperatureOverride: 0.4,
  });

  if (!aiResult.success) {
    const error = new Error(`Lovable AI error: ${aiResult.error}`);
    (error as any).statusCode = aiResult.error?.includes('429') ? 429 : 500;
    console.error('[WebSearchFallback] Lovable AI error:', aiResult.error);
    throw error;
  }

  const content = aiResult.data?.choices?.[0]?.message?.content || "";

  const results = parseSearchResults(content, query, searchType, []);

  return {
    success: true,
    source: 'lovable-ai',
    query,
    search_type: searchType,
    results,
    citations: [],
    total_results: results.length,
    message: `Tìm thấy ${results.length} kết quả từ AI (không có nguồn web trực tiếp)`,
    fallback_used: true,
  };
}

// ============================================
// Static Fallback (when all else fails)
// ============================================

function getStaticFallback(query: string, searchType: string, industry?: string): WebSearchResponse {
  const staticResults: WebSearchResult[] = [
    {
      title: `Gợi ý cho "${query}"`,
      snippet: `Không thể tìm kiếm web real-time lúc này. Hãy thử lại sau hoặc sử dụng thông tin có sẵn trong hệ thống.`,
      relevance: 'Thông tin chung',
      content_angle: 'Tham khảo Industry Memory và Brand Context để tạo content phù hợp',
    }
  ];

  if (searchType === 'trending') {
    staticResults.push({
      title: 'Evergreen Content',
      snippet: 'Khi không có dữ liệu trending real-time, hãy tập trung vào evergreen content - nội dung có giá trị lâu dài.',
      relevance: 'Chiến lược backup',
      content_angle: 'Tạo content giáo dục, hướng dẫn, hoặc giải quyết pain points cơ bản',
    });
  }

  return {
    success: true,
    source: 'fallback',
    query,
    search_type: searchType,
    results: staticResults,
    citations: [],
    total_results: staticResults.length,
    message: 'Sử dụng kết quả dự phòng - web search tạm thời không khả dụng',
    fallback_used: true,
  };
}

// ============================================
// Helper: Parse Search Results
// ============================================

function parseSearchResults(
  content: string,
  query: string,
  searchType: string,
  citations: string[]
): WebSearchResult[] {
  let results: WebSearchResult[] = [];

  try {
    // Try to extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      results = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback: create single result from content
  }

  if (results.length === 0) {
    results = [{
      title: `Kết quả: ${query}`,
      snippet: content.substring(0, 500),
      relevance: searchType === 'trending' ? 'Xu hướng mới' : 'Thông tin liên quan',
      content_angle: 'Phân tích chi tiết để tìm góc content phù hợp',
    }];
  }

  // Add citations and limit results
  return results.slice(0, 7).map((r, i) => ({
    title: r.title || 'Untitled',
    snippet: r.snippet || '',
    relevance: r.relevance || '',
    content_angle: r.content_angle,
    source: citations[i] || undefined,
  }));
}

// ============================================
// Main Export: Enhanced Web Search
// ============================================

export interface WebSearchOptions {
  query: string;
  searchType: string;
  industry?: string;
  recency?: string;
  maxResults?: number;
  skipCache?: boolean;
  timeoutMs?: number;
  userId?: string;
  organizationId?: string;
  // New: Social trend options
  platforms?: ('tiktok' | 'facebook' | 'youtube' | 'instagram')[];
  includeSocialTrends?: boolean;
}

export async function enhancedWebSearch(options: WebSearchOptions): Promise<WebSearchResponse> {
  const { 
    query, 
    searchType, 
    industry, 
    recency, 
    skipCache = false, 
    timeoutMs = 15000,
    userId,
    organizationId,
    platforms,
    includeSocialTrends,
  } = options;
  
  // Auto-enable social trends for trending searches
  const shouldIncludeSocialTrends = includeSocialTrends ?? 
    (searchType === 'trending' && FIRECRAWL_API_KEY);
  
  const startTime = Date.now();
  const cacheKey = getCacheKey(query, searchType, industry);
  const supabase = createSupabaseClient();

  // 1. Check L1 memory cache first (fastest)
  if (!skipCache) {
    const memoryCached = getFromMemoryCache(cacheKey);
    if (memoryCached) {
      const latencyMs = Date.now() - startTime;
      // Track cache hit (non-blocking)
      trackSearchAnalytics(supabase, {
        query,
        searchType,
        industry,
        source: 'cached',
        resultCount: memoryCached.total_results,
        latencyMs,
        cacheHit: true,
        fallbackUsed: false,
        userId,
        organizationId,
      });
      return { ...memoryCached, latency_ms: latencyMs };
    }
  }

  // 2. Check L2 persistent cache (Supabase)
  if (!skipCache && supabase) {
    const persistentCached = await getFromPersistentCache(supabase, cacheKey);
    if (persistentCached) {
      const latencyMs = Date.now() - startTime;
      // Also store in memory cache for faster access
      setMemoryCache(cacheKey, persistentCached);
      // Track cache hit
      trackSearchAnalytics(supabase, {
        query,
        searchType,
        industry,
        source: 'cached',
        resultCount: persistentCached.total_results,
        latencyMs,
        cacheHit: true,
        fallbackUsed: false,
        userId,
        organizationId,
      });
      return { ...persistentCached, latency_ms: latencyMs };
    }
  }

  console.log(`[WebSearchFallback] Starting search: ${searchType} "${query}"`);

  let result: WebSearchResponse | null = null;
  let error: string | undefined;

  // 3. Try Perplexity with retry and circuit breaker
  if (PERPLEXITY_API_KEY) {
    try {
      result = await perplexityCircuit.execute(() =>
        withTimeout(
          () => withRetry(
            () => searchWithPerplexity(query, searchType, industry, recency),
            {
              maxRetries: 2,
              baseDelayMs: 500,
              maxDelayMs: 3000,
              retryOn: isRetryableError,
              onRetry: (err, attempt) => {
                console.log(`[WebSearchFallback] Perplexity retry ${attempt}:`, err.message);
              },
            }
          ),
          timeoutMs,
          'Perplexity search timed out'
        )
      );
      
      console.log(`[WebSearchFallback] Perplexity success: ${result.total_results} results`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.warn('[WebSearchFallback] Perplexity failed:', error);
    }
  }

  // 3.5. Enrich with Social Trends from Firecrawl (for trending searches)
  let socialTrendsData: MergedTrendResults | null = null;
  if (shouldIncludeSocialTrends && FIRECRAWL_API_KEY) {
    try {
      const targetPlatforms = platforms || ['tiktok', 'youtube'];
      console.log(`[WebSearchFallback] Fetching social trends for: ${targetPlatforms.join(', ')}`);
      
      // Get trends for first platform (most common case)
      const primaryPlatform = targetPlatforms[0] as 'tiktok' | 'facebook' | 'youtube' | 'instagram';
      socialTrendsData = await getSocialTrends(primaryPlatform, { industry });
      
      if (socialTrendsData && socialTrendsData.trends.length > 0) {
        console.log(`[WebSearchFallback] Got ${socialTrendsData.trends.length} social trends from ${socialTrendsData.sources.join(', ')}`);
        
        // Merge social trends into search results
        const socialResults: WebSearchResult[] = socialTrendsData.trends.slice(0, 5).map(trend => ({
          title: trend.name,
          snippet: trend.description || `${trend.type} đang trending trên ${trend.platform}`,
          relevance: 'high',
          content_angle: `Trending ${trend.type} on ${trend.platform}`,
          source: trend.source,
        }));
        
        if (result) {
          // Merge with existing results
          result.results = [...socialResults, ...result.results];
          result.message = `${result.message} + ${socialTrendsData.trends.length} social trends`;
        } else {
          // Use social trends as primary result
          result = {
            success: true,
            source: 'cached', // Social trends are cached
            query,
            search_type: searchType,
            results: socialResults,
            citations: socialTrendsData.sources,
            total_results: socialResults.length,
            message: `Tìm thấy ${socialResults.length} xu hướng từ ${socialTrendsData.sources.join(', ')}`,
          };
        }
      }
    } catch (err) {
      console.warn('[WebSearchFallback] Social trends fetch failed:', err);
      // Non-blocking - continue with other sources
    }
  }

  // 4. Fallback to Lovable AI (always available via multi-provider system)
  if (!result) {
    try {
      result = await lovableAICircuit.execute(() =>
        withTimeout(
          () => withRetry(
            () => searchWithLovableAI(query, searchType, industry, options.organizationId),
            {
              maxRetries: 2,
              baseDelayMs: 500,
              maxDelayMs: 2000,
              retryOn: isRetryableError,
            }
          ),
          timeoutMs,
          'Lovable AI search timed out'
        )
      );
      
      console.log(`[WebSearchFallback] Lovable AI fallback success: ${result.total_results} results`);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.warn('[WebSearchFallback] Lovable AI fallback failed:', error);
    }
  }

  // 5. Static fallback (never fails)
  if (!result) {
    console.log('[WebSearchFallback] Using static fallback');
    result = getStaticFallback(query, searchType, industry);
  }

  const latencyMs = Date.now() - startTime;
  result.latency_ms = latencyMs;

  // 6. Cache successful results (both L1 and L2)
  if (result.source !== 'fallback') {
    setMemoryCache(cacheKey, result);
    if (supabase) {
      // Async cache to persistent storage
      setPersistentCache(supabase, cacheKey, result, searchType, industry);
    }
  }

  // 7. Track analytics
  trackSearchAnalytics(supabase, {
    query,
    searchType,
    industry,
    source: result.source,
    resultCount: result.total_results,
    latencyMs,
    cacheHit: false,
    fallbackUsed: result.fallback_used || false,
    error,
    userId,
    organizationId,
  });

  return result;
}

// ============================================
// Circuit Breaker Status (for monitoring)
// ============================================

export function getCircuitStatus(): Record<string, string> {
  return {
    perplexity: perplexityCircuit.getState(),
    lovableAI: lovableAICircuit.getState(),
  };
}

export function resetCircuits(): void {
  perplexityCircuit.reset();
  lovableAICircuit.reset();
  console.log('[WebSearchFallback] All circuits reset');
}

// ============================================
// Cache Management Functions
// ============================================

export async function getSearchCacheStats(): Promise<any> {
  const supabase = createSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_web_search_cache_stats');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[WebSearchFallback] Failed to get cache stats:', err);
    return null;
  }
}

export async function cleanupExpiredSearchCache(): Promise<number> {
  const supabase = createSupabaseClient();
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase.rpc('cleanup_web_search_cache');
    if (error) throw error;
    console.log(`[WebSearchFallback] Cleaned up ${data} expired cache entries`);
    return data || 0;
  } catch (err) {
    console.error('[WebSearchFallback] Failed to cleanup cache:', err);
    return 0;
  }
}

export function clearMemoryCache(): void {
  memoryCache.clear();
  console.log('[WebSearchFallback] Memory cache cleared');
}
