// ============================================
// Pipeline: Context Fetcher
// Parallel context fetching extracted from index.ts
// Phase 3C: Uses batch RPC when available
// ============================================

import { withFallback, withTimeout } from "../error-utils.ts";
import { fetchLearningContext } from "../learning-context.ts";
import { LearningContext, JourneyStageMessagingData, JourneyStage } from "../prompt-utils.ts";
import { fetchUserPreferences, UserPreferencesContext } from "../user-preferences.ts";
import { fetchCrossSessionMemory, CrossSessionMemory } from "../session-memory.ts";
import { searchRelevantContent, fetchIndustryMemory, fetchIndustryGlossary } from "../data-fetchers/index.ts";
import { cacheThrough, CacheKeys } from "../cache/memory-cache.ts";
import { enhancedWebSearch, WebSearchResponse } from "../data-fetchers/web-search-fallback.ts";
import { getConversationRAGContext, ConversationRAGResult } from "../data-fetchers/conversation-rag.ts";
import { BrandContext, IndustryMemory, GlossaryTerm, RAGResult, ChatMessage } from "../types/chat-types.ts";

// ---- Types ----

export interface PipelineContext {
  brandContext: BrandContext | null;
  personasContext: string[];
  productsContext: string[];
  productPersonaContext: string[];
  recentTopics: string[];
  industryMemory: IndustryMemory | null;
  learningContext: LearningContext | null;
  journeyMessaging: JourneyStageMessagingData[];
  sampleTexts: Record<string, string> | null;
  industryGlossary: GlossaryTerm[];
  userPreferences: UserPreferencesContext | null;
  sessionMemory: CrossSessionMemory | null;
  ragResults: RAGResult[];
  conversationRagResults: ConversationRAGResult[];
  conversationRagSection: string;
  prefetchedTrends: WebSearchResponse | null;
  prefetchSection: string;
}

// ---- Main Fetcher ----

export async function fetchAllContext(
  supabase: any,
  params: {
    messages: ChatMessage[];
    brandTemplateId?: string;
    organizationId?: string;
    userId?: string;
    forceWebSearch?: boolean;
  },
  logger: { info: (msg: string, ctx?: any) => void; warn: (msg: string, ctx?: any) => void }
): Promise<PipelineContext> {
  const { messages, brandTemplateId, organizationId, userId, forceWebSearch } = params;

  const ctx: PipelineContext = {
    brandContext: null,
    personasContext: [],
    productsContext: [],
    productPersonaContext: [],
    recentTopics: [],
    industryMemory: null,
    learningContext: null,
    journeyMessaging: [],
    sampleTexts: null,
    industryGlossary: [],
    userPreferences: null,
    sessionMemory: null,
    ragResults: [],
    conversationRagResults: [],
    conversationRagSection: '',
    prefetchedTrends: null,
    prefetchSection: '',
  };

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();

  // Parallel fetch all context sources with per-source timeouts
  const fetches: Promise<void>[] = [];

  // Source 1: User preferences & session memory (3s timeout)
  if (userId) {
    fetches.push(
      withTimeout(async () => {
        const [userPrefsResult, sessionMemoryResult] = await Promise.all([
          fetchUserPreferences(supabase, userId, brandTemplateId),
          fetchCrossSessionMemory(supabase, userId, brandTemplateId, organizationId, 10),
        ]);
        ctx.userPreferences = userPrefsResult;
        ctx.sessionMemory = sessionMemoryResult;
      }, 3000, '[ContextFetcher] User prefs/session memory timeout')
        .catch(e => logger.warn('[ContextFetcher] User prefs timed out', { error: String(e) }))
    );
  }

  // Source 2: Brand context (3s timeout for DB fetches)
  if (brandTemplateId) {
    fetches.push(
      withTimeout(
        () => fetchBrandContext(supabase, brandTemplateId, organizationId, ctx, logger),
        3000,
        '[ContextFetcher] Brand context timeout'
      ).catch(e => logger.warn('[ContextFetcher] Brand context timed out', { error: String(e) }))
    );
  }

  // Source 3: RAG search (4s timeout)
  if (lastUserMessage && organizationId) {
    fetches.push(
      withTimeout(
        () => fetchRAGContext(supabase, lastUserMessage.content, organizationId, brandTemplateId, userId, ctx, logger),
        4000,
        '[ContextFetcher] RAG search timeout'
      ).catch(e => logger.warn('[ContextFetcher] RAG timed out', { error: String(e) }))
    );
  }

  // Source 4: Web search / trending (5s timeout, reduced from 12s)
  if (lastUserMessage) {
    fetches.push(
      withTimeout(
        () => fetchTrendingContext(lastUserMessage.content, forceWebSearch, ctx, logger, userId, organizationId),
        5000,
        '[ContextFetcher] Web search timeout'
      ).catch(e => logger.warn('[ContextFetcher] Web search timed out', { error: String(e) }))
    );
  }

  // Execute all in parallel — partial results on timeout
  const results = await Promise.allSettled(fetches);
  const timedOut = results.filter(r => r.status === 'rejected');
  if (timedOut.length > 0) {
    logger.warn(`[ContextFetcher] ${timedOut.length}/${results.length} sources timed out or failed`);
  }

  return ctx;
}

// ---- Sub-fetchers ----

async function fetchBrandContext(
  supabase: any,
  brandTemplateId: string,
  organizationId: string | undefined,
  ctx: PipelineContext,
  logger: { info: (msg: string, ctx?: any) => void; warn: (msg: string, ctx?: any) => void }
): Promise<void> {
  const [brandResult, personasResult, productsResult, mappingsResult, historyResult] = await Promise.all([
    supabase.from('brand_templates').select(`
      brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
      unique_value_proposition, target_age_range, target_gender, evergreen_themes,
      brand_hashtags, main_competitors, industry_template_id, sample_texts
    `).eq('id', brandTemplateId).single(),
    supabase.from('customer_personas').select(`
      id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
      device_usage, tech_savviness, buying_motivation, communication_style,
      typical_funnel_stage, objections, journey_map, priority_score
    `).eq('brand_template_id', brandTemplateId)
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('is_primary', { ascending: false })
      .limit(5),
    supabase.from('brand_products').select('id, name, category, description, unique_selling_points, suggested_content_angles, is_featured')
      .eq('brand_template_id', brandTemplateId).eq('is_active', true)
      .order('is_featured', { ascending: false }).limit(5),
    supabase.from('product_persona_mappings').select('id, product_id, persona_id, relevance_score, is_primary_product, custom_pitch, key_benefits, preferred_content_angles')
      .eq('brand_template_id', brandTemplateId)
      .order('relevance_score', { ascending: false }).limit(20),
    supabase.from('topic_history').select('topic')
      .eq('brand_template_id', brandTemplateId)
      .order('created_at', { ascending: false }).limit(10),
  ]);

  if (brandResult.data) {
    const brand = brandResult.data;
    ctx.brandContext = {
      brandName: brand.brand_name,
      brandPositioning: brand.brand_positioning,
      toneOfVoice: brand.tone_of_voice,
      industry: brand.industry,
      contentPillars: brand.content_pillars as any,
      uniqueValueProposition: brand.unique_value_proposition,
      targetAgeRange: brand.target_age_range,
      targetGender: brand.target_gender,
      evergreenThemes: brand.evergreen_themes,
      brandHashtags: brand.brand_hashtags,
      mainCompetitors: brand.main_competitors,
      industryTemplateId: brand.industry_template_id,
    };

    if (brand.sample_texts && typeof brand.sample_texts === 'object') {
      ctx.sampleTexts = brand.sample_texts as Record<string, string>;
    }

    // Fetch Industry Memory + Glossary
    if (brand.industry_template_id) {
      const [memoryResult, glossaryResult] = await Promise.all([
        withFallback(() => fetchIndustryMemory(supabase, brand.industry_template_id, 'vi'), null, { logError: true, errorContext: 'industryMemory' }),
        withFallback(() => fetchIndustryGlossary(supabase, brand.industry_template_id, 'vi', 30), [], { logError: true, errorContext: 'glossary' }),
      ]);
      ctx.industryMemory = memoryResult;
      ctx.industryGlossary = glossaryResult;
    }

    // Learning Context
    ctx.learningContext = await withFallback(
      () => fetchLearningContext(supabase, brandTemplateId, organizationId || null, 50),
      null,
      { logError: true, errorContext: 'learningContext' }
    );
  }

  // Personas
  if (personasResult.data?.length) {
    ctx.personasContext = personasResult.data.map((p: any) => {
      const parts = [`${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})`];
      if (p.device_usage) parts.push(`📱 ${p.device_usage}`);
      if (p.tech_savviness) parts.push(`🔧 Tech: ${p.tech_savviness}`);
      if (p.typical_funnel_stage) parts.push(`📊 Stage: ${p.typical_funnel_stage.toUpperCase()}`);
      if (p.communication_style) parts.push(`💬 Style: ${p.communication_style}`);
      parts.push(`Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}`);
      parts.push(`Desires: ${(p.desires || []).slice(0, 3).join(', ')}`);
      if (p.buying_motivation?.length) parts.push(`Động lực mua: ${p.buying_motivation.slice(0, 2).join(', ')}`);
      if (p.objections?.length) parts.push(`Objections: ${p.objections.slice(0, 2).join(', ')}`);
      return parts.join(' | ');
    });
  }

  // Products
  if (productsResult.data?.length) {
    ctx.productsContext = productsResult.data.map((p: any) =>
      `${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`
    );
  }

  // Product-Persona mappings + Journey messaging
  if (mappingsResult.data?.length && personasResult.data?.length && productsResult.data?.length) {
    const personaMap = new Map(personasResult.data.map((p: any) => [p.id, p.name]));
    const productMap = new Map(productsResult.data.map((p: any) => [p.id, p.name]));

    ctx.productPersonaContext = mappingsResult.data
      .filter((m: any) => personaMap.has(m.persona_id) && productMap.has(m.product_id))
      .map((m: any) => {
        const parts = [`${productMap.get(m.product_id)} → ${personaMap.get(m.persona_id)} (${m.relevance_score}%)`];
        if (m.is_primary_product) parts[0] = '⭐ ' + parts[0];
        if (m.custom_pitch) parts.push(`Pitch: "${m.custom_pitch}"`);
        if (m.key_benefits?.length) parts.push(`Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`);
        return parts.join(' | ');
      });

    // Journey stage messaging
    if (mappingsResult.data?.length > 0) {
      const mappingIds = mappingsResult.data.map((m: any) => m.id).filter(Boolean);
      if (mappingIds.length > 0) {
        const { data: journeyData } = await supabase
          .from('journey_stage_messaging')
          .select('mapping_id, journey_stage, headline, hook, key_message, pain_points_focus, benefits_highlight, cta_template, emotional_tone, objection_response, content_types, avoid_messages')
          .in('mapping_id', mappingIds);

        if (journeyData?.length) {
          ctx.journeyMessaging = journeyData.map((j: any) => ({
            mapping_id: j.mapping_id,
            journey_stage: j.journey_stage as JourneyStage,
            headline: j.headline,
            hook: j.hook,
            key_message: j.key_message,
            pain_points_focus: j.pain_points_focus || [],
            benefits_highlight: j.benefits_highlight || [],
            cta_template: j.cta_template,
            emotional_tone: j.emotional_tone,
            objection_response: j.objection_response,
            content_types: j.content_types || [],
            avoid_messages: j.avoid_messages || [],
          }));
        }
      }
    }
  }

  if (historyResult.data) {
    ctx.recentTopics = historyResult.data.map((h: any) => h.topic);
  }
}

async function fetchRAGContext(
  supabase: any,
  lastUserContent: string,
  organizationId: string | undefined,
  brandTemplateId: string | undefined,
  userId: string | undefined,
  ctx: PipelineContext,
  logger: { info: (msg: string, ctx?: any) => void; warn: (msg: string, ctx?: any) => void }
): Promise<void> {
  if (organizationId) {
    ctx.ragResults = await withFallback(
      () => searchRelevantContent(supabase, lastUserContent, organizationId, brandTemplateId, 5),
      [],
      { logError: true, errorContext: 'RAG' }
    );
  }

  if (userId) {
    const convRagResult = await withFallback(
      () => getConversationRAGContext(supabase, lastUserContent, userId, organizationId, brandTemplateId, undefined),
      { results: [], promptSection: '' },
      { logError: true, errorContext: 'ConversationRAG' }
    );
    ctx.conversationRagResults = convRagResult.results;
    ctx.conversationRagSection = convRagResult.promptSection;
  }
}

async function fetchTrendingContext(
  lastUserContent: string,
  forceWebSearch: boolean | undefined,
  ctx: PipelineContext,
  logger: { info: (msg: string, ctx?: any) => void; warn: (msg: string, ctx?: any) => void },
  userId?: string,
  organizationId?: string,
): Promise<void> {
  const content = lastUserContent.toLowerCase();
  const trendingKeywords = [
    'xu hướng', 'trending', 'đang hot', 'viral', 'trend',
    'tin tức mới nhất', 'tin mới', 'hot topic', 'xu huong',
    'đang được quan tâm', 'nổi bật', 'phổ biến', 'gần đây',
    'ý tưởng', 'chủ đề', 'topic', 'brainstorm', 'gợi ý',
    'content gì', 'nội dung gì', 'viết gì', 'làm gì',
    'tìm kiếm', 'discover', 'khám phá', 'mới', 'fresh',
    'đề xuất', 'suggest', 'ideas', 'sáng tạo', 'creative',
    'เทรนด์', 'กำลังฮิต', 'ไวรัล', 'ข่าวล่าสุด', 'ยอดนิยม',
    'ไอเดีย', 'หัวข้อ', 'แนะนำ', 'คอนเทนต์', 'สร้างสรรค์',
    'what to write', 'content ideas', 'latest trends', 'popular',
  ];

  const hasTrendingIntent = trendingKeywords.some(kw => content.includes(kw));
  if (!forceWebSearch && !hasTrendingIntent) return;

  const industryName = ctx.industryMemory?.name || ctx.brandContext?.industry?.[0] || 'business';
  const hasThaiContent = content.match(/[\u0E00-\u0E7F]/);
  const searchQuery = hasThaiContent
    ? `เทรนด์คอนเทนต์ ${industryName} สัปดาห์นี้ trending topics content marketing`
    : `xu hướng nội dung ${industryName} tuần này trending topics content marketing`;

  try {
    ctx.prefetchedTrends = await withTimeout(
      () => enhancedWebSearch({
        query: searchQuery,
        searchType: 'trending',
        industry: industryName,
        recency: 'week',
        maxResults: 8,
        timeoutMs: 10000,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        includeSocialTrends: true,
      }),
      12000,
      'Prefetch web search timed out'
    );

    if (ctx.prefetchedTrends?.success && ctx.prefetchedTrends.results.length > 0) {
      ctx.prefetchSection = `
## 🔍 Web Trends Context (Prefetched)
Dữ liệu xu hướng được tự động tìm kiếm cho ngành "${industryName}":

${ctx.prefetchedTrends.results.slice(0, 6).map((r, i) =>
        `${i + 1}. **${r.title}**
   - ${r.snippet}
   ${r.content_angle ? `- Góc nội dung: ${r.content_angle}` : ''}`
      ).join('\n\n')}

${ctx.prefetchedTrends.citations?.length > 0 ? `
**Nguồn tham khảo:**
${ctx.prefetchedTrends.citations.slice(0, 3).map((c: string) => `- ${c}`).join('\n')}
` : ''}

⚡ Sử dụng dữ liệu này để gợi ý topics cụ thể và relevant cho user.
`;
    } else {
      ctx.prefetchSection = buildFallbackTrendSection(industryName);
    }
  } catch {
    ctx.prefetchSection = buildFallbackTrendSection(industryName);
  }
}

function buildFallbackTrendSection(industryName: string): string {
  return `
## 🔍 Web Trends Context
⚠️ Đang sử dụng dữ liệu dự phòng do không thể tìm kiếm web ngay lúc này.
Hãy gợi ý các topic dựa trên kiến thức về ngành "${industryName}" và brand context có sẵn.
Lưu ý: Không nói với user rằng "công cụ tìm kiếm bị lỗi". Đưa ra gợi ý hữu ích dựa trên context.
`;
}
