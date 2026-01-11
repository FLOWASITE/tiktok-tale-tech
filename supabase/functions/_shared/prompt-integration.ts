/**
 * Prompt Integration Helper
 * 
 * Simplified interface for edge functions to integrate with the Prompt Registry.
 * Handles prompt fetching, variable interpolation, and usage tracking.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getPrompt,
  getPrompts,
  trackPromptUsage,
  PromptConfig,
  PromptResult,
} from "./prompt-registry.ts";

// ============================================================================
// TYPES
// ============================================================================

export interface PromptContext {
  supabase: SupabaseClient;
  functionName: string;
  organizationId?: string;
  brandTemplateId?: string;
}

export interface FetchedPrompt {
  content: string;
  meta: {
    promptId: string | null;
    version: number;
    isDefault: boolean;
    abTestId?: string;
    abTestVariant?: 'a' | 'b';
  };
}

export interface UsageTrackingData {
  qualityScore?: number;
  generationTimeMs?: number;
}

// ============================================================================
// MAIN HELPER CLASS
// ============================================================================

/**
 * PromptManager - Simplified interface for edge functions
 * 
 * @example
 * const pm = new PromptManager({
 *   supabase,
 *   functionName: 'generate-hooks',
 *   organizationId,
 * });
 * 
 * const systemPrompt = await pm.get('system', { topic, brandName });
 * const generatePrompt = await pm.get('generate', { count, channel });
 * 
 * // After generation, track usage
 * await pm.trackAll({ qualityScore: 85, generationTimeMs: 1234 });
 */
export class PromptManager {
  private context: PromptContext;
  private fetchedPrompts: Map<string, FetchedPrompt> = new Map();
  
  constructor(context: PromptContext) {
    this.context = context;
  }
  
  /**
   * Get a single prompt with variable interpolation
   */
  async get(
    promptKey: string,
    variables?: Record<string, string | number | boolean | undefined>
  ): Promise<string> {
    const result = await this.fetch(promptKey, variables);
    return result.content;
  }
  
  /**
   * Get a prompt with full metadata
   */
  async fetch(
    promptKey: string,
    variables?: Record<string, string | number | boolean | undefined>
  ): Promise<FetchedPrompt> {
    const cacheKey = `${promptKey}:${JSON.stringify(variables || {})}`;
    
    // Check local cache first
    const cached = this.fetchedPrompts.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from registry
    const config: PromptConfig = {
      functionName: this.context.functionName,
      promptKey,
      variables: this.stringifyVariables(variables),
      organizationId: this.context.organizationId,
    };
    
    const result = await getPrompt(this.context.supabase, config);
    
    const fetched: FetchedPrompt = {
      content: result.content,
      meta: {
        promptId: result.promptId,
        version: result.version,
        isDefault: result.isDefault,
        abTestId: result.abTestId,
        abTestVariant: result.abTestVariant,
      },
    };
    
    // Cache locally
    this.fetchedPrompts.set(cacheKey, fetched);
    
    return fetched;
  }
  
  /**
   * Get multiple prompts at once (batch fetch)
   */
  async getMultiple(
    configs: Array<{ key: string; variables?: Record<string, string | number | boolean | undefined> }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Fetch all in parallel
    const promises = configs.map(async ({ key, variables }) => {
      const content = await this.get(key, variables);
      return { key, content };
    });
    
    const resolved = await Promise.all(promises);
    resolved.forEach(({ key, content }) => results.set(key, content));
    
    return results;
  }
  
  /**
   * Track usage for all fetched prompts
   */
  async trackAll(data: UsageTrackingData): Promise<void> {
    const trackingPromises: Promise<void>[] = [];
    
    for (const [_, fetched] of this.fetchedPrompts) {
      if (fetched.meta.promptId) {
        trackingPromises.push(
          trackPromptUsage(this.context.supabase, fetched.meta.promptId, {
            version: fetched.meta.version,
            abTestId: fetched.meta.abTestId,
            abTestVariant: fetched.meta.abTestVariant,
            qualityScore: data.qualityScore,
            generationTimeMs: data.generationTimeMs,
            functionName: this.context.functionName,
            organizationId: this.context.organizationId,
          })
        );
      }
    }
    
    await Promise.all(trackingPromises);
  }
  
  /**
   * Get info about fetched prompts (for logging/debugging)
   */
  getPromptInfo(): Array<{ key: string; promptId: string | null; version: number; isDefault: boolean; abTest?: string }> {
    const info: Array<{ key: string; promptId: string | null; version: number; isDefault: boolean; abTest?: string }> = [];
    
    for (const [cacheKey, fetched] of this.fetchedPrompts) {
      const key = cacheKey.split(':')[0];
      info.push({
        key,
        promptId: fetched.meta.promptId,
        version: fetched.meta.version,
        isDefault: fetched.meta.isDefault,
        abTest: fetched.meta.abTestId ? `${fetched.meta.abTestId}:${fetched.meta.abTestVariant}` : undefined,
      });
    }
    
    return info;
  }
  
  /**
   * Clear local cache (useful for long-running requests)
   */
  clearCache(): void {
    this.fetchedPrompts.clear();
  }
  
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  
  private stringifyVariables(
    variables?: Record<string, string | number | boolean | undefined>
  ): Record<string, string> | undefined {
    if (!variables) return undefined;
    
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    
    return result;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick fetch a single prompt without creating a manager
 */
export async function fetchPrompt(
  supabase: SupabaseClient,
  functionName: string,
  promptKey: string,
  variables?: Record<string, string>,
  organizationId?: string
): Promise<PromptResult> {
  return getPrompt(supabase, {
    functionName,
    promptKey,
    variables,
    organizationId,
  });
}

/**
 * Create a PromptManager for a specific function
 */
export function createPromptManager(
  supabase: SupabaseClient,
  functionName: string,
  organizationId?: string,
  brandTemplateId?: string
): PromptManager {
  return new PromptManager({
    supabase,
    functionName,
    organizationId,
    brandTemplateId,
  });
}

// ============================================================================
// PROMPT BUILDING UTILITIES
// ============================================================================

/**
 * Build a complete prompt from multiple parts
 */
export function buildPrompt(parts: Array<string | undefined | null>): string {
  return parts
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join('\n\n');
}

/**
 * Merge base prompt with overrides
 */
export function mergePromptOverrides(
  basePrompt: string,
  overrides?: Record<string, string>
): string {
  if (!overrides || Object.keys(overrides).length === 0) {
    return basePrompt;
  }
  
  let result = basePrompt;
  for (const [placeholder, replacement] of Object.entries(overrides)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    result = result.replace(regex, replacement);
  }
  
  return result;
}

/**
 * Extract variable names from a prompt template
 */
export function extractVariableNames(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = template.matchAll(regex);
  const names = new Set<string>();
  
  for (const match of matches) {
    names.add(match[1]);
  }
  
  return Array.from(names);
}

// Re-export types and functions from registry
export { getPrompt, getPrompts, trackPromptUsage } from "./prompt-registry.ts";
export type { PromptConfig, PromptResult } from "./prompt-registry.ts";
