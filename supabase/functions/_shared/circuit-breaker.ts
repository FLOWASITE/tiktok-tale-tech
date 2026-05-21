/**
 * Circuit Breaker Pattern for AI Provider Resilience
 * 
 * Tracks failure rates per model and automatically falls back to backup models
 * when failure threshold is exceeded.
 * 
 * v2: Hybrid Redis + in-memory state for cross-instance awareness.
 */

import { getRedis } from "./cache/redis-cache.ts";

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

// Fallback model mapping (family-aware: keep user's provider whenever possible)
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
  'google/gemini-3.1-pro-preview': 'google/gemini-2.5-flash',
  'google/gemini-3.5-flash': 'google/gemini-2.5-flash',
  // OpenAI fallbacks
  'openai/gpt-5': 'google/gemini-2.5-pro',
  'openai/gpt-5-mini': 'google/gemini-2.5-flash',
  'openai/gpt-5-nano': 'google/gemini-2.5-flash-lite',
  // DeepSeek direct (stay within family before crossing to Gemini)
  'deepseek-v4-flash': 'deepseek-chat',
  'deepseek-v4-pro': 'deepseek-reasoner',
  'deepseek-reasoner': 'deepseek-chat',
  'deepseek-chat': 'google/gemini-2.5-flash',
  // DashScope / Qwen direct
  'qwen-max': 'qwen-plus',
  'qwen-max-latest': 'qwen-plus',
  'qwen-plus': 'qwen-flash',
  'qwen-plus-latest': 'qwen-flash',
  'qwen-turbo': 'qwen-flash',
  'qwen-long': 'qwen-plus',
  'qwen-flash': 'google/gemini-2.5-flash',
  'qwen-vl-max': 'qwen-vl-plus',
  'qwen-vl-plus': 'google/gemini-2.5-flash',
};

// Default fallback for any unknown model
const DEFAULT_FALLBACK = 'google/gemini-2.5-flash';

/**
 * Resolve a family-aware fallback for models not listed in FALLBACK_MODELS.
 * Keeps the user's chosen provider whenever possible instead of silently
 * switching to Lovable Gateway gemini.
 */
function resolveFamilyFallback(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith('deepseek-')) return 'deepseek-chat';
  if (m.startsWith('qwen-vl')) return 'qwen-vl-plus';
  if (m.startsWith('qwen-')) return 'qwen-plus';
  if (m.startsWith('deepseek/')) return 'google/gemini-2.5-flash';
  if (m.startsWith('9router/')) return 'google/gemini-2.5-flash';
  if (m.startsWith('openai/')) return 'openai/gpt-5-mini';
  if (m.startsWith('google/gemini-3')) return 'google/gemini-2.5-flash';
  return DEFAULT_FALLBACK;
}

// ============================================
// STATE MANAGEMENT (Hybrid: Redis + In-Memory)
// ============================================

// In-memory state for circuit breakers (per-model) — local fallback
const circuitStates = new Map<string, CircuitBreakerState>();

// Request timestamps for rate calculation
const requestHistory = new Map<string, { timestamp: number; success: boolean }[]>();

/** Redis key for circuit breaker state */
function cbRedisKey(model: string): string {
  return `flowa:cb:${model.replace(/\//g, ':')}`;
}

/**
 * Get circuit breaker state — try Redis first, fallback to in-memory
 */
async function getState(model: string): Promise<CircuitBreakerState> {
  // Try Redis first
  try {
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get(cbRedisKey(model));
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        // Sync to in-memory
        circuitStates.set(model, parsed);
        return parsed;
      }
    }
  } catch {
    // Redis unavailable, use in-memory
  }

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
 * Persist circuit breaker state to Redis (fire-and-forget)
 */
async function persistState(model: string, state: CircuitBreakerState, ttlMs: number): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.set(cbRedisKey(model), JSON.stringify(state), { ex: Math.ceil(ttlMs / 1000) });
    }
  } catch {
    // Redis unavailable, in-memory only
  }
}

/**
 * Log circuit breaker trip event to database
 */
async function logCircuitBreakerEvent(
  model: string,
  state: CircuitBreakerState,
  failureRate: number,
  supabase?: any
): Promise<void> {
  if (!supabase) return;
  try {
    const provider = model.split('/')[0] || 'unknown';
    await supabase.from('circuit_breaker_events').insert({
      provider,
      model,
      failure_count: state.failures,
      failure_rate: failureRate,
      tripped_at: new Date().toISOString(),
      instance_id: crypto.randomUUID().slice(0, 8),
    });
  } catch (err) {
    console.warn('[circuit-breaker] Failed to log event:', err);
  }
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
export async function isCircuitOpen(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): Promise<boolean> {
  const state = await getState(model);
  const now = Date.now();
  
  // If open, check if we should transition to half-open
  if (state.state === 'open' && state.openedAt) {
    if (now - state.openedAt > config.resetTimeoutMs) {
      state.state = 'half-open';
      circuitStates.set(model, state);
      await persistState(model, state, config.resetTimeoutMs);
      console.log(`[circuit-breaker] ${model}: OPEN -> HALF-OPEN (trying again)`);
    }
  }
  
  return state.state === 'open';
}

/**
 * Record a successful request
 */
export async function recordSuccess(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): Promise<void> {
  const state = await getState(model);
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

  circuitStates.set(model, state);
  await persistState(model, state, config.resetTimeoutMs);
}

/**
 * Record a failed request
 */
export async function recordFailure(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG, supabase?: any): Promise<void> {
  const state = await getState(model);
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
    
    // Log trip event to database
    logCircuitBreakerEvent(model, state, failureRate, supabase).catch(() => {});
  }

  circuitStates.set(model, state);
  await persistState(model, state, config.resetTimeoutMs);
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
export async function getEffectiveModel(
  model: string, 
  config: CircuitBreakerConfig = DEFAULT_CONFIG
): Promise<{ model: string; usingFallback: boolean }> {
  if (await isCircuitOpen(model, config)) {
    const fallback = getFallbackModel(model);
    console.log(`[circuit-breaker] ${model} circuit OPEN, using fallback: ${fallback}`);
    return { model: fallback, usingFallback: true };
  }
  return { model, usingFallback: false };
}

/**
 * Get circuit breaker statistics for a model
 */
export async function getStats(model: string, config: CircuitBreakerConfig = DEFAULT_CONFIG): Promise<{
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: number | null;
  openedAt: number | null;
}> {
  const state = await getState(model);
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
export async function resetCircuit(model: string): Promise<void> {
  circuitStates.delete(model);
  requestHistory.delete(model);
  try {
    const redis = await getRedis();
    if (redis) await redis.del(cbRedisKey(model));
  } catch { /* Redis unavailable */ }
  console.log(`[circuit-breaker] ${model}: RESET`);
}

/**
 * Reset all circuit breakers (clears in-memory + Redis)
 */
export async function resetAllCircuits(): Promise<void> {
  const models = [...circuitStates.keys()];
  circuitStates.clear();
  requestHistory.clear();
  try {
    const redis = await getRedis();
    if (redis && models.length > 0) {
      await Promise.all(models.map(m => redis.del(cbRedisKey(m))));
    }
  } catch { /* Redis unavailable */ }
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
