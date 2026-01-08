/**
 * Shared AI types and error codes
 */

export type AIErrorCode = 'CREDITS_EXHAUSTED' | 'RATE_LIMIT' | 'UNKNOWN';

export interface AIHookState {
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
}

export interface AIRequestOptions {
  brandTemplateId?: string;
  organizationId?: string;
  signal?: AbortSignal;
}
