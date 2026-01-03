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

// Helper to create SSE emitter
function createProgressEmitter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  return (event: ProgressEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(encoder.encode(data));
  };
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

  // Create streaming response
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = createProgressEmitter(controller);

      try {
        // Step 1: Initialize
        emit({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' });
        await delay(200);

        // Step 2: Brand Context
        emit({ type: 'progress', step: 'brand', progress: 10, message: 'Tải ngữ cảnh thương hiệu...' });
        
        // Step 3: Personas
        emit({ type: 'progress', step: 'personas', progress: 20, message: 'Phân tích personas & sản phẩm...' });
        
        // Step 4: Industry
        emit({ type: 'progress', step: 'industry', progress: 30, message: 'Tải dữ liệu ngành...' });
        
        // Step 5: Build Prompt
        emit({ type: 'progress', step: 'prompt', progress: 40, message: 'Xây dựng prompt AI...' });

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

        // Heartbeat: emit progress updates every 2s while waiting for AI
        // Simulate per-channel progress by cycling through channels
        let currentProgress = 50;
        const maxProgressWhileWaiting = 72;
        let channelIndex = 0;
        const completedChannels: string[] = [];
        const progressPerChannel = channels.length > 0 ? (maxProgressWhileWaiting - 50) / channels.length : 22;

        const heartbeatInterval = setInterval(() => {
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
              message: `AI đang xử lý nội dung... (${currentProgress}%)` 
            });
          }
        }, 2000);

        // Wait for AI response
        const response = await aiCallPromise;
        clearInterval(heartbeatInterval);

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

        // Step 7: Self-critique happening inside main function
        emit({ type: 'progress', step: 'critique', progress: 75, message: 'Đánh giá chất lượng...' });

        // Step 8: Finalize
        emit({ type: 'progress', step: 'finalize', progress: 90, message: 'Lưu và hoàn thiện...' });
        
        // Parse result
        const result = await response.json();
        
        if (result.error) {
          emit({ type: 'error', message: result.error });
        } else {
          // Step 9: Complete
          emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
          emit({ type: 'result', data: result });
        }

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        emit({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Lỗi không xác định' 
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// Helper delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
