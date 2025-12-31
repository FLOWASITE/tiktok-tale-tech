// Social Trend Scraper - Uses Firecrawl to scrape trend aggregator sites
// for TikTok/Facebook/YouTube data indirectly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ============================================================================
// Types
// ============================================================================

export interface TrendSource {
  url: string;
  name: string;
  platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram' | 'multi';
  type: 'hashtags' | 'creators' | 'sounds' | 'videos' | 'general';
  scrapeOptions?: {
    waitFor?: number;
    onlyMainContent?: boolean;
  };
}

export interface NormalizedTrend {
  name: string;
  type: 'hashtag' | 'sound' | 'creator' | 'video' | 'topic';
  platform: string;
  metrics?: {
    views?: number;
    followers?: number;
    growth_rate?: string;
    engagement?: string;
    rank?: number;
  };
  description?: string;
  url?: string;
  source: string;
  scraped_at: string;
}

export interface ScrapedTrendResult {
  success: boolean;
  source: string;
  platform: string;
  trends: NormalizedTrend[];
  raw_content?: string;
  error?: string;
  scraped_at: string;
}

export interface MergedTrendResults {
  platform: string;
  trends: NormalizedTrend[];
  sources: string[];
  total_count: number;
  scraped_at: string;
}

// ============================================================================
// Trend Sources Configuration
// ============================================================================

export const TREND_SOURCES: Record<string, TrendSource> = {
  // TikTok Sources
  tiktok_creative_center: {
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
    name: 'TikTok Creative Center',
    platform: 'tiktok',
    type: 'hashtags',
    scrapeOptions: { waitFor: 3000 }
  },
  socialblade_tiktok: {
    url: 'https://socialblade.com/tiktok/top/100/followers',
    name: 'SocialBlade TikTok',
    platform: 'tiktok',
    type: 'creators'
  },
  
  // YouTube Sources
  socialblade_youtube: {
    url: 'https://socialblade.com/youtube/top/trending',
    name: 'SocialBlade YouTube',
    platform: 'youtube',
    type: 'videos'
  },
  
  // Multi-platform trend sites
  social_media_today: {
    url: 'https://www.socialmediatoday.com/social-networks/',
    name: 'Social Media Today',
    platform: 'multi',
    type: 'general'
  }
};

// ============================================================================
// Firecrawl Client
// ============================================================================

async function callFirecrawl(
  url: string, 
  options?: { waitFor?: number; onlyMainContent?: boolean }
): Promise<{ success: boolean; markdown?: string; links?: string[]; error?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  
  if (!apiKey) {
    console.error('[SocialTrendScraper] FIRECRAWL_API_KEY not configured');
    return { success: false, error: 'Firecrawl API key not configured' };
  }
  
  try {
    console.log(`[SocialTrendScraper] Scraping: ${url}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor ?? 2000,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[SocialTrendScraper] Firecrawl error:`, data);
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    
    // Handle nested data structure
    const markdown = data.data?.markdown || data.markdown;
    const links = data.data?.links || data.links;
    
    console.log(`[SocialTrendScraper] Scraped ${url} - ${markdown?.length || 0} chars`);
    
    return { success: true, markdown, links };
  } catch (error) {
    console.error(`[SocialTrendScraper] Error scraping ${url}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Trend Parsers
// ============================================================================

function parseHashtagsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  
  // Look for hashtag patterns like #skincare, #trending
  const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
  const foundHashtags = new Set<string>();
  
  for (const line of lines) {
    const matches = line.match(hashtagRegex);
    if (matches) {
      for (const hashtag of matches) {
        if (!foundHashtags.has(hashtag.toLowerCase())) {
          foundHashtags.add(hashtag.toLowerCase());
          
          // Try to extract view counts from context
          const viewMatch = line.match(/(\d+(?:\.\d+)?[KMB]?)\s*(?:views?|lượt xem)/i);
          
          trends.push({
            name: hashtag,
            type: 'hashtag',
            platform,
            metrics: viewMatch ? { views: parseViewCount(viewMatch[1]) } : undefined,
            description: line.substring(0, 200),
            source,
            scraped_at: new Date().toISOString()
          });
        }
      }
    }
  }
  
  return trends;
}

function parseCreatorsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  
  // Look for patterns like "@username" or "username - followers"
  const usernameRegex = /@[\w._]+/g;
  const foundCreators = new Set<string>();
  
  let currentRank = 0;
  
  for (const line of lines) {
    // Check for rank patterns (1., 2., #1, #2)
    const rankMatch = line.match(/^[#]?(\d+)[.\s]/);
    if (rankMatch) {
      currentRank = parseInt(rankMatch[1]);
    }
    
    const matches = line.match(usernameRegex);
    if (matches) {
      for (const username of matches) {
        if (!foundCreators.has(username.toLowerCase())) {
          foundCreators.add(username.toLowerCase());
          
          // Try to extract follower counts
          const followerMatch = line.match(/(\d+(?:\.\d+)?[KMB]?)\s*(?:followers?|người theo dõi)/i);
          
          trends.push({
            name: username,
            type: 'creator',
            platform,
            metrics: {
              followers: followerMatch ? parseViewCount(followerMatch[1]) : undefined,
              rank: currentRank || undefined
            },
            description: line.substring(0, 200),
            source,
            scraped_at: new Date().toISOString()
          });
        }
      }
    }
  }
  
  return trends;
}

function parseGeneralTrendsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  
  // Look for trend-like headings and list items
  for (const line of lines) {
    // Skip empty or very short lines
    if (line.trim().length < 10) continue;
    
    // Look for list items or headings that might be trends
    const isListItem = /^[-*•]\s+/.test(line);
    const isHeading = /^#{1,3}\s+/.test(line);
    const hasNumbers = /\d+[KMB]?\s*(views?|followers?|likes?)/i.test(line);
    
    if ((isListItem || isHeading || hasNumbers) && line.length > 15 && line.length < 300) {
      const cleanedText = line.replace(/^[-*•#\s]+/, '').trim();
      
      if (cleanedText.length > 10) {
        trends.push({
          name: cleanedText.substring(0, 100),
          type: 'topic',
          platform,
          description: cleanedText,
          source,
          scraped_at: new Date().toISOString()
        });
      }
    }
  }
  
  // Limit to top trends to avoid noise
  return trends.slice(0, 20);
}

function parseViewCount(countStr: string): number {
  const num = parseFloat(countStr.replace(/[,\s]/g, ''));
  if (countStr.toUpperCase().includes('B')) return num * 1_000_000_000;
  if (countStr.toUpperCase().includes('M')) return num * 1_000_000;
  if (countStr.toUpperCase().includes('K')) return num * 1_000;
  return num;
}

// ============================================================================
// Main Scraping Functions
// ============================================================================

export async function scrapeTrendSource(sourceKey: string): Promise<ScrapedTrendResult> {
  const source = TREND_SOURCES[sourceKey];
  
  if (!source) {
    return {
      success: false,
      source: sourceKey,
      platform: 'unknown',
      trends: [],
      error: `Unknown source: ${sourceKey}`,
      scraped_at: new Date().toISOString()
    };
  }
  
  const scrapeResult = await callFirecrawl(source.url, source.scrapeOptions);
  
  if (!scrapeResult.success || !scrapeResult.markdown) {
    return {
      success: false,
      source: source.name,
      platform: source.platform,
      trends: [],
      error: scrapeResult.error,
      scraped_at: new Date().toISOString()
    };
  }
  
  // Parse based on source type
  let trends: NormalizedTrend[];
  
  switch (source.type) {
    case 'hashtags':
      trends = parseHashtagsFromMarkdown(scrapeResult.markdown, source.name, source.platform);
      break;
    case 'creators':
      trends = parseCreatorsFromMarkdown(scrapeResult.markdown, source.name, source.platform);
      break;
    default:
      trends = parseGeneralTrendsFromMarkdown(scrapeResult.markdown, source.name, source.platform);
  }
  
  console.log(`[SocialTrendScraper] Parsed ${trends.length} trends from ${source.name}`);
  
  return {
    success: true,
    source: source.name,
    platform: source.platform,
    trends,
    raw_content: scrapeResult.markdown.substring(0, 5000), // Keep first 5KB for reference
    scraped_at: new Date().toISOString()
  };
}

export async function scrapeMultipleSources(
  sourceKeys: string[],
  options?: { parallel?: boolean; maxConcurrent?: number }
): Promise<ScrapedTrendResult[]> {
  const { parallel = true, maxConcurrent = 2 } = options || {};
  
  if (!parallel) {
    // Sequential scraping
    const results: ScrapedTrendResult[] = [];
    for (const key of sourceKeys) {
      const result = await scrapeTrendSource(key);
      results.push(result);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
  }
  
  // Parallel with concurrency limit
  const results: ScrapedTrendResult[] = [];
  
  for (let i = 0; i < sourceKeys.length; i += maxConcurrent) {
    const batch = sourceKeys.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(key => scrapeTrendSource(key)));
    results.push(...batchResults);
    
    // Delay between batches
    if (i + maxConcurrent < sourceKeys.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

export async function scrapeTrendsForPlatform(
  platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram'
): Promise<MergedTrendResults> {
  // Find all sources for this platform
  const platformSources = Object.entries(TREND_SOURCES)
    .filter(([_, source]) => source.platform === platform || source.platform === 'multi')
    .map(([key]) => key);
  
  if (platformSources.length === 0) {
    return {
      platform,
      trends: [],
      sources: [],
      total_count: 0,
      scraped_at: new Date().toISOString()
    };
  }
  
  const results = await scrapeMultipleSources(platformSources);
  
  // Merge and deduplicate trends
  const allTrends: NormalizedTrend[] = [];
  const sources: string[] = [];
  const seenNames = new Set<string>();
  
  for (const result of results) {
    if (result.success) {
      sources.push(result.source);
      
      for (const trend of result.trends) {
        const key = `${trend.type}:${trend.name.toLowerCase()}`;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          allTrends.push(trend);
        }
      }
    }
  }
  
  return {
    platform,
    trends: allTrends,
    sources,
    total_count: allTrends.length,
    scraped_at: new Date().toISOString()
  };
}

// ============================================================================
// Cache Integration
// ============================================================================

export async function getCachedTrends(
  platform: string,
  maxAgeMinutes: number = 240 // 4 hours default
): Promise<MergedTrendResults | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) return null;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const cacheKey = `social_trends:${platform}`;
    
    const { data, error } = await supabase
      .from('web_search_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    // Update hit count
    await supabase
      .from('web_search_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('id', data.id);
    
    console.log(`[SocialTrendScraper] Cache hit for ${platform}`);
    
    return data.results as MergedTrendResults;
  } catch (error) {
    console.error('[SocialTrendScraper] Cache lookup error:', error);
    return null;
  }
}

export async function cacheTrends(platform: string, results: MergedTrendResults): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const cacheKey = `social_trends:${platform}`;
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
    
    await supabase
      .from('web_search_cache')
      .upsert({
        cache_key: cacheKey,
        query: `Social trends for ${platform}`,
        search_type: 'social_trends',
        results,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, { onConflict: 'cache_key' });
    
    console.log(`[SocialTrendScraper] Cached trends for ${platform}`);
  } catch (error) {
    console.error('[SocialTrendScraper] Cache write error:', error);
  }
}

// ============================================================================
// High-level API
// ============================================================================

export async function getSocialTrends(
  platform: 'tiktok' | 'facebook' | 'youtube' | 'instagram',
  options?: { forceRefresh?: boolean; industry?: string }
): Promise<MergedTrendResults> {
  const { forceRefresh = false } = options || {};
  
  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedTrends(platform);
    if (cached) return cached;
  }
  
  // Scrape fresh data
  const results = await scrapeTrendsForPlatform(platform);
  
  // Cache results
  if (results.trends.length > 0) {
    await cacheTrends(platform, results);
  }
  
  return results;
}

// Export available platforms and sources
export const AVAILABLE_PLATFORMS = ['tiktok', 'youtube'] as const;
export const getAvailableSources = () => Object.keys(TREND_SOURCES);
