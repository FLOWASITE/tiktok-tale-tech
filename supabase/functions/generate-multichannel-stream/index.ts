import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProgressEvent {
  type: 'progress' | 'result' | 'error';
  step?: string;
  progress?: number;
  message?: string;
  data?: any;
  retryCount?: number;
  // Per-channel progress
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
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

        // Step 6: Call main generate-multichannel function
        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 50, 
          message: 'AI đang tạo nội dung (có thể mất 30-60 giây)...',
          totalChannels: channels,
          completedChannels: [],
          currentChannel: channels[0],
        });
        
        // Get auth token from request
        const authHeader = req.headers.get('authorization');
        
        // Start the AI call as a promise
        const aiCallPromise = fetch(`${supabaseUrl}/functions/v1/generate-multichannel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || '',
          },
          body: JSON.stringify(formData),
        });

        // Heartbeat: emit progress updates every 1s while waiting for AI
        // Simulate per-channel progress by cycling through channels
        let currentProgress = 50;
        const maxProgressWhileWaiting = 72;
        let channelIndex = 0;
        const completedChannels: string[] = [];
        const progressPerChannel = channels.length > 0 ? (maxProgressWhileWaiting - 50) / channels.length : 22;

        // Keep-alive comment counter for anti-buffering
        let keepAliveCounter = 0;
        
        heartbeatInterval = setInterval(() => {
          if (clientDisconnected) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            return;
          }
          
          // Every 10s, send SSE comment keep-alive to force flush through proxies
          keepAliveCounter++;
          if (keepAliveCounter % 10 === 0) {
            try {
              controller.enqueue(encoder.encode(': keep-alive\n\n'));
            } catch {}
          }
          
          if (currentProgress < maxProgressWhileWaiting && channels.length > 0) {
            // Calculate which channel we're "working on" based on progress
            const expectedChannelIndex = Math.floor((currentProgress - 50) / progressPerChannel);
            
            // Mark previous channels as completed
            while (channelIndex < expectedChannelIndex && channelIndex < channels.length) {
              if (!completedChannels.includes(channels[channelIndex])) {
                completedChannels.push(channels[channelIndex]);
              }
              channelIndex++;
            }
            
            const currentChannel = channels[Math.min(channelIndex, channels.length - 1)];
            const displayName = channelDisplayNames[currentChannel] || currentChannel;
            
            currentProgress += 2;
            emit({ 
              type: 'progress', 
              step: 'ai', 
              progress: currentProgress, 
              message: `Đang tạo ${displayName}...`,
              currentChannel,
              completedChannels: [...completedChannels],
              totalChannels: channels,
            });
          } else if (currentProgress < maxProgressWhileWaiting) {
            currentProgress += 2;
            emit({ 
              type: 'progress', 
              step: 'ai', 
              progress: currentProgress, 
              message: `AI đang xử lý nội dung... (${currentProgress}%)`,
              completedChannels: [...completedChannels],
              totalChannels: channels,
            });
          }
        }, 1000); // Heartbeat every 1 second

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
        
        // Emit final AI step with all channels completed
        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 73, 
          message: 'AI đã tạo xong nội dung...',
          currentChannel: undefined,
          completedChannels: channels, // All channels completed
          totalChannels: channels,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Lỗi khi tạo nội dung';
          
          if (response.status === 429) {
            errorMessage = 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.';
          } else if (response.status === 402) {
            errorMessage = 'Cần nạp thêm credits để tiếp tục sử dụng.';
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

        // Parse result FIRST - this is when backend is truly done
        const parseStart = Date.now();
        const result = await response.json();
        console.log(`[timing] Parse result: ${Date.now() - parseStart}ms`);

        // Check for disconnect before final steps
        if (clientDisconnected) {
          console.log('[stream] Client disconnected before final steps, aborting');
          controller.close();
          return;
        }
        
        // Now emit steps with accurate timing AFTER we have the result
        // Backend already did critique + footer + save, so these are just UI updates
        
        // Step 7: Self-critique (already done by backend)
        emit({ 
          type: 'progress', 
          step: 'critique', 
          progress: 75, 
          message: 'AI đã kiểm tra chất lượng nội dung ✓',
          completedChannels: channels,
          totalChannels: channels,
        });
        await delay(300);

        // Step 8: Footer Info (already done by backend)
        emit({ 
          type: 'progress', 
          step: 'finalize', 
          progress: 85, 
          message: 'Đã chèn Footer Info ✓',
          completedChannels: channels,
          totalChannels: channels,
        });
        await delay(200);

        // Step 9: Save to DB (already done by backend)
        emit({ 
          type: 'progress', 
          step: 'finalize', 
          progress: 95, 
          message: 'Đã lưu vào cơ sở dữ liệu ✓',
          completedChannels: channels,
          totalChannels: channels,
        });
        await delay(200);
        
        if (result.error) {
          emit({ type: 'error', message: result.error });
        } else {
          // Step 10: Complete - emit with small delay to ensure client receives it
          emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
          await delay(100);
          
          // Emit result and [DONE] marker
          emit({ type: 'result', data: result });
          
          // Send [DONE] marker for client to close immediately
          if (!clientDisconnected) {
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch {}
          }
        }

        controller.close();
      } catch (error) {
        // Clean up heartbeat on error
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        // Don't log/emit error if client just disconnected
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
