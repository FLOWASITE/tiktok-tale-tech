/**
 * Streaming Handler for generate-multichannel
 * 
 * Handles SSE streaming mode while using the full context from the main function.
 * This module provides token-by-token streaming with all features intact:
 * - Industry Memory
 * - Extended Brand Context  
 * - Self-Critique (post-stream)
 * - Footer Info
 * - Marketing Frameworks
 */

import { callAI, iterateStreamDeltas, getProviderFromModel } from "./ai-provider.ts";
import { isCircuitOpen } from "./circuit-breaker.ts";
import { formatFooterInfo, type FooterInfo } from "./channel-prompt-builder.ts";
import { calculateChannelMaxTokens } from "./dynamic-tokens.ts";
import { 
  type ChannelOptimization,
  getEffectiveQualityMode,
  applyTokenOptimization,
} from "./channel-optimization.ts";

// ============================================
// TYPES
// ============================================

export interface StreamingContext {
  organizationId: string | null;
  userId: string | null;
  channels: string[];
  topic: string;
  contentGoal: string;
  qualityMode?: 'fast' | 'balanced' | 'quality'; // NEW: For dynamic token calculation
  brandTemplateId?: string;
  brandName: string;
  // Footer context
  footerInfo: FooterInfo | null;
  channelOverrides: Record<string, any> | null;
  brandAllowEmoji: boolean;
  companyName: string | null;
  tagline: string | null;
  // Footer control - whether to append footer after generation
  includeFooterInfo: boolean; // Default: true
  // Model configs per channel
  channelModelConfigs: Map<string, { model: string; temperature: number; maxTokens: number | null }>;
  defaultModel: string;
  defaultTemperature: number;
  // Critique context (for post-streaming self-critique)
  brandVoice?: any;
  mergedRules?: any;
  // NEW: Per-channel optimization configs
  channelOptimizations?: Record<string, ChannelOptimization>;
}

export interface StreamingProgressEvent {
  type: 'progress' | 'result' | 'error' | 'streaming_text';
  step?: string;
  progress?: number;
  message?: string;
  data?: any;
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  streamingChunk?: {
    channel: string;
    text: string;
    isComplete: boolean;
  };
}

export interface GenerateChannelStreamingParams {
  channel: string;
  systemPrompt: string;
  userPrompt: string;
  context: StreamingContext;
  emit: (event: StreamingProgressEvent) => boolean;
}

// ============================================
// STREAMING GENERATION
// ============================================

// Max concurrent channel generations - tuned for optimal throughput
const MAX_PARALLEL_CHANNELS = 4;

// Pre-allocated buffers for streaming - reduces GC pressure
const STREAM_BUFFER_SIZE = 64 * 1024; // 64KB

export interface ChannelGenerationResult {
  content: string;
  success: boolean;
  error?: string;
  tokenUsage?: { inputTokens: number; outputTokens: number };
  modelUsed?: string;
  usedFallback?: boolean;
}

export interface ParallelStreamingResult {
  channelResults: Record<string, string>;
  completedChannels: string[];
  errors: Record<string, string>;
  stats: {
    totalDurationMs: number;
    channelDurations: Record<string, number>;
    // NEW: Token and model tracking for metrics
    modelsUsed: Record<string, string>;
    tokenUsage: Record<string, { input: number; output: number }>;
    totalInputTokens: number;
    totalOutputTokens: number;
    usedFallback: boolean;
    fallbackModels: string[];
  };
}

/**
 * Generate content for multiple channels in PARALLEL with interleaved streaming
 * OPTIMIZED: Uses Promise.allSettled for resilience, pre-allocated results
 * ENHANCED: Emits 'channel_complete' event immediately when each channel finishes
 * NEW: Tracks token usage and models for metrics
 */
export async function generateChannelsParallel(params: {
  channels: string[];
  systemPrompt: string;
  buildUserPrompt: (channel: string) => string;
  context: StreamingContext;
  emit: (event: StreamingProgressEvent) => boolean;
  onChannelComplete?: (channel: string, content: string) => void;
}): Promise<ParallelStreamingResult> {
  const { channels, systemPrompt, buildUserPrompt, context, emit, onChannelComplete } = params;
  
  // Pre-allocate result containers
  const channelResults: Record<string, string> = Object.create(null);
  const completedChannels: string[] = [];
  const errors: Record<string, string> = Object.create(null);
  const channelDurations: Record<string, number> = Object.create(null);
  
  // NEW: Metrics tracking
  const modelsUsed: Record<string, string> = Object.create(null);
  const tokenUsage: Record<string, { input: number; output: number }> = Object.create(null);
  let usedFallback = false;
  const fallbackModels: string[] = [];
  
  const startTime = Date.now();
  
  // Optimized batch processor using allSettled for resilience
  const processBatch = async (batch: string[]): Promise<void> => {
    const results = await Promise.allSettled(
      batch.map(async (channel) => {
        const channelStart = Date.now();
        const userPrompt = buildUserPrompt(channel);
        
        const result = await generateChannelStreaming({
          channel,
          systemPrompt,
          userPrompt,
          context,
          emit,
        });
        
        channelDurations[channel] = Date.now() - channelStart;
        return { channel, result };
      })
    );
    
    // Process results - faster than individual awaits
    for (const settled of results) {
      if (settled.status === 'fulfilled') {
        const { channel, result } = settled.value;
        if (result.success) {
          channelResults[channel] = result.content;
          completedChannels.push(channel);
          
          // Track model and token usage
          if (result.modelUsed) {
            modelsUsed[channel] = result.modelUsed;
          }
          if (result.tokenUsage) {
            tokenUsage[channel] = {
              input: result.tokenUsage.inputTokens,
              output: result.tokenUsage.outputTokens,
            };
          }
          if (result.usedFallback) {
            usedFallback = true;
            if (result.modelUsed) {
              fallbackModels.push(result.modelUsed);
            }
          }
          
          // EARLY RETURN: Emit channel_complete immediately so UI can show it
          emit({
            type: 'progress',
            step: 'channel_complete',
            message: `${getChannelDisplayName(channel)} hoàn thành`,
            currentChannel: channel,
            completedChannels: [...completedChannels],
            totalChannels: channels,
            progress: Math.round((completedChannels.length / channels.length) * 80) + 20, // 20-100%
          });
          
          onChannelComplete?.(channel, result.content);
        } else {
          errors[channel] = result.error || 'Unknown error';
          
          // Emit error for individual channel (graceful degradation)
          emit({
            type: 'progress',
            step: 'channel_error',
            message: `${getChannelDisplayName(channel)}: ${result.error}`,
            currentChannel: channel,
          });
        }
      } else {
        // Handle rejected promise - shouldn't happen but be safe
        console.error('[parallel-streaming] Unexpected rejection:', settled.reason);
      }
    }
  };
  
  // Process all batches - optimized loop
  const batchCount = Math.ceil(channels.length / MAX_PARALLEL_CHANNELS);
  for (let i = 0; i < batchCount; i++) {
    const start = i * MAX_PARALLEL_CHANNELS;
    const batch = channels.slice(start, start + MAX_PARALLEL_CHANNELS);
    await processBatch(batch);
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Calculate total tokens
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const usage of Object.values(tokenUsage)) {
    totalInputTokens += usage.input;
    totalOutputTokens += usage.output;
  }
  
  // Log performance stats
  console.log(`[parallel-streaming] Completed ${completedChannels.length}/${channels.length} channels in ${totalDuration}ms, tokens: ${totalInputTokens}+${totalOutputTokens}`);
  if (Object.keys(errors).length > 0) {
    console.warn(`[parallel-streaming] Errors:`, errors);
  }
  
  return { 
    channelResults, 
    completedChannels, 
    errors,
    stats: {
      totalDurationMs: totalDuration,
      channelDurations,
      modelsUsed,
      tokenUsage,
      totalInputTokens,
      totalOutputTokens,
      usedFallback,
      fallbackModels,
    },
  };
}

/**
 * Generate content for a single channel with real-time token streaming
 * OPTIMIZED: Reduced logging, batch token accumulation, streamlined error handling
 * NEW: Returns token usage and model info for metrics
 */
export async function generateChannelStreaming(
  params: GenerateChannelStreamingParams
): Promise<ChannelGenerationResult> {
  const { channel, systemPrompt, userPrompt, context, emit } = params;
  
  // Get model config - use nullish coalescing for speed
  const channelConfig = context.channelModelConfigs.get(channel);
  let effectiveModel = channelConfig?.model ?? context.defaultModel;
  let effectiveTemperature = channelConfig?.temperature ?? context.defaultTemperature;

  // Provider-aware fallback: if the channel-specific override targets a provider
  // whose circuit is currently OPEN (e.g. Lovable Gateway after 402 'Not enough credits'),
  // fall back to the group/default model so we don't waste a round-trip on a known-bad path.
  if (channelConfig?.model && channelConfig.model !== context.defaultModel) {
    try {
      const overrideProvider = getProviderFromModel(channelConfig.model);
      const isCloudProvider = overrideProvider === "lovable" || overrideProvider === "openrouter";
      if (isCloudProvider && (await isCircuitOpen(channelConfig.model))) {
        console.warn(
          `[channel-routing] ${channel} override "${channelConfig.model}" (${overrideProvider}) circuit OPEN — falling back to "${context.defaultModel}"`
        );
        effectiveModel = context.defaultModel;
        effectiveTemperature = context.defaultTemperature;
      }
    } catch (err) {
      console.warn(`[channel-routing] fallback check failed for ${channel}:`, err);
    }
  }
  
  // Get channel optimization for token adjustment
  const channelOpt = context.channelOptimizations?.[channel];
  
  // Calculate dynamic max_tokens based on channel and context
  let dynamicMaxTokens = calculateChannelMaxTokens(channel, {
    contentGoal: context.contentGoal,
    qualityMode: context.qualityMode,
    channelMaxLength: channelConfig?.maxTokens ?? undefined,
  });
  
  // Apply channel optimization token adjustment (costPriority affects token count)
  if (channelOpt) {
    dynamicMaxTokens = applyTokenOptimization(dynamicMaxTokens, channelOpt);
  }
  
  // Estimate input tokens (rough: ~3 chars per token for mixed content)
  const inputTokensEstimate = Math.ceil((systemPrompt.length + userPrompt.length) / 3);
  
  const startTime = Date.now();

  try {
    const aiResult = await callAI({
      functionName: 'generate-multichannel',
      organizationId: context.organizationId || undefined,
      modelOverride: effectiveModel,
      temperatureOverride: effectiveTemperature,
      maxTokensOverride: dynamicMaxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    if (!aiResult.success || !aiResult.data) {
      return { 
        content: '', 
        success: false, 
        error: aiResult.error || 'AI call failed',
        modelUsed: effectiveModel,
        tokenUsage: { inputTokens: inputTokensEstimate, outputTokens: 0 },
        usedFallback: false,
      };
    }

    // Optimized streaming with array join (faster than string concat)
    // Token batching: accumulate tokens for 80ms before emitting
    const contentParts: string[] = [];
    let outputTokenCount = 0;
    let tokenBuffer = '';
    let lastEmitTime = Date.now();
    const BATCH_INTERVAL_MS = 80;

    try {
      for await (const delta of iterateStreamDeltas(aiResult.data)) {
        if (delta.done) break;

        if (delta.content) {
          contentParts.push(delta.content);
          outputTokenCount++;
          tokenBuffer += delta.content;

          // Batch emit: only send when 80ms elapsed since last emit
          const now = Date.now();
          if (now - lastEmitTime >= BATCH_INTERVAL_MS) {
            emit({
              type: 'streaming_text',
              streamingChunk: {
                channel,
                text: tokenBuffer,
                isComplete: false,
              },
            });
            tokenBuffer = '';
            lastEmitTime = now;
          }
        }
      }
    } catch (streamError) {
      // Don't log - already handled by AI provider
    }

    // Flush remaining tokens in buffer
    if (tokenBuffer) {
      emit({
        type: 'streaming_text',
        streamingChunk: {
          channel,
          text: tokenBuffer,
          isComplete: false,
        },
      });
    }

    // Mark complete
    emit({
      type: 'streaming_text',
      streamingChunk: { channel, text: '', isComplete: true },
    });

    // Build final content efficiently
    let fullContent = contentParts.join('');

    // Append footer if user opted in (default: true)
    if (context.includeFooterInfo !== false) {
      const footerText = formatFooterInfo(
        context.footerInfo,
        channel,
        context.brandAllowEmoji,
        context.channelOverrides,
        context.companyName,
        context.tagline
      );

      if (footerText) {
        fullContent += footerText;
        emit({
          type: 'streaming_text',
          streamingChunk: { channel, text: footerText, isComplete: false },
        });
      }
    }

    // Estimate output tokens based on content length
    const outputTokensEstimate = Math.max(outputTokenCount, Math.ceil(fullContent.length / 3));

    return { 
      content: fullContent, 
      success: true,
      modelUsed: effectiveModel,
      tokenUsage: { 
        inputTokens: inputTokensEstimate, 
        outputTokens: outputTokensEstimate 
      },
      usedFallback: false, // TODO: Get from circuit breaker when integrated
    };
  } catch (error) {
    return { 
      content: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      modelUsed: effectiveModel,
      tokenUsage: { inputTokens: inputTokensEstimate, outputTokens: 0 },
      usedFallback: false,
    };
  }
}

/**
 * Get display name for a channel
 */
export function getChannelDisplayName(channel: string): string {
  const names: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    threads: 'Threads',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    zalo_oa: 'Zalo OA',
    telegram: 'Telegram',
    email: 'Email',
    website: 'Website',
    blogger: 'Blogger',
    wordpress: 'WordPress',
    google_maps: 'Google Maps',
    pinterest: 'Pinterest',
    bluesky: 'Bluesky',
  };
  return names[channel] || channel;
}

/**
 * Create SSE response with proper headers
 */
export function createSSEResponse(
  stream: ReadableStream<Uint8Array>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
