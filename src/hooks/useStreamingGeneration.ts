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

// Abort reason types for selective error handling
type AbortReason = 'user' | 'replaced' | 'watchdog' | null;

export function useStreamingGeneration(options: UseStreamingGenerationOptions = {}) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  // Synchronous guard to prevent double-submit (ref updates immediately, unlike state)
  const generatingRef = useRef(false);

  // Watchdog timeout in ms - cancel if no events received for this duration
  // Increased to 90s to handle slow AI models (e.g., kimi-k2) without false positives
  const WATCHDOG_TIMEOUT_MS = 90000; // 90 seconds

  const cleanupTimers = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const generate = useCallback(async (formData: any): Promise<any> => {
    // Synchronous guard - block immediately if already generating
    if (generatingRef.current) {
      console.log('[streaming] Blocked: generation already in progress (ref guard)');
      return null;
    }
    generatingRef.current = true;

    // Cancel any existing generation (mark as "replaced" - no error toast)
    if (abortControllerRef.current) {
      abortReasonRef.current = 'replaced';
      abortControllerRef.current.abort();
    }
    cleanupTimers();

    abortControllerRef.current = new AbortController();
    abortReasonRef.current = null; // Reset abort reason for new request
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
          abortReasonRef.current = 'watchdog';
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          cleanupTimers();
          setIsGenerating(false);
          setProgress({ type: 'error', message: 'Kết nối streaming bị ngắt quá lâu. Vui lòng thử lại.' });
          options.onError?.('Kết nối streaming bị ngắt quá lâu. Vui lòng thử lại.');
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
              cleanupTimers();
              generatingRef.current = false;
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
                cleanupTimers();
                generatingRef.current = false;
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
      cleanupTimers();
      generatingRef.current = false;

      setIsGenerating(false);
      setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
      
      return result;
    } catch (error) {
      // Clear watchdog timer on error
      cleanupTimers();
      generatingRef.current = false;

      if (error instanceof Error && error.name === 'AbortError') {
        const reason = abortReasonRef.current;
        console.log(`[streaming] Generation aborted, reason: ${reason}`);
        
        // Only show error for watchdog timeout, not for user cancel or replaced requests
        if (reason === 'watchdog') {
          // Already handled in watchdog interval
        }
        // For 'user' and 'replaced' - silent abort, no toast
        setIsGenerating(false);
        setProgress(null);
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ type: 'error', message: errorMessage });
      options.onError?.(errorMessage);
      setIsGenerating(false);
      throw error;
    }
  }, [options, cleanupTimers]);

  const cancel = useCallback(() => {
    abortReasonRef.current = 'user';
    cleanupTimers();
    generatingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(null);
    }
  }, [cleanupTimers]);

  return {
    generate,
    cancel,
    progress,
    isGenerating,
  };
}
