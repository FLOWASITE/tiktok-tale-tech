// Social Trend Scraper - Uses Firecrawl to scrape trend aggregator sites
// for TikTok/Facebook/YouTube/Instagram data

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
  tiktok_exolyt: {
    url: 'https://exolyt.com/trending',
    name: 'Exolyt Trending',
    platform: 'tiktok',
    type: 'general',
    scrapeOptions: { waitFor: 2000 }
  },
  ritetag_tiktok: {
    url: 'https://ritetag.com/best-hashtags-for/tiktok',
    name: 'RiteTag TikTok',
    platform: 'tiktok',
    type: 'hashtags'
  },
  
  // Facebook Sources
  socialblade_facebook: {
    url: 'https://socialblade.com/facebook/top/100/likes',
    name: 'SocialBlade Facebook',
    platform: 'facebook',
    type: 'creators'
  },
  facebook_trends_tagembed: {
    url: 'https://tagembed.com/blog/facebook-trends/',
    name: 'Facebook Trends Guide',
    platform: 'facebook',
    type: 'general'
  },
  facebook_trends_hootsuite: {
    url: 'https://blog.hootsuite.com/facebook-trends/',
    name: 'Hootsuite Facebook Trends',
    platform: 'facebook',
    type: 'general'
  },
  
  // YouTube Sources
  socialblade_youtube: {
    url: 'https://socialblade.com/youtube/top/trending',
    name: 'SocialBlade YouTube',
    platform: 'youtube',
    type: 'videos'
  },
  youtube_trending_channels: {
    url: 'https://us.youtubers.me/global/all/top-1000-most-subscribed-youtube-channels',
    name: 'YouTubers.me Top',
    platform: 'youtube',
    type: 'creators'
  },
  
  // Instagram Sources
  socialblade_instagram: {
    url: 'https://socialblade.com/instagram/top/100/followers',
    name: 'SocialBlade Instagram',
    platform: 'instagram',
    type: 'creators'
  },
  instagram_trends_hootsuite: {
    url: 'https://blog.hootsuite.com/instagram-trends/',
    name: 'Hootsuite Instagram Trends',
    platform: 'instagram',
    type: 'general'
  },
  instagram_trends_later: {
    url: 'https://later.com/blog/instagram-trends/',
    name: 'Later Instagram Trends',
    platform: 'instagram',
    type: 'general'
  },
  
  // Multi-platform trend sites
  social_media_today: {
    url: 'https://www.socialmediatoday.com/social-networks/',
    name: 'Social Media Today',
    platform: 'multi',
    type: 'general'
  }
};

// Available platforms
export const AVAILABLE_PLATFORMS = ['tiktok', 'facebook', 'youtube', 'instagram'] as const;

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

function parseViewCount(countStr: string): number {
  const num = parseFloat(countStr.replace(/[,\s]/g, ''));
  if (countStr.toUpperCase().includes('B')) return num * 1_000_000_000;
  if (countStr.toUpperCase().includes('M')) return num * 1_000_000;
  if (countStr.toUpperCase().includes('K')) return num * 1_000;
  return num;
}

// Parser for SocialBlade table format
function parseSocialBladeTable(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  
  console.log(`[Parser:SocialBlade] Processing ${lines.length} lines from ${source}`);
  
  // Pattern 1: Table rows with | separator
  // | Rank | Username | Followers | Growth |
  const tableRowRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/;
  
  // Pattern 2: Lines with rank and username
  // 1 @username 100M followers
  const linePatternRegex = /^#?(\d+)[.\s]+[@]?([\w._-]+)\s+(\d+(?:\.\d+)?[KMB]?)/i;
  
  // Pattern 3: Markdown link with numbers
  // [username](url) 100M followers
  const linkPatternRegex = /\[([^\]]+)\]\([^)]+\)\s*(\d+(?:\.\d+)?[KMB]?)/i;

  const foundCreators = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    let match: RegExpMatchArray | null = null;
    let rank = 0;
    let username = '';
    let metricValue = '';
    
    // Try table row pattern
    match = line.match(tableRowRegex);
    if (match) {
      rank = parseInt(match[1]);
      username = match[2].replace(/[@\[\]]/g, '').trim();
      metricValue = match[3];
    }
    
    // Try line pattern
    if (!username) {
      match = line.match(linePatternRegex);
      if (match) {
        rank = parseInt(match[1]);
        username = match[2];
        metricValue = match[3];
      }
    }
    
    // Try link pattern
    if (!username) {
      match = line.match(linkPatternRegex);
      if (match) {
        username = match[1].replace(/[@]/g, '').trim();
        metricValue = match[2];
        rank = trends.length + 1;
      }
    }
    
    // Skip header rows and invalid entries
    if (!username || username.toLowerCase() === 'username' || username.toLowerCase() === 'name') {
      continue;
    }
    
    const key = username.toLowerCase();
    if (foundCreators.has(key)) continue;
    foundCreators.add(key);
    
    trends.push({
      name: username.startsWith('@') ? username : `@${username}`,
      type: 'creator',
      platform,
      metrics: {
        followers: metricValue ? parseViewCount(metricValue) : undefined,
        rank: rank || undefined
      },
      source,
      scraped_at: new Date().toISOString()
    });
    
    if (trends.length >= 50) break; // Limit to top 50
  }
  
  console.log(`[Parser:SocialBlade] Found ${trends.length} creators`);
  return trends;
}

// Parser for blog/article format
function parseBlogTrends(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  const foundTrends = new Set<string>();
  
  console.log(`[Parser:Blog] Processing ${lines.length} lines from ${source}`);
  
  // Patterns for blog content
  const patterns = [
    // ## 1. Trend Name
    /^#{1,3}\s*\d+[.)]\s*(.+)/,
    // 1. **Trend Name**
    /^\d+[.)]\s*\*\*(.+?)\*\*/,
    // - **Trend Name**
    /^[-*]\s*\*\*(.+?)\*\*/,
    // ## Trend Name (heading without number)
    /^#{2,3}\s+([A-Z][^#\n]{10,60})$/,
    // Bold text: **Trend Name** - description
    /\*\*([^*]{5,50})\*\*\s*[-–:]/
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const trendName = match[1].trim()
          .replace(/\*\*/g, '')
          .replace(/\[|\]/g, '')
          .substring(0, 80);
        
        // Skip generic words
        if (trendName.length < 5 || 
            /^(the|and|for|how|why|what|when|this|that|with|your|more)/i.test(trendName)) {
          continue;
        }
        
        const key = trendName.toLowerCase();
        if (foundTrends.has(key)) continue;
        foundTrends.add(key);
        
        trends.push({
          name: trendName,
          type: 'topic',
          platform,
          description: trimmed.substring(0, 200),
          source,
          scraped_at: new Date().toISOString()
        });
        
        break; // Only match first pattern per line
      }
    }
    
    if (trends.length >= 25) break;
  }
  
  console.log(`[Parser:Blog] Found ${trends.length} trends`);
  return trends;
}

// Enhanced hashtag parser
function parseHashtagsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  const foundHashtags = new Set<string>();
  
  console.log(`[Parser:Hashtags] Processing ${lines.length} lines from ${source}`);
  
  // Multiple patterns to catch hashtags
  const patterns = [
    // #hashtag
    /#([\w\u00C0-\u024F]{3,30})/g,
    // hashtag (5B views)
    /(\w{4,25})\s*\(\s*(\d+(?:\.\d+)?[KMB]?)\s*(?:views?|posts?)\)/gi,
    // "hashtag" - description
    /"([\w\u00C0-\u024F]{4,25})"\s*[-–]/g,
    // 1. hashtag: description
    /\d+[.)]\s*([\w\u00C0-\u024F]{4,25}):/g
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(line)) !== null) {
        const hashtag = match[1].toLowerCase();
        
        // Skip common words
        if (/^(the|and|for|this|that|with|from|have|been)$/i.test(hashtag)) continue;
        if (foundHashtags.has(hashtag)) continue;
        
        foundHashtags.add(hashtag);
        
        // Try to extract view count from context
        const viewMatch = line.match(/(\d+(?:\.\d+)?[KMB]?)\s*(?:views?|lượt xem|posts?)/i);
        
        trends.push({
          name: `#${hashtag}`,
          type: 'hashtag',
          platform,
          metrics: viewMatch ? { views: parseViewCount(viewMatch[1]) } : undefined,
          description: line.substring(0, 200),
          source,
          scraped_at: new Date().toISOString()
        });
        
        if (trends.length >= 30) break;
      }
    }
    if (trends.length >= 30) break;
  }
  
  console.log(`[Parser:Hashtags] Found ${trends.length} hashtags`);
  return trends;
}

// Enhanced creators parser
function parseCreatorsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  const foundCreators = new Set<string>();
  
  console.log(`[Parser:Creators] Processing ${lines.length} lines from ${source}`);
  
  let currentRank = 0;
  
  for (const line of lines) {
    // Check for rank patterns
    const rankMatch = line.match(/^[#]?(\d+)[.\s]/);
    if (rankMatch) {
      currentRank = parseInt(rankMatch[1]);
    }
    
    // Multiple username patterns
    const usernamePatterns = [
      /@([\w._]{2,30})/g,  // @username
      /\[([\w._]{2,30})\]\(/g,  // [username](url)
      /(?:^|\s)([\w._]{3,25})\s+(\d+(?:\.\d+)?[KMB])\s*(?:followers?|subs?)/gi  // username 100M followers
    ];
    
    for (const pattern of usernamePatterns) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(line)) !== null) {
        const username = match[1];
        
        // Skip invalid usernames
        if (username.toLowerCase() === 'username' || username.length < 2) continue;
        
        const key = username.toLowerCase();
        if (foundCreators.has(key)) continue;
        foundCreators.add(key);
        
        // Extract follower count
        const followerMatch = line.match(/(\d+(?:\.\d+)?[KMB]?)\s*(?:followers?|người theo dõi|subs?)/i);
        
        trends.push({
          name: username.startsWith('@') ? username : `@${username}`,
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
        
        if (trends.length >= 50) break;
      }
    }
    if (trends.length >= 50) break;
  }
  
  console.log(`[Parser:Creators] Found ${trends.length} creators`);
  return trends;
}

// General trends parser
function parseGeneralTrendsFromMarkdown(markdown: string, source: string, platform: string): NormalizedTrend[] {
  const trends: NormalizedTrend[] = [];
  const lines = markdown.split('\n');
  const foundTrends = new Set<string>();
  
  console.log(`[Parser:General] Processing ${lines.length} lines from ${source}`);
  
  for (const line of lines) {
    if (line.trim().length < 10) continue;
    
    const isListItem = /^[-*•]\s+/.test(line);
    const isHeading = /^#{1,3}\s+/.test(line);
    const isNumbered = /^\d+[.)]\s+/.test(line);
    const hasNumbers = /\d+[KMB]?\s*(views?|followers?|likes?)/i.test(line);
    
    if ((isListItem || isHeading || isNumbered || hasNumbers) && line.length > 15 && line.length < 300) {
      const cleanedText = line
        .replace(/^[-*•#\s\d.)+]+/, '')
        .replace(/\*\*/g, '')
        .trim();
      
      if (cleanedText.length > 10 && cleanedText.length < 100) {
        const key = cleanedText.toLowerCase().substring(0, 50);
        if (foundTrends.has(key)) continue;
        foundTrends.add(key);
        
        trends.push({
          name: cleanedText.substring(0, 80),
          type: 'topic',
          platform,
          description: cleanedText,
          source,
          scraped_at: new Date().toISOString()
        });
      }
    }
    
    if (trends.length >= 20) break;
  }
  
  console.log(`[Parser:General] Found ${trends.length} trends`);
  return trends.slice(0, 20);
}

// Intelligent parser selection with fallback
function parseTrendsWithFallback(
  markdown: string, 
  source: TrendSource
): NormalizedTrend[] {
  const { name, platform, type } = source;
  let trends: NormalizedTrend[] = [];
  
  // Log sample content for debugging
  console.log(`[Parser] Content sample (first 500 chars): ${markdown.substring(0, 500)}`);
  
  // Detect if it's a SocialBlade table
  const isSocialBladeFormat = markdown.includes('| Rank') || 
                              markdown.includes('|---|') ||
                              source.name.includes('SocialBlade');
  
  // Try specialized parser first
  if (isSocialBladeFormat && type === 'creators') {
    console.log(`[Parser] Using SocialBlade table parser for ${name}`);
    trends = parseSocialBladeTable(markdown, name, platform);
  } else if (type === 'hashtags') {
    console.log(`[Parser] Using hashtag parser for ${name}`);
    trends = parseHashtagsFromMarkdown(markdown, name, platform);
  } else if (type === 'creators') {
    console.log(`[Parser] Using creators parser for ${name}`);
    trends = parseCreatorsFromMarkdown(markdown, name, platform);
  }
  
  // Fallback to blog parser if no results
  if (trends.length === 0) {
    console.log(`[Parser] Primary parser found 0 results, trying blog parser for ${name}`);
    trends = parseBlogTrends(markdown, name, platform);
  }
  
  // Final fallback to general parser
  if (trends.length === 0) {
    console.log(`[Parser] Blog parser found 0 results, trying general parser for ${name}`);
    trends = parseGeneralTrendsFromMarkdown(markdown, name, platform);
  }
  
  console.log(`[Parser] Final result: ${trends.length} trends from ${name}`);
  return trends;
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
  
  console.log(`[SocialTrendScraper] Starting scrape: ${source.name} (${source.platform}/${source.type})`);
  
  const scrapeResult = await callFirecrawl(source.url, source.scrapeOptions);
  
  if (!scrapeResult.success || !scrapeResult.markdown) {
    console.error(`[SocialTrendScraper] Scrape failed for ${source.name}: ${scrapeResult.error}`);
    return {
      success: false,
      source: source.name,
      platform: source.platform,
      trends: [],
      error: scrapeResult.error,
      scraped_at: new Date().toISOString()
    };
  }
  
  // Use intelligent parser with fallback
  const trends = parseTrendsWithFallback(scrapeResult.markdown, source);
  
  console.log(`[SocialTrendScraper] Completed ${source.name}: ${trends.length} trends`);
  
  return {
    success: true,
    source: source.name,
    platform: source.platform,
    trends,
    raw_content: scrapeResult.markdown.substring(0, 5000),
    scraped_at: new Date().toISOString()
  };
}

export async function scrapeMultipleSources(
  sourceKeys: string[],
  options?: { parallel?: boolean; maxConcurrent?: number }
): Promise<ScrapedTrendResult[]> {
  const { parallel = true, maxConcurrent = 2 } = options || {};
  
  if (!parallel) {
    const results: ScrapedTrendResult[] = [];
    for (const key of sourceKeys) {
      const result = await scrapeTrendSource(key);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
  }
  
  const results: ScrapedTrendResult[] = [];
  
  for (let i = 0; i < sourceKeys.length; i += maxConcurrent) {
    const batch = sourceKeys.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(key => scrapeTrendSource(key)));
    results.push(...batchResults);
    
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
  
  console.log(`[SocialTrendScraper] Found ${platformSources.length} sources for ${platform}: ${platformSources.join(', ')}`);
  
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
    if (result.success && result.trends.length > 0) {
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
  
  console.log(`[SocialTrendScraper] Merged ${allTrends.length} unique trends from ${sources.length} sources for ${platform}`);
  
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
  maxAgeMinutes: number = 240
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
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    
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
  
  // Cache results if we got any
  if (results.trends.length > 0) {
    await cacheTrends(platform, results);
  }
  
  return results;
}

export function getAvailableSources(): string[] {
  return Object.keys(TREND_SOURCES);
}
