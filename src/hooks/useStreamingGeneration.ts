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

export interface BatchInfo {
  kind: 'long_form' | 'short_form';
  index: number;
  total: number;
  channels: string[];
  kindIndex: number;
  kindTotal: number;
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
  // Batch info (emitted on step='batch_start' / 'batch_complete')
  batchInfo?: BatchInfo;
}

interface UseStreamingGenerationOptions {
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

// Abort reason types for selective error handling
type AbortReason = 'user' | 'replaced' | 'watchdog' | 'realtime_done' | null;

export function useStreamingGeneration(options: UseStreamingGenerationOptions = {}) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const streamingTextsRef = useRef<Record<string, string>>({});
  const [channelUpdateSignal, setChannelUpdateSignal] = useState<{ channel: string; version: number }>({ channel: '', version: 0 });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  const generatingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const taskCompletedViaDbRef = useRef(false);

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

  // Watchdog timeout (180s no chunk = give up & try recover)
  const WATCHDOG_TIMEOUT_MS = 180000;
  const FIRST_BYTE_TIMEOUT_MS = 90000;
  // Polling fallback: only start polling after this many ms of stream silence
  const POLLING_SILENCE_THRESHOLD_MS = 30000;
  const POLLING_INTERVAL_MS = 10000;

  const cleanupTimers = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const cleanupRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
      realtimeChannelRef.current = null;
    }
  }, []);

  /**
   * Subscribe to generation_tasks Realtime updates for this task.
   * If the DB reports completed (with result_id) before SSE finishes,
   * abort the stream early and recover the content from DB.
   */
  const subscribeToTaskRealtime = useCallback((taskId: string, ctx: {
    organizationId?: string | null;
    topic?: string | null;
  }) => {
    cleanupRealtime();
    const channel = supabase
      .channel(`gen-task-${taskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'generation_tasks', filter: `id=eq.${taskId}` },
        async (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          // Push prep-phase progress into UI if SSE hasn't reported newer
          if (typeof row.progress === 'number' && row.current_step) {
            setProgress((prev) => {
              const prevP = prev?.progress ?? 0;
              if (row.progress < prevP) return prev;
              return {
                type: 'progress',
                step: row.current_step,
                progress: row.progress,
                message: row.progress_message || prev?.message,
              };
            });
          }
          if ((row.status === 'completed' || row.status === 'cancelled' || row.status === 'failed') && !taskCompletedViaDbRef.current) {
            taskCompletedViaDbRef.current = true;
            console.log(`[streaming] Realtime detected task ${row.status}, closing stream early`);
            // Trigger abort so the fetch loop unwinds and recovery runs
            abortReasonRef.current = 'realtime_done';
            if (abortControllerRef.current) {
              try { abortControllerRef.current.abort(); } catch {}
            }
            cleanupRealtime();
          }
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
  }, [cleanupRealtime]);

  /**
   * Polling fallback: every POLLING_INTERVAL_MS check task status if stream
   * has been silent for > POLLING_SILENCE_THRESHOLD_MS. Stops on terminal status.
   */
  const startPollingFallback = useCallback((taskId: string) => {
    if (pollingTimerRef.current) return;
    pollingTimerRef.current = setInterval(async () => {
      const silenceMs = Date.now() - lastEventTimeRef.current;
      if (silenceMs < POLLING_SILENCE_THRESHOLD_MS) return;
      try {
        const { data } = await supabase
          .from('generation_tasks')
          .select('status, progress, current_step, progress_message, result_id, error_message')
          .eq('id', taskId)
          .maybeSingle();
        if (!data) return;
        if (typeof data.progress === 'number' && data.current_step) {
          setProgress((prev) => {
            const prevP = prev?.progress ?? 0;
            if (data.progress < prevP) return prev;
            return {
              type: 'progress',
              step: data.current_step ?? prev?.step,
              progress: data.progress,
              message: data.progress_message || prev?.message,
            };
          });
        }
        if ((data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') && !taskCompletedViaDbRef.current) {
          taskCompletedViaDbRef.current = true;
          console.log(`[streaming] Polling detected task ${data.status}, closing stream early`);
          abortReasonRef.current = 'realtime_done';
          if (abortControllerRef.current) {
            try { abortControllerRef.current.abort(); } catch {}
          }
        }
      } catch (err) {
        console.warn('[streaming] polling fallback error', err);
      }
    }, POLLING_INTERVAL_MS);
  }, []);

  const generate = useCallback(async (formData: any): Promise<any> => {
    if (generatingRef.current) {
      console.log('[streaming] Blocked: generation already in progress (ref guard)');
      return null;
    }
    generatingRef.current = true;
    taskCompletedViaDbRef.current = false;

    if (abortControllerRef.current) {
      abortReasonRef.current = 'replaced';
      abortControllerRef.current.abort();
    }
    cleanupTimers();
    cleanupRealtime();

    abortControllerRef.current = new AbortController();
    abortReasonRef.current = null;
    lastEventTimeRef.current = Date.now();
    setIsGenerating(true);
    streamingTextsRef.current = {};
    setChannelUpdateSignal({ channel: '', version: 0 });
    setProgress({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' });

    let taskId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      userIdRef.current = session?.user?.id ?? null;

      if (!accessToken || !session?.user?.id) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
      }

      const orgId = formData.organization_id || formData.organizationId || null;
      if (!orgId) {
        throw new Error('Chưa chọn Workspace. Vui lòng chọn Workspace trước khi tạo nội dung.');
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: task, error: taskError } = await (supabase as any)
          .from('generation_tasks')
          .insert({
            user_id: session.user.id,
            organization_id: orgId,
            task_type: 'multichannel',
            status: 'pending',
            progress: 0,
            input_params: { ...formData, organization_id: orgId, organizationId: orgId },
          })
          .select()
          .single();

        if (!taskError && task?.id) {
          taskId = task.id;
          setCurrentTaskId(taskId);
          // Wire up Realtime + polling fallback right after task is created
          subscribeToTaskRealtime(taskId, {
            organizationId: orgId,
            topic: formData.topic,
          });
          startPollingFallback(taskId);
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
          body: JSON.stringify({ ...formData, organization_id: orgId, organizationId: orgId, stream: true, taskId }),
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

      let receivedFirstByte = false;

      const resetWatchdog = (isFirstByte = false) => {
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
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
          cleanupRealtime();
          generatingRef.current = false;
          setIsGenerating(false);
          setProgress({ type: 'error', message: errorMsg });
          options.onError?.(errorMsg);
        }, timeout);
      };

      resetWatchdog();

      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        lastEventTimeRef.current = Date.now();
        if (!receivedFirstByte) {
          receivedFirstByte = true;
          console.log('[streaming] First byte received');
        }
        resetWatchdog(true);

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              console.log('[streaming] Received [DONE] marker, closing stream');
              cleanupTimers();
              cleanupRealtime();
              generatingRef.current = false;
              await reader.cancel();
              setIsGenerating(false);
              setCurrentTaskId(null);
              setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
              return result;
            }

            try {
              const event = JSON.parse(jsonStr) as ProgressEvent;

              if (!event.batchInfo && event.data?.batchInfo) {
                event.batchInfo = event.data.batchInfo as BatchInfo;
              }

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
                console.log('[streaming] Received result event, closing stream');
                cleanupTimers();
                cleanupRealtime();
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
              console.debug('SSE parse skip:', jsonStr);
            }
          }
        }
      }

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

      cleanupTimers();
      cleanupRealtime();
      generatingRef.current = false;

      setIsGenerating(false);
      setCurrentTaskId(null);
      setProgress({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });

      return result;
    } catch (error) {
      cleanupTimers();
      generatingRef.current = false;

      // Realtime/polling detected terminal status → always attempt recovery
      const isRealtimeDone = abortReasonRef.current === 'realtime_done';

      if (
        taskId &&
        error instanceof Error &&
        abortReasonRef.current !== 'user' &&
        abortReasonRef.current !== 'replaced' &&
        (isRealtimeDone || error.name === 'AbortError' || isRecoverableMultichannelError(error.message))
      ) {
        try {
          const recoveredResult = await recoverFromTask({
            taskId,
            userId: userIdRef.current,
            organizationId: formData.organization_id,
            topic: formData.topic,
            reason: error.message || 'Kết nối stream bị ngắt trước khi nhận kết quả',
          });
          cleanupRealtime();
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

      cleanupRealtime();

      if (error instanceof Error && error.name === 'AbortError') {
        const reason = abortReasonRef.current;
        console.log(`[streaming] Generation aborted, reason: ${reason}`);
        setIsGenerating(false);
        if (reason === 'user') {
          setProgress({ type: 'progress', step: 'cancelled', progress: 0, message: 'Đã hủy.' });
        } else {
          setProgress(null);
        }
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ type: 'error', message: errorMessage });
      options.onError?.(errorMessage);
      setIsGenerating(false);
      throw error;
    }
  }, [options, cleanupTimers, cleanupRealtime, subscribeToTaskRealtime, startPollingFallback, recoverFromTask]);

  const cancel = useCallback(async () => {
    abortReasonRef.current = 'user';
    cleanupTimers();
    cleanupRealtime();
    generatingRef.current = false;
    const taskIdToCancel = currentTaskId;
    userIdRef.current = null;
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch {}
      setIsGenerating(false);
      setProgress({ type: 'progress', step: 'cancelled', progress: 0, message: 'Đã hủy.' });
      streamingTextsRef.current = {};
      setChannelUpdateSignal({ channel: '', version: 0 });
      setCurrentTaskId(null);
    }
    // Mark task as cancelled in DB so backend can stop work on next checkpoint
    if (taskIdToCancel) {
      try {
        await supabase
          .from('generation_tasks')
          .update({ status: 'cancelled', error_message: 'User cancelled' })
          .eq('id', taskIdToCancel);
      } catch (err) {
        console.warn('[streaming] Failed to mark task cancelled:', err);
      }
    }
  }, [cleanupTimers, cleanupRealtime, currentTaskId]);

  const getChannelText = useCallback((ch: string) => streamingTextsRef.current[ch] || '', []);
  const streamingTexts = streamingTextsRef.current;

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortReasonRef.current = 'replaced';
        abortControllerRef.current.abort();
      }
      cleanupTimers();
      cleanupRealtime();
      generatingRef.current = false;
      userIdRef.current = null;
      streamingTextsRef.current = {};
    };
  }, [cleanupTimers, cleanupRealtime]);

  return {
    generate,
    cancel,
    progress,
    isGenerating,
    streamingTexts,
    getChannelText,
    channelUpdateSignal,
    currentTaskId,
  };
}
