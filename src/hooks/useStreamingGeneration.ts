import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressEvent {
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

interface UseStreamingGenerationOptions {
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useStreamingGeneration(options: UseStreamingGenerationOptions = {}) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Watchdog timeout in ms - cancel if no events received for this duration
  // Increased to 90s to handle slow AI models (e.g., kimi-k2) without false positives
  const WATCHDOG_TIMEOUT_MS = 90000; // 90 seconds

  const generate = useCallback(async (formData: any): Promise<any> => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    abortControllerRef.current = new AbortController();
    lastEventTimeRef.current = Date.now();
    setIsGenerating(true);
    setProgress({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' });

    try {
      // Get current user's access token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-multichannel-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Lỗi khi tạo nội dung';
        
        if (response.status === 429) {
          errorMessage = 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.';
        } else if (response.status === 402) {
          errorMessage = 'Cần nạp thêm credits để tiếp tục sử dụng.';
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc response stream');
      }

      // Start watchdog timer to detect stale connections
      watchdogTimerRef.current = setInterval(() => {
        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
        if (timeSinceLastEvent > WATCHDOG_TIMEOUT_MS) {
          console.warn(`[streaming] Watchdog triggered: no events for ${timeSinceLastEvent}ms, aborting...`);
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          if (watchdogTimerRef.current) {
            clearInterval(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          setIsGenerating(false);
          setProgress({ type: 'error', message: 'Kết nối bị gián đoạn, vui lòng thử lại.' });
          options.onError?.('Kết nối bị gián đoạn, vui lòng thử lại.');
        }
      }, 5000); // Check every 5 seconds

      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Update last event time on any data received
        lastEventTimeRef.current = Date.now();

        // Parse SSE events line by line
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              // Server signaled end, cancel reader and exit
              console.log('[streaming] Received [DONE] marker, closing stream');
              if (watchdogTimerRef.current) {
                clearInterval(watchdogTimerRef.current);
                watchdogTimerRef.current = null;
              }
              await reader.cancel();
              setIsGenerating(false);
              setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
              return result;
            }

            try {
              const event = JSON.parse(jsonStr) as ProgressEvent;
              setProgress(event);
              options.onProgress?.(event);

              if (event.type === 'result') {
                result = event.data;
                options.onComplete?.(event.data);
                // Immediately cancel reader and resolve - don't wait for stream to close
                console.log('[streaming] Received result event, closing stream');
                if (watchdogTimerRef.current) {
                  clearInterval(watchdogTimerRef.current);
                  watchdogTimerRef.current = null;
                }
                await reader.cancel();
                setIsGenerating(false);
                setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
                return result;
              } else if (event.type === 'error') {
                throw new Error(event.message || 'Lỗi không xác định');
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
              console.debug('SSE parse skip:', jsonStr);
            }
          }
        }
      }

      // Stream ended without explicit result - check buffer for any remaining data
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const event = JSON.parse(jsonStr) as ProgressEvent;
                if (event.type === 'result') {
                  result = event.data;
                  options.onComplete?.(event.data);
                }
              } catch {}
            }
          }
        }
      }

      // Clear watchdog timer
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      setIsGenerating(false);
      setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
      
      return result;
    } catch (error) {
      // Clear watchdog timer on error
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation cancelled');
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ type: 'error', message: errorMessage });
      options.onError?.(errorMessage);
      setIsGenerating(false);
      throw error;
    }
  }, [options]);

  const cancel = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(null);
    }
  }, []);

  return {
    generate,
    cancel,
    progress,
    isGenerating,
  };
}
