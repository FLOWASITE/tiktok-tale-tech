import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

async function callAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
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
  console.log(`[callAI] Success via ${result.provider}, content length: ${content.length}`);
  return content;
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
  };
}> {
  console.log(`[generateSinglePass] Starting with model: ${model}, maxTokens: ${maxTokens}`);
  
  onProgress?.('generating', 10, 'Generating content...');
  
  const prompt = buildSinglePassPrompt(config);
  
  let content: string;
  if (onChunk) {
    content = await callAIStreaming(
      model,
      prompt,
      `Write high-quality Core Content about: ${config.topic}`,
      maxTokens,
      0.7,
      onChunk
    );
  } else {
    content = await callAI(
      model,
      prompt,
      `Write high-quality Core Content about: ${config.topic}`,
      maxTokens,
      0.7
    );
  }
  
  onProgress?.('complete', 95, 'Finalizing...');
  
  return {
    content,
    metadata: {
      stepsCompleted: ['single_pass'],
      modelsUsed: [model],
      totalTokensEstimated: maxTokens,
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
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

    // Get user from auth header with body userId fallback
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    let isServiceRoleCall = false;
    const bodyUserId = (body as any).userId || (body as any).user_id || null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

      if (token === serviceRoleKey || token === anonKey) {
        // Internal trusted call (from tool-executor or other edge functions)
        isServiceRoleCall = true;
        userId = bodyUserId;
      } else {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          userId = user.id;
        } else {
          // JWT invalid, fallback to body userId
          userId = bodyUserId;
          if (userId) isServiceRoleCall = true;
        }
      }
    }

    // Verify org membership if using body userId (security check)
    const orgId = body.organizationId || (body as any).organization_id || null;
    if (isServiceRoleCall && userId && orgId) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle();
      if (!member) {
        console.warn(`[generate-core-content] Body userId ${userId} is not a member of org ${orgId}, resetting to null`);
        userId = null;
      }
    }
    const {
      topic,
      contentGoal,
      contentAngle,
      contentRole,
      lengthMode = 'medium',
      brandTemplateId,
      organizationId,
      targetAudience,
      additionalContext,
      topicHistoryId,
      stream = false,
      enableResearch = false,
      researchRecency = 'month',
      taskId,
    } = body;
    
    // Validate required fields
    if (!topic || topic.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Topic is required (min 5 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Set organization ID for multi-provider AI calls
    currentOrganizationId = organizationId;
    
    console.log(`[generate-core-content] Topic: "${topic.slice(0, 50)}...", Length: ${lengthMode}, Stream: ${stream}`);
    
    // ========== FETCH MODEL FROM ADMIN CONFIG ==========
    let model = getDefaultModel();
    try {
      const aiConfig = await getAIConfig('generate-core-content', organizationId);
      if (aiConfig.model) {
        model = aiConfig.model;
        console.log(`[generate-core-content] Using admin config model: ${model}`);
      }
    } catch (configErr) {
      console.warn('[generate-core-content] Failed to fetch admin config, using default model:', configErr);
    }
    
    // Calculate max tokens based on length mode
    const maxTokens = getMaxTokens(lengthMode as CoreContentLengthMode);
    
    // Fetch brand template
    let brandContext: BrandContext | null = null;
    if (brandTemplateId) {
      const { data: brandData } = await supabase
        .from('brand_templates')
        .select('*')
        .eq('id', brandTemplateId)
        .single();
      
      if (brandData) {
        brandContext = {
          brandName: brandData.brand_name,
          brandPositioning: brandData.brand_positioning || undefined,
          toneOfVoice: brandData.tone_of_voice || undefined,
          uniqueValueProposition: brandData.unique_value_proposition || undefined,
          contentPillars: brandData.content_pillars || undefined,
          evergreenThemes: brandData.evergreen_themes || undefined,
          industry: brandData.industry || undefined,
          targetAgeRange: brandData.target_age_range || undefined,
          targetGender: brandData.target_gender || undefined,
          brandHashtags: brandData.brand_hashtags || undefined,
          mainCompetitors: brandData.main_competitors || undefined,
          preferredWords: brandData.preferred_words || undefined,
          bannedWords: brandData.forbidden_words || undefined,
          sentenceStyle: brandData.sentence_style || undefined,
          emojiPolicy: brandData.emoji_policy || undefined,
        };
        console.log(`[generate-core-content] Loaded brand: ${brandData.brand_name}`);
      }
    }
    
    // Fetch personas if brand exists
    let personas: CustomerPersonaContext[] = [];
    if (brandTemplateId) {
      const { data: personaData } = await supabase
        .from('customer_personas')
        .select('name, occupation, pain_points, buying_triggers, communication_style')
        .eq('brand_template_id', brandTemplateId)
        .limit(3);
      
      if (personaData) {
        personas = personaData.map(p => ({
          name: p.name,
          description: p.occupation || undefined,
          pain_points: p.pain_points || undefined,
          triggers: p.buying_triggers || undefined,
          communication_style: p.communication_style || undefined,
        }));
      }
    }
    
    // Fetch products if brand exists
    let products: BrandProductContext[] = [];
    if (brandTemplateId) {
      const { data: productData } = await supabase
        .from('brand_products')
        .select('name, description, unique_selling_points, benefits, suggested_content_angles')
        .eq('brand_template_id', brandTemplateId)
        .eq('is_active', true)
        .limit(3);
      
      if (productData) {
        products = productData.map(p => ({
          name: p.name,
          description: p.description || undefined,
          unique_selling_points: p.unique_selling_points || undefined,
          benefits: p.benefits || undefined,
          content_angles: p.suggested_content_angles || undefined,
        }));
      }
    }
    
    // ========== AUTO RESEARCH (Optional) ==========
    let researchContext = '';
    let researchData: ResearchResult | null = null;
    
    if (enableResearch) {
      console.log(`[generate-core-content] Performing auto research for: "${topic.slice(0, 50)}..."`);
      
      researchData = await performResearch({
        topic,
        industry: brandContext?.industry,
        recency: researchRecency,
        maxFacts: 8,
        organizationId,
      });
      
      if (researchData.success && researchData.facts.length > 0) {
        researchContext = buildResearchContext(researchData);
        console.log(`[generate-core-content] Research found ${researchData.facts.length} facts`);
      }
    }
    
    const enrichedContext = [additionalContext, researchContext].filter(Boolean).join('\n\n');
    
    // ========== SMART CONTEXT (Few-shot Learning) ==========
    let smartContextInjection = '';
    
    try {
      const smartContext = await buildSmartContext(supabase, {
        qualityMode: 'balanced', // Always use balanced for smart context
        brandTemplateId,
        organizationId,
        includeHookPatterns: false,
        includeCTAPatterns: false,
        includeLearning: true,
      });
      
      if (smartContext.fewShotExamples || smartContext.negativePatterns) {
        smartContextInjection = [
          smartContext.fewShotExamples,
          smartContext.negativePatterns,
        ].filter(Boolean).join('\n\n');
        console.log(`[generate-core-content] Smart context loaded, richness: ${smartContext.contextRichnessScore}`);
      }
    } catch (err) {
      console.warn('[generate-core-content] Failed to build smart context:', err);
    }
    
    // ========== KNOWLEDGE GRAPH CONTEXT (Phase 6) ==========
    let knowledgeGraphContext: KnowledgeGraphContext | null = null;
    let knowledgeGraphInjection = '';
    
    try {
      // Fetch industry template ID from brand template if available
      let industryTemplateId: string | undefined;
      if (brandTemplateId) {
        const { data: brandData } = await supabase
          .from('brand_templates')
          .select('industry_template_id')
          .eq('id', brandTemplateId)
          .single();
        industryTemplateId = brandData?.industry_template_id;
      }
      
      knowledgeGraphContext = await fetchKnowledgeGraphContext(supabase, {
        topic,
        industryTemplateId,
        organizationId,
        limit: 10,
      });
      
      if (knowledgeGraphContext.regulations.length > 0 || knowledgeGraphContext.relevantTerms.length > 0) {
        knowledgeGraphInjection = buildKnowledgeGraphPromptSection(knowledgeGraphContext);
        console.log(`[generate-core-content] Knowledge Graph loaded: ${knowledgeGraphContext.regulations.length} regulations, ${knowledgeGraphContext.relevantTerms.length} terms`);
      }
    } catch (err) {
      console.warn('[generate-core-content] Failed to fetch Knowledge Graph context:', err);
    }
    
    // ========== PROMPT MANAGER INTEGRATION ==========
    const promptManager = createPromptManager(
      supabase,
      'generate-core-content',
      organizationId,
      brandTemplateId
    );
    
    const lengthConfigData = getLengthConfig(lengthMode as CoreContentLengthMode);
    const wordBudgetData = getWordBudgetByLength(lengthMode as CoreContentLengthMode);
    
    const promptVariables = {
      topic,
      contentGoalDescription: getGoalDescription(contentGoal),
      contentAngle: contentAngle ? getAngleDescription(contentAngle) : '',
      roleContext: buildRoleContext(contentRole),
      brandContext: buildBrandContextBlock(brandContext),
      personaContext: buildPersonaContextBlock(personas),
      productContext: buildProductContextBlock(products),
      targetAudience: targetAudience || '',
      additionalContext: enrichedContext || '',
      smartContextInjection: smartContextInjection || '',
      knowledgeGraphContext: knowledgeGraphInjection || '',
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
    
    let registrySystemPrompt: string | null = null;
    try {
      registrySystemPrompt = await promptManager.get('system_prompt', promptVariables);
      console.log(`[generate-core-content] Using registry system_prompt (${registrySystemPrompt.length} chars)`);
    } catch (promptErr) {
      console.warn('[generate-core-content] Failed to fetch registry prompt, will use hardcoded fallback:', promptErr);
    }
    
    // Build pipeline config
    const pipelineConfig: EnhancedPromptConfig = {
      topic,
      contentGoal: contentGoal || 'education',
      contentAngle,
      role: contentRole,
      lengthMode: lengthMode as CoreContentLengthMode,
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
            sse.sendError('Generated content too short');
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
            { lengthMode: lengthMode as CoreContentLengthMode }
          );
          const qualityScore = qualityMetrics.overall;
          
          console.log(`[generate-core-content] Quality Gate: ${qualityScore}/100`);
          
          // Save to database
          const { data: coreContent, error: insertError } = await supabase
            .from('core_contents')
            .insert({
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
            })
            .select('id')
            .single();
          
          if (insertError) {
            console.error(`[generate-core-content] Insert error:`, insertError);
            clearInterval(keepAliveInterval);
            sse.sendError(`Failed to save: ${insertError.message}`);
            sse.close();
            return;
          }
          
          // Save metrics
          try {
            const inputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.4);
            const outputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.6);
            const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
            
            await saveMetrics(supabase, {
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
              contentId: coreContent.id,
              contextSources: enableResearch ? ['research'] : [],
            });
          } catch (metricsErr) {
            console.warn(`[generate-core-content] Failed to save metrics:`, metricsErr);
          }
          
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
    
    // Save to database
    const { data: coreContent, error: insertError } = await supabase
      .from('core_contents')
      .insert({
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
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error(`[generate-core-content] Insert error:`, insertError);
      throw new Error(`Failed to save core content: ${insertError.message}`);
    }
    
    // Save metrics
    try {
      const inputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.4);
      const outputTokensEstimated = Math.round(result.metadata.totalTokensEstimated * 0.6);
      const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
      
      await saveMetrics(supabase, {
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
      });
    } catch (metricsErr) {
      console.warn(`[generate-core-content] Failed to save metrics:`, metricsErr);
    }
    
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
});
