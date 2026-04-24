/**
 * AI Cost Estimation Utility
 * 
 * Estimates cost based on token usage and model pricing.
 * Prices are approximate and based on public API pricing.
 */

// Model pricing per 1M tokens (USD)
// Sources: OpenAI, Google, Anthropic public pricing pages
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Google Gemini family (via Lovable Gateway - estimated)
  'google/gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'google/gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'google/gemini-2.5-flash-lite': { input: 0.0375, output: 0.15 },
  'google/gemini-3-pro-preview': { input: 1.5, output: 6.0 },
  'google/gemini-3-flash-preview': { input: 0.10, output: 0.40 },
  
  // OpenAI family (via Lovable Gateway - estimated)
  'openai/gpt-5': { input: 2.50, output: 10.0 },
  'openai/gpt-5-mini': { input: 0.15, output: 0.60 },
  'openai/gpt-5-nano': { input: 0.075, output: 0.30 },
  'openai/gpt-5.2': { input: 3.0, output: 12.0 },
  
  // Moonshot/Kimi family (via OpenRouter - estimated)
  'moonshotai/kimi-k2': { input: 0.15, output: 0.55 },
  'moonshotai/kimi-k2-0905': { input: 0.15, output: 0.55 },
  'moonshotai/moonshot-v1-8k': { input: 0.12, output: 0.40 },
  'moonshotai/moonshot-v1-32k': { input: 0.18, output: 0.60 },
  'moonshotai/moonshot-v1-128k': { input: 0.30, output: 1.0 },
  
  // DeepSeek family (via OpenRouter - estimated)
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  
  // Anthropic family (via OpenRouter - estimated)
  'anthropic/claude-sonnet-4': { input: 3.0, output: 15.0 },
  'anthropic/claude-sonnet-4.5': { input: 3.0, output: 15.0 },
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3.5-haiku': { input: 0.80, output: 4.0 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  
  // Qwen family (via OpenRouter - estimated)
  'qwen/qwen-turbo': { input: 0.05, output: 0.20 },
  'qwen/qwen-plus': { input: 0.10, output: 0.40 },
  'qwen/qwen-max': { input: 0.40, output: 1.60 },
  'qwen/qwen3-coder-next': { input: 0.12, output: 0.75 },
  
  // New flagship models (Feb 2026)
  'anthropic/claude-sonnet-4.6': { input: 3.0, output: 15.0 },
  'anthropic/claude-opus-4.6': { input: 5.0, output: 25.0 },
  'anthropic/claude-opus-4.5': { input: 5.0, output: 25.0 },
  'anthropic/claude-haiku-4.5': { input: 1.0, output: 5.0 },
  'openai/gpt-5.2-codex': { input: 1.75, output: 14.0 },
  'openai/gpt-oss-120b': { input: 0.039, output: 0.19 },
  'google/gemini-3.1-pro-preview': { input: 2.0, output: 12.0 },
  'deepseek/deepseek-v3.2': { input: 0.26, output: 0.38 },
  'deepseek/deepseek-chat-v3.1': { input: 0.15, output: 0.75 },
  'moonshotai/kimi-k2.5': { input: 0.23, output: 3.0 },
  'minimax/minimax-m2.5': { input: 0.30, output: 1.10 },
  'x-ai/grok-4.1-fast': { input: 0.20, output: 0.50 },
  'x-ai/grok-4.20-beta': { input: 2.0, output: 6.0 },
  'x-ai/grok-4.20-multi-agent-beta': { input: 2.0, output: 6.0 },
  'z-ai/glm-5': { input: 0.30, output: 2.55 },
  'xiaomi/mimo-v2-flash': { input: 0.09, output: 0.29 },
  
  // OpenAI GPT-5.x series (March 2026)
  'openai/gpt-5.4': { input: 2.50, output: 15.0 },
  'openai/gpt-5.4-pro': { input: 30.0, output: 180.0 },
  'openai/gpt-5.3-codex': { input: 1.75, output: 14.0 },
  'openai/gpt-5.3-chat': { input: 1.75, output: 14.0 },
  
  // Google Gemini 3.1 (March 2026)
  'google/gemini-3.1-flash-lite-preview': { input: 0.25, output: 1.50 },
  
  // Qwen 3.5 (March 2026)
  'qwen/qwen3.5-397b-a17b': { input: 0.39, output: 2.34 },
  'qwen/qwen3.5-flash-02-23': { input: 0.10, output: 0.40 },
  
  // Other new models (March 2026)
  'inception/mercury-2': { input: 0.25, output: 0.75 },
  'stepfun/step-3.5-flash': { input: 0.10, output: 0.30 },
  'bytedance-seed/seed-2.0-lite': { input: 0.25, output: 2.0 },
};

// Image generation models - fixed cost per request (not token-based)
const IMAGE_MODEL_PRICING: Record<string, number> = {
  'google/gemini-3-pro-image-preview': 0.04,
  'google/gemini-3.1-flash-image-preview': 0.02,
  'google/gemini-2.5-flash-image': 0.02,
  'google/gemini-3-pro-image': 0.04,
  'google/imagen-3': 0.04,
  'google/imagen-3-fast': 0.02,
};

// Default pricing for unknown models
const DEFAULT_PRICING = { input: 0.10, output: 0.40 };
const DEFAULT_IMAGE_COST = 0.03; // $0.03 per image for unknown image models

/**
 * Estimate cost for a single AI call
 * @param model - Model identifier (e.g., 'google/gemini-2.5-flash')
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // Round to 6 decimals
}

/**
 * Estimate cost for image generation (fixed per-request pricing)
 * @param model - Image model identifier
 * @returns Estimated cost per image in USD
 */
export function estimateImageCost(model: string): number {
  return IMAGE_MODEL_PRICING[model] || DEFAULT_IMAGE_COST;
}

/**
 * Check if a model is an image generation model
 */
export function isImageModel(model: string): boolean {
  return model in IMAGE_MODEL_PRICING || 
    model.includes('image') || 
    model.includes('imagen');
}

/**
 * Estimate total cost across multiple models/channels
 * @param modelsUsed - Map of channel -> model used
 * @param tokenUsage - Map of channel -> { input, output } token counts
 * @returns Total estimated cost in USD
 */
export function estimateTotalCost(
  modelsUsed: Record<string, string>,
  tokenUsage: Record<string, { input: number; output: number }>
): number {
  let total = 0;
  
  for (const [channel, model] of Object.entries(modelsUsed)) {
    const usage = tokenUsage[channel];
    if (usage) {
      total += estimateCost(model, usage.input, usage.output);
    }
  }
  
  return Math.round(total * 1_000_000) / 1_000_000; // Round to 6 decimals
}

/**
 * Get model pricing info
 * @param model - Model identifier
 * @returns Pricing per 1M tokens
 */
export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || DEFAULT_PRICING;
}

/**
 * Check if a model is a known/supported model
 */
export function isKnownModel(model: string): boolean {
  return model in MODEL_PRICING;
}

/**
 * Get all supported models
 */
export function getSupportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}
