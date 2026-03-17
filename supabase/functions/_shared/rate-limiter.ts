// ============================================
// Rate Limiting & Quota Management
// Phase 5: Per-user and per-org rate limiting
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyPrefix: string;      // Prefix for rate limit keys
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  usageType: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  planType: string;
  message?: string;
}

/**
 * Default rate limits by plan type
 */
export const PLAN_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'rl:free',
  },
  starter: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'rl:starter',
  },
  pro: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'rl:pro',
  },
  enterprise: {
    windowMs: 60 * 1000,
    maxRequests: 120,
    keyPrefix: 'rl:enterprise',
  },
};

/**
 * Chat-specific rate limits (messages per minute)
 */
export const CHAT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'rl:chat:free',
  },
  starter: {
    windowMs: 60 * 1000,
    maxRequests: 15,
    keyPrefix: 'rl:chat:starter',
  },
  pro: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'rl:chat:pro',
  },
  enterprise: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'rl:chat:enterprise',
  },
};

/**
 * In-memory rate limit store (for edge functions)
 * Uses a Map with automatic cleanup
 */
class InMemoryRateLimitStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  private cleanupInterval: number | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.startCleanup();
  }

  private startCleanup(): void {
    // Edge functions are short-lived, but this helps with long-running instances
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000) as unknown as number;
  }

  get(key: string): { count: number; resetAt: number } | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, count: number, resetAt: number): void {
    this.store.set(key, { count, resetAt });
  }

  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const entry = this.get(key);
    
    if (!entry) {
      const resetAt = now + windowMs;
      this.set(key, 1, resetAt);
      return { count: 1, resetAt };
    }

    entry.count++;
    this.set(key, entry.count, entry.resetAt);
    return entry;
  }
}

// Singleton store for edge function lifecycle
const rateLimitStore = new InMemoryRateLimitStore();

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const fullKey = `${config.keyPrefix}:${key}`;
  const entry = rateLimitStore.increment(fullKey, config.windowMs);
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetAt = new Date(entry.resetAt);
  
  return {
    allowed,
    remaining,
    resetAt,
    retryAfterMs: allowed ? undefined : entry.resetAt - Date.now(),
  };
}

/**
 * Get rate limit config for a plan type
 */
export function getRateLimitConfig(
  planType: string,
  limitType: 'general' | 'chat' = 'general'
): RateLimitConfig {
  const limits = limitType === 'chat' ? CHAT_RATE_LIMITS : PLAN_RATE_LIMITS;
  return limits[planType] || limits['free'];
}

/**
 * Check user quota from database
 */
export async function checkUserQuota(
  supabase: any,
  userId: string,
  usageType: 'script' | 'carousel' | 'multichannel' | 'image_generation'
): Promise<QuotaCheckResult> {
  try {
    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type, status, current_period_start, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !subscription) {
      return {
        allowed: false,
        usageType,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        planType: 'none',
        message: 'No active subscription found',
      };
    }

    // Get plan limits
    const { data: planLimit, error: limitError } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan_type', subscription.plan_type)
      .single();

    if (limitError || !planLimit) {
      return {
        allowed: false,
        usageType,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        planType: subscription.plan_type,
        message: 'Plan limits not found',
      };
    }

    // Get current usage
    const { count: currentUsage, error: usageError } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .gte('created_at', subscription.current_period_start)
      .lte('created_at', subscription.current_period_end);

    if (usageError) {
      console.error('Error fetching usage:', usageError);
    }

    const usage = currentUsage || 0;

    // Map usage type to limit field
    const limitMap: Record<string, string> = {
      script: 'monthly_scripts',
      carousel: 'monthly_carousels',
      multichannel: 'monthly_multichannel',
      image_generation: 'monthly_images',
      ai_edit: 'monthly_ai_edits',
    };

    const limitField = limitMap[usageType];
    const limit = planLimit[limitField] as number;

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        usageType,
        currentUsage: usage,
        limit: -1,
        remaining: Infinity,
        planType: subscription.plan_type,
      };
    }

    const remaining = Math.max(0, limit - usage);
    const allowed = usage < limit;

    return {
      allowed,
      usageType,
      currentUsage: usage,
      limit,
      remaining,
      planType: subscription.plan_type,
      message: allowed ? undefined : `Đã hết quota ${usageType}. Nâng cấp gói để tiếp tục.`,
    };
  } catch (err) {
    console.error('Quota check error:', err);
    return {
      allowed: false,
      usageType,
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      planType: 'error',
      message: 'Error checking quota',
    };
  }
}

/**
 * Log usage for tracking
 */
export async function logUsage(
  supabase: any,
  userId: string,
  usageType: 'script' | 'carousel' | 'multichannel' | 'image_generation' | 'ai_edit',
  referenceId?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.from('usage_logs').insert({
      user_id: userId,
      usage_type: usageType,
      reference_id: referenceId || null,
      metadata: metadata || null,
    });

    if (error) {
      console.error('Failed to log usage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Usage logging error:', err);
    return false;
  }
}

/**
 * Get user's plan type from subscription
 */
export async function getUserPlanType(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      return 'free';
    }

    return data.plan_type || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Combined rate limit and quota check
 */
export async function checkRateLimitAndQuota(
  supabase: any,
  userId: string,
  usageType: 'script' | 'carousel' | 'multichannel' | 'image_generation' | 'ai_edit',
  limitType: 'general' | 'chat' = 'general'
): Promise<{
  allowed: boolean;
  rateLimit: RateLimitResult;
  quota: QuotaCheckResult;
  message?: string;
}> {
  // Get user's plan type
  const planType = await getUserPlanType(supabase, userId);
  
  // Check rate limit
  const rateLimitConfig = getRateLimitConfig(planType, limitType);
  const rateLimit = checkRateLimit(userId, rateLimitConfig);
  
  // Check quota
  const quota = await checkUserQuota(supabase, userId, usageType);
  
  // Determine overall allowance
  const allowed = rateLimit.allowed && quota.allowed;
  
  let message: string | undefined;
  if (!rateLimit.allowed) {
    message = `Quá nhiều request. Thử lại sau ${Math.ceil((rateLimit.retryAfterMs || 0) / 1000)} giây.`;
  } else if (!quota.allowed) {
    message = quota.message;
  }
  
  return {
    allowed,
    rateLimit,
    quota,
    message,
  };
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    ...(result.retryAfterMs ? { 'Retry-After': Math.ceil(result.retryAfterMs / 1000).toString() } : {}),
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitErrorResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'RATE_LIMIT',
      message: 'Quá nhiều request. Vui lòng thử lại sau.',
      retryAfter: Math.ceil((result.retryAfterMs || 0) / 1000),
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...createRateLimitHeaders(result),
      },
    }
  );
}

/**
 * Create quota exceeded error response
 */
export function createQuotaExceededResponse(
  result: QuotaCheckResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'QUOTA_EXCEEDED',
      message: result.message || 'Đã hết quota. Vui lòng nâng cấp gói.',
      usageType: result.usageType,
      currentUsage: result.currentUsage,
      limit: result.limit,
      planType: result.planType,
    }),
    {
      status: 402,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
