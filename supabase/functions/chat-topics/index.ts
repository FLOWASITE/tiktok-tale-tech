import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLearningContext } from "../_shared/learning-context.ts";
import { LearningContext, JourneyStageMessagingData, JourneyStage } from "../_shared/prompt-utils.ts";
import { fetchUserPreferences, UserPreferencesContext } from "../_shared/user-preferences.ts";
import { fetchCrossSessionMemory, CrossSessionMemory } from "../_shared/session-memory.ts";
import { createSSEWriter } from "../_shared/sse-writer.ts";
import { buildContextMetadata, serializeContextMetadata, summarizeContext } from "../_shared/context-tracker.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
// Graph Engine imports
import { runOrchestrator, createNodeRegistry, type NodeExecutionContext } from "../_shared/graph/graph-engine.ts";

// Import shared types
import { ChatMessage, ChatRequest, BrandContext, IndustryMemory, GlossaryTerm, RAGResult } from "../_shared/types/chat-types.ts";

// Import shared data fetchers
import { searchRelevantContent, fetchIndustryMemory, fetchIndustryGlossary } from "../_shared/data-fetchers/index.ts";
import { enhancedWebSearch, WebSearchResponse } from "../_shared/data-fetchers/web-search-fallback.ts";
import { getConversationRAGContext, ConversationRAGResult } from "../_shared/data-fetchers/conversation-rag.ts";

// Import shared system prompt builder
import { buildSystemPrompt } from "../_shared/system-prompt-builder.ts";

// Import error handling utilities
import { withFallback, withRetry, withTimeout, isRetryableError } from "../_shared/error-utils.ts";

// Import observability utilities
import { createLogger, saveMetrics, getContextSources, estimateTokens, AIMetrics } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";

// Import token management utilities
import { 
  createTokenManager, 
  estimateTokenCount, 
  estimateConversationTokens,
  summarizeConversationHistory,
  TokenBudgetAllocator,
  ContextSegment
} from "../_shared/token-manager.ts";

// Import rate limiting utilities
import { 
  checkRateLimit, 
  getRateLimitConfig, 
  checkUserQuota,
  createRateLimitErrorResponse,
  createQuotaExceededResponse,
  getUserPlanType,
  logUsage
} from "../_shared/rate-limiter.ts";

// NEW: Prompt Registry Integration - Phase 4
import { createPromptManager } from "../_shared/prompt-integration.ts";

// Prompt Guard
import { sanitizeInput, logSecurityEvent } from "../_shared/prompt-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize logger with trace ID
  const logger = createLogger({
    functionName: 'chat-topics',
  });
  const requestStartTime = performance.now();

  try {
    const { messages, brandTemplateId, contentGoal, organizationId, userId, forceWebSearch }: ChatRequest = await req.json();

    // Extend logger context
    if (userId) logger.info('Request received', { userId, organizationId, brandTemplateId });

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user access token from Authorization header for downstream forwarding
    const authHeader = req.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    
    // Validate user from token if possible (prefer token over body userId)
    // CRITICAL: Only set userAccessToken if it's a VALID user JWT (not anon key or service key)
    let resolvedUserId = userId;
    let userAccessToken = ''; // Only populated with a verified user JWT
    if (rawToken && rawToken !== supabaseKey) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(rawToken);
        if (!authError && user?.id) {
          resolvedUserId = user.id;
          userAccessToken = rawToken; // Only set when confirmed as valid user JWT
          logger.info('Resolved user from JWT', { resolvedUserId });
        } else {
          logger.info('Token is not a valid user JWT, will use service-role for downstream calls');
        }
      } catch {
        // Fall back to body userId, userAccessToken stays empty
      }
    }

    // ============ RATE LIMITING & QUOTA CHECK ============
    if (userId) {
      // Get user's plan type
      const planType = await getUserPlanType(supabase, userId);
      
      // Check rate limit (chat-specific limits)
      const rateLimitConfig = getRateLimitConfig(planType, 'chat');
      const rateLimitResult = checkRateLimit(userId, rateLimitConfig);
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded', { 
          userId, 
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
          retryAfterMs: rateLimitResult.retryAfterMs,
        });
        return createRateLimitErrorResponse(rateLimitResult, corsHeaders);
      }
      
      // Check quota for AI edits (chat counts as ai_edit)
      const quotaResult = await checkUserQuota(supabase, userId, 'ai_edit');
      
      if (!quotaResult.allowed) {
        logger.warn('Quota exceeded', {
          userId,
          usageType: quotaResult.usageType,
          currentUsage: quotaResult.currentUsage,
          limit: quotaResult.limit,
        });
        return createQuotaExceededResponse(quotaResult, corsHeaders);
      }
      
      logger.info('Rate limit and quota check passed', {
        planType,
        rateLimitRemaining: rateLimitResult.remaining,
        quotaRemaining: quotaResult.remaining,
      });
    }

    // Start context fetch timer
    const contextFetchStart = performance.now();

    // Fetch all context data in parallel
    let brandContext: BrandContext | null = null;
    let personasContext: string[] = [];
    let productsContext: string[] = [];
    let productPersonaContext: string[] = [];
    let recentTopics: string[] = [];
    let industryMemory: IndustryMemory | null = null;
    let learningContext: LearningContext | null = null;
    let journeyMessaging: JourneyStageMessagingData[] = [];
    let sampleTexts: Record<string, string> | null = null;
    let industryGlossary: GlossaryTerm[] = [];
    let userPreferences: UserPreferencesContext | null = null;
    let sessionMemory: CrossSessionMemory | null = null;
    
    // Fetch user preferences and cross-session memory if userId is provided
    if (userId) {
      const [userPrefsResult, sessionMemoryResult] = await Promise.all([
        fetchUserPreferences(supabase, userId, brandTemplateId),
        fetchCrossSessionMemory(supabase, userId, brandTemplateId, organizationId, 10),
      ]);
      
      userPreferences = userPrefsResult;
      sessionMemory = sessionMemoryResult;
      
      if (userPreferences) {
        console.log('Loaded user preferences:', {
          tone: userPreferences.preferredTone,
          skillLevel: userPreferences.skillLevel,
          emojiFrequency: userPreferences.emojiFrequency,
          stylePatterns: userPreferences.stylePatterns.length,
          avgEditPercentage: userPreferences.avgEditPercentage,
        });
      }
      
      if (sessionMemory) {
        console.log('Loaded cross-session memory:', {
          insights: sessionMemory.insights.length,
          corrections: sessionMemory.corrections.length,
          summaries: sessionMemory.conversationSummaries.length,
          totalConversations: sessionMemory.totalConversations,
          avgMessagesPerSession: sessionMemory.avgMessagesPerSession,
        });
      }
    }
    
    if (brandTemplateId) {
      const [brandResult, personasResult, productsResult, mappingsResult, historyResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
            unique_value_proposition, target_age_range, target_gender, evergreen_themes,
            brand_hashtags, main_competitors, industry_template_id, sample_texts
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select(`
            id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style, 
            typical_funnel_stage, objections, journey_map, priority_score
          `)
          .eq('brand_template_id', brandTemplateId)
          .order('priority_score', { ascending: false, nullsFirst: false })
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('id, name, category, description, unique_selling_points, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5),
        supabase
          .from('product_persona_mappings')
          .select('product_id, persona_id, relevance_score, is_primary_product, custom_pitch, key_benefits, preferred_content_angles')
          .eq('brand_template_id', brandTemplateId)
          .order('relevance_score', { ascending: false })
          .limit(20),
        supabase
          .from('topic_history')
          .select('topic')
          .eq('brand_template_id', brandTemplateId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);
      
      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = {
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

        // Parse sample_texts if available
        if (brand.sample_texts && typeof brand.sample_texts === 'object') {
          sampleTexts = brand.sample_texts as Record<string, string>;
          console.log('Loaded sample_texts channels:', Object.keys(sampleTexts).join(', '));
        }

        // Fetch Industry Memory and Glossary if brand has industry_template_id
        // Using graceful degradation - continue even if these fail
        if (brand.industry_template_id) {
          const [memoryResult, glossaryResult] = await Promise.all([
            withFallback(
              () => fetchIndustryMemory(supabase, brand.industry_template_id, 'vi'),
              null,
              { logError: true, errorContext: 'industryMemory' }
            ),
            withFallback(
              () => fetchIndustryGlossary(supabase, brand.industry_template_id, 'vi', 30),
              [],
              { logError: true, errorContext: 'glossary' }
            )
          ]);
          industryMemory = memoryResult;
          industryGlossary = glossaryResult;
          if (industryGlossary.length > 0) {
            console.log('Loaded', industryGlossary.length, 'industry glossary terms');
          }
        }

        // Fetch Learning Context with graceful degradation
        learningContext = await withFallback(
          () => fetchLearningContext(supabase, brandTemplateId, organizationId || null, 50),
          null,
          { logError: true, errorContext: 'learningContext' }
        );
        console.log('Learning context:', learningContext ? {
          topPerformers: learningContext.topPerformers?.length || 0,
          avgPerformance: learningContext.averagePerformance,
          negativeFeedback: learningContext.negativeFeedback?.length || 0,
          preferredCategories: learningContext.preferredCategories?.length || 0,
          publishedCount: learningContext.publishedCount || 0,
        } : 'No learning context');
      }

      // Build enhanced personas context
      if (personasResult.data?.length) {
        personasContext = personasResult.data.map((p: any) => {
          const parts = [
            `${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})`,
          ];
          if (p.device_usage) parts.push(`📱 ${p.device_usage}`);
          if (p.tech_savviness) parts.push(`🔧 Tech: ${p.tech_savviness}`);
          if (p.typical_funnel_stage) parts.push(`📊 Stage: ${p.typical_funnel_stage.toUpperCase()}`);
          if (p.communication_style) parts.push(`💬 Style: ${p.communication_style}`);
          parts.push(`Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}`);
          parts.push(`Desires: ${(p.desires || []).slice(0, 3).join(', ')}`);
          if (p.buying_motivation?.length) {
            parts.push(`Động lực mua: ${p.buying_motivation.slice(0, 2).join(', ')}`);
          }
          if (p.objections?.length) {
            parts.push(`Objections: ${p.objections.slice(0, 2).join(', ')}`);
          }
          return parts.join(' | ');
        });
        console.log('Loaded', personasResult.data.length, 'enhanced personas for chat context');
      }

      // Build products context
      if (productsResult.data?.length) {
        productsContext = productsResult.data.map((p: any) => 
          `${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`
        );
        console.log('Loaded', productsResult.data.length, 'products for chat context');
      }

      // Build product-persona mappings context
      if (mappingsResult.data?.length && personasResult.data?.length && productsResult.data?.length) {
        const personaMap = new Map(personasResult.data.map((p: any) => [p.id, p.name]));
        const productMap = new Map(productsResult.data.map((p: any) => [p.id, p.name]));
        
        productPersonaContext = mappingsResult.data
          .filter((m: any) => personaMap.has(m.persona_id) && productMap.has(m.product_id))
          .map((m: any) => {
            const parts = [
              `${productMap.get(m.product_id)} → ${personaMap.get(m.persona_id)} (${m.relevance_score}%)`
            ];
            if (m.is_primary_product) parts[0] = '⭐ ' + parts[0];
            if (m.custom_pitch) parts.push(`Pitch: "${m.custom_pitch}"`);
            if (m.key_benefits?.length) parts.push(`Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`);
            return parts.join(' | ');
          });
        console.log('Loaded', productPersonaContext.length, 'product-persona mappings');

        // Fetch journey stage messaging for all mappings
        if (mappingsResult.data?.length > 0) {
          const mappingIds = mappingsResult.data.map((m: any) => m.id).filter(Boolean);
          if (mappingIds.length > 0) {
            const { data: journeyData, error: journeyError } = await supabase
              .from('journey_stage_messaging')
              .select('mapping_id, journey_stage, headline, hook, key_message, pain_points_focus, benefits_highlight, cta_template, emotional_tone, objection_response, content_types, avoid_messages')
              .in('mapping_id', mappingIds);

            if (journeyError) {
              console.error('Error fetching journey messaging:', journeyError);
            } else if (journeyData?.length) {
              journeyMessaging = journeyData.map((j: any) => ({
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
              console.log('Loaded', journeyMessaging.length, 'journey stage messaging records');
            }
          }
        }
      }

      if (historyResult.data) {
        recentTopics = historyResult.data.map(h => h.topic);
      }
    }

    // RAG: Search for relevant past content based on user's latest message
    // Using graceful degradation - continue even if RAG fails
    let ragResults: RAGResult[] = [];
    let conversationRagResults: ConversationRAGResult[] = [];
    let conversationRagSection = '';
    
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        // Content RAG (existing)
        if (organizationId) {
          ragResults = await withFallback(
            () => searchRelevantContent(
              supabase,
              lastUserMessage.content,
              organizationId,
              brandTemplateId,
              5
            ),
            [],
            { logError: true, errorContext: 'RAG' }
          );
          console.log('Content RAG search results:', ragResults.length, 'relevant items found');
        }
        
        // Conversation RAG (new) - search past conversations for relevant context
        if (userId) {
          const convRagResult = await withFallback(
            () => getConversationRAGContext(
              supabase,
              lastUserMessage.content,
              userId,
              organizationId,
              brandTemplateId,
              undefined // current conversation ID not available here
            ),
            { results: [], promptSection: '' },
            { logError: true, errorContext: 'ConversationRAG' }
          );
          conversationRagResults = convRagResult.results;
          conversationRagSection = convRagResult.promptSection;
          console.log('Conversation RAG search results:', conversationRagResults.length, 'relevant past conversations found');
        }
      }
    }

    // ============ PREFETCH WEB SEARCH FOR TRENDING INTENT ============
    // Detect trending/xu hướng intent and prefetch web search to ensure AI always has data
    let prefetchedTrends: WebSearchResponse | null = null;
    let prefetchSection = '';
    
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        const content = lastUserMessage.content.toLowerCase();
        // Expanded keywords: Trending + Brainstorm/discovery intent
        const trendingKeywords = [
          // Vietnamese trending/viral intent
          'xu hướng', 'trending', 'đang hot', 'viral', 'trend', 
          'tin tức mới nhất', 'tin mới', 'hot topic', 'xu huong',
          'đang được quan tâm', 'nổi bật', 'phổ biến', 'gần đây',
          // Vietnamese brainstorm/discovery intent
          'ý tưởng', 'chủ đề', 'topic', 'brainstorm', 'gợi ý',
          'content gì', 'nội dung gì', 'viết gì', 'làm gì',
          'tìm kiếm', 'discover', 'khám phá', 'mới', 'fresh',
          'đề xuất', 'suggest', 'ideas', 'sáng tạo', 'creative',
          // Thai trending/discovery intent
          'เทรนด์', 'กำลังฮิต', 'ไวรัล', 'ข่าวล่าสุด', 'ยอดนิยม',
          'ไอเดีย', 'หัวข้อ', 'แนะนำ', 'คอนเทนต์', 'สร้างสรรค์',
          // English fallback
          'what to write', 'content ideas', 'latest trends', 'popular'
        ];
        
        const hasTrendingIntent = trendingKeywords.some(kw => content.includes(kw));
        
        // Force prefetch if forceWebSearch flag is set OR trending intent detected
        const shouldPrefetch = forceWebSearch || hasTrendingIntent;
        
        if (shouldPrefetch) {
          logger.info('Detected trending intent, prefetching web search', { 
            keywords: trendingKeywords.filter(kw => content.includes(kw))
          });
          
          // Build industry-specific search query
          const industryName = industryMemory?.name || brandContext?.industry?.[0] || 'business';
          // Build search query based on detected language context
          const hasThaiContent = content.match(/[\u0E00-\u0E7F]/);
          const searchQuery = hasThaiContent
            ? `เทรนด์คอนเทนต์ ${industryName} สัปดาห์นี้ trending topics content marketing`
            : `xu hướng nội dung ${industryName} tuần này trending topics content marketing`;
          
          try {
            prefetchedTrends = await withTimeout(
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
              12000, // 12s timeout for entire operation
              'Prefetch web search timed out'
            );
            
            if (prefetchedTrends && prefetchedTrends.success && prefetchedTrends.results.length > 0) {
              logger.info('Prefetch web search successful', {
                source: prefetchedTrends.source,
                resultsCount: prefetchedTrends.results.length,
                cacheHit: prefetchedTrends.cache_hit,
              });
              
              // Build prefetch section for system prompt
              prefetchSection = `
## 🔍 Web Trends Context (Prefetched)
Dữ liệu xu hướng được tự động tìm kiếm cho ngành "${industryName}":

${prefetchedTrends.results.slice(0, 6).map((r, i) => 
  `${i + 1}. **${r.title}**
   - ${r.snippet}
   ${r.content_angle ? `- Góc nội dung: ${r.content_angle}` : ''}`
).join('\n\n')}

${prefetchedTrends.citations?.length > 0 ? `
**Nguồn tham khảo:**
${prefetchedTrends.citations.slice(0, 3).map(c => `- ${c}`).join('\n')}
` : ''}

⚡ Sử dụng dữ liệu này để gợi ý topics cụ thể và relevant cho user.
`;
            } else {
              logger.warn('Prefetch web search returned no results, using fallback note');
              prefetchSection = `
## 🔍 Web Trends Context
⚠️ Đang sử dụng dữ liệu dự phòng do không thể tìm kiếm web ngay lúc này.
Hãy gợi ý các topic dựa trên:
- Các chủ đề evergreen của ngành "${industryName}"
- Content pillars của brand
- Xu hướng phổ biến theo mùa/thời điểm

Lưu ý: Không nói với user rằng "công cụ tìm kiếm bị lỗi". Thay vào đó, đưa ra gợi ý dựa trên kiến thức hiện có.
`;
            }
          } catch (prefetchErr) {
            logger.warn('Prefetch web search failed', { 
              error: prefetchErr instanceof Error ? prefetchErr.message : String(prefetchErr) 
            });
            prefetchSection = `
## 🔍 Web Trends Context
⚠️ Đang sử dụng dữ liệu dự phòng do không thể tìm kiếm web ngay lúc này.
Hãy gợi ý các topic dựa trên kiến thức về ngành và brand context có sẵn.
Lưu ý: Không nói với user rằng "công cụ tìm kiếm bị lỗi". Đưa ra gợi ý hữu ích dựa trên context.
`;
          }
        }
      }
    }

    // Calculate context fetch duration
    const contextFetchDurationMs = Math.round(performance.now() - contextFetchStart);
    logger.timed('context_fetch', 'Context fetching complete', contextFetchDurationMs, {
      brandContext: !!brandContext,
      industryMemory: !!industryMemory,
      ragResults: ragResults.length,
      personas: personasContext.length,
      products: productsContext.length,
      prefetchedTrends: !!prefetchedTrends,
    });

    // ============ TOKEN MANAGEMENT ============
    // Initialize token manager for context window control
    const tokenManager = createTokenManager('google/gemini-2.5-flash');
    const conversationTokens = estimateConversationTokens(messages);
    
    // Check if conversation history needs summarization
    let processedMessages = messages;
    let conversationSummarized = false;
    const maxConversationTokens = Math.floor(tokenManager.getAvailableBudget() * 0.4); // Reserve 40% for conversation
    
    if (conversationTokens > maxConversationTokens && messages.length > 6) {
      const summarized = summarizeConversationHistory(
        messages,
        maxConversationTokens,
        6 // Keep last 6 messages
      );
      
      if (summarized.summarized) {
        processedMessages = summarized.messages;
        conversationSummarized = true;
        logger.info('Conversation history summarized', {
          originalMessages: messages.length,
          summarizedMessages: processedMessages.length,
          originalTokens: conversationTokens,
          newTokens: estimateConversationTokens(processedMessages),
        });
      }
    }

    // Build system prompt with all context using shared builder
    const systemPrompt = buildSystemPrompt(
      brandContext, 
      contentGoal, 
      recentTopics, 
      personasContext, 
      productsContext, 
      productPersonaContext, 
      industryMemory, 
      learningContext, 
      journeyMessaging, 
      sampleTexts, 
      industryGlossary,
      ragResults,
      userPreferences,
      sessionMemory,
      conversationRagSection,
      prefetchSection // NEW: Prefetched web search for trending intent
    );

    // Graph Engine is the only execution mode
    const finalSystemPrompt = systemPrompt;

    // Token budget validation
    const systemPromptTokens = estimateTokenCount(finalSystemPrompt);
    const totalInputTokens = systemPromptTokens + estimateConversationTokens(processedMessages);
    const budgetStatus = tokenManager.getBudgetStatus(totalInputTokens);
    
    logger.info('Token budget status', {
      systemPromptTokens,
      conversationTokens: estimateConversationTokens(processedMessages),
      totalInputTokens,
      available: budgetStatus.available,
      utilizationPercent: budgetStatus.utilizationPercent,
      status: budgetStatus.status,
      conversationSummarized,
    });

    // Warn if approaching limits
    if (budgetStatus.status === 'critical') {
      logger.warn('Token budget critical', {
        utilization: budgetStatus.utilizationPercent,
        remaining: budgetStatus.remaining,
      });
    }

    // Prepare messages for AI
    const aiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...processedMessages,
    ];

    // Legacy estimate for metrics (keeping backward compatibility)
    const inputTokensEstimated = totalInputTokens;

    // Build context metadata for transparency
    const contextMetadata = buildContextMetadata({
      industryMemory: industryMemory || undefined,
      brandContext: brandContext || undefined,
      learningContext: learningContext || undefined,
      userPreferences: userPreferences || undefined,
      sessionMemory: sessionMemory || undefined,
      ragResults: ragResults.length > 0 ? ragResults : undefined,
      industryGlossary: industryGlossary.length > 0 ? industryGlossary : undefined,
      personasContext: personasContext.length > 0 ? personasContext : undefined,
      productsContext: productsContext.length > 0 ? productsContext : undefined,
      journeyMessaging: journeyMessaging.length > 0 ? journeyMessaging : undefined,
      sampleTexts: sampleTexts || undefined,
      conversationRagResults: conversationRagResults.length > 0 ? conversationRagResults : undefined,
      webSearchResults: prefetchedTrends?.results || undefined, // Prefetched web search results
    });
    
    // Get context sources for metrics
    const contextSources = getContextSources({
      industryMemory,
      brandContext,
      learningContext,
      ragResults,
      glossary: industryGlossary,
      personas: personasContext.length > 0 ? personasContext : undefined,
      products: productsContext.length > 0 ? productsContext : undefined,
      journeyMessaging,
      sampleTexts,
      userPreferences,
      sessionMemory,
      conversationRag: conversationRagResults.length > 0 ? conversationRagResults : undefined,
    });

    logger.info('Context summary', { 
      sources: contextSources.join(', '),
      badgeCount: contextMetadata.badges.length,
      richnessScore: contextMetadata.context_richness_score,
    });

    // ============ GRAPH ENGINE MODE ============
    {
      logger.info('Starting Graph Engine execution', { inputTokensEstimated });

      const nodeContext: NodeExecutionContext = {
        supabase,
        userId: resolvedUserId || undefined,
        organizationId: organizationId || undefined,
        brandTemplateId: brandTemplateId || undefined,
        brandName: brandContext?.brandName,
        industry: brandContext?.industry?.[0],
        userAccessToken: userAccessToken || undefined,
        complianceRules: industryMemory?.compliance_rules?.map(r => typeof r === 'string' ? r : r.rule),
      };

      const nodeRegistry = createNodeRegistry(nodeContext);

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const sseWriter = createSSEWriter(writer);
      let pendingWrites = Promise.resolve();

      const enqueueEvent = (event: any) => {
        pendingWrites = pendingWrites
          .then(() => sseWriter.write(event))
          .catch((err) => {
            logger.warn('Failed to stream graph event', {
              eventType: event?.type,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      };

      // Send context metadata first
      const metadataEvent = `data: ${serializeContextMetadata(contextMetadata)}\n\n`;
      writer.write(encoder.encode(metadataEvent));

      const aiCallStart = performance.now();
      (async () => {
        let hadError = false;
        let errorType: string | undefined;
        let errorMessage: string | undefined;
        let contentStr = '';

        // Heartbeat
        const heartbeatInterval = setInterval(() => {
          writer.write(encoder.encode(':heartbeat\n\n')).catch(() => {});
        }, 15000);

        try {
          let userMessage = processedMessages[processedMessages.length - 1]?.content || '';

          // Prompt Guard: sanitize user input
          const guardResult = sanitizeInput(userMessage);
          if (guardResult.riskLevel !== 'none') {
            logger.warn('Prompt injection detected', {
              riskLevel: guardResult.riskLevel,
              patterns: guardResult.flaggedPatterns,
            });
            // Fire-and-forget log
            logSecurityEvent(supabase, resolvedUserId, organizationId || undefined, guardResult).catch(() => {});
            userMessage = guardResult.sanitizedMessage;
          }

          const graphResult = await runOrchestrator(userMessage, nodeRegistry, {
            organizationId: organizationId || undefined,
            brandMemoryContext: undefined, // brand_memory node handles this
            maxExecutionMs: 55000,
            conversationHistory: processedMessages.map(m => ({ role: m.role, content: m.content })),
            onEvent: (event) => {
              enqueueEvent(event);
            },
          });

          // Flush all pending events
          await pendingWrites;

          // Stream final content
          const finalContent = graphResult.state.generatedContent
            || graphResult.state.researchData
            || graphResult.state.nodeResults
                .filter(r => r.success && r.content)
                .map(r => r.content)
                .join('\n\n')
            || 'Xin lỗi, không thể xử lý yêu cầu này.';

          contentStr = typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent);
          const chunks = contentStr.match(/.{1,100}/g) || [];
          for (const chunk of chunks) {
            await sseWriter.write({ type: 'content_chunk', data: { chunk } });
          }

          await writer.write(encoder.encode('data: [DONE]\n\n'));

          logger.info('Graph Engine complete', {
            executedNodes: graphResult.executedNodes,
            skippedNodes: graphResult.skippedNodes,
            status: graphResult.state.status,
            exitReason: graphResult.state.exitReason,
            plan: graphResult.state.orchestratorPlan?.reasoning,
          });
        } catch (err) {
          hadError = true;
          errorType = err instanceof Error ? err.name : 'UnknownError';
          errorMessage = err instanceof Error ? err.message : 'Unknown error';
          logger.error('Graph Engine error', err instanceof Error ? err : undefined);

          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            data: { message: errorMessage },
          })}\n\n`;
          await writer.write(encoder.encode(errorEvent));
        } finally {
          clearInterval(heartbeatInterval);
          await writer.close();

          if (!hadError && userId) {
            logUsage(supabase, userId, 'ai_edit', undefined, {
              mode: 'graph_engine',
              brandTemplateId,
            }).catch(err => logger.warn('Failed to log usage', { error: err.message }));
          }

          const aiCallDurationMs = Math.round(performance.now() - aiCallStart);
          const totalDurationMs = Math.round(performance.now() - requestStartTime);
          const model = 'google/gemini-2.5-flash';
          const outputTokensEstimated = Math.ceil((contentStr?.length || 200) / 4);
          const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);

          saveMetrics(supabase, {
            traceId: logger.getTraceId(),
            functionName: 'chat-topics',
            organizationId: organizationId || undefined,
            userId: userId || undefined,
            brandTemplateId: brandTemplateId || undefined,
            totalDurationMs,
            aiCallDurationMs,
            contextFetchDurationMs,
            inputTokensEstimated,
            outputTokensEstimated,
            contextSources,
            contextRichnessScore: contextMetadata.context_richness_score,
            exitReason: 'graph_engine',
            hadError,
            errorType,
            errorMessage,
            modelsUsed: { default: model, graphEngine: true },
            estimatedCostUsd,
          }).catch(err => logger.warn('Failed to save metrics', { error: err.message }));
        }
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }
    // (Legacy supervisor, agentic loop, and single-turn modes removed — Graph Engine is the only path)

  } catch (error) {
    console.error('Chat-topics error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
