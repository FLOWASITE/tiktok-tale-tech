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

import { callAI, iterateStreamDeltas } from "./ai-provider.ts";
import { formatFooterInfo, type FooterInfo } from "./channel-prompt-builder.ts";

// ============================================
// TYPES
// ============================================

export interface StreamingContext {
  organizationId: string | null;
  userId: string | null;
  channels: string[];
  topic: string;
  contentGoal: string;
  brandTemplateId?: string;
  brandName: string;
  // Footer context
  footerInfo: FooterInfo | null;
  channelOverrides: Record<string, any> | null;
  brandAllowEmoji: boolean;
  companyName: string | null;
  tagline: string | null;
  // Model configs per channel
  channelModelConfigs: Map<string, { model: string; temperature: number; maxTokens: number | null }>;
  defaultModel: string;
  defaultTemperature: number;
  // Critique context (for post-streaming self-critique)
  brandVoice?: any;
  mergedRules?: any;
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

/**
 * Generate content for a single channel with real-time token streaming
 */
export async function generateChannelStreaming(
  params: GenerateChannelStreamingParams
): Promise<{ content: string; success: boolean; error?: string }> {
  const { channel, systemPrompt, userPrompt, context, emit } = params;
  
  // Get model config for this channel
  const channelConfig = context.channelModelConfigs.get(channel);
  const effectiveModel = channelConfig?.model || context.defaultModel;
  const effectiveTemperature = channelConfig?.temperature ?? context.defaultTemperature;
  
  console.log(`[streaming] Starting channel: ${channel} with model: ${effectiveModel}`);
  const startTime = Date.now();

  try {
    // Call AI with streaming enabled
    const aiResult = await callAI({
      functionName: 'generate-multichannel',
      organizationId: context.organizationId || undefined,
      modelOverride: effectiveModel,
      temperatureOverride: effectiveTemperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    if (!aiResult.success || !aiResult.data) {
      console.error(`[streaming] AI failed for ${channel}:`, aiResult.error);
      return { 
        content: `[Error: ${aiResult.error || 'Unknown error'}]`, 
        success: false, 
        error: aiResult.error 
      };
    }

    // Stream tokens in real-time
    let fullContent = '';
    let tokenCount = 0;
    let gotFirstToken = false;

    try {
      for await (const delta of iterateStreamDeltas(aiResult.data)) {
        if (delta.done) {
          console.log(`[streaming] ${channel} done. Tokens: ${tokenCount}, Content length: ${fullContent.length}`);
          break;
        }

        if (delta.content) {
          if (!gotFirstToken) {
            gotFirstToken = true;
            console.log(`[streaming] ${channel} first token after ${Date.now() - startTime}ms`);
          }

          fullContent += delta.content;
          tokenCount++;

          // Emit every token immediately - true real-time streaming!
          emit({
            type: 'streaming_text',
            streamingChunk: {
              channel,
              text: delta.content,
              isComplete: false,
            },
          });
        }
      }
    } catch (streamError) {
      console.error(`[streaming] Stream error for ${channel}:`, streamError);
    }

    // Mark channel as complete
    emit({
      type: 'streaming_text',
      streamingChunk: {
        channel,
        text: '',
        isComplete: true,
      },
    });

    // Append footer info
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
      // Emit footer as final chunk
      emit({
        type: 'streaming_text',
        streamingChunk: {
          channel,
          text: footerText,
          isComplete: false,
        },
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[streaming] ${channel} completed in ${duration}ms, ${fullContent.length} chars`);

    return { content: fullContent, success: true };
  } catch (error) {
    console.error(`[streaming] Error for ${channel}:`, error);
    return { 
      content: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
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
    google_maps: 'Google Maps',
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
