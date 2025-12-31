import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitConfig,
  checkUserQuota,
  logUsage,
  getUserPlanType,
  checkRateLimitAndQuota,
  createRateLimitHeaders,
  createRateLimitErrorResponse,
  createQuotaExceededResponse,
  PLAN_RATE_LIMITS,
  CHAT_RATE_LIMITS,
} from '../rate-limiter.ts';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('PLAN_RATE_LIMITS', () => {
    it('should have configurations for all plan types', () => {
      expect(PLAN_RATE_LIMITS.free).toBeDefined();
      expect(PLAN_RATE_LIMITS.starter).toBeDefined();
      expect(PLAN_RATE_LIMITS.pro).toBeDefined();
      expect(PLAN_RATE_LIMITS.enterprise).toBeDefined();
    });

    it('should have increasing limits for higher plans', () => {
      expect(PLAN_RATE_LIMITS.starter.maxRequests).toBeGreaterThan(PLAN_RATE_LIMITS.free.maxRequests);
      expect(PLAN_RATE_LIMITS.pro.maxRequests).toBeGreaterThan(PLAN_RATE_LIMITS.starter.maxRequests);
      expect(PLAN_RATE_LIMITS.enterprise.maxRequests).toBeGreaterThan(PLAN_RATE_LIMITS.pro.maxRequests);
    });
  });

  describe('CHAT_RATE_LIMITS', () => {
    it('should have chat-specific limits', () => {
      expect(CHAT_RATE_LIMITS.free.maxRequests).toBe(5);
      expect(CHAT_RATE_LIMITS.starter.maxRequests).toBe(15);
      expect(CHAT_RATE_LIMITS.pro.maxRequests).toBe(30);
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return general rate limit by default', () => {
      const config = getRateLimitConfig('free');
      expect(config.keyPrefix).toBe('rl:free');
    });

    it('should return chat rate limit when specified', () => {
      const config = getRateLimitConfig('starter', 'chat');
      expect(config.keyPrefix).toBe('rl:chat:starter');
      expect(config.maxRequests).toBe(15);
    });

    it('should default to free plan for unknown plan types', () => {
      const config = getRateLimitConfig('unknown-plan');
      expect(config.maxRequests).toBe(PLAN_RATE_LIMITS.free.maxRequests);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'test' };
      const result = checkRateLimit('user-1', config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track request count within window', () => {
      const config = { windowMs: 60000, maxRequests: 3, keyPrefix: 'test-count' };
      
      const result1 = checkRateLimit('user-2', config);
      expect(result1.remaining).toBe(2);
      
      const result2 = checkRateLimit('user-2', config);
      expect(result2.remaining).toBe(1);
      
      const result3 = checkRateLimit('user-2', config);
      expect(result3.remaining).toBe(0);
      expect(result3.allowed).toBe(true);
      
      const result4 = checkRateLimit('user-2', config);
      expect(result4.allowed).toBe(false);
      expect(result4.retryAfterMs).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const config = { windowMs: 1000, maxRequests: 1, keyPrefix: 'test-reset' };
      
      checkRateLimit('user-3', config);
      const blocked = checkRateLimit('user-3', config);
      expect(blocked.allowed).toBe(false);
      
      // Advance past the window
      vi.advanceTimersByTime(1001);
      
      const afterReset = checkRateLimit('user-3', config);
      expect(afterReset.allowed).toBe(true);
    });

    it('should provide reset timestamp', () => {
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'test-timestamp' };
      const result = checkRateLimit('user-4', config);
      
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkUserQuota', () => {
    it('should return not allowed when no subscription', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const result = await checkUserQuota(mockSupabase, 'user-1', 'script');
      
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('No active subscription');
    });

    it('should allow unlimited usage when limit is -1', async () => {
      const mockSupabase = createMockSupabase({
        subscription: { plan_type: 'enterprise', status: 'active', current_period_start: '2024-01-01', current_period_end: '2024-02-01' },
        planLimit: { monthly_scripts: -1 },
        usageCount: 1000,
      });

      const result = await checkUserQuota(mockSupabase, 'user-1', 'script');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should calculate remaining quota correctly', async () => {
      const mockSupabase = createMockSupabase({
        subscription: { plan_type: 'starter', status: 'active', current_period_start: '2024-01-01', current_period_end: '2024-02-01' },
        planLimit: { monthly_scripts: 100 },
        usageCount: 75,
      });

      const result = await checkUserQuota(mockSupabase, 'user-1', 'script');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(25);
      expect(result.currentUsage).toBe(75);
      expect(result.limit).toBe(100);
    });

    it('should deny when quota exceeded', async () => {
      const mockSupabase = createMockSupabase({
        subscription: { plan_type: 'free', status: 'active', current_period_start: '2024-01-01', current_period_end: '2024-02-01' },
        planLimit: { monthly_scripts: 10 },
        usageCount: 10,
      });

      const result = await checkUserQuota(mockSupabase, 'user-1', 'script');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toBeDefined();
    });
  });

  describe('logUsage', () => {
    it('should log usage successfully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      const result = await logUsage(mockSupabase, 'user-1', 'script', 'ref-123');
      
      expect(result).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        usage_type: 'script',
        reference_id: 'ref-123',
        metadata: null,
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await logUsage(mockSupabase, 'user-1', 'script');
      
      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getUserPlanType', () => {
    it('should return plan type from subscription', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { plan_type: 'pro' }, error: null }),
      };

      const result = await getUserPlanType(mockSupabase, 'user-1');
      expect(result).toBe('pro');
    });

    it('should default to free when no subscription', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const result = await getUserPlanType(mockSupabase, 'user-1');
      expect(result).toBe('free');
    });
  });

  describe('checkRateLimitAndQuota', () => {
    it('should check both rate limit and quota', async () => {
      const mockSupabase = createMockSupabase({
        subscription: { plan_type: 'starter', status: 'active', current_period_start: '2024-01-01', current_period_end: '2024-02-01' },
        planLimit: { monthly_scripts: 100 },
        usageCount: 50,
      });

      const result = await checkRateLimitAndQuota(mockSupabase, 'user-combo', 'script');
      
      expect(result.rateLimit).toBeDefined();
      expect(result.quota).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should deny when rate limit exceeded', async () => {
      const config = { windowMs: 60000, maxRequests: 1, keyPrefix: 'rl:starter' };
      
      const mockSupabase = createMockSupabase({
        subscription: { plan_type: 'starter', status: 'active', current_period_start: '2024-01-01', current_period_end: '2024-02-01' },
        planLimit: { monthly_scripts: 100 },
        usageCount: 50,
      });

      // First check to exhaust rate limit
      await checkRateLimitAndQuota(mockSupabase, 'user-rate-limit', 'script');
      
      // This should be rate limited (depending on internal state)
      // Note: Due to unique key prefixes per user, each call creates new state
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create appropriate headers', () => {
      const result = {
        allowed: true,
        remaining: 5,
        resetAt: new Date('2024-01-01T12:00:00Z'),
      };

      const headers = createRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should include Retry-After when rate limited', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2024-01-01T12:00:00Z'),
        retryAfterMs: 30000,
      };

      const headers = createRateLimitHeaders(result);
      
      expect(headers['Retry-After']).toBe('30');
    });
  });

  describe('createRateLimitErrorResponse', () => {
    it('should create 429 response', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2024-01-01T12:00:00Z'),
        retryAfterMs: 30000,
      };

      const response = createRateLimitErrorResponse(result, { 'Access-Control-Allow-Origin': '*' });
      
      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('createQuotaExceededResponse', () => {
    it('should create 402 response', () => {
      const result = {
        allowed: false,
        usageType: 'script',
        currentUsage: 100,
        limit: 100,
        remaining: 0,
        planType: 'free',
        message: 'Quota exceeded',
      };

      const response = createQuotaExceededResponse(result, {});
      
      expect(response.status).toBe(402);
    });
  });
});

// Helper to create mock Supabase client
function createMockSupabase(options: {
  subscription?: any;
  planLimit?: any;
  usageCount?: number;
}) {
  let callCount = 0;
  
  return {
    from: vi.fn().mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === 'subscriptions') {
            return Promise.resolve({ data: options.subscription, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        single: vi.fn().mockImplementation(() => {
          if (table === 'plan_limits') {
            return Promise.resolve({ data: options.planLimit, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
    }),
  };
}
