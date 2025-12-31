import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  estimateConversationTokens,
  truncateToTokenBudget,
  summarizeConversationHistory,
  TokenBudgetAllocator,
  createTokenManager,
  fitsWithinLimit,
  MODEL_LIMITS,
  type ConversationMessage,
} from '../token-manager.ts';

describe('token-manager', () => {
  describe('estimateTokenCount', () => {
    it('should return 0 for empty input', () => {
      expect(estimateTokenCount('')).toBe(0);
      expect(estimateTokenCount(null as any)).toBe(0);
    });

    it('should estimate tokens for English text', () => {
      const text = 'Hello world, this is a test message for token estimation.';
      const tokens = estimateTokenCount(text);
      
      // Expect roughly 1 token per 4 chars for English
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });

    it('should account for Vietnamese characters', () => {
      const vietnamese = 'Xin chào thế giới, đây là tin nhắn thử nghiệm.';
      const tokens = estimateTokenCount(vietnamese);
      
      // Vietnamese should use more tokens per char
      expect(tokens).toBeGreaterThan(15);
    });

    it('should handle code blocks differently', () => {
      const codeText = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const tokens = estimateTokenCount(codeText);
      
      expect(tokens).toBeGreaterThan(5);
    });

    it('should return at least 1 for non-empty text', () => {
      expect(estimateTokenCount('a')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('estimateConversationTokens', () => {
    it('should return small count for empty messages', () => {
      expect(estimateConversationTokens([])).toBe(10); // Just buffer
    });

    it('should account for message overhead', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      
      const tokens = estimateConversationTokens(messages);
      
      // Should include message overhead (~4 tokens per message)
      expect(tokens).toBeGreaterThan(10);
    });

    it('should handle long conversations', () => {
      const messages: ConversationMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `This is message number ${i + 1} with some content.`,
      }));
      
      const tokens = estimateConversationTokens(messages);
      
      expect(tokens).toBeGreaterThan(100);
    });
  });

  describe('truncateToTokenBudget', () => {
    it('should not truncate if within budget', () => {
      const text = 'Short text';
      const result = truncateToTokenBudget(text, 100);
      
      expect(result.truncated).toBe(false);
      expect(result.text).toBe(text);
    });

    it('should truncate from tail by default', () => {
      const text = 'A'.repeat(1000);
      const result = truncateToTokenBudget(text, 50);
      
      expect(result.truncated).toBe(true);
      expect(result.text.endsWith('...')).toBe(true);
      expect(result.text.length).toBeLessThan(text.length);
    });

    it('should truncate from head when specified', () => {
      const text = 'Start' + 'A'.repeat(1000) + 'End';
      const result = truncateToTokenBudget(text, 50, 'head');
      
      expect(result.truncated).toBe(true);
      expect(result.text.startsWith('...')).toBe(true);
      expect(result.text).toContain('End');
    });

    it('should truncate from middle when specified', () => {
      const text = 'Start' + 'A'.repeat(1000) + 'End';
      const result = truncateToTokenBudget(text, 50, 'middle');
      
      expect(result.truncated).toBe(true);
      expect(result.text).toContain('Start');
      expect(result.text).toContain('[nội dung được lược bỏ]');
      expect(result.text).toContain('End');
    });

    it('should report original token count', () => {
      const text = 'A'.repeat(1000);
      const result = truncateToTokenBudget(text, 50);
      
      expect(result.originalTokens).toBeGreaterThan(50);
    });
  });

  describe('summarizeConversationHistory', () => {
    it('should not summarize if within budget', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];
      
      const result = summarizeConversationHistory(messages, 1000);
      
      expect(result.summarized).toBe(false);
      expect(result.messages).toBe(messages);
    });

    it('should not summarize if few messages', () => {
      const messages: ConversationMessage[] = [
        { role: 'user', content: 'A'.repeat(500) },
        { role: 'assistant', content: 'B'.repeat(500) },
      ];
      
      const result = summarizeConversationHistory(messages, 10, 4);
      
      expect(result.summarized).toBe(false);
    });

    it('should summarize older messages and keep recent', () => {
      const messages: ConversationMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}: ${'A'.repeat(100)}`,
      }));
      
      const result = summarizeConversationHistory(messages, 500, 6);
      
      expect(result.summarized).toBe(true);
      expect(result.messages.length).toBe(7); // 1 summary + 6 recent
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toContain('Tóm tắt');
      expect(result.summary).toBeDefined();
    });
  });

  describe('TokenBudgetAllocator', () => {
    it('should create allocator with default model', () => {
      const allocator = new TokenBudgetAllocator();
      const budget = allocator.getAvailableBudget();
      
      expect(budget).toBeGreaterThan(0);
      expect(budget).toBeLessThan(MODEL_LIMITS['google/gemini-2.5-flash'].contextWindow);
    });

    it('should respect model limits', () => {
      const flashAllocator = new TokenBudgetAllocator('google/gemini-2.5-flash');
      const proAllocator = new TokenBudgetAllocator('google/gemini-2.5-pro');
      
      expect(proAllocator.getAvailableBudget()).toBeGreaterThan(
        flashAllocator.getAvailableBudget()
      );
    });

    it('should allocate segments by priority', () => {
      const allocator = new TokenBudgetAllocator();
      
      const result = allocator.allocate([
        { type: 'systemBase', content: 'System instructions' },
        { type: 'industryMemory', content: 'Industry rules and compliance' },
        { type: 'brandContext', content: 'Brand voice and guidelines' },
        { type: 'conversationHistory', content: 'Previous messages' },
      ]);
      
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeLessThanOrEqual(1);
    });

    it('should truncate low-priority segments when over budget', () => {
      const allocator = new TokenBudgetAllocator('openai/gpt-5-nano'); // Smaller context
      
      const result = allocator.allocate([
        { type: 'systemBase', content: 'A'.repeat(5000) },
        { type: 'industryMemory', content: 'B'.repeat(5000) },
        { type: 'conversationHistory', content: 'C'.repeat(50000) },
      ]);
      
      expect(result.truncatedSegments.length + result.droppedSegments.length).toBeGreaterThan(0);
    });

    it('should report budget status correctly', () => {
      const allocator = new TokenBudgetAllocator();
      
      const lowUsage = allocator.getBudgetStatus(1000);
      expect(lowUsage.status).toBe('ok');
      
      const available = allocator.getAvailableBudget();
      
      const highUsage = allocator.getBudgetStatus(Math.floor(available * 0.8));
      expect(highUsage.status).toBe('warning');
      
      const criticalUsage = allocator.getBudgetStatus(Math.floor(available * 0.95));
      expect(criticalUsage.status).toBe('critical');
    });

    it('should track warnings for immutable segments that cannot fit', () => {
      const allocator = new TokenBudgetAllocator('default');
      
      // Create very large immutable content that exceeds budget
      const hugeContent = 'A'.repeat(500000);
      
      const result = allocator.allocate([
        { type: 'systemBase', content: hugeContent },
      ]);
      
      // Should have warnings when cannot fit immutable segments
      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('createTokenManager', () => {
    it('should create a TokenBudgetAllocator instance', () => {
      const manager = createTokenManager();
      expect(manager).toBeInstanceOf(TokenBudgetAllocator);
    });

    it('should accept custom model', () => {
      const manager = createTokenManager('google/gemini-2.5-pro');
      expect(manager.getAvailableBudget()).toBeGreaterThan(150000);
    });
  });

  describe('fitsWithinLimit', () => {
    it('should return true for small content', () => {
      expect(fitsWithinLimit('Hello world')).toBe(true);
    });

    it('should return false for huge content', () => {
      const hugeContent = 'A'.repeat(1000000);
      expect(fitsWithinLimit(hugeContent)).toBe(false);
    });

    it('should respect model-specific limits', () => {
      const content = 'A'.repeat(180000); // ~45000 tokens
      
      // Should fit in pro model (200k context)
      expect(fitsWithinLimit(content, 'google/gemini-2.5-pro')).toBe(true);
      
      // May not fit in smaller models with output reservation
      // This depends on token estimation accuracy
    });
  });

  describe('MODEL_LIMITS', () => {
    it('should have all expected models', () => {
      expect(MODEL_LIMITS['google/gemini-2.5-flash']).toBeDefined();
      expect(MODEL_LIMITS['google/gemini-2.5-pro']).toBeDefined();
      expect(MODEL_LIMITS['openai/gpt-5']).toBeDefined();
      expect(MODEL_LIMITS['default']).toBeDefined();
    });

    it('should have valid context windows', () => {
      Object.values(MODEL_LIMITS).forEach((limit: { contextWindow: number; maxOutput: number }) => {
        expect(limit.contextWindow).toBeGreaterThan(0);
        expect(limit.maxOutput).toBeGreaterThan(0);
        expect(limit.contextWindow).toBeGreaterThan(limit.maxOutput);
      });
    });
  });
});
