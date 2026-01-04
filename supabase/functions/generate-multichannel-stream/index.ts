import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI, iterateStreamDeltas } from "../_shared/ai-provider.ts";
import { 
  fetchStreamingContext, 
  buildStreamingPrompt, 
  getChannelDisplayName,
  type StreamingPromptInput,
} from "../_shared/channel-prompt-builder.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProgressEvent {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let formData: any;
  try {
    formData = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let clientDisconnected = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  req.signal.addEventListener('abort', () => {
    console.log('[realtime-stream] Client disconnected');
    clientDisconnected = true;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Anti-buffering padding (2KB)
      try {
        controller.enqueue(encoder.encode(':' + ' '.repeat(2048) + '\n\n'));
      } catch {}
      
      const emit = (event: ProgressEvent): boolean => {
        if (clientDisconnected) return false;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          return true;
        } catch {
          clientDisconnected = true;
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          return false;
        }
      };

      try {
        const channels: string[] = formData.channels || [];
        const brandTemplateId = formData.brand_template_id;
        const organizationId = formData.organization_id;
        const topic = formData.topic || '';
        const hook = formData.hook;
        const contentGoal = formData.content_goal;
        const productIds = formData.product_ids;
        const targetPersonaId = formData.target_persona_id;

        console.log(`[realtime-stream] Starting for ${channels.length} channels: ${channels.join(', ')}`);
        console.log(`[realtime-stream] Topic: "${topic.slice(0, 50)}..."`);

        // Initial progress
        if (!emit({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' })) {
          controller.close();
          return;
        }

        await delay(100);
        emit({ type: 'progress', step: 'brand', progress: 10, message: 'Tải ngữ cảnh thương hiệu...' });

        // Fetch context once (shared across all channels)
        const context = await fetchStreamingContext({
          topic,
          channel: channels[0], // Use first channel for context fetch
          brandTemplateId,
          organizationId,
          productIds,
          targetPersonaId,
        });

        emit({ type: 'progress', step: 'context', progress: 20, message: 'Đã tải context ✓' });

        // Get AI config
        const aiConfig = await getAIConfig('generate-multichannel', organizationId);
        console.log(`[realtime-stream] Using model: ${aiConfig.model}`);

        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 25, 
          message: 'Bắt đầu tạo nội dung real-time...',
          totalChannels: channels,
          completedChannels: [],
          currentChannel: channels[0],
        });

        // Store results for each channel
        const channelResults: Record<string, string> = {};
        const completedChannels: string[] = [];
        let overallProgress = 25;

        // Start heartbeat (keep-alive during AI calls)
        let heartbeatCount = 0;
        heartbeatInterval = setInterval(() => {
          if (clientDisconnected) return;
          heartbeatCount++;
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {}
        }, 5000);

        // Generate content for each channel SEQUENTIALLY (for clear UI streaming)
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];
          if (clientDisconnected) break;

          const displayName = getChannelDisplayName(channel);
          const channelProgress = 25 + ((i / channels.length) * 50);

          emit({
            type: 'progress',
            step: 'ai',
            progress: channelProgress,
            message: `Đang tạo ${displayName}...`,
            currentChannel: channel,
            completedChannels: [...completedChannels],
            totalChannels: channels,
          });

          console.log(`[realtime-stream] Starting channel: ${channel}`);
          const channelStartTime = Date.now();

          // Build prompt for this channel
          const promptInput: StreamingPromptInput = {
            topic,
            channel,
            brandTemplateId,
            organizationId,
            hook,
            contentGoal,
            productIds,
            targetPersonaId,
          };

          const prompt = buildStreamingPrompt(promptInput, context);

          // Call AI with streaming
          const aiResult = await callAI({
            functionName: 'generate-multichannel-stream',
            organizationId,
            messages: [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user },
            ],
            stream: true,
          });

          if (!aiResult.success || !aiResult.data) {
            console.error(`[realtime-stream] AI failed for ${channel}:`, aiResult.error);
            emit({
              type: 'streaming_text',
              streamingChunk: { 
                channel, 
                text: `[Lỗi tạo nội dung: ${aiResult.error || 'Unknown error'}]`, 
                isComplete: true 
              },
            });
            completedChannels.push(channel);
            channelResults[channel] = `[Error: ${aiResult.error}]`;
            continue;
          }

          // Stream tokens REAL-TIME
          let fullContent = '';
          let tokenCount = 0;
          const firstTokenTime = Date.now();
          let gotFirstToken = false;

          try {
            for await (const delta of iterateStreamDeltas(aiResult.data)) {
              if (clientDisconnected) break;
              
              if (delta.done) {
                console.log(`[realtime-stream] ${channel} done. Tokens: ${tokenCount}, Content length: ${fullContent.length}`);
                break;
              }

              if (delta.content) {
                if (!gotFirstToken) {
                  gotFirstToken = true;
                  console.log(`[realtime-stream] ${channel} first token after ${Date.now() - channelStartTime}ms`);
                }

                fullContent += delta.content;
                tokenCount++;

                // Emit EVERY token immediately - true real-time!
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
            console.error(`[realtime-stream] Stream error for ${channel}:`, streamError);
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

          completedChannels.push(channel);
          channelResults[channel] = fullContent;

          const channelDuration = Date.now() - channelStartTime;
          console.log(`[realtime-stream] ${channel} completed in ${channelDuration}ms, ${fullContent.length} chars`);

          // Update progress
          const completionProgress = 25 + (((i + 1) / channels.length) * 50);
          emit({
            type: 'progress',
            step: 'ai',
            progress: completionProgress,
            message: `✓ ${displayName} hoàn thành (${fullContent.length} ký tự)`,
            currentChannel: channels[i + 1],
            completedChannels: [...completedChannels],
            totalChannels: channels,
          });
        }

        // Stop heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (clientDisconnected) {
          controller.close();
          return;
        }

        // Final steps
        emit({ type: 'progress', step: 'ai', progress: 80, message: 'AI đã tạo xong nội dung ✓' });
        await delay(150);

        emit({ type: 'progress', step: 'finalize', progress: 90, message: 'Đang lưu kết quả...' });

        // ============================================
        // SAVE TO DATABASE
        // ============================================
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Get user from JWT
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        let userId: string | null = null;
        
        if (token) {
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        }

        // Check organization settings for initial status
        let initialStatus = 'draft';
        if (organizationId) {
          const { data: orgSettings } = await supabase
            .from('organizations')
            .select('skip_approval, auto_submit_review')
            .eq('id', organizationId)
            .single();
          
          if (orgSettings?.skip_approval) {
            initialStatus = 'approved';
          } else if (orgSettings?.auto_submit_review) {
            initialStatus = 'review';
          }
        }

        // Get brand info from context if available
        // Note: brandGuideline and primaryColor aren't in BrandContext type, so we skip them
        const brandName = context.brand?.brandName || null;

        // Insert to database
        const { data: savedContent, error: dbError } = await supabase
          .from('multi_channel_contents')
          .insert({
            user_id: userId,
            organization_id: organizationId || null,
            title: topic.slice(0, 100),
            topic: topic,
            content_goal: contentGoal || 'engagement',
            selected_channels: channels,
            brand_template_id: brandTemplateId || null,
            brand_name: brandName,
            status: initialStatus,
            // Channel contents
            website_content: channelResults.website || null,
            facebook_content: channelResults.facebook || null,
            instagram_content: channelResults.instagram || null,
            twitter_content: channelResults.twitter || null,
            google_maps_content: channelResults.google_maps || null,
            linkedin_content: channelResults.linkedin || null,
            email_content: channelResults.email || null,
            youtube_content: channelResults.youtube || null,
            zalo_oa_content: channelResults.zalo_oa || null,
            telegram_content: channelResults.telegram || null,
            tiktok_content: channelResults.tiktok || null,
            threads_content: channelResults.threads || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error('[realtime-stream] DB error:', dbError);
          emit({ type: 'error', message: 'Không thể lưu nội dung: ' + dbError.message });
          controller.close();
          return;
        }

        console.log('[realtime-stream] Saved content with ID:', savedContent.id);

        emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
        await delay(100);

        // Return saved content (includes DB ID for navigation)
        emit({ type: 'result', data: savedContent });

        // Send done signal
        if (!clientDisconnected) {
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch {}
        }

        controller.close();
      } catch (error) {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (clientDisconnected) {
          try { controller.close(); } catch {}
          return;
        }

        console.error('[realtime-stream] Error:', error);
        try {
          emit({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
        } catch {}
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
