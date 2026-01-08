/**
 * Test utilities and mocks for AI hooks testing
 */

import { vi, expect } from 'vitest';

// ============== MOCK FACTORIES ==============

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'test-org-id',
  name: 'Test Organization',
  ...overrides,
});

// ============== SUPABASE MOCK ==============

export const mockSupabaseFunctionsInvoke = vi.fn();

export const mockSupabase = {
  functions: {
    invoke: mockSupabaseFunctionsInvoke,
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
};

// ============== TOAST MOCK ==============

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

// ============== MOCK DATA ==============

export const mockGeneratedHooks = [
  { id: 'hook-1', text: 'Did you know that 90% of startups fail?', type: 'question', emotion: 'curiosity', strength: 85 },
  { id: 'hook-2', text: 'Stop scrolling! This will change how you think.', type: 'command', emotion: 'urgency', strength: 78 },
];

export const mockQuickSuggestions = [
  { id: 'quick-1', text: 'What if I told you...', type: 'question' },
  { id: 'quick-2', text: 'Here\'s the secret nobody talks about...', type: 'story' },
];

export const mockMultiChannelHooks = {
  youtube: [{ id: 'yt-1', text: 'YouTube Hook', type: 'question' }],
  tiktok: [{ id: 'tt-1', text: 'TikTok Hook', type: 'command' }],
};

export const mockKPISuggestions = {
  kpis: [
    { name: 'CTR', target: 2.5, unit: '%', reasoning: 'Industry average' },
    { name: 'Conversion Rate', target: 3.0, unit: '%', reasoning: 'Based on funnel stage' },
  ],
  confidence: 0.85,
};

export const mockAdjustmentAnalysis = {
  suggestions: [
    { id: 'adj-1', kpiName: 'CTR', currentValue: 1.5, suggestedValue: 2.0, reason: 'Trending upward', confidence: 0.8 },
  ],
  trendAnalysis: { direction: 'up', momentum: 0.15 },
};

export const mockRefinedTopics = [
  { topic: 'AI in Marketing 2024', angle: 'trend-analysis', hook: 'How AI is reshaping digital marketing' },
  { topic: 'Content Automation Tools', angle: 'how-to', hook: 'Automate your content pipeline' },
];

export const mockTrendingTopics = [
  { id: 'trend-1', topic: 'AI Content Generation', score: 92, status: 'rising', suggestedAngles: ['tutorial'] },
  { id: 'trend-2', topic: 'Short-form Video Strategy', score: 88, status: 'stable', suggestedAngles: ['case-study'] },
];

export const mockEnhancedSuggestions = [
  { id: 'sug-1', topic: 'Building a Personal Brand', category: 'branding', format: 'video', scores: { relevance: 85, engagement: 80, uniqueness: 75, overall: 80 } },
];

export const mockGapAnalysis = {
  gaps: [{ topic: 'Email Marketing', coverage: 20, opportunity: 'high' }],
  recommendations: ['Create email marketing series'],
};

export const mockClusterAnalysis = {
  clusters: [{ name: 'Social Media', topics: ['Instagram', 'TikTok'], strength: 0.85 }],
};

export const mockWeeklyPlan = {
  items: [
    { day: 'Monday', topic: 'AI Tools Overview', format: 'video' },
    { day: 'Wednesday', topic: 'Case Study: Brand X', format: 'carousel' },
  ],
};

// ============== ASYNC HELPERS ==============

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============== ASSERTION HELPERS ==============

export function expectApiCalledWith(fnName: string, expectedBody: Record<string, unknown>) {
  expect(mockSupabaseFunctionsInvoke).toHaveBeenCalledWith(
    fnName,
    expect.objectContaining({ body: expect.objectContaining(expectedBody) })
  );
}

export function expectApiNotCalled() {
  expect(mockSupabaseFunctionsInvoke).not.toHaveBeenCalled();
}

export function expectErrorToast(message?: string) {
  if (message) {
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining(message));
  } else {
    expect(mockToast.error).toHaveBeenCalled();
  }
}
