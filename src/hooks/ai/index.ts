/**
 * AI Hooks - Consolidated exports
 */

// Core types and utilities
export * from './types';
export * from './useAIErrorHandler';

// Consolidated Topic AI hook
export { useTopicAI } from './useTopicAI';
export type { UseTopicAIOptions, UseTopicAIResult } from './useTopicAI';

// Consolidated Hook AI hook
export { useHookAI, CHANNEL_HOOK_TYPES } from './useHookAI';
export type { 
  UseHookAIOptions, 
  UseHookAIResult, 
  GeneratedHook, 
  QuickHookSuggestion, 
  MultiChannelHook,
  GenerateHooksOptions,
  BrandVoice as HookBrandVoice,
} from './useHookAI';

// Consolidated KPI AI hook
export { useKPIAI } from './useKPIAI';
export type {
  UseKPIAIOptions,
  UseKPIAIResult,
  AISuggestion,
  AIKPISuggestionsResult,
  KPISuggestionsParams,
  AdjustmentSuggestion,
  AdjustmentAnalysis,
  CampaignGoal as KPICampaignGoal,
  KPILog,
  Campaign as KPICampaign,
} from './useKPIAI';
