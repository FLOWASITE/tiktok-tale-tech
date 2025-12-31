// ============================================
// Enhanced Web Search with Fallback Strategies
// ============================================

import { withRetry, withFallback, withTimeout, createCircuitBreaker, isRetryableError } from "../error-utils.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

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

// In-memory cache for recent searches (simple TTL cache)
const searchCache = new Map<string, { data: WebSearchResponse; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(query: string, searchType: string, industry?: string): string {
  return `${searchType}:${industry || 'all'}:${query.toLowerCase().trim()}`;
}

function getFromCache(key: string): WebSearchResponse | null {
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) {
    console.log(`[WebSearchFallback] Cache hit for key: ${key}`);
    return { ...cached.data, source: 'cached' };
  }
  if (cached) {
    searchCache.delete(key);
  }
  return null;
}

function setCache(key: string, data: WebSearchResponse): void {
  // Limit cache size
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
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
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
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

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: buildPerplexityPrompt(searchType, industry) },
        { role: 'user', content: enhancedQuery }
      ],
      search_recency_filter: recency || 'week',
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Perplexity API error: ${response.status}`);
    (error as any).statusCode = response.status;
    console.error('[WebSearchFallback] Perplexity error:', response.status, errorText);
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
    message: `Tìm thấy ${results.length} kết quả từ Perplexity`,
  };
}

// ============================================
// Fallback: Lovable AI Search
// ============================================

async function searchWithLovableAI(
  query: string,
  searchType: string,
  industry?: string
): Promise<WebSearchResponse> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

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
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Lovable AI error: ${response.status}`);
    (error as any).statusCode = response.status;
    console.error('[WebSearchFallback] Lovable AI error:', response.status, errorText);
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

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
}

export async function enhancedWebSearch(options: WebSearchOptions): Promise<WebSearchResponse> {
  const { query, searchType, industry, recency, skipCache = false, timeoutMs = 15000 } = options;
  const cacheKey = getCacheKey(query, searchType, industry);

  // 1. Check cache first (unless skipped)
  if (!skipCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
  }

  console.log(`[WebSearchFallback] Starting search: ${searchType} "${query}"`);

  // 2. Try Perplexity with retry and circuit breaker
  if (PERPLEXITY_API_KEY) {
    try {
      const result = await perplexityCircuit.execute(() =>
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
      
      // Cache successful result
      setCache(cacheKey, result);
      console.log(`[WebSearchFallback] Perplexity success: ${result.total_results} results`);
      return result;
    } catch (error) {
      console.warn('[WebSearchFallback] Perplexity failed:', error instanceof Error ? error.message : error);
    }
  }

  // 3. Fallback to Lovable AI
  if (LOVABLE_API_KEY) {
    try {
      const result = await lovableAICircuit.execute(() =>
        withTimeout(
          () => withRetry(
            () => searchWithLovableAI(query, searchType, industry),
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
      
      // Cache with shorter TTL for AI fallback
      searchCache.set(cacheKey, { data: result, expires: Date.now() + (CACHE_TTL_MS / 2) });
      console.log(`[WebSearchFallback] Lovable AI fallback success: ${result.total_results} results`);
      return result;
    } catch (error) {
      console.warn('[WebSearchFallback] Lovable AI fallback failed:', error instanceof Error ? error.message : error);
    }
  }

  // 4. Static fallback (never fails)
  console.log('[WebSearchFallback] Using static fallback');
  return getStaticFallback(query, searchType, industry);
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
