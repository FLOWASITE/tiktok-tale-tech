// ============================================
// Structured Logger with Trace IDs
// Observability & Monitoring Utilities
// ============================================

export interface LogContext {
  traceId: string;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  functionName: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  traceId: string;
  functionName: string;
  message: string;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface TimerHandle {
  stop: () => number;
  label: string;
  startTime: number;
}

/**
 * Structured Logger Class
 * Provides consistent JSON logging with trace IDs for debugging and monitoring
 */
export class StructuredLogger {
  private context: LogContext;
  private timers: Map<string, number> = new Map();

  constructor(context: LogContext) {
    this.context = context;
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      traceId: this.context.traceId,
      functionName: this.context.functionName,
      message,
    };

    if (this.context.userId) entry.userId = this.context.userId;
    if (this.context.organizationId) entry.organizationId = this.context.organizationId;
    if (this.context.brandTemplateId) entry.brandTemplateId = this.context.brandTemplateId;
    if (data && Object.keys(data).length > 0) entry.data = data;
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private log(level: LogLevel, entry: LogEntry): void {
    const logFn = level === 'error' ? console.error : 
                  level === 'warn' ? console.warn : 
                  level === 'debug' ? console.debug : 
                  console.log;
    
    // Output structured JSON for log aggregation
    logFn(JSON.stringify(entry));
  }

  debug(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('debug', message, data);
    this.log('debug', entry);
  }

  info(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, data);
    this.log('info', entry);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('warn', message, data);
    this.log('warn', entry);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('error', message, data, error);
    this.log('error', entry);
  }

  /**
   * Start a timer for performance tracking
   * Returns a function that, when called, returns the elapsed time in ms
   */
  startTimer(label: string): TimerHandle {
    const startTime = performance.now();
    this.timers.set(label, startTime);
    
    return {
      label,
      startTime,
      stop: (): number => {
        const endTime = performance.now();
        const durationMs = Math.round(endTime - startTime);
        this.timers.delete(label);
        return durationMs;
      },
    };
  }

  /**
   * Log with timing information
   */
  timed(label: string, message: string, durationMs: number, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, { ...data, durationMs });
    entry.durationMs = durationMs;
    this.log('info', entry);
  }

  /**
   * Get the trace ID for this logger instance
   */
  getTraceId(): string {
    return this.context.traceId;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): StructuredLogger {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
    });
  }
}

/**
 * Create a new logger instance with a unique trace ID
 */
export function createLogger(context: Omit<LogContext, 'traceId'> & { traceId?: string }): StructuredLogger {
  return new StructuredLogger({
    ...context,
    traceId: context.traceId || generateTraceId(),
  });
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

// ============================================
// Metrics Collection
// ============================================

export interface AIMetrics {
  traceId: string;
  functionName: string;
  organizationId?: string;
  userId?: string;
  brandTemplateId?: string;
  
  // Timing
  totalDurationMs: number;
  aiCallDurationMs?: number;
  contextFetchDurationMs?: number;
  
  // Token usage (estimated)
  inputTokensEstimated?: number;
  outputTokensEstimated?: number;
  
  // Context richness
  contextSources: string[];
  contextRichnessScore?: number;
  
  // Agentic loop specific
  totalTurns?: number;
  toolsExecuted?: string[];
  exitReason?: string;
  
  // Errors
  hadError: boolean;
  errorType?: string;
  errorMessage?: string;
  
  // NEW: Generation-specific fields (Phase 1: Analytics & Intelligence)
  channels?: string[];
  qualityMode?: string;
  modelsUsed?: Record<string, string>;          // { channel: model }
  channelDurations?: Record<string, number>;    // { channel: ms }
  cacheHit?: boolean;
  estimatedCostUsd?: number;
  usedFallback?: boolean;
  fallbackModel?: string;
  retryCount?: number;
  contentId?: string;
  actionType?: string;  // 'create' | 'expand' | 'regenerate' | 'preview'
}

/**
 * Estimate token count from text
 * Rough estimation: 1 token ~ 4 chars for English, ~2 chars for Vietnamese
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Assume mixed Vietnamese/English content
  const avgCharsPerToken = 3;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Build metrics object from execution data
 */
export function buildMetrics(partial: Partial<AIMetrics> & Pick<AIMetrics, 'traceId' | 'functionName' | 'totalDurationMs' | 'hadError'>): AIMetrics {
  return {
    traceId: partial.traceId,
    functionName: partial.functionName,
    organizationId: partial.organizationId,
    userId: partial.userId,
    brandTemplateId: partial.brandTemplateId,
    totalDurationMs: partial.totalDurationMs,
    aiCallDurationMs: partial.aiCallDurationMs,
    contextFetchDurationMs: partial.contextFetchDurationMs,
    inputTokensEstimated: partial.inputTokensEstimated,
    outputTokensEstimated: partial.outputTokensEstimated,
    contextSources: partial.contextSources || [],
    contextRichnessScore: partial.contextRichnessScore,
    totalTurns: partial.totalTurns,
    toolsExecuted: partial.toolsExecuted,
    exitReason: partial.exitReason,
    hadError: partial.hadError,
    errorType: partial.errorType,
    errorMessage: partial.errorMessage,
  };
}

/**
 * Save metrics to database
 */
export async function saveMetrics(supabase: any, metrics: AIMetrics): Promise<void> {
  try {
    const { error } = await supabase.from('ai_metrics').insert({
      trace_id: metrics.traceId,
      function_name: metrics.functionName,
      organization_id: metrics.organizationId || null,
      user_id: metrics.userId || null,
      brand_template_id: metrics.brandTemplateId || null,
      total_duration_ms: metrics.totalDurationMs,
      ai_call_duration_ms: metrics.aiCallDurationMs || null,
      context_fetch_duration_ms: metrics.contextFetchDurationMs || null,
      input_tokens_estimated: metrics.inputTokensEstimated || null,
      output_tokens_estimated: metrics.outputTokensEstimated || null,
      context_sources: metrics.contextSources,
      context_richness_score: metrics.contextRichnessScore || null,
      total_turns: metrics.totalTurns || null,
      tools_executed: metrics.toolsExecuted || null,
      exit_reason: metrics.exitReason || null,
      had_error: metrics.hadError,
      error_type: metrics.errorType || null,
      error_message: metrics.errorMessage || null,
      // NEW: Generation-specific fields (Phase 1)
      channels: metrics.channels || null,
      quality_mode: metrics.qualityMode || null,
      models_used: metrics.modelsUsed || null,
      channel_durations: metrics.channelDurations || null,
      cache_hit: metrics.cacheHit ?? false,
      estimated_cost_usd: metrics.estimatedCostUsd || null,
      used_fallback: metrics.usedFallback ?? false,
      fallback_model: metrics.fallbackModel || null,
      retry_count: metrics.retryCount ?? 0,
      content_id: metrics.contentId || null,
      action_type: metrics.actionType || null,
    });

    if (error) {
      console.warn('[saveMetrics] Failed to save metrics:', error.message);
    }
  } catch (err) {
    console.warn('[saveMetrics] Error saving metrics:', err);
  }
}

/**
 * Calculate context sources array from available context
 */
export function getContextSources(options: {
  industryMemory?: any;
  brandContext?: any;
  learningContext?: any;
  ragResults?: any[];
  glossary?: any[];
  personas?: any[];
  products?: any[];
  journeyMessaging?: any[];
  sampleTexts?: any;
  userPreferences?: any;
  sessionMemory?: any;
  conversationRag?: any[];
}): string[] {
  const sources: string[] = [];
  
  if (options.industryMemory) sources.push('industryMemory');
  if (options.brandContext) sources.push('brandContext');
  if (options.learningContext) sources.push('learningContext');
  if (options.ragResults?.length) sources.push('ragResults');
  if (options.glossary?.length) sources.push('glossary');
  if (options.personas?.length) sources.push('personas');
  if (options.products?.length) sources.push('products');
  if (options.journeyMessaging?.length) sources.push('journeyMessaging');
  if (options.sampleTexts) sources.push('sampleTexts');
  if (options.userPreferences) sources.push('userPreferences');
  if (options.sessionMemory) sources.push('sessionMemory');
  if (options.conversationRag?.length) sources.push('conversationRag');
  
  return sources;
}
