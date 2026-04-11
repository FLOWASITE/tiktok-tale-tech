import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSSEWriter } from "../_shared/sse-writer.ts";
import { serializeContextMetadata } from "../_shared/context-tracker.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { runOrchestrator, createNodeRegistry, type NodeExecutionContext } from "../_shared/graph/graph-engine.ts";
import { ChatMessage, ChatRequest } from "../_shared/types/chat-types.ts";
import { estimateTokenCount, estimateConversationTokens } from "../_shared/token-manager.ts";
import { sanitizeInput, logSecurityEvent } from "../_shared/prompt-guard.ts";
import { createLogger, saveMetrics, AIMetrics } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { validateCheckpoint, completeCheckpoint } from "../_shared/graph/checkpoint.ts";

// Pipeline modules (Sprint 7A)
import { validateRequest } from "../_shared/pipeline/request-validator.ts";
import { fetchAllContext } from "../_shared/pipeline/context-fetcher.ts";
import { processTokenBudget } from "../_shared/pipeline/token-processor.ts";
import { assemblePrompt } from "../_shared/pipeline/prompt-assembler.ts";

export type { ContentGoal } from "./content-goal-type.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(withPerf({ functionName: 'chat-topics', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger({ functionName: 'chat-topics' });
  const requestStartTime = performance.now();

  try {
    const { messages, brandTemplateId, contentGoal, organizationId, userId, forceWebSearch, continuationToken }: ChatRequest & { continuationToken?: string } = await req.json();

    if (userId) logger.info('Request received', { userId, organizationId, brandTemplateId, continuationToken: !!continuationToken });

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve user from JWT
    const authHeader = req.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    let resolvedUserId = userId;
    let userAccessToken = '';
    if (rawToken && rawToken !== supabaseKey) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(rawToken);
        if (!authError && user?.id) {
          resolvedUserId = user.id;
          userAccessToken = rawToken;
        }
      } catch { /* fallback to body userId */ }
    }

    // ============ CONTINUATION RESUME PATH ============
    if (continuationToken) {
      logger.info('Continuation token received, validating...', { continuationToken });
      const validation = await validateCheckpoint(supabase, continuationToken);

      if (validation.valid && validation.checkpoint) {
        logger.info('Checkpoint valid, resuming from node', { 
          nodeName: validation.checkpoint.nodeName,
          sessionId: validation.checkpoint.sessionId,
        });

        const checkpointState = validation.checkpoint.graphState;
        const completedNodes = new Set(
          checkpointState.nodeResults
            ?.filter((nr: any) => nr.success)
            .map((nr: any) => nr.nodeName) || []
        );

        const nodeContext: NodeExecutionContext = {
          supabase,
          userId: resolvedUserId || undefined,
          organizationId: organizationId || undefined,
          brandTemplateId: brandTemplateId || undefined,
          userAccessToken: userAccessToken || undefined,
        };

        const nodeRegistry = createNodeRegistry(nodeContext);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const sseWriter = createSSEWriter(writer);

        (async () => {
          try {
            const graphResult = await runOrchestrator(
              checkpointState.userMessage,
              nodeRegistry,
              {
                organizationId: organizationId || undefined,
                maxExecutionMs: 55000,
                conversationHistory: checkpointState.messages?.map((m: any) => ({ role: m.role, content: m.content })),
                onEvent: (event) => {
                  sseWriter.write(event).catch(() => {});
                },
                supabaseClient: supabase,
                completedNodes,
                resumedState: checkpointState,
              }
            );

            // Stream final content
            const finalContent = graphResult.state.generatedContent
              || graphResult.state.nodeResults
                  .filter(r => r.success && r.content)
                  .map(r => r.content)
                  .join('\n\n')
              || 'Xin lỗi, không thể xử lý yêu cầu này.';

            const contentStr = typeof finalContent === 'string' ? finalContent : 'Đã hoàn tất.';
            const chunks = contentStr.match(/.{1,100}/g) || [];
            for (const chunk of chunks) {
              await sseWriter.write({ type: 'content_chunk', data: { chunk } });
            }
            await writer.write(encoder.encode('data: [DONE]\n\n'));

            // Mark checkpoint completed
            completeCheckpoint(supabase, continuationToken).catch(() => {});

            logger.info('Continuation resume complete', {
              executedNodes: graphResult.executedNodes,
              skippedNodes: graphResult.skippedNodes,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error('Continuation resume error', err instanceof Error ? err : undefined);
            const errorEvent = `data: ${JSON.stringify({ type: 'error', data: { message: errorMessage } })}\n\n`;
            await writer.write(encoder.encode(errorEvent));
          } finally {
            await writer.close();
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
      } else {
        logger.warn('Checkpoint invalid, falling through to fresh run', { reason: validation.reason });
      }
    }

    // ============ STEP 1: VALIDATE REQUEST ============
    const validation = await validateRequest(supabase, userId, corsHeaders, logger);
    if (!validation.allowed) {
      return validation.errorResponse!;
    }

    // ============ STEP 2: FETCH ALL CONTEXT ============
    const contextFetchStart = performance.now();
    const ctx = await fetchAllContext(supabase, { messages, brandTemplateId, organizationId, userId, forceWebSearch }, logger);
    const contextFetchDurationMs = Math.round(performance.now() - contextFetchStart);

    logger.timed('context_fetch', 'Context fetching complete', contextFetchDurationMs, {
      brandContext: !!ctx.brandContext,
      industryMemory: !!ctx.industryMemory,
      ragResults: ctx.ragResults.length,
      personas: ctx.personasContext.length,
      products: ctx.productsContext.length,
      prefetchedTrends: !!ctx.prefetchedTrends,
    });

    // ============ STEP 3: ASSEMBLE PROMPT ============
    const { systemPrompt, contextMetadata, contextSources } = assemblePrompt(ctx, contentGoal);

    // ============ STEP 4: PROCESS TOKEN BUDGET ============
    const tokenResult = processTokenBudget(messages, systemPrompt, 'google/gemini-2.5-flash', logger);
    const { processedMessages, totalInputTokens } = tokenResult;

    logger.info('Context summary', {
      sources: contextSources.join(', '),
      badgeCount: contextMetadata.badges.length,
      richnessScore: contextMetadata.context_richness_score,
    });

    // ============ STEP 5: GRAPH ENGINE EXECUTION ============
    logger.info('Starting Graph Engine execution', { inputTokensEstimated: totalInputTokens });

    const nodeContext: NodeExecutionContext = {
      supabase,
      userId: resolvedUserId || undefined,
      organizationId: organizationId || undefined,
      brandTemplateId: brandTemplateId || undefined,
      brandName: ctx.brandContext?.brandName,
      industry: ctx.brandContext?.industry?.[0],
      userAccessToken: userAccessToken || undefined,
      complianceRules: ctx.industryMemory?.compliance_rules?.map((r: any) => typeof r === 'string' ? r : r.rule),
    };

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

    // Wire content node progress to SSE
    nodeContext.onContentProgress = (subStep: string, label: string, progress: number) => {
      enqueueEvent({ type: 'node_progress', data: { node: 'content', subStep, label, progress } });
    };

    const nodeRegistry = createNodeRegistry(nodeContext);

    // Send context metadata first
    const metadataEvent = `data: ${serializeContextMetadata(contextMetadata)}\n\n`;
    writer.write(encoder.encode(metadataEvent));

    const aiCallStart = performance.now();
    (async () => {
      let hadError = false;
      let errorType: string | undefined;
      let errorMessage: string | undefined;
      let contentStr = '';

      const heartbeatInterval = setInterval(() => {
        writer.write(encoder.encode(':heartbeat\n\n')).catch(() => {});
      }, 15000);

      try {
        let userMessage = processedMessages[processedMessages.length - 1]?.content || '';

        // Prompt Guard
        const guardResult = sanitizeInput(userMessage);
        if (guardResult.riskLevel !== 'none') {
          logger.warn('Prompt injection detected', { riskLevel: guardResult.riskLevel, patterns: guardResult.flaggedPatterns });
          logSecurityEvent(supabase, resolvedUserId, organizationId || undefined, guardResult).catch(() => {});
          userMessage = guardResult.sanitizedMessage;
        }

        const graphResult = await runOrchestrator(userMessage, nodeRegistry, {
          organizationId: organizationId || undefined,
          brandMemoryContext: undefined,
          maxExecutionMs: 55000,
          conversationHistory: processedMessages.map(m => ({ role: m.role, content: m.content })),
          onEvent: (event) => { enqueueEvent(event); },
          supabaseClient: supabase,
        });

        await pendingWrites;

        // Stream final content
        // Clean fallback: never stringify raw objects into chat bubble
        const researchSummary = graphResult.state.researchData?.summary;
        const finalContent = graphResult.state.generatedContent
          || (typeof researchSummary === 'string' && researchSummary.length > 20 ? researchSummary : null)
          || graphResult.state.nodeResults
              .filter(r => r.success && r.content)
              .map(r => r.content)
              .join('\n\n')
          || 'Xin lỗi, không thể xử lý yêu cầu này.';

        contentStr = typeof finalContent === 'string' ? finalContent : 'Đã hoàn tất phân tích. Vui lòng thử lại nếu cần chi tiết hơn.';
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

        const errorEvent = `data: ${JSON.stringify({ type: 'error', data: { message: errorMessage } })}\n\n`;
        await writer.write(encoder.encode(errorEvent));
      } finally {
        clearInterval(heartbeatInterval);
        await writer.close();

        // ai_edit usage logging removed (unlimited)

        const aiCallDurationMs = Math.round(performance.now() - aiCallStart);
        const totalDurationMs = Math.round(performance.now() - requestStartTime);
        const model = 'google/gemini-2.5-flash';
        const outputTokensEstimated = Math.ceil((contentStr?.length || 200) / 4);
        const estimatedCostUsd = estimateCost(model, totalInputTokens, outputTokensEstimated);

        saveMetrics(supabase, {
          traceId: logger.getTraceId(),
          functionName: 'chat-topics',
          organizationId: organizationId || undefined,
          userId: userId || undefined,
          brandTemplateId: brandTemplateId || undefined,
          totalDurationMs,
          aiCallDurationMs,
          contextFetchDurationMs,
          inputTokensEstimated: totalInputTokens,
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

  } catch (error) {
    console.error('Chat-topics error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
