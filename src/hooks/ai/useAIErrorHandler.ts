import { useCallback } from 'react';
import type { AIErrorCode } from './types';

interface ErrorHandlerResult {
  message: string;
  code: AIErrorCode;
}

/**
 * Shared error handling for AI hooks
 * Centralizes error parsing logic for API responses
 */
export function useAIErrorHandler() {
  const handleApiError = useCallback((err: unknown, fallbackMessage: string): ErrorHandlerResult => {
    // Check for Lovable AI specific error codes
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Rate limit detection
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429')
    ) {
      return {
        message: 'Đã đạt giới hạn request. Vui lòng thử lại sau.',
        code: 'RATE_LIMIT',
      };
    }
    
    // Credits exhausted detection
    if (
      errorMessage.includes('credits exhausted') ||
      errorMessage.includes('CREDITS_EXHAUSTED') ||
      errorMessage.includes('insufficient credits') ||
      errorMessage.includes('quota exceeded')
    ) {
      return {
        message: 'Đã hết credits AI. Vui lòng nâng cấp hoặc chờ reset.',
        code: 'CREDITS_EXHAUSTED',
      };
    }
    
    // Default unknown error
    return {
      message: fallbackMessage,
      code: 'UNKNOWN',
    };
  }, []);

  const parseErrorCode = useCallback((data: unknown): AIErrorCode | null => {
    if (data && typeof data === 'object' && 'errorCode' in data) {
      const code = (data as { errorCode?: string }).errorCode;
      if (code === 'RATE_LIMIT' || code === 'CREDITS_EXHAUSTED') {
        return code;
      }
    }
    return null;
  }, []);

  return { handleApiError, parseErrorCode };
}
