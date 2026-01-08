/**
 * @deprecated Use useHookAI().generator instead
 * This hook is kept for backward compatibility and will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated)
 * const { hooks, loading, generateHooks } = useHookGenerator();
 * 
 * // New way
 * const { generator } = useHookAI();
 * generator.hooks, generator.loading, generator.generateHooks
 */

import { useHookAI } from './ai/useHookAI';
import { GeneratedHook } from '@/types/hook';

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
}

interface GenerateOptions {
  topic: string;
  brandVoice?: BrandVoice;
  platform?: string;
  duration?: string;
  count?: number;
}

export function useHookGenerator() {
  const { generator } = useHookAI();

  return {
    hooks: generator.hooks as GeneratedHook[],
    loading: generator.loading,
    error: generator.error,
    generateHooks: generator.generateHooks,
    clearHooks: generator.clearHooks,
  };
}
