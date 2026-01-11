import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CoreContentQualityMode } from '@/types/coreContent';
import { ContentGoal, ContentAngle } from '@/types/multichannel';

// ============================================
// STREAMING CORE CONTENT HOOK
// ============================================

export interface CoreContentProgress {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  // Detailed progress info
  stepProgress?: number;           // 0-100 for current step
  totalSteps?: number;
  currentStepIndex?: number;
  estimatedRemainingMs?: number;
  sectionInfo?: {
    current: number;
    total: number;
    title: string;
  };
}

export interface StreamingCoreContentResult {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  keyMessages: string[];
  generationMetadata?: {
    qualityMode: string;
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
  qualityMode?: CoreContentQualityMode;
  brandTemplateId?: string;
  organizationId: string;
  targetAudience?: string;
  additionalContext?: string;
  // New: Research options
  enableResearch?: boolean;
  researchRecency?: 'day' | 'week' | 'month' | 'year';
}

export function useStreamingCoreContent(options: UseStreamingCoreContentOptions = {}) {
  const [streamingText, setStreamingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<CoreContentProgress>({
    step: '',
    progress: 0,
    message: '',
    isComplete: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (request: GenerateRequest): Promise<StreamingCoreContentResult | null> => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setStreamingText('');
    setProgress({ step: 'init', progress: 0, message: 'Đang khởi tạo...', isComplete: false });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Vui lòng đăng nhập để tạo nội dung');
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

            try {
              const event = JSON.parse(jsonStr);

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
                  // Detailed progress info
                  stepProgress: event.stepProgress,
                  totalSteps: event.totalSteps,
                  currentStepIndex: event.currentStepIndex,
                  estimatedRemainingMs: event.estimatedRemainingMs,
                  sectionInfo: event.sectionInfo,
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

              // Handle section complete
              if (event.type === 'section_complete') {
                accumulatedText = event.content || accumulatedText;
                setStreamingText(accumulatedText);
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

              // Handle error
              if (event.type === 'error') {
                throw new Error(event.message || 'Lỗi không xác định');
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      if (watchdogTimer) clearTimeout(watchdogTimer);

      return finalResult;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setProgress({ step: 'error', progress: 0, message: errorMessage, isComplete: false });
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setStreamingText('');
      setProgress({ step: '', progress: 0, message: '', isComplete: false });
    }
  }, []);

  const reset = useCallback(() => {
    setStreamingText('');
    setProgress({ step: '', progress: 0, message: '', isComplete: false });
  }, []);

  return {
    generate,
    cancel,
    reset,
    streamingText,
    isGenerating,
    progress,
  };
}
