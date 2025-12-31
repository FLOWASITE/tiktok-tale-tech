import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StructuredLogger,
  createLogger,
  generateTraceId,
  estimateTokens,
  buildMetrics,
  getContextSources,
  saveMetrics,
} from '../logger.ts';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTraceId', () => {
    it('should generate a valid UUID', () => {
      const traceId = generateTraceId();
      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('createLogger', () => {
    it('should create a logger with provided context', () => {
      const logger = createLogger({
        functionName: 'test-function',
        userId: 'user-123',
      });

      expect(logger).toBeInstanceOf(StructuredLogger);
      expect(logger.getTraceId()).toBeDefined();
    });

    it('should use provided traceId if given', () => {
      const customTraceId = 'custom-trace-id';
      const logger = createLogger({
        functionName: 'test',
        traceId: customTraceId,
      });

      expect(logger.getTraceId()).toBe(customTraceId);
    });
  });

  describe('StructuredLogger', () => {
    let logger: StructuredLogger;

    beforeEach(() => {
      logger = createLogger({
        functionName: 'test-function',
        userId: 'user-123',
        organizationId: 'org-456',
      });
    });

    it('should log info messages with structured JSON', () => {
      logger.info('Test message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('Test message');
      expect(loggedData.functionName).toBe('test-function');
      expect(loggedData.userId).toBe('user-123');
      expect(loggedData.data).toEqual({ key: 'value' });
      expect(loggedData.timestamp).toBeDefined();
      expect(loggedData.traceId).toBeDefined();
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('warn');
    });

    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      
      expect(loggedData.level).toBe('error');
      expect(loggedData.error.name).toBe('Error');
      expect(loggedData.error.message).toBe('Test error');
      expect(loggedData.error.stack).toBeDefined();
    });

    it('should log debug messages', () => {
      logger.debug('Debug info');

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('debug');
    });

    it('should track timing with startTimer', () => {
      const timer = logger.startTimer('operation');
      
      expect(timer.label).toBe('operation');
      expect(timer.startTime).toBeDefined();
      
      const duration = timer.stop();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should log timed operations', () => {
      logger.timed('operation', 'Completed operation', 150, { result: 'ok' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      expect(loggedData.durationMs).toBe(150);
      expect(loggedData.data.durationMs).toBe(150);
    });

    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ brandTemplateId: 'brand-789' });
      
      childLogger.info('Child log');

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.brandTemplateId).toBe('brand-789');
      expect(loggedData.userId).toBe('user-123'); // Inherits parent context
    });
  });

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens(null as any)).toBe(0);
    });

    it('should estimate tokens for English text', () => {
      const text = 'Hello, this is a test message.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be less than char count
    });

    it('should estimate tokens for Vietnamese text', () => {
      const text = 'Xin chào, đây là tin nhắn thử nghiệm.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('buildMetrics', () => {
    it('should build complete metrics object', () => {
      const metrics = buildMetrics({
        traceId: 'trace-123',
        functionName: 'test-fn',
        totalDurationMs: 500,
        hadError: false,
        organizationId: 'org-1',
        contextSources: ['brand', 'industry'],
      });

      expect(metrics.traceId).toBe('trace-123');
      expect(metrics.functionName).toBe('test-fn');
      expect(metrics.totalDurationMs).toBe(500);
      expect(metrics.hadError).toBe(false);
      expect(metrics.contextSources).toEqual(['brand', 'industry']);
    });

    it('should handle missing optional fields', () => {
      const metrics = buildMetrics({
        traceId: 'trace-123',
        functionName: 'test-fn',
        totalDurationMs: 100,
        hadError: true,
      });

      expect(metrics.contextSources).toEqual([]);
      expect(metrics.userId).toBeUndefined();
    });
  });

  describe('getContextSources', () => {
    it('should return empty array when no sources', () => {
      expect(getContextSources({})).toEqual([]);
    });

    it('should identify all present sources', () => {
      const sources = getContextSources({
        industryMemory: { rules: [] },
        brandContext: { name: 'Brand' },
        ragResults: [{ id: 1 }],
        glossary: [{ term: 'test' }],
        personas: [],
        products: [{ name: 'Product' }],
      });

      expect(sources).toContain('industryMemory');
      expect(sources).toContain('brandContext');
      expect(sources).toContain('ragResults');
      expect(sources).toContain('glossary');
      expect(sources).toContain('products');
      expect(sources).not.toContain('personas'); // Empty array
    });
  });

  describe('saveMetrics', () => {
    it('should save metrics to database', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      const metrics = buildMetrics({
        traceId: 'trace-123',
        functionName: 'test',
        totalDurationMs: 100,
        hadError: false,
      });

      await saveMetrics(mockSupabase, metrics);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_metrics');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
      };

      const metrics = buildMetrics({
        traceId: 'trace-123',
        functionName: 'test',
        totalDurationMs: 100,
        hadError: false,
      });

      // Should not throw
      await expect(saveMetrics(mockSupabase, metrics)).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
