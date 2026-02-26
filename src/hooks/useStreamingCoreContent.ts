import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CoreContentLengthMode } from '@/types/coreContent';
import { ContentGoal, ContentAngle } from '@/types/multichannel';

// ============================================
// STREAMING CORE CONTENT HOOK
// ============================================

export interface CoreContentProgress {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  estimatedRemainingMs?: number;
}

export interface StreamingCoreContentResult {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  keyMessages: string[];
  generationMetadata?: {
    stepsCompleted: string[];
    generationTimeMs: number;
    modelsUsed: string[];
  };
}

interface UseStreamingCoreContentOptions {
  onProgress?: (progress: CoreContentProgress) => void;
  onComplete?: (result: StreamingCoreContentResult) => void;
  onError?: (error: string) => void;
}

interface GenerateRequest {
  topic: string;
  contentGoal: ContentGoal;
  contentAngle?: ContentAngle;
  lengthMode?: CoreContentLengthMode;
  brandTemplateId?: string;
  organizationId: string;
  targetAudience?: string;
  personaId?: string;
  additionalContext?: string;
  enableResearch?: boolean;
  researchRecency?: 'day' | 'week' | 'month' | 'year';
}

const MAX_RETRIES = 2;

export function useStreamingCoreContent(options: UseStreamingCoreContentOptions = {}) {
  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<CoreContentProgress>({
    step: '',
    progress: 0,
    message: '',
    isComplete: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<GenerateRequest | null>(null);

  const generateInternal = useCallback(async (request: GenerateRequest, currentRetry: number): Promise<StreamingCoreContentResult | null> => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setLastError(null);
    
    if (currentRetry === 0) {
      setStreamingText('');
      setProgress({ step: 'init', progress: 0, message: 'Đang khởi tạo...', isComplete: false });
    } else {
      setProgress({ step: 'retrying', progress: 0, message: `Đang thử lại (${currentRetry}/${MAX_RETRIES})...`, isComplete: false });
    }

    let taskId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken || !session?.user?.id) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
      }

      // Create a background task for tracking (only on first try)
      if (currentRetry === 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: task, error: taskError } = await (supabase as any)
            .from('generation_tasks')
            .insert({
              user_id: session.user.id,
              organization_id: request.organizationId || null,
              task_type: 'core_content',
              status: 'pending',
              progress: 0,
              input_params: request,
            })
            .select()
            .single();

          if (!taskError && task?.id) {
            taskId = task.id;
            setCurrentTaskId(taskId);
          }
        } catch (err) {
          console.warn('[StreamingCoreContent] Failed to create task:', err);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-core-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...request,
            stream: true,
            taskId, // Pass taskId to edge function for progress tracking
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Lỗi khi tạo Core Content');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let finalResult: StreamingCoreContentResult | null = null;

      // Watchdog timer - increased to 5 minutes for quality models
      const WATCHDOG_TIMEOUT = 300000; // 5 minutes for quality models
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

      const resetWatchdog = () => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
          console.warn('[StreamingCoreContent] Watchdog timeout after 5 minutes');
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
              setProgress({ step: 'complete', progress: 100, message: 'Hoàn thành!', isComplete: true });
              continue;
            }

            let event: any;
            try {
              event = JSON.parse(jsonStr);
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
              continue;
            }

            // Handle keepalive events
            if (event.type === 'keepalive') {
              resetWatchdog();
              continue;
            }

            // Handle progress events
            if (event.type === 'progress') {
              const progressData: CoreContentProgress = {
                step: event.step || '',
                progress: event.progress || 0,
                message: event.message || '',
                isComplete: false,
                estimatedRemainingMs: event.estimatedRemainingMs,
              };
              setProgress(progressData);
              options.onProgress?.(progressData);
            }

            // Handle streaming text
            if (event.type === 'streaming_text') {
              const deltaText = event.content || event.text || '';
              if (deltaText) {
                accumulatedText += deltaText;
                setStreamingText(accumulatedText);
              }
            }

            // Handle final result
            if (event.type === 'result') {
              finalResult = {
                id: event.data?.id || '',
                title: event.data?.title || '',
                content: event.data?.content || accumulatedText,
                wordCount: event.data?.wordCount || 0,
                qualityScore: event.data?.qualityScore || 0,
                keyMessages: event.data?.keyMessages || [],
                generationMetadata: event.data?.generationMetadata,
              };
              setProgress({ step: 'complete', progress: 100, message: 'Hoàn thành!', isComplete: true });
              options.onComplete?.(finalResult);
            }

            // Handle error - throw to outer catch (NOT swallowed by parse catch)
            if (event.type === 'error') {
              throw new Error(event.message || 'Lỗi không xác định từ AI');
            }
          }
        }
      }

      if (watchdogTimer) clearTimeout(watchdogTimer);
      setRetryCount(0); // Reset retry count on success

      // If stream ended without a result event, treat as error
      if (!finalResult) {
        throw new Error('Không nhận được nội dung từ AI, vui lòng thử lại.');
      }

      return finalResult;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                            errorMessage.toLowerCase().includes('timeout') ||
                            errorMessage.toLowerCase().includes('connection');

      // Auto-retry for network errors
      if (isNetworkError && currentRetry < MAX_RETRIES) {
        console.log(`[StreamingCoreContent] Network error, retrying... (${currentRetry + 1}/${MAX_RETRIES})`);
        setRetryCount(currentRetry + 1);
        
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (currentRetry + 1)));
        
        return generateInternal(request, currentRetry + 1);
      }

      setLastError(errorMessage);
      setProgress({ step: 'error', progress: 0, message: errorMessage, isComplete: false });
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const generate = useCallback(async (request: GenerateRequest): Promise<StreamingCoreContentResult | null> => {
    lastRequestRef.current = request;
    setRetryCount(0);
    return generateInternal(request, 0);
  }, [generateInternal]);

  const retry = useCallback(async (): Promise<StreamingCoreContentResult | null> => {
    if (!lastRequestRef.current) {
      console.warn('[StreamingCoreContent] No previous request to retry');
      return null;
    }
    setRetryCount(0);
    return generateInternal(lastRequestRef.current, 0);
  }, [generateInternal]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setStreamingText('');
      setProgress({ step: '', progress: 0, message: '', isComplete: false });
      setLastError(null);
      setRetryCount(0);
    }
  }, []);

  const reset = useCallback(() => {
    setStreamingText('');
    setProgress({ step: '', progress: 0, message: '', isComplete: false });
    setLastError(null);
    setRetryCount(0);
    setCurrentTaskId(null);
  }, []);

  return {
    generate,
    retry,
    cancel,
    reset,
    streamingText,
    isGenerating,
    progress,
    retryCount,
    lastError,
    currentTaskId,
    canRetry: !!lastRequestRef.current && !isGenerating,
  };
}
