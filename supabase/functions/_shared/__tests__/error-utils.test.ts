import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RetryableError,
  NonRetryableError,
  withRetry,
  createCircuitBreaker,
  withFallback,
  withTimeout,
  isRetryableError,
  parseRetryAfter,
} from '../error-utils.ts';

describe('error-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('RetryableError', () => {
    it('should create a retryable error with default properties', () => {
      const error = new RetryableError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('RetryableError');
    });

    it('should accept retryAfterMs and statusCode options', () => {
      const error = new RetryableError('Test error', { retryAfterMs: 5000, statusCode: 429 });
      expect(error.retryAfterMs).toBe(5000);
      expect(error.statusCode).toBe(429);
    });
  });

  describe('NonRetryableError', () => {
    it('should create a non-retryable error', () => {
      const error = new NonRetryableError('Fatal error', 400);
      expect(error.message).toBe('Fatal error');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('NonRetryableError');
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
      
      // Fast-forward through retry delays
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      const resultPromise = withRetry(fn, { maxRetries: 2, baseDelayMs: 100 });
      
      await vi.runAllTimersAsync();
      
      await expect(resultPromise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry NonRetryableError', async () => {
      const fn = vi.fn().mockRejectedValue(new NonRetryableError('no retry'));

      await expect(withRetry(fn)).rejects.toThrow('no retry');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback on each retry', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { 
        maxRetries: 3, 
        baseDelayMs: 100,
        onRetry 
      });
      
      await vi.runAllTimersAsync();
      await resultPromise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
    });

    it('should respect custom retryOn condition', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('skip retry'));

      const resultPromise = withRetry(fn, { 
        maxRetries: 3,
        retryOn: (error: Error) => error.message !== 'skip retry'
      });

      await expect(resultPromise).rejects.toThrow('skip retry');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('createCircuitBreaker', () => {
    it('should execute function when circuit is closed', async () => {
      const breaker = createCircuitBreaker('test-service');
      const fn = vi.fn().mockResolvedValue('result');

      const result = await breaker.execute(fn);

      expect(result).toBe('result');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open circuit after reaching failure threshold', async () => {
      const breaker = createCircuitBreaker('test-failures', { failureThreshold: 3 });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reject immediately when circuit is open', async () => {
      const breaker = createCircuitBreaker('test-open', { failureThreshold: 1, resetTimeoutMs: 10000 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      expect(breaker.getState()).toBe('OPEN');
      
      await expect(breaker.execute(vi.fn())).rejects.toThrow('Circuit breaker');
    });

    it('should transition to half-open after reset timeout', async () => {
      const breaker = createCircuitBreaker('test-half-open', { 
        failureThreshold: 1, 
        resetTimeoutMs: 1000 
      });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      expect(breaker.getState()).toBe('OPEN');
      
      // Fast-forward past reset timeout
      vi.advanceTimersByTime(1001);
      
      // Next call should trigger half-open state
      const successFn = vi.fn().mockResolvedValue('recovered');
      const result = await breaker.execute(successFn);
      
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reset state correctly', () => {
      const breaker = createCircuitBreaker('test-reset', { failureThreshold: 1 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      breaker.execute(failFn).catch(() => {});
      
      breaker.reset();
      
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('withFallback', () => {
    it('should return function result on success', async () => {
      const result = await withFallback(
        () => Promise.resolve('success'),
        'fallback'
      );
      expect(result).toBe('success');
    });

    it('should return fallback value on error', async () => {
      const result = await withFallback(
        () => Promise.reject(new Error('fail')),
        'fallback'
      );
      expect(result).toBe('fallback');
    });

    it('should log error when logError is true', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await withFallback(
        () => Promise.reject(new Error('test error')),
        'fallback',
        { logError: true, errorContext: 'test' }
      );
      
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('withTimeout', () => {
    it('should return result if function completes in time', async () => {
      const fn = () => Promise.resolve('fast');
      
      const result = await withTimeout(fn, 1000);
      
      expect(result).toBe('fast');
    });

    it('should throw timeout error if function takes too long', async () => {
      const slowFn = () => new Promise((resolve) => setTimeout(resolve, 5000));
      
      const resultPromise = withTimeout(slowFn, 100, 'Custom timeout message');
      
      vi.advanceTimersByTime(101);
      
      await expect(resultPromise).rejects.toThrow('Custom timeout message');
    });
  });

  describe('isRetryableError', () => {
    it('should return false for NonRetryableError', () => {
      expect(isRetryableError(new NonRetryableError('no'))).toBe(false);
    });

    it('should return true for RetryableError', () => {
      expect(isRetryableError(new RetryableError('yes'))).toBe(true);
    });

    it('should return true for 429 status code', () => {
      const error = new Error('rate limited') as any;
      error.statusCode = 429;
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 500+ status codes except 501', () => {
      const error500 = new Error('server error') as any;
      error500.statusCode = 500;
      expect(isRetryableError(error500)).toBe(true);

      const error501 = new Error('not implemented') as any;
      error501.statusCode = 501;
      expect(isRetryableError(error501)).toBe(false);
    });

    it('should return true for network-related error messages', () => {
      expect(isRetryableError(new Error('network error'))).toBe(true);
      expect(isRetryableError(new Error('timeout occurred'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    });

    it('should return false for unrecognized errors', () => {
      expect(isRetryableError(new Error('validation failed'))).toBe(false);
    });
  });

  describe('parseRetryAfter', () => {
    it('should return undefined for null/undefined', () => {
      expect(parseRetryAfter(null)).toBeUndefined();
      expect(parseRetryAfter(undefined as any)).toBeUndefined();
    });

    it('should parse numeric seconds', () => {
      expect(parseRetryAfter(30)).toBe(30000);
      expect(parseRetryAfter('60')).toBe(60000);
    });

    it('should parse HTTP date format', () => {
      const futureDate = new Date(Date.now() + 10000);
      const result = parseRetryAfter(futureDate.toUTCString());
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(10000);
    });
  });
});
