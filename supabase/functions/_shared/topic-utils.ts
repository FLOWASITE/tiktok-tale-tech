/**
 * Topic Discovery Shared Utilities
 * Extracted common utilities for topic-related edge functions
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

// Initialize gte-small embedding model (384 dimensions) for semantic matching
let embeddingModel: any = null;
function getEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = new Supabase.ai.Session('gte-small');
  }
  return embeddingModel;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Simple hash function for cache key generation
 * Phase 4: Used to create context-aware cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Generate a hash from brand context data for cache invalidation
 * Cache will be invalidated when personas, products, or mappings change
 */
export function hashContextData(brandContext: TopicBrandContext | null): string {
  if (!brandContext) return 'no-context';
  
  const personasCount = brandContext.personas?.length || 0;
  const productsCount = brandContext.products?.length || 0;
  const pillarsCount = brandContext.contentPillars?.length || 0;
  
  // Include first persona and product names for more granular invalidation
  const firstPersonaName = brandContext.personas?.[0]?.name || '';
  const firstProductName = brandContext.products?.[0]?.name || '';
  
  const contextString = `${personasCount}-${productsCount}-${pillarsCount}-${firstPersonaName}-${firstProductName}`;
  return simpleHash(contextString);
}

// ========== TYPES ==========

export interface IndustryContext {
  targetAudience?: string;
  forbiddenTerms?: string[];
  complianceRules?: { rule: string; description: string }[];
  brandVoice?: { tone?: string[]; formality?: string; language_style?: string[] };
  claimRestrictions?: string[];
}

export interface TopicBrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  industry?: string[];
  contentPillars?: ContentPillar[];
  uniqueValueProposition?: string;
  targetAgeRange?: string;
  targetGender?: string;
  evergreenThemes?: string[];
  brandHashtags?: string[];
  mainCompetitors?: string[];
  industryTemplateId?: string;
  // Extended context strings
  personasContext: string;
  productsContext: string;
  productPersonaMappingContext: string;
  // Raw data for ID lookup
  personas?: PersonaData[];
  products?: ProductData[];
  industryContext?: IndustryContext;
}

export interface ContentPillar {
  name: string;
  weight?: number;
  keywords?: string[];
  color?: string;
}

export interface PersonaData {
  id: string;
  name: string;
  occupation?: string;
  age_range?: string;
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
  buying_triggers?: string[];
  preferred_channels?: string[];
  typical_funnel_stage?: string;
  is_primary?: boolean;
  device_usage?: string;
  tech_savviness?: string;
  buying_motivation?: string[];
  communication_style?: string;
  journey_map?: { stage: string; content_type: string }[];
  priority_score?: number;
  content_preferences?: Record<string, any>;
}

export interface ProductData {
  id: string;
  name: string;
  category?: string;
  description?: string;
  unique_selling_points?: string[];
  pain_points_solved?: string[];
  suggested_content_angles?: string[];
  is_featured?: boolean;
}

export interface ProductPersonaMapping {
  product_id: string;
  persona_id: string;
  relevance_score?: number;
  is_primary_product?: boolean;
  custom_pitch?: string;
  key_benefits?: string[];
  objection_handlers?: string[];
  preferred_content_angles?: string[];
  avoid_topics?: string[];
}

export interface TopicHistoryItem {
  topic: string;
  category?: string;
  pillar?: string;
  content_goal?: string;
  was_used?: boolean;
  feedback?: 'positive' | 'negative' | 'neutral';
  performance_score?: number;
  created_at?: string;
}

export interface IndustryInsight {
  insights: string[];
  statistics: string[];
  caseStudies: string[];
  citations: string[];
}

export interface AudienceQAResult {
  questions: string[];
  sources: string[];
  categories: string[];
}

export interface PerplexityTrendResult {
  trends: string[];
  citations: string[];
}

// ========== PERPLEXITY WEB SEARCH ==========

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

// Threshold for learning context richness - if above this, skip web search
const LEARNING_CONTEXT_THRESHOLD = 20;
// Cache window in hours - if cache was hit recently, skip web search
const RECENT_CACHE_WINDOW_HOURS = 4;

/**
 * Determine if web search should be skipped based on:
 * 1. Learning context richness (> 20 feedback points)
 * 2. Recent cache hit (< 4 hours)
 * 3. Explicit skipWebSearch flag
 * 4. No Perplexity API key configured
 */
export interface WebSearchDecision {
  shouldSkipIndustrySearch: boolean;
  shouldSkipAudienceQA: boolean;
  reason: string;
}

export function shouldSkipWebSearch(options: {
  skipWebSearch?: boolean;
  learningContextSize?: number;
  cacheHitTimestamp?: number;
  forceRefresh?: boolean;
  hasIndustry?: boolean;
}): WebSearchDecision {
  const { skipWebSearch, learningContextSize = 0, cacheHitTimestamp, forceRefresh, hasIndustry } = options;
  
  // If no industry, always skip
  if (!hasIndustry) {
    return {
      shouldSkipIndustrySearch: true,
      shouldSkipAudienceQA: true,
      reason: 'no_industry',
    };
  }

  // If no Perplexity API key, skip
  if (!PERPLEXITY_API_KEY) {
    return {
      shouldSkipIndustrySearch: true,
      shouldSkipAudienceQA: true,
      reason: 'no_api_key',
    };
  }

  // Force refresh overrides all skip conditions
  if (forceRefresh) {
    return {
      shouldSkipIndustrySearch: false,
      shouldSkipAudienceQA: false,
      reason: 'force_refresh',
    };
  }

  // Explicit skip flag
  if (skipWebSearch) {
    return {
      shouldSkipIndustrySearch: true,
      shouldSkipAudienceQA: true,
      reason: 'explicit_skip',
    };
  }

  // Check learning context richness
  if (learningContextSize >= LEARNING_CONTEXT_THRESHOLD) {
    console.log(`[topic-utils] Rich learning context (${learningContextSize} points), skipping web search`);
    return {
      shouldSkipIndustrySearch: true,
      shouldSkipAudienceQA: true,
      reason: 'rich_learning_context',
    };
  }

  // Check recent cache hit
  if (cacheHitTimestamp) {
    const hoursSinceCacheHit = (Date.now() - cacheHitTimestamp) / (1000 * 60 * 60);
    if (hoursSinceCacheHit < RECENT_CACHE_WINDOW_HOURS) {
      console.log(`[topic-utils] Recent cache hit (${hoursSinceCacheHit.toFixed(1)}h ago), skipping web search`);
      return {
        shouldSkipIndustrySearch: true,
        shouldSkipAudienceQA: true,
        reason: 'recent_cache',
      };
    }
  }

  // Default: perform web search
  return {
    shouldSkipIndustrySearch: false,
    shouldSkipAudienceQA: false,
    reason: 'default',
  };
}

/**
 * Search for industry data using Perplexity API
 */
export async function searchIndustryData(
  industry: string, 
  brandName: string
): Promise<IndustryInsight | null> {
  if (!PERPLEXITY_API_KEY) {
    console.log('[Perplexity] API not configured, skipping industry data search');
    return null;
  }

  try {
    const currentYear = new Date().getFullYear();
    const searchQuery = `${industry} Việt Nam ${currentYear}: thống kê ngành mới nhất, case studies thành công, insights marketing, báo cáo thị trường, xu hướng tiêu dùng, số liệu doanh thu, thị phần. Tập trung vào dữ liệu thực tế và số liệu cụ thể.`;

    console.log('[Perplexity] Industry search:', searchQuery.substring(0, 80));

    // 5-second timeout to prevent blocking the entire flow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `Bạn là chuyên gia phân tích ngành tại Việt Nam. Trả về dữ liệu theo format JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "statistics": ["thống kê với con số cụ thể 1", "thống kê 2", ...],
  "caseStudies": ["case study brand A: ...", "case study B: ...", ...]
}
Chỉ đưa thông tin thực tế, có nguồn đáng tin cậy. Mỗi mục 3-5 items.` 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'month',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] API error:', response.status, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('[Perplexity] Industry data received, citations:', citations.length);

    // Parse JSON from response
    const result: IndustryInsight = {
      insights: [],
      statistics: [],
      caseStudies: [],
      citations
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.insights = parsed.insights || [];
        result.statistics = parsed.statistics || [];
        result.caseStudies = parsed.caseStudies || [];
      } else {
        // Fallback: extract lines as insights
        const lines = content.split('\n').filter((line: string) => line.trim() && line.length > 20);
        result.insights = lines.slice(0, 5);
      }
    } catch (parseError) {
      console.error('[Perplexity] Failed to parse response:', parseError);
      const lines = content.split('\n').filter((line: string) => line.trim() && line.length > 20);
      result.insights = lines.slice(0, 5);
    }

    return result;
  } catch (error) {
    console.error('[Perplexity] Search error:', error);
    return null;
  }
}

/**
 * Search for audience questions using Perplexity API
 */
export async function searchAudienceQuestions(
  industry: string, 
  targetAudience?: string
): Promise<AudienceQAResult | null> {
  if (!PERPLEXITY_API_KEY) {
    console.log('[Perplexity] API not configured, skipping audience Q&A mining');
    return null;
  }

  try {
    const audienceContext = targetAudience || 'khách hàng';
    const searchQuery = `Câu hỏi phổ biến nhất của ${audienceContext} về ${industry} Việt Nam. Những thắc mắc, vấn đề, khó khăn thường gặp khi tìm hiểu hoặc sử dụng dịch vụ/sản phẩm ${industry}. Bao gồm: câu hỏi từ forums, cộng đồng, People Also Ask, FAQ thường gặp.`;

    console.log('[Perplexity] Q&A mining:', searchQuery.substring(0, 80));

    // 5-second timeout to prevent blocking the entire flow
    const qaController = new AbortController();
    const qaTimeoutId = setTimeout(() => qaController.abort(), 5000);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `Bạn là chuyên gia nghiên cứu khách hàng. Liệt kê các câu hỏi THỰC SỰ mà khách hàng đang hỏi trên internet (forums, cộng đồng, Google, Facebook groups). Trả về dạng JSON:
{
  "questions": ["Câu hỏi 1?", "Câu hỏi 2?", ...],
  "sources": ["forum/community name 1", "source 2", ...],
  "categories": ["category 1", "category 2", ...]
}
Tập trung vào 8-12 câu hỏi phổ biến nhất, thực tế và có thể tạo content trả lời.` 
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'month',
      }),
      signal: qaController.signal,
    });

    clearTimeout(qaTimeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] Q&A API error:', response.status, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('[Perplexity] Q&A received, citations:', citations.length);

    // Parse JSON from response
    const result: AudienceQAResult = {
      questions: [],
      sources: citations.length > 0 ? citations.slice(0, 5) : [],
      categories: []
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.questions = parsed.questions || [];
        result.sources = parsed.sources || citations.slice(0, 5);
        result.categories = parsed.categories || [];
      } else {
        // Fallback: extract lines as questions
        const lines = content.split('\n').filter((line: string) => line.trim() && line.includes('?'));
        result.questions = lines.slice(0, 10).map((q: string) => q.replace(/^[\d\.\-\*]+\s*/, '').trim());
      }
    } catch (parseError) {
      console.error('[Perplexity] Failed to parse Q&A response:', parseError);
      const lines = content.split('\n').filter((line: string) => line.trim() && line.includes('?'));
      result.questions = lines.slice(0, 10).map((q: string) => q.replace(/^[\d\.\-\*]+\s*/, '').trim());
    }

    console.log('[Perplexity] Extracted', result.questions.length, 'audience questions');
    return result;
  } catch (error) {
    console.error('[Perplexity] Audience Q&A mining error:', error);
    return null;
  }
}

/**
 * Search for trending topics using Perplexity API
 */
export async function searchTrendingTopics(
  industry: string, 
  brandName: string
): Promise<PerplexityTrendResult | null> {
  if (!PERPLEXITY_API_KEY) {
    console.log('[Perplexity] API not configured, skipping trending search');
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

    console.log('[Perplexity] Trending search:', searchQuery.substring(0, 150));
    const startTime = Date.now();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
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

    // Extract trends from response
    const lines = content.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => {
        if (!line || line.startsWith('#') || line.startsWith('##')) return false;
        return /^[\d\.\-\*\•]/.test(line) || line.length > 10;
      })
      .map((line: string) => line.replace(/^[\d\.\-\*\•\s]+/, '').trim())
      .filter((line: string) => line.length > 5 && line.length < 100);

    const trends = lines.slice(0, 10);
    console.log('[Perplexity] Extracted trends:', trends.length);

    return { trends, citations };
  } catch (error) {
    console.error('[Perplexity] Trending search error:', error);
    return null;
  }
}

// ========== BRAND CONTEXT FETCHING ==========

/**
 * Fetch complete brand context including personas, products, and mappings
 */
export async function fetchTopicBrandContext(
  supabase: SupabaseClient,
  brandTemplateId: string
): Promise<TopicBrandContext | null> {
  if (!brandTemplateId) return null;

  const [brandResult, personasResult, productsResult, mappingsResult] = await Promise.all([
    supabase
      .from('brand_templates')
      .select(`
        brand_name, brand_positioning, tone_of_voice, content_pillars, industry,
        unique_value_proposition, mission, main_competitors, competitive_advantages,
        evergreen_themes, target_age_range, target_gender, industry_template_id,
        brand_hashtags
      `)
      .eq('id', brandTemplateId)
      .single(),
    supabase
      .from('customer_personas')
      .select(`
        id, name, occupation, age_range, pain_points, desires, buying_triggers, objections, is_primary,
        device_usage, tech_savviness, buying_motivation, communication_style, typical_funnel_stage,
        journey_map, priority_score, content_preferences
      `)
      .eq('brand_template_id', brandTemplateId)
      .order('is_primary', { ascending: false })
      .limit(5),
    supabase
      .from('brand_products')
      .select('id, name, category, description, unique_selling_points, pain_points_solved, suggested_content_angles, is_featured')
      .eq('brand_template_id', brandTemplateId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .limit(5),
    supabase
      .from('product_persona_mappings')
      .select(`
        product_id, persona_id, relevance_score, is_primary_product,
        custom_pitch, key_benefits, objection_handlers, preferred_content_angles, avoid_topics
      `)
      .eq('brand_template_id', brandTemplateId)
  ]);

  if (!brandResult.data) {
    console.log('[fetchTopicBrandContext] Brand not found:', brandTemplateId);
    return null;
  }

  const brand = brandResult.data;
  const personas: PersonaData[] = personasResult.data || [];
  const products: ProductData[] = productsResult.data || [];
  const mappings: ProductPersonaMapping[] = mappingsResult.data || [];

  // Build personas context string
  let personasContext = '';
  if (personas.length > 0) {
    const primary = personas.find(p => p.is_primary) || personas[0];
    personasContext = `
## CUSTOMER PERSONAS:
${personas.map(p => `
- ${p.name}${p.is_primary ? ' ⭐ Primary' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})
  Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}
  Desires: ${(p.desires || []).slice(0, 3).join(', ')}
  Objections: ${(p.objections || []).slice(0, 2).join(', ')}
  Buying Triggers: ${(p.buying_triggers || []).slice(0, 3).join(', ')}
  Device: ${p.device_usage || 'mobile-first'} | Tech: ${p.tech_savviness || 'medium'}
  Motivation: ${(p.buying_motivation || []).slice(0, 2).join(', ')}
  Stage: ${p.typical_funnel_stage || 'awareness'}`).join('\n')}

### PRIMARY PERSONA FOCUS: ${primary?.name || 'N/A'}
- Communication Style: ${primary?.communication_style || 'balanced'}
- Device Usage: ${primary?.device_usage || 'mobile-first'} → ${primary?.device_usage === 'mobile-first' ? 'Keep content scannable' : 'Can include longer form'}
- Tech Level: ${primary?.tech_savviness || 'medium'} → ${primary?.tech_savviness === 'low' ? 'Use simple language' : 'Can use technical terms'}
- Journey Stage: ${primary?.typical_funnel_stage || 'awareness'}
${primary?.journey_map?.length ? `- Journey Map: ${primary.journey_map.map(j => j.stage + ' → ' + j.content_type).join(', ')}` : ''}

→ Topics PHẢI giải quyết pain points hoặc khơi gợi desires của personas, phù hợp với device usage và tech level`;
    console.log('[fetchTopicBrandContext] Loaded', personas.length, 'personas with enhanced fields');
  }

  // Build products context string
  let productsContext = '';
  if (products.length > 0) {
    productsContext = `

## PRODUCTS/SERVICES:
${products.map(p => `
- ${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}
  USPs: ${(p.unique_selling_points || []).slice(0, 2).join(', ')}
  Solves: ${(p.pain_points_solved || []).slice(0, 2).join(', ')}
  Content Angles: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`).join('\n')}
→ Có thể tạo topics về use cases, benefits, testimonials của sản phẩm`;
    console.log('[fetchTopicBrandContext] Loaded', products.length, 'products');
  }

  // Build product-persona mapping context string
  let productPersonaMappingContext = '';
  if (mappings.length > 0 && personas.length > 0 && products.length > 0) {
    const mappingsByPersona: Record<string, ProductPersonaMapping[]> = {};
    mappings.forEach(m => {
      if (!mappingsByPersona[m.persona_id]) mappingsByPersona[m.persona_id] = [];
      mappingsByPersona[m.persona_id].push(m);
    });

    productPersonaMappingContext = '\n\n## PRODUCT-PERSONA TARGETING MATRIX:\n';
    Object.entries(mappingsByPersona).forEach(([personaId, pMappings]) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;
      
      productPersonaMappingContext += `\n### ${persona.name} (${persona.occupation || 'N/A'}):\n`;
      pMappings.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)).forEach(m => {
        const product = products.find(p => p.id === m.product_id);
        if (!product) return;
        productPersonaMappingContext += `- ${product.name} (Relevance: ${m.relevance_score || 80}%)`;
        if (m.custom_pitch) productPersonaMappingContext += `\n  Pitch: "${m.custom_pitch}"`;
        if (m.key_benefits?.length) productPersonaMappingContext += `\n  Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`;
        if (m.preferred_content_angles?.length) productPersonaMappingContext += `\n  Góc content: ${m.preferred_content_angles.join(', ')}`;
        if (m.avoid_topics?.length) productPersonaMappingContext += `\n  ⚠️ TRÁNH: ${m.avoid_topics.join(', ')}`;
        productPersonaMappingContext += '\n';
      });
    });
    productPersonaMappingContext += '\n→ Sử dụng mapping này để tạo topics targeting cụ thể persona + product\n';
    console.log('[fetchTopicBrandContext] Loaded', mappings.length, 'product-persona mappings');
  }

  // Fetch industry context if available
  let industryContext: IndustryContext | undefined = undefined;
  if (brand.industry_template_id) {
    const { data: industryData } = await supabase
      .from('industry_templates')
      .select('target_audience, forbidden_terms, compliance_rules, brand_voice, claim_restrictions')
      .eq('id', brand.industry_template_id)
      .single();
    
    if (industryData) {
      industryContext = {
        targetAudience: industryData.target_audience,
        forbiddenTerms: industryData.forbidden_terms,
        complianceRules: industryData.compliance_rules,
        brandVoice: industryData.brand_voice,
        claimRestrictions: industryData.claim_restrictions,
      };
    }
  }

  return {
    brandName: brand.brand_name,
    brandPositioning: brand.brand_positioning,
    toneOfVoice: brand.tone_of_voice,
    industry: brand.industry,
    contentPillars: brand.content_pillars as ContentPillar[],
    uniqueValueProposition: brand.unique_value_proposition,
    targetAgeRange: brand.target_age_range,
    targetGender: brand.target_gender,
    evergreenThemes: brand.evergreen_themes,
    brandHashtags: brand.brand_hashtags,
    mainCompetitors: brand.main_competitors,
    industryTemplateId: brand.industry_template_id,
    personasContext,
    productsContext,
    productPersonaMappingContext,
    // Raw data for ID lookup
    personas,
    products,
    industryContext,
  };
}

/**
 * Build full brand context string for AI prompts
 */
export function buildBrandContextString(context: TopicBrandContext): string {
  return `
Brand: ${context.brandName}
Positioning: ${context.brandPositioning || 'N/A'}
UVP: ${context.uniqueValueProposition || 'N/A'}
Tone: ${(context.toneOfVoice || []).join(', ')}
Industry: ${(context.industry || []).join(', ')}
Target: ${context.targetAgeRange || ''} ${context.targetGender || ''}
Evergreen Themes: ${(context.evergreenThemes || []).join(', ')}
Content Pillars: ${context.contentPillars?.map(p => p.name || p).join(', ') || 'Not defined'}
${context.personasContext}
${context.productsContext}
${context.productPersonaMappingContext}`;
}

// ========== TOPIC HISTORY ==========

/**
 * Fetch topic history for learning and recommendations
 */
export async function fetchTopicHistory(
  supabase: SupabaseClient,
  organizationId?: string,
  brandTemplateId?: string,
  limit: number = 50
): Promise<TopicHistoryItem[]> {
  let query = supabase
    .from('topic_history')
    .select('topic, category, pillar, content_goal, was_used, feedback, performance_score, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  if (brandTemplateId) {
    query = query.eq('brand_template_id', brandTemplateId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchTopicHistory] Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Build topic history context string for AI prompts
 */
export function buildTopicHistoryContext(history: TopicHistoryItem[]): string {
  if (!history.length) return 'No topic history available';
  
  return history
    .map(t => `- ${t.topic} (${t.category || 'N/A'}, pillar: ${t.pillar || 'none'}, feedback: ${t.feedback || 'none'}, score: ${t.performance_score || 'N/A'})`)
    .join('\n');
}

// ========== CACHE UTILITIES ==========

/**
 * Check cache for topic-related data
 */
export async function checkTopicCache(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<any | null> {
  const { data: cached } = await supabase
    .from('ai_response_cache')
    .select('response_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached?.response_data) {
    console.log('[Cache] HIT for key:', cacheKey.substring(0, 50));
    
    // Increment hit count
    await supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey });
    
    return cached.response_data;
  }

  console.log('[Cache] MISS for key:', cacheKey.substring(0, 50));
  return null;
}

/**
 * Save data to topic cache
 */
export async function saveTopicCache(
  supabase: SupabaseClient,
  cacheKey: string,
  data: any,
  ttlHours: number = 12,
  options?: {
    organizationId?: string;
    brandTemplateId?: string;
    functionName?: string;
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  
  try {
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: options?.functionName || 'topic-discovery',
      input_hash: cacheKey,
      response_data: data,
      expires_at: expiresAt,
      cache_scope: options?.organizationId ? 'org' : 'global',
      organization_id: options?.organizationId,
      brand_template_id: options?.brandTemplateId,
      response_schema_version: '1.0',
      hit_count: 0,
    }, { onConflict: 'cache_key' });
    
    console.log('[Cache] SAVED for key:', cacheKey.substring(0, 50), 'TTL:', ttlHours, 'hours');
  } catch (error) {
    console.error('[Cache] Save error:', error);
  }
}

// ========== TRENDING TOPICS ==========

/**
 * Fetch cached trending topics from database
 */
export async function fetchTrendingTopicsFromDB(
  supabase: SupabaseClient,
  organizationId: string,
  limit: number = 10
): Promise<any[]> {
  const { data } = await supabase
    .from('trending_topics')
    .select('topic, category, velocity_score, peak_status, suggested_angles, source')
    .eq('organization_id', organizationId)
    .gt('expires_at', new Date().toISOString())
    .order('velocity_score', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Build trending topics context string for AI prompts
 */
export function buildTrendingContext(trendingTopics: any[]): string {
  if (!trendingTopics.length) return '';

  return `
## XU HƯỚNG ĐANG HOT (Real-time từ Perplexity Web Search + Curated Data):
${trendingTopics.map((t, i) => 
  `${i+1}. "${t.topic}" (velocity: ${t.velocity_score}/100, status: ${t.peak_status}, nguồn: ${t.source})
   - Góc độ gợi ý: ${(t.suggested_angles || []).slice(0, 2).join(', ')}`
).join('\n')}

⚡ ƯU TIÊN: Tích hợp các xu hướng này vào đề xuất khi phù hợp với brand! Nếu đề xuất dựa trên trending, hãy indicate rõ trong response.
`;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Infer search intent from funnel stage and topic type
 */
export function inferSearchIntent(
  funnelStage?: string, 
  topicType?: string
): 'informational' | 'navigational' | 'commercial' | 'transactional' {
  if (funnelStage === 'bofu') return 'transactional';
  if (funnelStage === 'mofu') return 'commercial';
  if (topicType === 'story') return 'navigational';
  return 'informational';
}

/**
 * Infer content tier (3H Model) from category, searchIntent, funnelStage
 */
export function inferContentTier(
  category?: string,
  searchIntent?: string,
  funnelStage?: string
): 'hero' | 'hub' | 'hygiene' {
  if (category === 'reactive' || (category === 'seasonal' && funnelStage === 'bofu')) {
    return 'hero';
  }
  if ((category === 'evergreen' || category === 'trending') && funnelStage === 'mofu') {
    return 'hub';
  }
  if (searchIntent === 'informational' || funnelStage === 'tofu') {
    return 'hygiene';
  }
  return 'hygiene';
}

/**
 * Infer media ownership from format, contentTier, and topic characteristics
 */
export function inferMediaOwnership(
  formats?: string[],
  contentTier?: string,
  category?: string,
  topicType?: string
): 'owned' | 'earned' | 'paid' {
  if (contentTier === 'hero' && (category === 'reactive' || category === 'seasonal')) {
    return 'paid';
  }
  const earnedFormats = ['ugc', 'testimonial', 'meme'];
  if (formats?.some(f => earnedFormats.includes(f))) {
    return 'earned';
  }
  if (topicType === 'story') {
    return 'earned';
  }
  return 'owned';
}

/**
 * Infer journey stage from funnel stage and topic characteristics
 */
export function inferJourneyStage(
  funnelStage?: string,
  category?: string,
  topicType?: string
): 'awareness' | 'consideration' | 'decision' | 'loyalty' {
  if (funnelStage === 'tofu') return 'awareness';
  if (funnelStage === 'mofu') return 'consideration';
  if (funnelStage === 'bofu') return 'decision';
  
  if (category === 'reactive' || category === 'seasonal') return 'awareness';
  if (category === 'trending') return 'consideration';
  
  if (topicType === 'story') return 'awareness';
  if (topicType === 'solution' || topicType === 'how') return 'consideration';
  if (topicType === 'case_study') return 'decision';
  
  return 'awareness';
}

/**
 * Create standard CORS headers
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create error response with standard format
 */
export function createErrorResponse(
  message: string, 
  status: number = 500, 
  errorCode?: string
): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message,
      ...(errorCode && { errorCode })
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(): Response {
  return createErrorResponse(
    'Đã vượt quá giới hạn request. Vui lòng thử lại sau.',
    429,
    'RATE_LIMIT'
  );
}

/**
 * Create credits exhausted error response
 */
export function createCreditsExhaustedResponse(): Response {
  return createErrorResponse(
    'AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.',
    402,
    'CREDITS_EXHAUSTED'
  );
}

// ========== SEMANTIC PERSONA MATCHING ==========

/**
 * Generate embedding for text using gte-small model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getEmbeddingModel();
    const output = await model.run(text, {
      mean_pool: true,
      normalize: true,
    });
    return Array.from(output as Float32Array);
  } catch (error) {
    console.error('[Embedding] Error generating embedding:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Build text representation of persona for embedding
 */
function personaToText(persona: PersonaData): string {
  const parts: string[] = [];
  
  parts.push(`Persona: ${persona.name}`);
  if (persona.occupation) parts.push(`Nghề nghiệp: ${persona.occupation}`);
  if (persona.age_range) parts.push(`Độ tuổi: ${persona.age_range}`);
  if (persona.pain_points?.length) {
    parts.push(`Pain points: ${persona.pain_points.slice(0, 5).join(', ')}`);
  }
  if (persona.desires?.length) {
    parts.push(`Desires: ${persona.desires.slice(0, 5).join(', ')}`);
  }
  if (persona.buying_triggers?.length) {
    parts.push(`Buying triggers: ${persona.buying_triggers.slice(0, 3).join(', ')}`);
  }
  if (persona.objections?.length) {
    parts.push(`Objections: ${persona.objections.slice(0, 3).join(', ')}`);
  }
  if (persona.communication_style) {
    parts.push(`Communication style: ${persona.communication_style}`);
  }
  
  return parts.join('\n');
}

export interface SemanticMatchResult {
  personaId: string;
  personaName: string;
  score: number;
  matchType: 'semantic' | 'keyword' | 'ai';
}

/**
 * Semantic matching of topic with personas using embeddings
 * Returns sorted list of matches with similarity scores (0-100)
 */
export async function semanticMatchPersona(
  topic: string,
  personas: PersonaData[],
  options?: {
    minScore?: number;
    maxResults?: number;
  }
): Promise<SemanticMatchResult[]> {
  const { minScore = 40, maxResults = 5 } = options || {};
  
  if (!topic || personas.length === 0) {
    console.log('[SemanticMatch] Empty topic or no personas');
    return [];
  }

  const startTime = Date.now();
  
  try {
    // Generate embedding for topic
    const topicEmbedding = await generateEmbedding(topic);
    if (topicEmbedding.length === 0) {
      console.warn('[SemanticMatch] Failed to generate topic embedding, falling back to keyword match');
      return keywordMatchPersona(topic, personas, minScore, maxResults);
    }

    // Generate embeddings for all personas and calculate similarity
    const results: SemanticMatchResult[] = [];
    
    for (const persona of personas) {
      const personaText = personaToText(persona);
      const personaEmbedding = await generateEmbedding(personaText);
      
      if (personaEmbedding.length > 0) {
        const similarity = cosineSimilarity(topicEmbedding, personaEmbedding);
        const score = Math.round(similarity * 100);
        
        if (score >= minScore) {
          results.push({
            personaId: persona.id,
            personaName: persona.name,
            score,
            matchType: 'semantic',
          });
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    const duration = Date.now() - startTime;
    console.log(`[SemanticMatch] Matched ${results.length} personas (min score: ${minScore}) in ${duration}ms`);
    
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('[SemanticMatch] Error:', error);
    // Fallback to keyword matching
    return keywordMatchPersona(topic, personas, minScore, maxResults);
  }
}

/**
 * Keyword-based fallback matching when embeddings fail
 */
function keywordMatchPersona(
  topic: string,
  personas: PersonaData[],
  minScore: number,
  maxResults: number
): SemanticMatchResult[] {
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/).filter(w => w.length > 2);
  
  const results: SemanticMatchResult[] = [];
  
  for (const persona of personas) {
    let matchCount = 0;
    let totalKeywords = 0;
    
    // Check pain points
    const painPoints = (persona.pain_points || []).join(' ').toLowerCase();
    const desires = (persona.desires || []).join(' ').toLowerCase();
    const triggers = (persona.buying_triggers || []).join(' ').toLowerCase();
    const occupation = (persona.occupation || '').toLowerCase();
    
    const allText = `${painPoints} ${desires} ${triggers} ${occupation}`;
    
    for (const word of topicWords) {
      totalKeywords++;
      if (allText.includes(word)) {
        matchCount++;
      }
    }
    
    // Also check if topic contains persona-related keywords
    const personaKeywords = [...(persona.pain_points || []), ...(persona.desires || [])];
    for (const keyword of personaKeywords) {
      const kw = keyword.toLowerCase();
      if (kw.length > 3 && topicLower.includes(kw.substring(0, Math.min(kw.length, 10)))) {
        matchCount += 2; // Boost for keyword match
      }
    }
    
    const score = totalKeywords > 0 
      ? Math.min(100, Math.round((matchCount / Math.max(totalKeywords, 1)) * 100) + (persona.is_primary ? 15 : 0))
      : (persona.is_primary ? 60 : 30);
    
    if (score >= minScore) {
      results.push({
        personaId: persona.id,
        personaName: persona.name,
        score,
        matchType: 'keyword',
      });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  console.log(`[KeywordMatch] Matched ${results.length} personas via keyword fallback`);
  
  return results.slice(0, maxResults);
}
