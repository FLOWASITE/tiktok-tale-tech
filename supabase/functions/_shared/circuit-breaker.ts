/**
 * Circuit Breaker Pattern for AI Provider Resilience
 * 
 * Tracks failure rates per model and automatically falls back to backup models
 * when failure threshold is exceeded.
 */

// ============================================
// TYPES
// ============================================

export interface CircuitBreakerState {
  failures: number;
  successes: number;
  lastFailure: number;
  lastSuccess: number;
  state: 'closed' | 'open' | 'half-open';
  openedAt: number | null;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  failureRateThreshold: number;  // Failure rate (0-1) before opening
  resetTimeoutMs: number;        // Time to wait before trying again
  halfOpenRequests: number;      // Number of test requests in half-open state
  windowSizeMs: number;          // Time window for calculating failure rate
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,           // 3 failures minimum
  failureRateThreshold: 0.3,     // 30% failure rate triggers fallback
  resetTimeoutMs: 5 * 60 * 1000, // 5 minutes before retry
  halfOpenRequests: 2,           // 2 test requests in half-open
  windowSizeMs: 5 * 60 * 1000,   // 5 minute rolling window
};

// Fallback model mapping
const FALLBACK_MODELS: Record<string, string> = {
  // OpenRouter models -> Lovable Gateway fallbacks
  'moonshotai/kimi-k2': 'google/gemini-2.5-flash',
  'moonshotai/moonshot-v1-8k': 'google/gemini-2.5-flash',
  'moonshotai/moonshot-v1-32k': 'google/gemini-2.5-flash',
  'moonshotai/moonshot-v1-128k': 'google/gemini-2.5-pro',
  'deepseek/deepseek-chat': 'google/gemini-2.5-flash',
  'deepseek/deepseek-r1': 'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4': 'google/gemini-2.5-pro',
  'anthropic/claude-3.5-sonnet': 'google/gemini-2.5-flash',
  'anthropic/claude-3-haiku': 'google/gemini-2.5-flash-lite',
  'qwen/qwen-turbo': 'google/gemini-2.5-flash-lite',
  'qwen/qwen-plus': 'google/gemini-2.5-flash',
  'qwen/qwen-max': 'google/gemini-2.5-pro',
  // Gemini fallbacks
  'google/gemini-2.5-pro': 'google/gemini-2.5-flash',
  'google/gemini-3-pro-preview': 'google/gemini-2.5-flash',
  // OpenAI fallbacks
  'openai/gpt-5': 'google/gemini-2.5-pro',
  'openai/gpt-5-mini': 'google/gemini-2.5-flash',
  'openai/gpt-5-nano': 'google/gemini-2.5-flash-lite',
};

// Default fallback for any unknown model
const DEFAULT_FALLBACK = 'google/gemini-2.5-flash';

// ============================================
// STATE MANAGEMENT
// ============================================

// In-memory state for circuit breakers (per-model)
const circuitStates = new Map<string, CircuitBreakerState>();

// Request timestamps for rate calculation
const requestHistory = new Map<string, { timestamp: number; success: boolean }[]>();

/**
 * Get or create circuit breaker state for a model
 */
function getState(model: string): CircuitBreakerState {
  let state = circuitStates.get(model);
  if (!state) {
    state = {
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastSuccess: 0,
      state: 'closed',
      openedAt: null,
    };
    circuitStates.set(model, state);
  }
  return state;
}

/**
 * Clean up old request history outside the window
 */
function cleanupHistory(model: string, windowSizeMs: number): void {
  const history = requestHistory.get(model);
  if (!history) return;
  
  const cutoff = Date.now() - windowSizeMs;
  const filtered = history.filter(r => r.timestamp > cutoff);
  requestHistory.set(model, filtered);
}

/**
 * Calculate failure rate within the window
 */
function getFailureRate(model: string, config: CircuitBreakerConfig): number {
  cleanupHistory(model, config.windowSizeMs);
  
  const history = requestHistory.get(model) || [];
  if (history.length < config.failureThreshold) {
    return 0; // Not enough data
  }
  
  const failures = history.filter(r => !r.success).length;
  return failures / history.length;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if a model's circuit is open (should use fallback)
 */
export function isCircuitOpen(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): boolean {
  const state = getState(model);
  const now = Date.now();
  
  // If open, check if we should transition to half-open
  if (state.state === 'open' && state.openedAt) {
    if (now - state.openedAt > config.resetTimeoutMs) {
      state.state = 'half-open';
      console.log(`[circuit-breaker] ${model}: OPEN -> HALF-OPEN (trying again)`);
    }
  }
  
  return state.state === 'open';
}

/**
 * Record a successful request
 */
export function recordSuccess(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): void {
  const state = getState(model);
  state.successes++;
  state.lastSuccess = Date.now();
  
  // Record in history
  const history = requestHistory.get(model) || [];
  history.push({ timestamp: Date.now(), success: true });
  requestHistory.set(model, history);
  
  // If half-open and successful, close the circuit
  if (state.state === 'half-open') {
    state.state = 'closed';
    state.failures = 0;
    state.openedAt = null;
    console.log(`[circuit-breaker] ${model}: HALF-OPEN -> CLOSED (recovered)`);
  }
}

/**
 * Record a failed request
 */
export function recordFailure(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): void {
  const state = getState(model);
  state.failures++;
  state.lastFailure = Date.now();
  
  // Record in history
  const history = requestHistory.get(model) || [];
  history.push({ timestamp: Date.now(), success: false });
  requestHistory.set(model, history);
  
  // Calculate current failure rate
  const failureRate = getFailureRate(model, config);
  
  // Check if we should open the circuit
  const shouldOpen = 
    (state.failures >= config.failureThreshold && failureRate >= config.failureRateThreshold) ||
    state.state === 'half-open'; // Any failure in half-open immediately opens
  
  if (shouldOpen && state.state !== 'open') {
    state.state = 'open';
    state.openedAt = Date.now();
    console.log(`[circuit-breaker] ${model}: -> OPEN (failures: ${state.failures}, rate: ${(failureRate * 100).toFixed(1)}%)`);
  }
}

/**
 * Get fallback model for a given model
 */
export function getFallbackModel(model: string): string {
  return FALLBACK_MODELS[model] || DEFAULT_FALLBACK;
}

/**
 * Get effective model (original or fallback if circuit is open)
 */
export function getEffectiveModel(
  model: string, 
  config: CircuitBreakerConfig = DEFAULT_CONFIG
): { model: string; usingFallback: boolean } {
  if (isCircuitOpen(model, config)) {
    const fallback = getFallbackModel(model);
    console.log(`[circuit-breaker] ${model} circuit OPEN, using fallback: ${fallback}`);
    return { model: fallback, usingFallback: true };
  }
  return { model, usingFallback: false };
}

/**
 * Get circuit breaker statistics for a model
 */
export function getStats(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: number | null;
  openedAt: number | null;
} {
  const state = getState(model);
  const failureRate = getFailureRate(model, config);
  
  return {
    state: state.state,
    failures: state.failures,
    successes: state.successes,
    failureRate,
    lastFailure: state.lastFailure || null,
    openedAt: state.openedAt,
  };
}

/**
 * Reset circuit breaker for a model (for testing/admin)
 */
export function resetCircuit(model: string): void {
  circuitStates.delete(model);
  requestHistory.delete(model);
  console.log(`[circuit-breaker] ${model}: RESET`);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
  circuitStates.clear();
  requestHistory.clear();
  console.log(`[circuit-breaker] All circuits RESET`);
}

// ============================================
// AUTO-RETRY UTILITY
// ============================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any, attempt: number) => boolean,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, delay: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= config.maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
      
      onRetry?.(attempt + 1, delay, error);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.statusCode;
  
  // Network/timeout errors - always retry
  if (message.includes('timeout') || 
      message.includes('network') || 
      message.includes('connection') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')) {
    return true;
  }
  
  // Rate limits - retry with backoff
  if (status === 429) {
    return true;
  }
  
  // Server errors - retry
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // 402 Payment Required - don't retry
  if (status === 402) {
    return false;
  }
  
  // 4xx errors - don't retry (except 429)
  if (status >= 400 && status < 500) {
    return false;
  }
  
  // Default: don't retry unknown errors
  return false;
}
