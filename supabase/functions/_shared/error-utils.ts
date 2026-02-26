// ============================================
// Error Handling Utilities
// Retry logic, Circuit Breaker, Graceful Degradation
// Re-exports FlowaError taxonomy for convenience
// ============================================

// Re-export error taxonomy
export { 
  FlowaError, TransientError, PermanentError, DegradationError,
  LLMTimeoutError, RateLimitError, NetworkError,
  AuthenticationError, InvalidInputError, ConfigurationError,
  NonCriticalNodeError, CacheError, EmbeddingError,
  classifyError, getErrorStrategy,
} from "./errors/flowa-error.ts";

export class RetryableError extends Error {
  retryable: boolean = true;
  retryAfterMs?: number;
  statusCode?: number;

  constructor(message: string, options?: { retryAfterMs?: number; statusCode?: number }) {
    super(message);
    this.name = 'RetryableError';
    this.retryAfterMs = options?.retryAfterMs;
    this.statusCode = options?.statusCode;
  }
}

export class NonRetryableError extends Error {
  retryable: boolean = false;
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'NonRetryableError';
    this.statusCode = statusCode;
  }
}

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is non-retryable
      if (error instanceof NonRetryableError) {
        throw error;
      }

      // Check custom retry condition
      if (opts.retryOn && !opts.retryOn(lastError)) {
        throw lastError;
      }

      // Check if we've exhausted retries
      if (attempt >= opts.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, opts.maxDelayMs);

      // Use retry-after header if available
      const retryAfter = (error as RetryableError).retryAfterMs;
      const actualDelay = retryAfter ? Math.min(retryAfter, opts.maxDelayMs) : delay;

      opts.onRetry?.(lastError, attempt + 1, actualDelay);

      await sleep(actualDelay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Circuit Breaker Pattern
// ============================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number | null;
  halfOpenCalls: number;
}

const DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  halfOpenMaxCalls: 3,
};

// In-memory circuit state (per function instance)
const circuitStates = new Map<string, CircuitBreakerState>();

/**
 * Create a circuit breaker for a specific service
 */
export function createCircuitBreaker(
  name: string,
  options: Partial<CircuitBreakerOptions> = {}
) {
  const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };

  // Initialize state if not exists
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: null,
      halfOpenCalls: 0,
    });
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const state = circuitStates.get(name)!;

      // Check if circuit should transition from OPEN to HALF_OPEN
      if (state.state === 'OPEN') {
        const timeSinceFailure = Date.now() - (state.lastFailureTime || 0);
        if (timeSinceFailure >= opts.resetTimeoutMs) {
          state.state = 'HALF_OPEN';
          state.halfOpenCalls = 0;
          console.log(`[CircuitBreaker:${name}] Transitioning to HALF_OPEN`);
        } else {
          throw new Error(`Circuit breaker ${name} is OPEN. Retry after ${opts.resetTimeoutMs - timeSinceFailure}ms`);
        }
      }

      // In HALF_OPEN, limit concurrent calls
      if (state.state === 'HALF_OPEN') {
        if (state.halfOpenCalls >= opts.halfOpenMaxCalls) {
          throw new Error(`Circuit breaker ${name} is HALF_OPEN and at max calls`);
        }
        state.halfOpenCalls++;
      }

      try {
        const result = await fn();

        // Success - reset failures
        if (state.state === 'HALF_OPEN') {
          state.state = 'CLOSED';
          console.log(`[CircuitBreaker:${name}] Recovered, transitioning to CLOSED`);
        }
        state.failures = 0;

        return result;
      } catch (error) {
        state.failures++;
        state.lastFailureTime = Date.now();

        if (state.failures >= opts.failureThreshold) {
          state.state = 'OPEN';
          console.log(`[CircuitBreaker:${name}] Threshold reached, transitioning to OPEN`);
        }

        throw error;
      }
    },

    getState(): CircuitState {
      return circuitStates.get(name)?.state || 'CLOSED';
    },

    reset(): void {
      circuitStates.set(name, {
        state: 'CLOSED',
        failures: 0,
        lastFailureTime: null,
        halfOpenCalls: 0,
      });
    },
  };
}

// ============================================
// Graceful Degradation Helpers
// ============================================

/**
 * Execute with fallback - returns fallback value if function fails
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  options?: {
    logError?: boolean;
    errorContext?: string;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (options?.logError !== false) {
      console.warn(
        `[withFallback${options?.errorContext ? `:${options.errorContext}` : ''}]`,
        'Using fallback due to error:',
        error instanceof Error ? error.message : String(error)
      );
    }
    return fallback;
  }
}

/**
 * Execute with timeout - throws if function takes too long
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Check if error is retryable based on status code
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NonRetryableError) return false;
  if (error instanceof RetryableError) return true;

  // Check for common retryable HTTP status codes
  const statusCode = (error as any).statusCode || (error as any).status;
  if (statusCode) {
    // 429 Too Many Requests, 500+ Server Errors (except 501 Not Implemented)
    return statusCode === 429 || (statusCode >= 500 && statusCode !== 501);
  }

  // Check for network errors
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('fetch failed')
  );
}

/**
 * Parse retry-after header value to milliseconds
 */
export function parseRetryAfter(retryAfter: string | number | null): number | undefined {
  if (!retryAfter) return undefined;

  if (typeof retryAfter === 'number') {
    return retryAfter * 1000; // Assume seconds
  }

  // Try parsing as number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return undefined;
}
