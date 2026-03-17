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

  // Quota check removed for ai_edit (unlimited) - only rate limit applies

  logger.info('Rate limit check passed', {
    planType,
    rateLimitRemaining: rateLimitResult.remaining,
  });

  return {
    allowed: true,
    planType,
    rateLimitRemaining: rateLimitResult.remaining,
    quotaRemaining: quotaResult.remaining,
  };
}
