import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CoreContentConfig,
  EnhancedPromptConfig,
  CoreContentLengthMode,
  getWordBudgetByLength,
  getLengthConfig,
  getMaxTokens,
  getDefaultModel,
  buildSinglePassPrompt,
  buildBrandContextBlock,
  buildPersonaContextBlock,
  buildProductContextBlock,
  buildRoleContext,
  buildCompetitiveContextBlock,
  buildStyleGuideBlock,
  getGoalDescription,
  getAngleDescription,
  CustomerPersonaContext,
  BrandProductContext,
} from '../_shared/core-content-pipeline.ts';
import { BrandContext } from '../_shared/types/chat-types.ts';
import { performResearch, buildResearchContext, ResearchResult, ResearchRecency } from '../_shared/research-helper.ts';
import { buildSmartContext, SmartContextResult } from '../_shared/smart-context.ts';
import { evaluateCoreContentQuality, QualityMetrics } from '../_shared/quality-gate.ts';
import { saveMetrics, generateTraceId } from '../_shared/logger.ts';
import { estimateCost, estimateTotalCost } from '../_shared/cost-estimator.ts';
import { getAIConfig } from '../_shared/ai-config.ts';
import { callAI as callAIProvider } from '../_shared/ai-provider.ts';
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { 
  updateTaskProgress, 
  completeTask, 
  failTask 
} from '../_shared/task-tracking.ts';
// NEW: Knowledge Graph Integration - Phase 6
import {
  fetchKnowledgeGraphContext,
  buildKnowledgeGraphPromptSection,
  type KnowledgeGraphContext,
} from "../_shared/data-fetchers/knowledge-graph-fetcher.ts";

// ============================================
// SSE STREAMING HELPERS
// ============================================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });
  
  const send = (event: Record<string, unknown>) => {
    if (controller) {
      try {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      } catch (e) {
        console.error('[SSE] Error sending:', e);
      }
    }
  };
  
  const sendProgress = (step: string, progress: number, message: string, extra?: { estimatedRemainingMs?: number }) => {
    send({ type: 'progress', step, progress, message, ...extra });
  };
  
  const sendKeepAlive = () => {
    send({ type: 'keepalive', timestamp: Date.now() });
  };
  
  const sendText = (content: string) => {
    send({ type: 'streaming_text', content });
  };
  
  const sendResult = (data: Record<string, unknown>) => {
    send({ type: 'result', data });
  };
  
  const sendError = (message: string) => {
    send({ type: 'error', message });
  };
  
  const close = () => {
    if (controller) {
      try {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        console.error('[SSE] Error closing:', e);
      }
    }
  };
  
  return { stream, send, sendProgress, sendText, sendResult, sendError, sendKeepAlive, close };
}

// ============================================
// CORS & REQUEST TYPES
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GenerateCoreContentRequest {
  topic: string;
  contentGoal: string;
  contentAngle?: string;
  contentRole?: 'seed' | 'sprout' | 'harvest';
  lengthMode?: 'short' | 'medium' | 'long';
  brandTemplateId?: string;
  organizationId?: string;
  targetAudience?: string;
  additionalContext?: string;
  topicHistoryId?: string;
  stream?: boolean;
  enableResearch?: boolean;
  researchRecency?: ResearchRecency;
  taskId?: string;
}

interface CoreContentResponse {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  keyMessages: string[];
  qualityScore: number;
  aiModel: string;
  generationMetadata?: {
    stepsCompleted: string[];
    totalTokensEstimated: number;
    modelsUsed: string[];
    generationTimeMs: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function extractKeyMessages(content: string): string[] {
  const messages: string[] = [];
  
  const bulletMatches = content.match(/^[\-\*•]\s+(.+)$/gm);
  if (bulletMatches) {
    bulletMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^[\-\*•]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  const numberedMatches = content.match(/^\d+[\.\)]\s+(.+)$/gm);
  if (numberedMatches) {
    numberedMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^\d+[\.\)]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    boldMatches.slice(0, 3).forEach(m => {
      const cleaned = m.replace(/\*\*/g, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        messages.push(cleaned);
      }
    });
  }
  
  return [...new Set(messages)].slice(0, 5);
}

function generateTitle(topic: string, content: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].slice(0, 200);
  
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1].slice(0, 200);
  
  return topic.length > 200 ? topic.slice(0, 197) + '...' : topic;
}

// Organization ID for provider config lookup
let currentOrganizationId: string | undefined;

// ============================================
// AI CALL HELPER - SIMPLIFIED SINGLE-PASS
// ============================================

interface AICallWithUsage {
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number; upstream_cost?: number } | null;
}

async function callAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
  const result = await callAIWithUsage(model, systemPrompt, userPrompt, maxTokens, temperature);
  return result.content;
}

async function callAIWithUsage(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<AICallWithUsage> {
  console.log(`[callAI] Model: ${model}, MaxTokens: ${maxTokens}, OrgId: ${currentOrganizationId || 'none'}`);
  
  const result = await callAIProvider({
    functionName: 'generate-core-content',
    organizationId: currentOrganizationId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokensOverride: maxTokens,
    temperatureOverride: temperature,
    modelOverride: model,
  });
  
  if (!result.success) {
    console.error(`[callAI] Provider call failed:`, result.error);
    throw new Error(result.error || 'AI call failed');
  }
  
  const content = result.data?.choices?.[0]?.message?.content || '';
  
  // Extract actual token usage from API response
  const usage = result.data?.usage ? {
    prompt_tokens: result.data.usage.prompt_tokens || 0,
    completion_tokens: result.data.usage.completion_tokens || 0,
    upstream_cost: result.data.usage.cost_details?.upstream_inference_cost,
  } : null;
  
  console.log(`[callAI] Success via ${result.provider}, content length: ${content.length}${usage ? `, tokens: ${usage.prompt_tokens}+${usage.completion_tokens}` : ''}`);
  return { content, usage };
}

// AI Call with Streaming support
async function callAIStreaming(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7,
  onChunk?: (text: string) => void
): Promise<string> {
  console.log(`[callAIStreaming] Model: ${model}, MaxTokens: ${maxTokens}, OrgId: ${currentOrganizationId || 'none'}`);
  
  const result = await callAIProvider({
    functionName: 'generate-core-content',
    organizationId: currentOrganizationId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokensOverride: maxTokens,
    temperatureOverride: temperature,
    modelOverride: model,
    stream: true,
  });
  
  if (!result.success) {
    console.error(`[callAIStreaming] Provider call failed:`, result.error);
    throw new Error(result.error || 'AI streaming call failed');
  }
  
  // Handle streaming response
  const reader = result.data?.getReader?.();
  if (!reader) {
    // Non-streaming fallback
    const content = result.data?.choices?.[0]?.message?.content || '';
    if (onChunk && content) {
      onChunk(content);
    }
    return content;
  }
  
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          const reasoning = parsed.choices?.[0]?.delta?.reasoning || '';
          if (delta) {
            fullText += delta;
            onChunk?.(delta);
          }
          // For reasoning/thinking models: if final chunk has full message content, capture it
          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason && !fullText && parsed.choices?.[0]?.message?.content) {
            fullText = parsed.choices[0].message.content;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
  
  console.log(`[callAIStreaming] Success via ${result.provider}, content length: ${fullText.length}`);
  
  // Fallback: if streaming returned empty (e.g. reasoning model), retry non-streaming
  if (!fullText) {
    console.warn('[callAIStreaming] Streaming returned empty, retrying non-streaming...');
    return callAI(model, systemPrompt, userPrompt, maxTokens, temperature);
  }
  
  return fullText;
}

// ============================================
// SINGLE-PASS GENERATION
// ============================================

async function generateSinglePass(
  config: EnhancedPromptConfig,
  model: string,
  maxTokens: number,
  onProgress?: (step: string, progress: number, message: string) => void,
  onChunk?: (text: string) => void
): Promise<{
  content: string;
  metadata: {
    stepsCompleted: string[];
    modelsUsed: string[];
    totalTokensEstimated: number;
    actualUsage?: { prompt_tokens: number; completion_tokens: number; upstream_cost?: number } | null;
  };
}> {
  console.log(`[generateSinglePass] Starting with model: ${model}, maxTokens: ${maxTokens}`);
  
  onProgress?.('generating', 10, 'AI đang tạo nội dung...');
  
  const prompt = buildSinglePassPrompt(config);
  const userMsg = `Write high-quality Core Content about: ${config.topic}`;
  
  // --- Soft time-based progress ticker ---
  let currentSoftProgress = 10;
  let hasReceivedChunk = false;
  const softProgressInterval = setInterval(() => {
    if (!hasReceivedChunk && currentSoftProgress < 85) {
      currentSoftProgress = Math.min(currentSoftProgress + 3, 85);
      onProgress?.('generating', currentSoftProgress, 'AI đang xử lý...');
    }
  }, 3000);
  
  const modelsUsed: string[] = [];
  let content = '';
  let actualUsage: { prompt_tokens: number; completion_tokens: number; upstream_cost?: number } | null = null;
  
  try {
    if (onChunk) {
      // Track accumulated text length for dynamic progress (10% -> 90%)
      let accumulatedLength = 0;
      let lastProgressSent = 10;
      const expectedLength = maxTokens * 3.5;
      
      const wrappedOnChunk = (text: string) => {
        hasReceivedChunk = true;
        accumulatedLength += text.length;
        
        const ratio = Math.min(accumulatedLength / expectedLength, 1);
        const estimatedProgress = Math.round(10 + ratio * 80);
        
        if (estimatedProgress >= lastProgressSent + 5) {
          lastProgressSent = estimatedProgress;
          currentSoftProgress = estimatedProgress;
          onProgress?.('generating', Math.min(estimatedProgress, 90), 'AI đang tạo nội dung...');
        }
        
        onChunk(text);
      };
      
      content = await callAIStreaming(model, prompt, userMsg, maxTokens, 0.7, wrappedOnChunk);
      // Streaming doesn't return usage, estimate from content length
      actualUsage = {
        prompt_tokens: Math.ceil((prompt.length + userMsg.length) / 3),
        completion_tokens: Math.ceil(content.length / 3),
      };
    } else {
      const result = await callAIWithUsage(model, prompt, userMsg, maxTokens, 0.7);
      content = result.content;
      actualUsage = result.usage;
    }
    modelsUsed.push(model);
    
    // --- Fallback if content is empty or too short ---
    if (!content || content.length < 300) {
      const FALLBACK_MODEL = 'google/gemini-2.5-flash';
      console.warn(`[generateSinglePass] Primary model returned ${content?.length || 0} chars, falling back to ${FALLBACK_MODEL}`);
      onProgress?.('fallback', 50, `Chuyển sang model dự phòng...`);
      
      const fallbackResult = await callAIWithUsage(FALLBACK_MODEL, prompt, userMsg, maxTokens, 0.7);
      content = fallbackResult.content;
      actualUsage = fallbackResult.usage; // Use fallback usage
      modelsUsed.push(FALLBACK_MODEL);
      
      if (!content || content.length < 300) {
        throw new Error('Không thể tạo nội dung đủ chất lượng sau khi thử nhiều model. Vui lòng thử lại.');
      }
      console.log(`[generateSinglePass] Fallback model produced ${content.length} chars`);
    }
  } finally {
    clearInterval(softProgressInterval);
  }
  
  onProgress?.('complete', 95, 'Finalizing...');
  
  return {
    content,
    metadata: {
      stepsCompleted: modelsUsed.length > 1 ? ['single_pass', 'fallback'] : ['single_pass'],
      modelsUsed,
      totalTokensEstimated: actualUsage ? (actualUsage.prompt_tokens + actualUsage.completion_tokens) : maxTokens,
      actualUsage,
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(withPerf({ functionName: 'generate-core-content', slowThresholdMs: 45000 }, async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body first (need body.userId for fallback)
    const body: GenerateCoreContentRequest = await req.json();
    const {
      topic, contentGoal, contentAngle, contentRole,
      brandTemplateId, targetAudience, additionalContext, topicHistoryId,
      stream, enableResearch, researchRecency, taskId,
    } = body;
    const effectiveLengthMode = (body.lengthMode as CoreContentLengthMode) || 'medium';

    // Get auth info needed for parallel resolution
    const authHeader = req.headers.get('authorization');
    const bodyUserId = (body as any).userId || (body as any).user_id || null;
    const organizationId = body.organizationId || (body as any).organization_id || null;
    
    // ========== PHASE 1: PARALLEL AUTH + DATA FETCHING ==========
    // Auth verification runs concurrently with all DB queries
    console.log(`[generate-core-content] Phase 1: Starting parallel auth + data fetching...`);
    const phase1Start = Date.now();
    
    // Helper to resolve auth (runs in parallel with other fetches)
    const resolveAuth = async (): Promise<{ userId: string | null; isServiceRoleCall: boolean }> => {
      let userId: string | null = null;
      let isServiceRoleCall = false;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

        if (token === serviceRoleKey || token === anonKey) {
          isServiceRoleCall = true;
          userId = bodyUserId;
        } else {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user?.id) {
            userId = user.id;
          } else {
            userId = bodyUserId;
            if (userId) isServiceRoleCall = true;
          }
        }
      }

      // Verify org membership if using body userId
      if (isServiceRoleCall && userId && organizationId) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .limit(1)
          .maybeSingle();
        if (!member) {
          console.warn(`[generate-core-content] Body userId ${userId} is not a member of org ${organizationId}, resetting to null`);
          userId = null;
        }
      }
      return { userId, isServiceRoleCall };
    };
    
    const [authResult, aiConfigResult, brandResult, personasResult, productsResult, smartCtxResult] = 
      await Promise.allSettled([
        // 0. Auth (parallel with everything else)
        resolveAuth(),
        // 1. AI Config
        getAIConfig('generate-core-content', organizationId),
        // 2. Brand template
        brandTemplateId 
          ? supabase.from('brand_templates').select('*').eq('id', brandTemplateId).single()
          : Promise.resolve({ data: null }),
        // 3. Personas
        brandTemplateId
          ? supabase.from('customer_personas')
              .select('name, occupation, pain_points, buying_triggers, communication_style')
              .eq('brand_template_id', brandTemplateId).limit(3)
          : Promise.resolve({ data: null }),
        // 4. Products
        brandTemplateId
          ? supabase.from('brand_products')
              .select('name, description, unique_selling_points, benefits, suggested_content_angles')
              .eq('brand_template_id', brandTemplateId).eq('is_active', true).limit(3)
          : Promise.resolve({ data: null }),
        // 5. Smart Context
        buildSmartContext(supabase, {
          qualityMode: 'balanced',
          brandTemplateId,
          organizationId,
          includeHookPatterns: false,
          includeCTAPatterns: false,
          includeLearning: true,
        }).catch(err => { console.warn('[generate-core-content] Smart context failed:', err); return null; }),
      ]);
    
    console.log(`[generate-core-content] Phase 1 completed in ${Date.now() - phase1Start}ms`);
    
    // --- Extract Auth ---
    let userId: string | null = null;
    if (authResult.status === 'fulfilled') {
      userId = authResult.value.userId;
    } else {
      console.warn('[generate-core-content] Auth resolution failed:', authResult.reason);
    }
    
    // --- Extract AI Config ---
    const aiConfig = aiConfigResult.status === 'fulfilled' ? aiConfigResult.value : null;

    // --- Extract Brand Data ---
    const brandData = brandResult.status === 'fulfilled' ? brandResult.value?.data : null;
    const brandContext: BrandContext | null = brandData ? {
      brandName: brandData.brand_name || '',
      industry: brandData.industry || [],
      toneOfVoice: brandData.tone_of_voice || [],
      brandPositioning: brandData.brand_positioning || undefined,
      uniqueValueProposition: brandData.unique_value_proposition || undefined,
      contentPillars: brandData.content_pillars || [],
      mainCompetitors: brandData.main_competitors || [],
      preferredWords: brandData.preferred_words || [],
      bannedWords: brandData.forbidden_words || [],
      sentenceStyle: brandData.sentence_style || undefined,
      emojiPolicy: brandData.emoji_policy || undefined,
    } : null;

    // --- Extract Personas ---
    const personas = personasResult.status === 'fulfilled' ? (personasResult.value?.data || []) : [];

    // --- Extract Products ---
    const products = productsResult.status === 'fulfilled' ? (productsResult.value?.data || []) : [];

    // --- Extract Smart Context ---
    const smartCtx = smartCtxResult.status === 'fulfilled' ? smartCtxResult.value : null;
    const smartContextInjection = smartCtx?.contextInjection || '';

    // --- Derive model & maxTokens ---
    const model = aiConfig?.model || getDefaultModel();
    const maxTokens = getMaxTokens(effectiveLengthMode);

    // ========== PHASE 2: PARALLEL RESEARCH + KG + PROMPT ==========
    // These depend on Phase 1 results (brandContext, brandData) but are independent of each other
    console.log(`[generate-core-content] Phase 2: Starting parallel Research + KG + Prompt...`);
    const phase2Start = Date.now();
    
    const promptManager = createPromptManager(supabase, 'generate-core-content', organizationId, brandTemplateId);
    const lengthConfigData = getLengthConfig(effectiveLengthMode);
    const wordBudgetData = getWordBudgetByLength(effectiveLengthMode);
    
    // Use industry_template_id from Phase 1 brand data (no duplicate query!)
    const industryTemplateId = brandData?.industry_template_id;
    
    const [researchSettled, kgSettled, promptSettled] = await Promise.allSettled([
      // 1. Research (Perplexity)
      enableResearch 
        ? performResearch({
            topic,
            industry: brandContext?.industry,
            recency: researchRecency,
            maxFacts: 8,
            organizationId,
          })
        : Promise.resolve(null),
      // 2. Knowledge Graph (reuses industryTemplateId from Phase 1)
      fetchKnowledgeGraphContext(supabase, {
        topic,
        industryTemplateId,
        organizationId,
        limit: 10,
      }).catch(err => { console.warn('[generate-core-content] KG failed:', err); return null; }),
      // 3. Prompt Registry (needs promptVariables built from Phase 1 data)
      // We build variables inline since they're ready
      (async () => {
        const promptVariables = {
          topic,
          contentGoalDescription: getGoalDescription(contentGoal),
          contentAngle: contentAngle ? getAngleDescription(contentAngle) : '',
          roleContext: buildRoleContext(contentRole),
          brandContext: buildBrandContextBlock(brandContext),
          personaContext: buildPersonaContextBlock(personas),
          productContext: buildProductContextBlock(products),
          targetAudience: targetAudience || '',
          additionalContext: additionalContext || '', // Will be enriched after research
          smartContextInjection: smartContextInjection || '',
          knowledgeGraphContext: '', // Will be filled after KG
          targetWords: lengthConfigData.targetWords.toString(),
          minWords: lengthConfigData.minWords.toString(),
          maxWords: lengthConfigData.maxWords.toString(),
          introWords: lengthConfigData.sectionBudgets.intro.toString(),
          analysisWords: lengthConfigData.sectionBudgets.analysis.toString(),
          impactWords: lengthConfigData.sectionBudgets.impact.toString(),
          solutionWords: lengthConfigData.sectionBudgets.solution.toString(),
          conclusionWords: lengthConfigData.sectionBudgets.conclusion.toString(),
          competitiveContext: buildCompetitiveContextBlock(brandContext),
          styleGuide: buildStyleGuideBlock(brandContext),
        };
        return promptManager.get('system_prompt', promptVariables);
      })().catch(err => { console.warn('[generate-core-content] Prompt registry failed:', err); return null; }),
    ]);
    
    console.log(`[generate-core-content] Phase 2 completed in ${Date.now() - phase2Start}ms`);
    
    // --- Extract Research ---
    let researchContext = '';
    let researchData: ResearchResult | null = null;
    if (researchSettled.status === 'fulfilled' && researchSettled.value) {
      researchData = researchSettled.value;
      if (researchData.success && researchData.facts.length > 0) {
        researchContext = buildResearchContext(researchData);
        console.log(`[generate-core-content] Research found ${researchData.facts.length} facts`);
      }
    }
    
    const enrichedContext = [additionalContext, researchContext].filter(Boolean).join('\n\n');
    
    // --- Extract Knowledge Graph ---
    let knowledgeGraphInjection = '';
    if (kgSettled.status === 'fulfilled' && kgSettled.value) {
      const kgCtx = kgSettled.value as KnowledgeGraphContext;
      if (kgCtx.regulations.length > 0 || kgCtx.relevantTerms.length > 0) {
        knowledgeGraphInjection = buildKnowledgeGraphPromptSection(kgCtx);
        console.log(`[generate-core-content] Knowledge Graph loaded: ${kgCtx.regulations.length} regulations, ${kgCtx.relevantTerms.length} terms`);
      }
    }
    
    // --- Extract Registry Prompt ---
    let registrySystemPrompt: string | null = null;
    if (promptSettled.status === 'fulfilled' && promptSettled.value) {
      registrySystemPrompt = promptSettled.value as string;
      console.log(`[generate-core-content] Using registry system_prompt (${registrySystemPrompt.length} chars)`);
    }
    
    // Build pipeline config
    const pipelineConfig: EnhancedPromptConfig = {
      topic,
      contentGoal: contentGoal || 'education',
      contentAngle,
      role: contentRole,
      lengthMode: effectiveLengthMode,
      brandContext,
      personas,
      products,
      targetAudience,
      additionalContext: [enrichedContext, knowledgeGraphInjection].filter(Boolean).join('\n\n') || undefined,
      smartContextInjection: smartContextInjection || undefined,
      registrySystemPrompt: registrySystemPrompt || undefined,
    };
    
    // ========== STREAMING MODE ==========
    if (stream) {
      const sse = createSSEStream();
      
      if (taskId) {
        await updateTaskProgress(supabase, taskId, 0, 'Đang khởi tạo...', 'init', 'generating');
      }
      
      if (enableResearch && researchData) {
        sse.sendProgress('research', 5, `Đã thu thập ${researchData.facts.length} facts từ web`);
        if (taskId) {
          await updateTaskProgress(supabase, taskId, 5, `Đã thu thập ${researchData.facts.length} facts`, 'research');
        }
      }
      
      const keepAliveInterval = setInterval(() => {
        sse.sendKeepAlive();
      }, 15000);
      
      (async () => {
        try {
          const result = await generateSinglePass(
            pipelineConfig,
            model,
            maxTokens,
            (step, progress, message) => {
              sse.sendProgress(step, progress, message);
              updateTaskProgress(supabase, taskId, progress, message, step);
            },
            (chunk) => sse.sendText(chunk)
          );
          
          if (!result.content || result.content.length < 300) {
            clearInterval(keepAliveInterval);
            const errMsg = 'Nội dung AI tạo ra quá ngắn hoặc rỗng. Vui lòng thử lại.';
            console.error(`[generate-core-content] ${errMsg} (length: ${result.content?.length || 0})`);
            if (taskId) {
              await failTask(supabase, taskId, errMsg);
            }
            sse.sendError(errMsg);
            sse.close();
            return;
          }
          
          const wordCount = countWords(result.content);
          const keyMessages = extractKeyMessages(result.content);
          const title = generateTitle(topic, result.content);
          const duration = Date.now() - startTime;
          
          // Quality Gate Evaluation
          const qualityMetrics = evaluateCoreContentQuality(
            result.content,
            brandContext,
            null, // No outline in single-pass
            'balanced', // Legacy parameter, ignored
            { lengthMode: effectiveLengthMode }
          );
          const qualityScore = qualityMetrics.overall;
          
          console.log(`[generate-core-content] Quality Gate: ${qualityScore}/100`);
          
          // Save to database + metrics in PARALLEL
          const insertData = {
            title,
            topic,
            content: result.content,
            word_count: wordCount,
            content_goal: contentGoal || 'education',
            content_angle: contentAngle || null,
            content_role: contentRole || null,
            target_audience: targetAudience || null,
            key_messages: keyMessages,
            brand_template_id: brandTemplateId || null,
            organization_id: organizationId,
            user_id: userId,
            source_type: 'ai_generated',
            source_topic_history_id: topicHistoryId || null,
            quality_score: qualityScore,
            ai_model_used: model,
            status: 'draft',
            outline: null,
            generation_metadata: {
              lengthMode: effectiveLengthMode,
              stepsCompleted: enableResearch ? ['research', ...result.metadata.stepsCompleted] : result.metadata.stepsCompleted,
              totalTokensEstimated: result.metadata.totalTokensEstimated,
              modelsUsed: result.metadata.modelsUsed,
              generationTimeMs: duration,
              researchEnabled: enableResearch,
              researchFacts: researchData?.facts?.length || 0,
              qualityMetrics: {
                overall: qualityMetrics.overall,
                breakdown: qualityMetrics.breakdown,
                issues: qualityMetrics.issues,
                suggestions: qualityMetrics.suggestions,
                passesThreshold: qualityMetrics.passesThreshold,
              },
            },
          };
          
          const actualUsage = result.metadata.actualUsage;
          const inputTokensEstimated = actualUsage?.prompt_tokens || Math.round(result.metadata.totalTokensEstimated * 0.4);
          const outputTokensEstimated = actualUsage?.completion_tokens || Math.round(result.metadata.totalTokensEstimated * 0.6);
          const estimatedCostUsd = actualUsage?.upstream_cost || estimateCost(model, inputTokensEstimated, outputTokensEstimated);
          
          const [insertResult, _metricsResult] = await Promise.allSettled([
            supabase.from('core_contents').insert(insertData).select('id').single(),
            saveMetrics(supabase, {
              traceId: generateTraceId(),
              functionName: 'generate-core-content',
              organizationId,
              userId: userId || undefined,
              brandTemplateId: brandTemplateId || undefined,
              totalDurationMs: duration,
              inputTokensEstimated,
              outputTokensEstimated,
              modelsUsed: { step_0: model },
              estimatedCostUsd,
              hadError: false,
              contextSources: enableResearch ? ['research'] : [],
            }),
          ]);
          
          if (insertResult.status === 'rejected' || !insertResult.value?.data) {
            const insertError = insertResult.status === 'rejected' ? insertResult.reason : insertResult.value?.error;
            console.error(`[generate-core-content] Insert error:`, insertError);
            clearInterval(keepAliveInterval);
            sse.sendError(`Failed to save: ${insertError?.message || 'Unknown insert error'}`);
            sse.close();
            return;
          }
          
          const coreContent = insertResult.value.data;
          
          if (taskId) {
            await completeTask(supabase, taskId, coreContent.id, 'core_contents');
          }
          
          sse.sendResult({
            id: coreContent.id,
            title,
            content: result.content,
            wordCount,
            keyMessages,
            qualityScore,
            aiModel: model,
            generationMetadata: {
              stepsCompleted: result.metadata.stepsCompleted,
              totalTokensEstimated: result.metadata.totalTokensEstimated,
              modelsUsed: result.metadata.modelsUsed,
              generationTimeMs: duration,
            },
          });
          
          clearInterval(keepAliveInterval);
          sse.close();
        } catch (error) {
          console.error(`[generate-core-content] Stream error:`, error);
          
          if (taskId) {
            await failTask(supabase, taskId, error instanceof Error ? error.message : 'Unknown error');
          }
          
          clearInterval(keepAliveInterval);
          sse.sendError(error instanceof Error ? error.message : 'Unknown error');
          sse.close();
        }
      })();
      
      return new Response(sse.stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // ========== NON-STREAMING MODE ==========
    const result = await generateSinglePass(pipelineConfig, model, maxTokens);
    
    if (!result.content || result.content.length < 300) {
      throw new Error('Generated content too short');
    }
    
    const wordCount = countWords(result.content);
    const keyMessages = extractKeyMessages(result.content);
    const title = generateTitle(topic, result.content);
    const duration = Date.now() - startTime;
    
    // Quality Gate Evaluation
    const qualityMetrics = evaluateCoreContentQuality(
      result.content,
      brandContext,
      null,
      'balanced',
      { lengthMode: lengthMode as CoreContentLengthMode }
    );
    const qualityScore = qualityMetrics.overall;
    
    console.log(`[generate-core-content] Generated ${wordCount} words, score: ${qualityScore}, time: ${duration}ms`);
    
    // Save to database + metrics in PARALLEL
    const insertData = {
      title,
      topic,
      content: result.content,
      word_count: wordCount,
      content_goal: contentGoal || 'education',
      content_angle: contentAngle || null,
      content_role: contentRole || null,
      target_audience: targetAudience || null,
      key_messages: keyMessages,
      brand_template_id: brandTemplateId || null,
      organization_id: organizationId,
      user_id: userId,
      source_type: 'ai_generated',
      source_topic_history_id: topicHistoryId || null,
      quality_score: qualityScore,
      ai_model_used: model,
      status: 'draft',
      outline: null,
      generation_metadata: {
        lengthMode,
        stepsCompleted: enableResearch ? ['research', ...result.metadata.stepsCompleted] : result.metadata.stepsCompleted,
        totalTokensEstimated: result.metadata.totalTokensEstimated,
        modelsUsed: result.metadata.modelsUsed,
        generationTimeMs: duration,
        researchEnabled: enableResearch,
        researchFacts: researchData?.facts?.length || 0,
        qualityMetrics: {
          overall: qualityMetrics.overall,
          breakdown: qualityMetrics.breakdown,
          issues: qualityMetrics.issues,
          suggestions: qualityMetrics.suggestions,
          passesThreshold: qualityMetrics.passesThreshold,
        },
      },
    };
    
    // Use actual usage from AI response if available, otherwise estimate
    const actualUsage = result.metadata.actualUsage;
    let inputTokensEstimated: number;
    let outputTokensEstimated: number;
    let estimatedCostUsd: number;
    
    if (actualUsage) {
      inputTokensEstimated = actualUsage.prompt_tokens;
      outputTokensEstimated = actualUsage.completion_tokens;
      // Prefer upstream cost from provider if available
      if (actualUsage.upstream_cost) {
        estimatedCostUsd = actualUsage.upstream_cost;
        console.log(`[generate-core-content] Actual cost from provider: $${estimatedCostUsd.toFixed(6)}`);
      } else {
        estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
      }
      console.log(`[generate-core-content] Actual tokens: ${inputTokensEstimated} input + ${outputTokensEstimated} output`);
    } else {
      inputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.4);
      outputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.6);
      estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
    }
    
    const [insertResult, _metricsResult] = await Promise.allSettled([
      supabase.from('core_contents').insert(insertData).select('id').single(),
      saveMetrics(supabase, {
        traceId: generateTraceId(),
        functionName: 'generate-core-content',
        organizationId: organizationId || undefined,
        userId: userId || undefined,
        brandTemplateId: brandTemplateId || undefined,
        totalDurationMs: duration,
        inputTokensEstimated,
        outputTokensEstimated,
        modelsUsed: { step_0: model },
        estimatedCostUsd,
        hadError: false,
        contextSources: enableResearch ? ['research'] : [],
      }),
    ]);
    
    if (insertResult.status === 'rejected' || !insertResult.value?.data) {
      const insertError = insertResult.status === 'rejected' ? insertResult.reason : insertResult.value?.error;
      console.error(`[generate-core-content] Insert error:`, insertError);
      throw new Error(`Failed to save core content: ${insertError?.message || 'Unknown insert error'}`);
    }
    
    const coreContent = insertResult.value.data;
    
    console.log(`[generate-core-content] Saved with ID: ${coreContent.id}`);
    
    const response: CoreContentResponse = {
      id: coreContent.id,
      title,
      content: result.content,
      wordCount,
      keyMessages,
      qualityScore,
      aiModel: model,
      generationMetadata: {
        stepsCompleted: enableResearch ? ['research', ...result.metadata.stepsCompleted] : result.metadata.stepsCompleted,
        totalTokensEstimated: result.metadata.totalTokensEstimated,
        modelsUsed: result.metadata.modelsUsed,
        generationTimeMs: duration,
      },
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[generate-core-content] Error:`, error);
    
    const status = error instanceof Error && error.message.includes('Rate limits') ? 429 
      : error instanceof Error && error.message.includes('Payment required') ? 402 
      : 500;
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}));
