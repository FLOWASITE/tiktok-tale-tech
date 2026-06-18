export type EdgeFunctionErrorCode = 'CREDITS_EXHAUSTED' | 'RATE_LIMIT' | 'ALL_PROVIDERS_DOWN' | 'IDLE_TIMEOUT' | 'PROVIDER_CONFIG_MISSING' | 'UNKNOWN';

interface EdgeFunctionErrorPayload {
  error?: string;
  errorCode?: string;
  code?: string;
}

export interface ParsedEdgeFunctionError {
  message: string;
  code: EdgeFunctionErrorCode;
  status?: number;
}

const CREDITS_PATTERN = /credits|payment required|not enough credits|402/i;
const RATE_LIMIT_PATTERN = /rate limit|too many requests|429/i;
const IDLE_TIMEOUT_PATTERN = /IDLE_TIMEOUT|idle timeout|504|timed out/i;

export function parseEdgeFunctionError(
  error: unknown,
  fallbackMessage: string,
): ParsedEdgeFunctionError {
  const err = error as {
    message?: string;
    context?: { body?: string; status?: number };
  } | null;

  let message = err?.message || fallbackMessage;
  let code: EdgeFunctionErrorCode = 'UNKNOWN';
  const status = err?.context?.status;

  if (typeof err?.context?.body === 'string' && err.context.body.trim()) {
    try {
      const body = JSON.parse(err.context.body) as EdgeFunctionErrorPayload;
      if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error;
      }
      if (body.errorCode === 'CREDITS_EXHAUSTED') {
        code = 'CREDITS_EXHAUSTED';
      }
      if (body.errorCode === 'RATE_LIMIT' || body.errorCode === 'RATE_LIMITED') {
        code = 'RATE_LIMIT';
      }
      if (body.errorCode === 'ALL_PROVIDERS_DOWN') {
        code = 'ALL_PROVIDERS_DOWN';
      }
      if (body.errorCode === 'IDLE_TIMEOUT' || body.code === 'IDLE_TIMEOUT') {
        code = 'IDLE_TIMEOUT';
      }
      if (body.errorCode === 'PROVIDER_CONFIG_MISSING') {
        code = 'PROVIDER_CONFIG_MISSING';
        message = 'Provider AI tạo ảnh chưa được cấu hình. Liên hệ admin để thêm API key.';
      }
    } catch {
      // Ignore non-JSON body
    }
  }

  if (code === 'UNKNOWN') {
    if (status === 402 || CREDITS_PATTERN.test(message)) {
      code = 'CREDITS_EXHAUSTED';
    } else if (status === 429 || RATE_LIMIT_PATTERN.test(message)) {
      code = 'RATE_LIMIT';
    } else if (status === 504 || IDLE_TIMEOUT_PATTERN.test(message)) {
      code = 'IDLE_TIMEOUT';
    } else if (/ALL_PROVIDERS_DOWN/i.test(message)) {
      code = 'ALL_PROVIDERS_DOWN';
    }
  }

  return { message, code, status };
}