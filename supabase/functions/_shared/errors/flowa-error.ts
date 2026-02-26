// ============================================
// FlowaError Taxonomy
// Structured error hierarchy for the Flowa pipeline
// ============================================

/**
 * Base error class for all Flowa errors.
 * Provides structured error info for retry/skip/fail decisions.
 */
export class FlowaError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly skipable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      retryable?: boolean;
      skipable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'FlowaError';
    this.code = options.code || 'FLOWA_ERROR';
    this.statusCode = options.statusCode || 500;
    this.retryable = options.retryable ?? false;
    this.skipable = options.skipable ?? false;
    if (options.cause) this.cause = options.cause;
  }
}

// ============================================
// Transient Errors (retry-able)
// ============================================

export class TransientError extends FlowaError {
  readonly retryAfterMs?: number;

  constructor(message: string, options?: { code?: string; statusCode?: number; retryAfterMs?: number; cause?: Error }) {
    super(message, {
      code: options?.code || 'TRANSIENT_ERROR',
      statusCode: options?.statusCode || 503,
      retryable: true,
      skipable: false,
      cause: options?.cause,
    });
    this.name = 'TransientError';
    this.retryAfterMs = options?.retryAfterMs;
  }
}

export class LLMTimeoutError extends TransientError {
  constructor(message = 'LLM request timed out', options?: { retryAfterMs?: number; cause?: Error }) {
    super(message, { code: 'LLM_TIMEOUT', statusCode: 504, ...options });
    this.name = 'LLMTimeoutError';
  }
}

export class RateLimitError extends TransientError {
  constructor(message = 'Rate limit exceeded', options?: { retryAfterMs?: number; cause?: Error }) {
    super(message, { code: 'RATE_LIMIT', statusCode: 429, ...options });
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends TransientError {
  constructor(message = 'Network error', options?: { cause?: Error }) {
    super(message, { code: 'NETWORK_ERROR', statusCode: 503, ...options });
    this.name = 'NetworkError';
  }
}

// ============================================
// Permanent Errors (fail fast, no retry)
// ============================================

export class PermanentError extends FlowaError {
  constructor(message: string, options?: { code?: string; statusCode?: number; cause?: Error }) {
    super(message, {
      code: options?.code || 'PERMANENT_ERROR',
      statusCode: options?.statusCode || 400,
      retryable: false,
      skipable: false,
      cause: options?.cause,
    });
    this.name = 'PermanentError';
  }
}

export class AuthenticationError extends PermanentError {
  constructor(message = 'Authentication failed', options?: { cause?: Error }) {
    super(message, { code: 'AUTH_ERROR', statusCode: 401, ...options });
    this.name = 'AuthenticationError';
  }
}

export class InvalidInputError extends PermanentError {
  constructor(message = 'Invalid input', options?: { cause?: Error }) {
    super(message, { code: 'INVALID_INPUT', statusCode: 400, ...options });
    this.name = 'InvalidInputError';
  }
}

export class ConfigurationError extends PermanentError {
  constructor(message = 'Configuration error', options?: { cause?: Error }) {
    super(message, { code: 'CONFIG_ERROR', statusCode: 500, ...options });
    this.name = 'ConfigurationError';
  }
}

// ============================================
// Degradation Errors (skip & continue)
// ============================================

export class DegradationError extends FlowaError {
  constructor(message: string, options?: { code?: string; cause?: Error }) {
    super(message, {
      code: options?.code || 'DEGRADATION_ERROR',
      statusCode: 200, // Not a failure from HTTP perspective
      retryable: false,
      skipable: true,
      cause: options?.cause,
    });
    this.name = 'DegradationError';
  }
}

export class NonCriticalNodeError extends DegradationError {
  readonly nodeName: string;
  constructor(nodeName: string, message?: string, options?: { cause?: Error }) {
    super(message || `Non-critical node '${nodeName}' failed`, { code: 'NODE_DEGRADED', ...options });
    this.name = 'NonCriticalNodeError';
    this.nodeName = nodeName;
  }
}

export class CacheError extends DegradationError {
  constructor(message = 'Cache operation failed', options?: { cause?: Error }) {
    super(message, { code: 'CACHE_ERROR', ...options });
    this.name = 'CacheError';
  }
}

export class EmbeddingError extends DegradationError {
  constructor(message = 'Embedding generation failed', options?: { cause?: Error }) {
    super(message, { code: 'EMBEDDING_ERROR', ...options });
    this.name = 'EmbeddingError';
  }
}

// ============================================
// Error Classification Helpers
// ============================================

/**
 * Classify an unknown error into the FlowaError hierarchy.
 * Used when catching generic errors from external services.
 */
export function classifyError(error: unknown): FlowaError {
  if (error instanceof FlowaError) return error;

  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();
  const statusCode = (err as any).statusCode || (err as any).status;

  // Rate limit
  if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return new RateLimitError(err.message, { cause: err });
  }

  // Timeout
  if (statusCode === 504 || message.includes('timeout') || message.includes('timed out') || message.includes('deadline exceeded')) {
    return new LLMTimeoutError(err.message, { cause: err });
  }

  // Network
  if (message.includes('network') || message.includes('econnreset') || message.includes('socket hang up') || message.includes('fetch failed')) {
    return new NetworkError(err.message, { cause: err });
  }

  // Auth
  if (statusCode === 401 || statusCode === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
    return new AuthenticationError(err.message, { cause: err });
  }

  // Invalid input
  if (statusCode === 400 || message.includes('invalid') || message.includes('validation')) {
    return new InvalidInputError(err.message, { cause: err });
  }

  // Server errors (retryable)
  if (statusCode && statusCode >= 500 && statusCode !== 501) {
    return new TransientError(err.message, { statusCode, cause: err });
  }

  // Default: treat as transient (retry once)
  return new TransientError(err.message, { cause: err });
}

/**
 * Determine error handling strategy for a node failure.
 */
export function getErrorStrategy(error: FlowaError, isCriticalNode: boolean): 'retry' | 'skip' | 'fail' {
  if (error instanceof PermanentError) return 'fail';
  if (error instanceof DegradationError && !isCriticalNode) return 'skip';
  if (error instanceof TransientError) return 'retry';
  // Unknown FlowaError on critical node → fail
  if (isCriticalNode) return 'fail';
  return 'skip';
}
