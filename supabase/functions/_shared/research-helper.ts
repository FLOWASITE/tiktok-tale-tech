// ============================================
// RESEARCH HELPER FOR CORE CONTENT GENERATION
// Auto-fetch web data before content generation
// ============================================

import { enhancedWebSearch, WebSearchResponse } from './data-fetchers/web-search-fallback.ts';

// ============================================
// TYPES
// ============================================

export interface ResearchResult {
  success: boolean;
  facts: ResearchFact[];
  sources: ResearchSource[];
  query: string;
  searchType: string;
  latencyMs: number;
  error?: string;
}

export interface ResearchFact {
  content: string;
  source?: string;
  relevanceScore?: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  domain?: string;
}

export type ResearchRecency = 'day' | 'week' | 'month' | 'year';

export interface ResearchOptions {
  topic: string;
  industry?: string[];
  recency?: ResearchRecency;
  maxFacts?: number;
  locale?: string;
  organizationId?: string;
}

// ============================================
// RESEARCH QUERY BUILDER
// ============================================

function buildResearchQuery(topic: string, industry?: string[]): string {
  // Start with the core topic
  let query = topic;
  
  // Add industry context if available
  if (industry?.length) {
    query = `${topic} ${industry.slice(0, 2).join(' ')}`;
  }
  
  // Add Vietnam context and recency markers
  // Note: The actual recency filtering is done by the search API
  if (!query.toLowerCase().includes('việt nam') && !query.toLowerCase().includes('vietnam')) {
    query += ' Việt Nam';
  }
  
  // Add current year for freshness
  const currentYear = new Date().getFullYear();
  if (!query.includes(String(currentYear)) && !query.includes(String(currentYear - 1))) {
    query += ` ${currentYear}`;
  }
  
  return query.trim();
}

// ============================================
// FACT EXTRACTION
// ============================================

function extractFactsFromSearchResults(
  response: WebSearchResponse,
  maxFacts: number = 10
): ResearchFact[] {
  const facts: ResearchFact[] = [];
  
  if (!response.success || !response.results?.length) {
    return facts;
  }
  
  for (const result of response.results) {
    if (facts.length >= maxFacts) break;
    
    // Extract from snippet
    if (result.snippet) {
      // Split snippet into sentences
      const sentences = result.snippet
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 300);
      
      for (const sentence of sentences) {
        if (facts.length >= maxFacts) break;
        
        // Skip if it's too generic or promotional
        if (isLowQualityFact(sentence)) continue;
        
        // Use source field from result (WebSearchResult type)
        facts.push({
          content: sentence + '.',
          source: result.source || result.title,
          relevanceScore: result.relevance === 'high' ? 0.9 : result.relevance === 'medium' ? 0.7 : 0.5,
        });
      }
    }
  }
  
  // Deduplicate similar facts
  return deduplicateFacts(facts);
}

function extractFactsFromContent(content: string, maxFacts: number): ResearchFact[] {
  const facts: ResearchFact[] = [];
  
  // Look for sentences with statistics or data
  const statPatterns = [
    /\d+%/,           // Percentages
    /\d+\s*(triệu|tỷ|nghìn|million|billion)/i, // Large numbers
    /tăng|giảm|đạt|vượt/i, // Growth indicators
    /theo\s+.+?\s+/i,  // Citations
    /năm\s+\d{4}/i,    // Year references
  ];
  
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 250);
  
  for (const sentence of sentences) {
    if (facts.length >= maxFacts) break;
    
    // Check if sentence contains statistical data
    const hasStats = statPatterns.some(pattern => pattern.test(sentence));
    if (hasStats && !isLowQualityFact(sentence)) {
      facts.push({
        content: sentence + '.',
        relevanceScore: 0.8,
      });
    }
  }
  
  return facts;
}

function isLowQualityFact(text: string): boolean {
  const lowQualityPatterns = [
    /click|nhấp|đọc thêm|xem thêm|tìm hiểu/i,
    /liên hệ|hotline|zalo|facebook/i,
    /miễn phí|khuyến mãi|giảm giá|sale/i,
    /đăng ký|đăng nhập|tạo tài khoản/i,
    /cookie|privacy|điều khoản/i,
  ];
  
  return lowQualityPatterns.some(pattern => pattern.test(text));
}

function deduplicateFacts(facts: ResearchFact[]): ResearchFact[] {
  const seen = new Set<string>();
  const result: ResearchFact[] = [];
  
  for (const fact of facts) {
    // Create a normalized key for comparison
    const key = fact.content
      .toLowerCase()
      .replace(/\d+/g, 'N') // Normalize numbers
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check for very similar facts (Jaccard similarity approximation)
    let isDuplicate = false;
    for (const seenKey of seen) {
      if (calculateSimilarity(key, seenKey) > 0.7) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seen.add(key);
      result.push(fact);
    }
  }
  
  return result;
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

// ============================================
// SOURCE EXTRACTION
// ============================================

function extractSources(response: WebSearchResponse): ResearchSource[] {
  // Use citations from response as sources
  if (!response.success) {
    return [];
  }
  
  const sources: ResearchSource[] = [];
  
  // Extract from citations if available
  if (response.citations?.length) {
    for (const citation of response.citations.slice(0, 5)) {
      // Citation is usually a URL
      sources.push({
        title: citation,
        url: citation,
        domain: extractDomain(citation),
      });
    }
  }
  
  // Fallback to result titles/sources
  if (sources.length === 0 && response.results?.length) {
    for (const result of response.results.slice(0, 5)) {
      if (result.source || result.title) {
        sources.push({
          title: result.title || result.source || 'Unknown',
          url: result.source || '',
          domain: result.source ? extractDomain(result.source) : undefined,
        });
      }
    }
  }
  
  return sources;
}

function extractDomain(urlOrText: string): string | undefined {
  try {
    if (urlOrText.startsWith('http')) {
      const url = new URL(urlOrText);
      return url.hostname.replace('www.', '');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ============================================
// MAIN RESEARCH FUNCTION
// ============================================

export async function performResearch(options: ResearchOptions): Promise<ResearchResult> {
  const {
    topic,
    industry,
    recency = 'month',
    maxFacts = 8,
    locale = 'vi',
    organizationId,
  } = options;
  
  const startTime = Date.now();
  const query = buildResearchQuery(topic, industry);
  
  console.log(`[Research] Starting research for: "${query.slice(0, 50)}..."`);
  
  try {
    // Perform web search
    const searchResponse = await enhancedWebSearch({
      query,
      searchType: 'research',
      industry: industry?.[0],
      recency,
      maxResults: 10,
      timeoutMs: 12000,
      organizationId,
    });
    
    if (!searchResponse.success) {
      console.warn(`[Research] Search failed: ${searchResponse.error || 'Unknown error'}`);
      return {
        success: false,
        facts: [],
        sources: [],
        query,
        searchType: 'research',
        latencyMs: Date.now() - startTime,
        error: searchResponse.error || 'Web search failed',
      };
    }
    
    // Extract facts and sources
    const facts = extractFactsFromSearchResults(searchResponse, maxFacts);
    const sources = extractSources(searchResponse);
    
    console.log(`[Research] Found ${facts.length} facts from ${sources.length} sources`);
    
    return {
      success: true,
      facts,
      sources,
      query,
      searchType: 'research',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`[Research] Error:`, error);
    return {
      success: false,
      facts: [],
      sources: [],
      query,
      searchType: 'research',
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// CONTEXT BUILDER FOR PROMPTS
// ============================================

export function buildResearchContext(research: ResearchResult): string {
  if (!research.success || !research.facts.length) {
    return '';
  }
  
  let context = `\n## DỮ LIỆU NGHIÊN CỨU TỪ NGUỒN UY TÍN\n`;
  context += `(Dữ liệu thu thập tự động từ internet)\n\n`;
  
  // Add facts as bullet points
  context += `### Facts & Insights:\n`;
  for (const fact of research.facts) {
    context += `- ${fact.content}`;
    if (fact.source) {
      context += ` _(Nguồn: ${fact.source})_`;
    }
    context += '\n';
  }
  
  // Add source references
  if (research.sources.length > 0) {
    context += `\n### Nguồn tham khảo:\n`;
    for (let i = 0; i < Math.min(research.sources.length, 5); i++) {
      const source = research.sources[i];
      context += `${i + 1}. ${source.title} (${source.domain || 'web'})\n`;
    }
  }
  
  // Add usage instructions
  context += `\n**Lưu ý cho AI:**\n`;
  context += `- Sử dụng dữ liệu trên để tăng tính thực tế và độ tin cậy\n`;
  context += `- Cite nguồn khi trích dẫn số liệu cụ thể\n`;
  context += `- Có thể paraphrase nhưng giữ nguyên ý nghĩa\n`;
  
  return context;
}
