import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel, MultiChannelContent } from '@/types/multichannel';

export interface StreamingTextChunk {
  channel: string;
  text: string;
  isComplete: boolean;
}

export interface ExpandProgressEvent {
  type: 'progress' | 'result' | 'error' | 'streaming_text';
  step?: string;
  progress?: number;
  message?: string;
  data?: any;
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  streamingChunk?: StreamingTextChunk;
}

interface UseExpandChannelsStreamingOptions {
  onProgress?: (event: ExpandProgressEvent) => void;
  onComplete?: (data: MultiChannelContent) => void;
  onError?: (error: string) => void;
}

type AbortReason = 'user' | 'replaced' | 'watchdog' | null;

export function useExpandChannelsStreaming(options: UseExpandChannelsStreamingOptions = {}) {
  const [progress, setProgress] = useState<ExpandProgressEvent | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});
  const [completedChannels, setCompletedChannels] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  const expandingRef = useRef(false);

  const WATCHDOG_TIMEOUT_MS = 150000; // 150 seconds
  const FIRST_BYTE_TIMEOUT_MS = 30000; // 30 seconds

  const cleanupTimers = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const expand = useCallback(async (
    contentId: string, 
    newChannels: Channel[]
  ): Promise<MultiChannelContent | null> => {
    // Synchronous guard
    if (expandingRef.current) {
      console.log('[expand-streaming] Blocked: expansion already in progress');
      return null;
    }
    expandingRef.current = true;

    // Cancel any existing expansion
    if (abortControllerRef.current) {
      abortReasonRef.current = 'replaced';
      abortControllerRef.current.abort();
    }
    cleanupTimers();

    abortControllerRef.current = new AbortController();
    abortReasonRef.current = null;
    setIsExpanding(true);
    setStreamingTexts({});
    setCompletedChannels([]);
    setProgress({ 
      type: 'progress', 
      step: 'init', 
      progress: 0, 
      message: 'Đang khởi tạo...',
      totalChannels: newChannels,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expand-multichannel-channels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            contentId, 
            newChannels,
            stream: true, // Enable streaming mode
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Lỗi khi mở rộng kênh');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc response stream');
      }

      let receivedFirstByte = false;
      
      const resetWatchdog = (isFirstByte = false) => {
        cleanupTimers();
        const timeout = receivedFirstByte ? WATCHDOG_TIMEOUT_MS : FIRST_BYTE_TIMEOUT_MS;
        watchdogTimerRef.current = setTimeout(() => {
          const errorMsg = 'Kết nối streaming bị ngắt. Vui lòng thử lại.';
          console.warn('[expand-streaming] Watchdog triggered');
          abortReasonRef.current = 'watchdog';
          abortControllerRef.current?.abort();
          cleanupTimers();
          expandingRef.current = false;
          setIsExpanding(false);
          setProgress({ type: 'error', message: errorMsg });
          options.onError?.(errorMsg);
        }, timeout);
      };
      
      resetWatchdog();

      const decoder = new TextDecoder();
      let buffer = '';
      let result: MultiChannelContent | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (!receivedFirstByte) {
          receivedFirstByte = true;
          console.log('[expand-streaming] First byte received');
        }
        resetWatchdog(true);

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              console.log('[expand-streaming] Received [DONE] marker');
              cleanupTimers();
              expandingRef.current = false;
              await reader.cancel();
              setIsExpanding(false);
              setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
              return result;
            }

            try {
              const event = JSON.parse(jsonStr) as ExpandProgressEvent;
              
              // Handle streaming text chunks
              if (event.type === 'streaming_text' && event.streamingChunk) {
                const { channel, text, isComplete } = event.streamingChunk;
                
                if (isComplete) {
                  setCompletedChannels(prev => 
                    prev.includes(channel) ? prev : [...prev, channel]
                  );
                } else {
                  setStreamingTexts(prev => ({
                    ...prev,
                    [channel]: (prev[channel] || '') + text,
                  }));
                }
              }
              
              // Update progress
              if (event.completedChannels) {
                setCompletedChannels(event.completedChannels);
              }
              
              setProgress(event);
              options.onProgress?.(event);

              if (event.type === 'result') {
                result = event.data;
                options.onComplete?.(event.data);
                console.log('[expand-streaming] Received result event');
                cleanupTimers();
                expandingRef.current = false;
                await reader.cancel();
                setIsExpanding(false);
                setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
                return result;
              } else if (event.type === 'error') {
                throw new Error(event.message || 'Lỗi không xác định');
              }
            } catch (parseError) {
              console.debug('SSE parse skip:', jsonStr);
            }
          }
        }
      }

      cleanupTimers();
      expandingRef.current = false;
      setIsExpanding(false);
      setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
      
      return result;
    } catch (error) {
      cleanupTimers();
      expandingRef.current = false;

      if (error instanceof Error && error.name === 'AbortError') {
        const reason = abortReasonRef.current;
        console.log(`[expand-streaming] Expansion aborted, reason: ${reason}`);
        setIsExpanding(false);
        setProgress(null);
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ type: 'error', message: errorMessage });
      options.onError?.(errorMessage);
      setIsExpanding(false);
      throw error;
    }
  }, [options, cleanupTimers]);

  const cancel = useCallback(() => {
    abortReasonRef.current = 'user';
    cleanupTimers();
    expandingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsExpanding(false);
      setProgress(null);
      setStreamingTexts({});
      setCompletedChannels([]);
    }
  }, [cleanupTimers]);

  const reset = useCallback(() => {
    setProgress(null);
    setStreamingTexts({});
    setCompletedChannels([]);
  }, []);

  return {
    expand,
    cancel,
    reset,
    progress,
    isExpanding,
    streamingTexts,
    completedChannels,
  };
}
