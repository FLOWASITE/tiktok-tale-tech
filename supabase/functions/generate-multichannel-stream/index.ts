import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChannelContentPreview {
  channel: string;
  preview: string;        // First 200 chars of content
  fullContent?: string;   // Full content for streaming display
  wordCount: number;
  isStreaming?: boolean;  // True if still receiving tokens
}

interface StreamingTextChunk {
  channel: string;
  text: string;           // New text chunk to append
  isComplete: boolean;    // True when channel generation is done
}

interface ProgressEvent {
  type: 'progress' | 'result' | 'error' | 'streaming_text';
  step?: string;
  progress?: number;
  message?: string;
  data?: any;
  retryCount?: number;
  // Per-channel progress
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  // Real-time content previews
  channelContent?: ChannelContentPreview;       // Single channel just completed
  channelContents?: ChannelContentPreview[];    // All completed so far
  // Streaming text for typewriter effect
  streamingChunk?: StreamingTextChunk;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse request body
  let formData: any;
  try {
    formData = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Track client disconnect state
  let clientDisconnected = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Listen for client abort signal
  req.signal.addEventListener('abort', () => {
    console.log('[stream] Client disconnected, cleaning up...');
    clientDisconnected = true;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  // Create streaming response
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Anti-buffering: Send 2KB padding comment to force proxy flush
      try {
        controller.enqueue(encoder.encode(':' + ' '.repeat(2048) + '\n\n'));
      } catch {}
      
      // Safe emit function that handles client disconnect
      const emit = (event: ProgressEvent) => {
        if (clientDisconnected) {
          console.log('[stream] Skipping emit - client disconnected');
          return false;
        }
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          console.log('[stream] Emit failed, client likely disconnected:', error);
          clientDisconnected = true;
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          return false;
        }
      };

      try {
        // Step 1: Initialize
        if (!emit({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' })) {
          controller.close();
          return;
        }
        await delay(200);

        // Step 2: Brand Context
        emit({ type: 'progress', step: 'brand', progress: 10, message: 'Tải ngữ cảnh thương hiệu...' });
        
        // Step 3: Personas
        emit({ type: 'progress', step: 'personas', progress: 20, message: 'Phân tích personas & sản phẩm...' });
        
        // Step 4: Industry
        emit({ type: 'progress', step: 'industry', progress: 30, message: 'Tải dữ liệu ngành...' });
        
        // Step 5: Build Prompt
        emit({ type: 'progress', step: 'prompt', progress: 40, message: 'Xây dựng prompt AI...' });

        // Check for disconnect before long AI call
        if (clientDisconnected) {
          console.log('[stream] Client disconnected before AI call, aborting');
          controller.close();
          return;
        }

        // Extract channels from formData for per-channel progress
        const channels: string[] = formData.channels || [];
        const channelDisplayNames: Record<string, string> = {
          facebook: 'Facebook',
          instagram: 'Instagram',
          linkedin: 'LinkedIn',
          twitter: 'Twitter',
          threads: 'Threads',
          tiktok: 'TikTok',
          youtube: 'YouTube',
          zalo: 'Zalo',
          telegram: 'Telegram',
          email: 'Email',
          website: 'Website',
          blog: 'Blog',
        };

        // Step 6: Call main generate-multichannel function with streaming enabled
        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 50, 
          message: 'AI đang tạo nội dung...',
          totalChannels: channels,
          completedChannels: [],
          currentChannel: channels[0],
        });
        
        // Get auth token from request
        const authHeader = req.headers.get('authorization');
        
        // Store streaming content as it arrives
        const streamingContents: Map<string, { text: string; wordCount: number }> = new Map();
        const completedChannels: string[] = [];
        
        // Start the AI call
        const aiCallPromise = fetch(`${supabaseUrl}/functions/v1/generate-multichannel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || '',
          },
          body: JSON.stringify({ ...formData, enableStreaming: true }),
        });

        // Heartbeat: emit progress updates while waiting for AI
        let currentProgress = 50;
        const maxProgressWhileWaiting = 72;
        let channelIndex = 0;
        const progressPerChannel = channels.length > 0 ? (maxProgressWhileWaiting - 50) / channels.length : 22;
        let keepAliveCounter = 0;
        
        heartbeatInterval = setInterval(() => {
          if (clientDisconnected) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            return;
          }
          
          // Every 10s, send SSE comment keep-alive
          keepAliveCounter++;
          if (keepAliveCounter % 10 === 0) {
            try {
              controller.enqueue(encoder.encode(': keep-alive\n\n'));
            } catch {}
          }
          
          if (currentProgress < maxProgressWhileWaiting && channels.length > 0) {
            const expectedChannelIndex = Math.floor((currentProgress - 50) / progressPerChannel);
            
            while (channelIndex < expectedChannelIndex && channelIndex < channels.length) {
              if (!completedChannels.includes(channels[channelIndex])) {
                completedChannels.push(channels[channelIndex]);
              }
              channelIndex++;
            }
            
            const currentChannel = channels[Math.min(channelIndex, channels.length - 1)];
            const displayName = channelDisplayNames[currentChannel] || currentChannel;
            
            currentProgress += 2;
            
            // Build current channel contents from streaming data
            const channelContents: ChannelContentPreview[] = [];
            streamingContents.forEach((content, channel) => {
              const preview = content.text.replace(/[#*_~`]/g, '').trim().slice(0, 200);
              channelContents.push({
                channel,
                preview: preview + (content.text.length > 200 ? '...' : ''),
                wordCount: content.wordCount,
                isStreaming: !completedChannels.includes(channel),
              });
            });
            
            emit({ 
              type: 'progress', 
              step: 'ai', 
              progress: currentProgress, 
              message: `Đang tạo ${displayName}...`,
              currentChannel,
              completedChannels: [...completedChannels],
              totalChannels: channels,
              channelContents: channelContents.length > 0 ? channelContents : undefined,
            });
          }
        }, 1000);

        // Wait for AI response
        const response = await aiCallPromise;
        
        // Clear heartbeat immediately after AI response
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Check for disconnect after long AI call
        if (clientDisconnected) {
          console.log('[stream] Client disconnected after AI call, aborting');
          controller.close();
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Lỗi khi tạo nội dung';
          
          if (response.status === 429) {
            errorMessage = 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.';
          } else if (response.status === 402) {
            errorMessage = 'Cần nạp thêm credits để tiếp tục sử dụng.';
          } else if (response.status === 504 || response.status === 524 || errorText.includes('timeout') || errorText.includes('Timeout')) {
            errorMessage = 'Model AI phản hồi quá lâu. Vui lòng thử đổi sang model nhanh hơn (ví dụ: gemini-2.5-flash) trong Admin Panel → AI Management → Channels.';
          } else if (response.status >= 500) {
            errorMessage = 'Lỗi server khi tạo nội dung. Vui lòng thử lại sau ít phút.';
          } else {
            try {
              const errJson = JSON.parse(errorText);
              errorMessage = errJson.error || errorMessage;
            } catch {}
          }
          
          emit({ type: 'error', message: errorMessage });
          controller.close();
          return;
        }

        // Parse result
        const parseStart = Date.now();
        const result = await response.json();
        console.log(`[timing] Parse result: ${Date.now() - parseStart}ms`);

        // Check for disconnect before final steps
        if (clientDisconnected) {
          console.log('[stream] Client disconnected before final steps, aborting');
          controller.close();
          return;
        }

        // Extract content previews and stream them with typewriter effect
        const channelContents: ChannelContentPreview[] = [];
        
        for (const channel of channels) {
          const contentKey = `${channel}_content`;
          const channelData = result[contentKey];
          
          if (channelData) {
            let textContent = '';
            if (typeof channelData === 'string') {
              textContent = channelData;
            } else if (channelData.content) {
              textContent = channelData.content;
            } else if (channelData.body) {
              textContent = channelData.body;
            } else if (channelData.caption) {
              textContent = channelData.caption;
            } else if (channelData.text) {
              textContent = channelData.text;
            }
            
            if (textContent) {
              const cleanText = textContent.replace(/[#*_~`]/g, '').trim();
              const wordCount = cleanText.split(/\s+/).filter((w: string) => w.length > 0).length;
              
              // Stream content in chunks for typewriter effect
              const CHUNK_SIZE = 50; // characters per chunk
              const displayName = channelDisplayNames[channel] || channel;
              
              // Emit streaming start
              emit({
                type: 'streaming_text',
                streamingChunk: {
                  channel,
                  text: '',
                  isComplete: false,
                },
                message: `Đang hiển thị ${displayName}...`,
              });
              
              // Stream content in chunks
              for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
                if (clientDisconnected) break;
                
                const chunk = cleanText.slice(i, i + CHUNK_SIZE);
                emit({
                  type: 'streaming_text',
                  streamingChunk: {
                    channel,
                    text: chunk,
                    isComplete: i + CHUNK_SIZE >= cleanText.length,
                  },
                });
                
                // Small delay between chunks for visual effect
                await delay(30);
              }
              
              const preview = cleanText.slice(0, 200) + (cleanText.length > 200 ? '...' : '');
              channelContents.push({ 
                channel, 
                preview, 
                fullContent: cleanText,
                wordCount,
                isStreaming: false,
              });
            }
          }
        }
        
        // Emit all channels completed with full content
        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 73, 
          message: 'AI đã tạo xong nội dung ✓',
          currentChannel: undefined,
          completedChannels: channels,
          totalChannels: channels,
          channelContents,
        });

        // Step 7: Self-critique
        emit({ 
          type: 'progress', 
          step: 'critique', 
          progress: 75, 
          message: 'AI đã kiểm tra chất lượng nội dung ✓',
          completedChannels: channels,
          totalChannels: channels,
          channelContents,
        });
        await delay(300);

        // Step 8: Footer Info
        emit({ 
          type: 'progress', 
          step: 'finalize', 
          progress: 85, 
          message: 'Đã chèn Footer Info ✓',
          completedChannels: channels,
          totalChannels: channels,
          channelContents,
        });
        await delay(200);

        // Step 9: Save to DB
        emit({ 
          type: 'progress', 
          step: 'finalize', 
          progress: 95, 
          message: 'Đã lưu vào cơ sở dữ liệu ✓',
          completedChannels: channels,
          totalChannels: channels,
          channelContents,
        });
        await delay(200);
        
        if (result.error) {
          emit({ type: 'error', message: result.error });
        } else {
          emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
          await delay(100);
          
          emit({ type: 'result', data: result });
          
          if (!clientDisconnected) {
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch {}
          }
        }

        controller.close();
      } catch (error) {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        if (clientDisconnected) {
          console.log('[stream] Error after client disconnect, suppressing:', error);
          try { controller.close(); } catch {}
          return;
        }
        
        console.error('Streaming error:', error);
        try {
          emit({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Lỗi không xác định' 
          });
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

// Helper delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
