// ============================================
// Pipeline: Request Validator
// Rate limiting + quota check extracted from index.ts
// ============================================

import {
  checkRateLimit,
  getRateLimitConfig,
  checkUserQuota,
  createRateLimitErrorResponse,
  createQuotaExceededResponse,
  getUserPlanType,
} from "../rate-limiter.ts";

export interface ValidationResult {
  allowed: boolean;
  errorResponse?: Response;
  planType?: string;
  rateLimitRemaining?: number;
  quotaRemaining?: number;
}

/**
 * Validate request: rate limit + quota check.
 * Returns { allowed: true } or { allowed: false, errorResponse }.
 */
export async function validateRequest(
  supabase: any,
  userId: string | undefined,
  corsHeaders: Record<string, string>,
  logger: { warn: (msg: string, ctx?: any) => void; info: (msg: string, ctx?: any) => void }
): Promise<ValidationResult> {
  if (!userId) return { allowed: true };

  const planType = await getUserPlanType(supabase, userId);

  // Rate limit check
  const rateLimitConfig = getRateLimitConfig(planType, 'chat');
  const rateLimitResult = checkRateLimit(userId, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', {
      userId,
      remaining: rateLimitResult.remaining,
      resetAt: rateLimitResult.resetAt,
      retryAfterMs: rateLimitResult.retryAfterMs,
    });
    return { allowed: false, errorResponse: createRateLimitErrorResponse(rateLimitResult, corsHeaders) };
  }

  // Quota check
  const quotaResult = await checkUserQuota(supabase, userId, 'ai_edit');

  if (!quotaResult.allowed) {
    logger.warn('Quota exceeded', {
      userId,
      usageType: quotaResult.usageType,
      currentUsage: quotaResult.currentUsage,
      limit: quotaResult.limit,
    });
    return { allowed: false, errorResponse: createQuotaExceededResponse(quotaResult, corsHeaders) };
  }

  logger.info('Rate limit and quota check passed', {
    planType,
    rateLimitRemaining: rateLimitResult.remaining,
    quotaRemaining: quotaResult.remaining,
  });

  return {
    allowed: true,
    planType,
    rateLimitRemaining: rateLimitResult.remaining,
    quotaRemaining: quotaResult.remaining,
  };
}
