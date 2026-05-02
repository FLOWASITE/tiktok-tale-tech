import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/types/multichannel';

export interface RegenerateProgress {
  progress: number;
  message: string;
  isComplete: boolean;
}

interface UseStreamingRegenerateOptions {
  onComplete?: (channel: Channel, content: string) => void;
  onError?: (error: string) => void;
}

export function useStreamingRegenerate(options: UseStreamingRegenerateOptions = {}) {
  const [streamingText, setStreamingText] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);
  const [progress, setProgress] = useState<RegenerateProgress>({ progress: 0, message: '', isComplete: false });
  const abortControllerRef = useRef<AbortController | null>(null);

  const regenerate = useCallback(async (
    contentId: string, 
    channel: Channel,
    regenerateOptions?: { includeFooterInfo?: boolean }
  ): Promise<string | null> => {
    // Cancel any existing regeneration
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsRegenerating(true);
    setRegeneratingChannel(channel);
    setStreamingText('');
    setProgress({ progress: 0, message: 'Đang khởi tạo...', isComplete: false });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Vui lòng đăng nhập để tạo lại nội dung');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-multichannel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: 'regenerate',
            contentId,
            channel,
            stream: true,
            includeFooterInfo: regenerateOptions?.includeFooterInfo !== false, // Default: true
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Lỗi khi tạo lại nội dung');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let finalResult: string | null = null;
      
      // Watchdog timer to detect stalled streams
      const WATCHDOG_TIMEOUT = 60000; // 60s
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
      
      const resetWatchdog = () => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
          console.warn('[Regenerate] Watchdog timeout - no data received');
          abortControllerRef.current?.abort();
        }, WATCHDOG_TIMEOUT);
      };
      
      resetWatchdog();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        resetWatchdog();

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              setProgress({ progress: 100, message: 'Hoàn thành!', isComplete: true });
              continue;
            }

            let event: any;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              // Ignore parse errors for incomplete JSON chunks
              continue;
            }

            // Handle streaming text chunks - support both formats:
            // 1. event.streamingChunk.text (from useStreamingGeneration format)
            // 2. event.content (from backend regenerate format)
            if (event.type === 'streaming_text') {
              const deltaText = event.streamingChunk?.text ?? event.content ?? '';
              if (deltaText) {
                accumulatedText += deltaText;
                setStreamingText(accumulatedText);
              }
              
              if (event.streamingChunk?.isComplete) {
                setProgress({ progress: 90, message: 'Đang hoàn thiện...', isComplete: false });
              }
            }

            // Handle progress events
            if (event.type === 'progress') {
              setProgress({
                progress: event.progress || 0,
                message: event.message || '',
                isComplete: false,
              });
            }
            
            // Handle channel_complete event
            if (event.type === 'channel_complete') {
              accumulatedText = event.content || accumulatedText;
              setStreamingText(accumulatedText);
              setProgress({ progress: 95, message: 'Đang lưu...', isComplete: false });
            }

            // Handle result
            if (event.type === 'result') {
              finalResult = event.data?.[`${channel}_content`] || accumulatedText;
              setProgress({ progress: 100, message: 'Hoàn thành!', isComplete: true });
              options.onComplete?.(channel, finalResult || '');
            }

            // Handle error (do not swallow inside JSON parse catch)
            if (event.type === 'error') {
              throw new Error(event.message || 'Lỗi không xác định');
            }
          }
        }
      }
      
      if (watchdogTimer) clearTimeout(watchdogTimer);

      return finalResult || accumulatedText;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled, silent return
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ progress: 0, message: errorMessage, isComplete: false });
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setIsRegenerating(false);
      setRegeneratingChannel(null);
    }
  }, [options]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRegenerating(false);
      setRegeneratingChannel(null);
      setStreamingText('');
      setProgress({ progress: 0, message: '', isComplete: false });
    }
  }, []);

  return {
    regenerate,
    cancel,
    streamingText,
    isRegenerating,
    regeneratingChannel,
    progress,
  };
}
