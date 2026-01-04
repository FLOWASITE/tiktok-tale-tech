import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChannelContentPreview {
  channel: string;
  preview: string;
  fullContent?: string;
  wordCount: number;
  isStreaming?: boolean;
}

interface StreamingTextChunk {
  channel: string;
  text: string;
  isComplete: boolean;
}

interface ProgressEvent {
  type: 'progress' | 'result' | 'error' | 'streaming_text';
  step?: string;
  progress?: number;
  message?: string;
  data?: any;
  retryCount?: number;
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  channelContent?: ChannelContentPreview;
  channelContents?: ChannelContentPreview[];
  streamingChunk?: StreamingTextChunk;
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

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
    console.log('[stream] Client disconnected');
    clientDisconnected = true;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Anti-buffering padding
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
        // Initial progress steps
        if (!emit({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' })) {
          controller.close();
          return;
        }
        await delay(150);
        emit({ type: 'progress', step: 'brand', progress: 10, message: 'Tải ngữ cảnh thương hiệu...' });
        await delay(100);
        emit({ type: 'progress', step: 'personas', progress: 20, message: 'Phân tích personas & sản phẩm...' });
        await delay(100);
        emit({ type: 'progress', step: 'industry', progress: 30, message: 'Tải dữ liệu ngành...' });
        await delay(100);
        emit({ type: 'progress', step: 'prompt', progress: 40, message: 'Xây dựng prompt AI...' });

        if (clientDisconnected) {
          controller.close();
          return;
        }

        const channels: string[] = formData.channels || [];
        const authHeader = req.headers.get('authorization');
        
        emit({ 
          type: 'progress', 
          step: 'ai', 
          progress: 50, 
          message: 'AI đang tạo nội dung...',
          totalChannels: channels,
          completedChannels: [],
          currentChannel: channels[0],
        });

        // Call generate-multichannel
        const aiResponse = await fetch(`${supabaseUrl}/functions/v1/generate-multichannel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || '',
          },
          body: JSON.stringify(formData),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          let errorMessage = 'Lỗi khi tạo nội dung';
          
          if (aiResponse.status === 429) {
            errorMessage = 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.';
          } else if (aiResponse.status === 402) {
            errorMessage = 'Cần nạp thêm credits để tiếp tục sử dụng.';
          } else if (aiResponse.status === 504 || aiResponse.status === 524 || errorText.includes('timeout')) {
            errorMessage = 'Model AI phản hồi quá lâu. Vui lòng thử đổi sang model nhanh hơn trong Admin Panel.';
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

        const result = await aiResponse.json();

        if (clientDisconnected) {
          controller.close();
          return;
        }

        // Stream content for each channel with typewriter effect
        const channelContents: ChannelContentPreview[] = [];
        const completedChannels: string[] = [];
        const CHUNK_SIZE = 50;
        
        for (const channel of channels) {
          if (clientDisconnected) break;
          
          const contentKey = `${channel}_content`;
          const channelData = result[contentKey];
          
          if (!channelData) continue;
          
          let textContent = '';
          if (typeof channelData === 'string') {
            textContent = channelData;
          } else if (channelData.content) {
            textContent = channelData.content;
          } else if (channelData.body) {
            textContent = channelData.body;
          }
          
          if (!textContent) continue;
          
          const cleanText = textContent.replace(/[#*_~`]/g, '').trim();
          const wordCount = cleanText.split(/\s+/).filter((w: string) => w.length > 0).length;
          const displayName = channelDisplayNames[channel] || channel;
          
          // Emit streaming start
          emit({
            type: 'streaming_text',
            streamingChunk: { channel, text: '', isComplete: false },
            message: `Đang hiển thị ${displayName}...`,
          });
          
          // Stream content in chunks
          for (let i = 0; i < cleanText.length; i += CHUNK_SIZE) {
            if (clientDisconnected) break;
            
            emit({
              type: 'streaming_text',
              streamingChunk: {
                channel,
                text: cleanText.slice(i, i + CHUNK_SIZE),
                isComplete: i + CHUNK_SIZE >= cleanText.length,
              },
            });
            
            await delay(30);
          }
          
          completedChannels.push(channel);
          
          const preview = cleanText.slice(0, 200) + (cleanText.length > 200 ? '...' : '');
          channelContents.push({ 
            channel, 
            preview, 
            fullContent: cleanText,
            wordCount,
            isStreaming: false,
          });
          
          // Update progress
          const progress = 50 + (completedChannels.length / channels.length) * 23;
          emit({
            type: 'progress',
            step: 'ai',
            progress,
            message: `✓ ${displayName} hoàn thành`,
            currentChannel: channels.find(c => !completedChannels.includes(c)),
            completedChannels: [...completedChannels],
            totalChannels: channels,
            channelContents: [...channelContents],
          });
        }

        // Final steps
        emit({ type: 'progress', step: 'ai', progress: 73, message: 'AI đã tạo xong nội dung ✓', completedChannels: channels, totalChannels: channels, channelContents });
        await delay(200);
        emit({ type: 'progress', step: 'critique', progress: 75, message: 'AI đã kiểm tra chất lượng ✓', completedChannels: channels, totalChannels: channels, channelContents });
        await delay(200);
        emit({ type: 'progress', step: 'finalize', progress: 85, message: 'Đã chèn Footer Info ✓', completedChannels: channels, totalChannels: channels, channelContents });
        await delay(200);
        emit({ type: 'progress', step: 'finalize', progress: 95, message: 'Đã lưu vào cơ sở dữ liệu ✓', completedChannels: channels, totalChannels: channels, channelContents });
        await delay(200);
        
        if (result.error) {
          emit({ type: 'error', message: result.error });
        } else {
          emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
          await delay(100);
          emit({ type: 'result', data: result });
          
          if (!clientDisconnected) {
            try { controller.enqueue(encoder.encode('data: [DONE]\n\n')); } catch {}
          }
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
        
        console.error('Streaming error:', error);
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
