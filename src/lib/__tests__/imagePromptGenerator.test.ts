import { describe, it, expect } from 'vitest';
import { generateImagePrompt, type PromptContext } from '@/lib/imagePromptGenerator';
import type { SuggestionV3 } from '@/lib/imageSuggestionEngine';

const mockSuggestion: SuggestionV3 = {
  id: 'test_1',
  style: 'photorealistic',
  score: 95,
  reason: 'Test reason',
  suggestedType: 'with_text',
  typography: 'clean',
  matchPercentage: 95,
};

const mockContext: PromptContext = {
  topic: '5 cách giảm stress cho dân văn phòng',
  brandTone: 'friendly, professional',
  channel: 'instagram',
  contentRole: 'sprout',
  hookMessage: 'Bạn có đang stress?',
  industry: 'service',
};

describe('generateImagePrompt', () => {
  it('returns a non-empty string', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('includes the topic', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toContain(mockContext.topic);
  });

  it('includes style directive', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result.toLowerCase()).toContain('photorealistic');
  });

  it('includes role directive for sprout', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result.toLowerCase()).toContain('trust');
  });

  it('includes brand tone', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toContain(mockContext.brandTone);
  });

  it('includes hook message for with_text type', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toContain('Bạn có đang stress?');
  });

  it('does not include hook message for background_only type', () => {
    const bgSuggestion = { ...mockSuggestion, suggestedType: 'background_only' as const };
    const result = generateImagePrompt(bgSuggestion, mockContext);
    expect(result).not.toContain('Text to overlay');
  });

  it('includes aspect ratio', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toContain('Aspect ratio');
  });

  it('includes industry context when provided', () => {
    const result = generateImagePrompt(mockSuggestion, mockContext);
    expect(result).toContain('service');
  });

  it('works without optional fields', () => {
    const minContext: PromptContext = {
      topic: 'Test topic',
      brandTone: 'neutral',
      channel: 'instagram',
      contentRole: 'seed',
    };
    const result = generateImagePrompt(mockSuggestion, minContext);
    expect(result).toBeTruthy();
  });

  it('seed role includes emotional/curiosity directive', () => {
    const seedContext = { ...mockContext, contentRole: 'seed' as const };
    const result = generateImagePrompt(mockSuggestion, seedContext);
    expect(result.toLowerCase()).toContain('curiosity');
  });

  it('harvest role includes conversion directive', () => {
    const harvestContext = { ...mockContext, contentRole: 'harvest' as const };
    const result = generateImagePrompt(mockSuggestion, harvestContext);
    expect(result.toLowerCase()).toContain('conversion');
  });
});
