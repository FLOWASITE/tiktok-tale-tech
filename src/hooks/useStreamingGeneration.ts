import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isRecoverableMultichannelError, waitForRecoveredMultichannel } from '@/lib/recoverGeneratedMultichannel';

export interface ChannelContentPreview {
  channel: string;
  preview: string;
  fullContent?: string;
  wordCount: number;
  isStreaming?: boolean;
}

export interface StreamingTextChunk {
  channel: string;
  text: string;
  isComplete: boolean;
}

export interface ProgressEvent {
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
  channelContent?: ChannelContentPreview;
  channelContents?: ChannelContentPreview[];
  // Streaming text for typewriter effect
  streamingChunk?: StreamingTextChunk;
  recoverySource?: 'background_task' | 'recent_content';
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
  // Per-channel state isolation: useRef for accumulated text (no re-render),
  // useState only for signaling which channel updated (targeted re-render)
  const streamingTextsRef = useRef<Record<string, string>>({});
  const [channelUpdateSignal, setChannelUpdateSignal] = useState<{ channel: string; version: number }>({ channel: '', version: 0 });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  // Synchronous guard to prevent double-submit (ref updates immediately, unlike state)
  const generatingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const recoverFromTask = useCallback(async (params: {
    taskId: string;
    userId?: string | null;
    organizationId?: string | null;
    topic?: string | null;
    reason: string;
  }) => {
    const recovered = await waitForRecoveredMultichannel({
      taskId: params.taskId,
      userId: params.userId,
      organizationId: params.organizationId,
      topic: params.topic,
    });

    if (recovered.content) {
      const recoverySource = recovered.source === 'recent_content' ? 'recent_content' : 'background_task';
      const recoveryMessage = recoverySource === 'recent_content'
        ? 'Stream bị ngắt, đã nối lại từ nội dung vừa lưu.'
        : 'Stream bị ngắt, đã khôi phục từ background task.';

      const recoveryEvent: ProgressEvent = {
        type: 'result',
        progress: 100,
        step: recovered.task?.status === 'completed' ? 'recovered_complete' : 'recovering_background',
        message: recoveryMessage,
        data: recovered.content,
        recoverySource,
      };

      setProgress(recoveryEvent);
      options.onProgress?.(recoveryEvent);
      options.onComplete?.(recovered.content);
      return recovered.content;
    }

    if (recovered.task?.status === 'failed') {
      throw new Error(recovered.task.error_message || params.reason);
    }

    throw new Error(params.reason);
  }, [options]);

  // Watchdog timeout in ms - cancel if no events received for this duration
  // Increased to 150s to handle slow AI models and buffering without false positives
  const WATCHDOG_TIMEOUT_MS = 150000; // 150 seconds
  // Grace period for first byte - shorter timeout for initial connection
  const FIRST_BYTE_TIMEOUT_MS = 30000; // 30 seconds

  const cleanupTimers = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
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
    streamingTextsRef.current = {}; // Reset streaming texts
    setChannelUpdateSignal({ channel: '', version: 0 });
    setProgress({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' });

    let taskId: string | null = null;

    try {
      // Get current user's access token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      userIdRef.current = session?.user?.id ?? null;

      if (!accessToken || !session?.user?.id) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
      }

      // Create a background task for tracking
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: task, error: taskError } = await (supabase as any)
          .from('generation_tasks')
          .insert({
            user_id: session.user.id,
            organization_id: formData.organization_id || null,
            task_type: 'multichannel',
            status: 'pending',
            progress: 0,
            input_params: formData,
          })
          .select()
          .single();

        if (!taskError && task?.id) {
          taskId = task.id;
          setCurrentTaskId(taskId);
        }
      } catch (err) {
        console.warn('[streaming] Failed to create task:', err);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-multichannel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ...formData, stream: true, taskId }),
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

      // Track if we've received the first byte
      let receivedFirstByte = false;
      
      // Sliding-window watchdog: reset timer on each chunk received
      const resetWatchdog = (isFirstByte = false) => {
        cleanupTimers();
        const timeout = isFirstByte ? WATCHDOG_TIMEOUT_MS : (receivedFirstByte ? WATCHDOG_TIMEOUT_MS : FIRST_BYTE_TIMEOUT_MS);
        watchdogTimerRef.current = setTimeout(() => {
          const errorMsg = receivedFirstByte 
            ? 'Kết nối streaming bị ngắt quá lâu. Vui lòng thử lại.'
            : 'Không nhận được dữ liệu từ máy chủ. Kiểm tra mạng và thử lại.';
          console.warn(`[streaming] Watchdog triggered: no events for ${timeout}ms, aborting...`);
          abortReasonRef.current = 'watchdog';
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          cleanupTimers();
          generatingRef.current = false;
          setIsGenerating(false);
          setProgress({ type: 'error', message: errorMsg });
          options.onError?.(errorMsg);
        }, timeout);
      };
      
      // Start initial watchdog (waiting for first byte)
      resetWatchdog();

      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Update last event time and reset watchdog on any data received
        lastEventTimeRef.current = Date.now();
        if (!receivedFirstByte) {
          receivedFirstByte = true;
          console.log('[streaming] First byte received');
        }
        resetWatchdog(true);

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
              setCurrentTaskId(null);
              setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
              return result;
            }

              try {
              const event = JSON.parse(jsonStr) as ProgressEvent;
              
              // Handle streaming text chunks - accumulate for typewriter effect
              if (event.type === 'streaming_text' && event.streamingChunk) {
                const { channel, text, isComplete } = event.streamingChunk;
                console.log(`[streaming_text] ${channel}: +${text.length} chars, complete: ${isComplete}`);
                streamingTextsRef.current = {
                  ...streamingTextsRef.current,
                  [channel]: (streamingTextsRef.current[channel] || '') + text,
                };
                setChannelUpdateSignal({ channel, version: Date.now() });
              }
              
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
                setCurrentTaskId(null);
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
      setCurrentTaskId(null);
      setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
      
      return result;
    } catch (error) {
      // Clear watchdog timer on error
      cleanupTimers();
      generatingRef.current = false;

      if (
        taskId &&
        error instanceof Error &&
        abortReasonRef.current !== 'user' &&
        abortReasonRef.current !== 'replaced' &&
        (error.name === 'AbortError' || isRecoverableMultichannelError(error.message))
      ) {
        try {
          const recoveredResult = await recoverFromTask({
            taskId,
            userId: userIdRef.current,
            organizationId: formData.organization_id,
            topic: formData.topic,
            reason: error.message || 'Kết nối stream bị ngắt trước khi nhận kết quả',
          });
          setIsGenerating(false);
          setCurrentTaskId(null);
          generatingRef.current = false;
          return recoveredResult;
        } catch (recoveryError) {
          const recoveryMessage = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
          if (error.name !== 'AbortError') {
            setProgress({ type: 'progress', step: 'recovery_failed', progress: 0, message: recoveryMessage });
          }
        }
      }

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
    userIdRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(null);
      streamingTextsRef.current = {};
      setChannelUpdateSignal({ channel: '', version: 0 });
      setCurrentTaskId(null);
    }
  }, [cleanupTimers]);

  // Expose getChannelText for per-channel subscription (avoids full object re-render)
  const getChannelText = useCallback((ch: string) => streamingTextsRef.current[ch] || '', []);

  // Stable snapshot for consumers that need the full object
  const streamingTexts = streamingTextsRef.current;

  // Cleanup on unmount: abort any active generation and reset state
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortReasonRef.current = 'replaced';
        abortControllerRef.current.abort();
      }
      cleanupTimers();
      generatingRef.current = false;
      userIdRef.current = null;
      streamingTextsRef.current = {};
    };
  }, [cleanupTimers]);

  return {
    generate,
    cancel,
    progress,
    isGenerating,
    streamingTexts, // Accumulated streaming text per channel (ref snapshot)
    getChannelText, // Per-channel accessor (no re-render on other channels)
    channelUpdateSignal, // Signal for per-channel re-render
    currentTaskId, // Current task ID for background tracking
  };
}
