// ============================================
// Multi-Provider AI Caller
// Dynamically routes AI calls to user's provider or Lovable Gateway
// Includes Circuit Breaker pattern and Auto-Retry for resilience
// Now with automatic metrics and cost tracking
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAIConfig, AIFunctionConfig } from "./ai-config.ts";
import { decrypt, isEncryptionConfigured } from "./crypto.ts";
import { saveMetrics, estimateTokens, generateTraceId, AIMetrics } from "./logger.ts";
import { estimateCost } from "./cost-estimator.ts";
import { 
  getEffectiveModel, 
  recordSuccess, 
  recordFailure, 
  isRetryableError,
  withRetry,
  type RetryConfig,
} from "./circuit-breaker.ts";
// Provider endpoint configurations
const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  dashscope: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
};

// Model prefix to provider mapping
// IMPORTANT: Lovable Gateway ONLY supports google/gemini-*, openai/gpt-5*, and sonar models
const MODEL_TO_PROVIDER: Record<string, string> = {
  // Lovable Gateway models (ONLY these work with Lovable)
  "google/gemini-": "lovable",   // Gemini models via Lovable Gateway
  "google/gemini-3": "lovable",  // Gemini 3 models
  "openai/gpt-5": "lovable",     // GPT-5 models via Lovable Gateway
  "sonar": "lovable",            // Perplexity sonar models
  
  // Direct provider models (user's own API key)
  "gpt-": "openai",              // Direct OpenAI
  "claude-": "anthropic",        // Direct Anthropic
  "gemini-": "gemini",           // Direct Gemini (without prefix)
  
  // DashScope models (Alibaba Cloud - OpenAI-compatible)
  "qwen-": "dashscope",           // qwen-plus, qwen-max, qwen-turbo (DashScope native)
  "qwen2": "dashscope",           // qwen2.5-*, qwen2-* (DashScope native)
  
  // OpenRouter models (200+ third-party models)
  "openrouter/": "openrouter",   // OpenRouter explicit prefix
  "anthropic/": "openrouter",    // Claude via OpenRouter
  "meta-llama/": "openrouter",   // Llama via OpenRouter
  "mistralai/": "openrouter",    // Mistral via OpenRouter
  "deepseek/": "openrouter",     // DeepSeek via OpenRouter
  "moonshotai/": "openrouter",   // Kimi models via OpenRouter
  "qwen/": "openrouter",         // Qwen models via OpenRouter (with provider prefix)
  "cohere/": "openrouter",       // Cohere models via OpenRouter
  "perplexity/": "openrouter",   // Perplexity models via OpenRouter
  "x-ai/": "openrouter",         // xAI/Grok models via OpenRouter
  "nvidia/": "openrouter",       // NVIDIA models via OpenRouter
  "01-ai/": "openrouter",        // Yi models via OpenRouter
};

export type AIMessage = {
  role: string;
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

export interface AICallOptions {
  functionName: string;
  organizationId?: string;
  messages: AIMessage[];
  tools?: any[];
  toolChoice?: any;
  stream?: boolean;
  maxTokensOverride?: number;
  // Per-channel model overrides (Admin-configured)
  modelOverride?: string;
  temperatureOverride?: number;
  // Force routing to a specific provider (bypasses auto-detection)
  forceProvider?: string | null;
  // Distributed tracing (Sprint 2)
  traceId?: string;
  spanId?: string;
}

// Extended options for callAIWithMetrics - includes user context for tracking
export interface AICallWithMetricsOptions extends AICallOptions {
  userId?: string;
  brandTemplateId?: string;
  contentId?: string;
  actionType?: string;
  channels?: string[];
  qualityMode?: string;
}

export interface AICallResult {
  success: boolean;
  data?: any;
  error?: string;
  provider: string;
  model: string;
  fromFallback?: boolean;
  // Auto-captured metrics (when using callAIWithMetrics)
  metrics?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    estimatedCostUsd: number;
  };
}

interface ProviderConfig {
  id: string;
  providerType: string;
  encryptedApiKey: string | null;
  apiKeySecretName: string | null;
  isActive: boolean;
  defaultModel: string | null;
  baseUrl: string | null;
}

// Known Lovable Gateway model patterns
const LOVABLE_MODEL_PATTERNS = ["google/gemini-", "openai/gpt-5", "sonar"];

/**
 * Check if model is supported by Lovable Gateway
 */
function isLovableCompatibleModel(model: string): boolean {
  return LOVABLE_MODEL_PATTERNS.some(pattern => model.startsWith(pattern));
}

/**
 * Get provider from model name
 */
function getProviderFromModel(model: string): string {
  // Check explicit prefixes first
  for (const [prefix, provider] of Object.entries(MODEL_TO_PROVIDER)) {
    if (model.startsWith(prefix)) {
      return provider;
    }
  }
  
  // Check if it's a known Lovable-supported model
  if (isLovableCompatibleModel(model)) {
    return "lovable";
  }
  
  // For any other model with provider prefix (e.g., "xyz/model-name"),
  // route to OpenRouter as it supports 200+ models
  if (model.includes("/")) {
    console.log(`[ai-provider] Unknown model prefix "${model}", routing to OpenRouter`);
    return "openrouter";
  }
  
  // Models without prefix default to Lovable
  return "lovable";
}

/**
 * Fetch provider config from database
 */
async function getProviderConfig(
  supabase: any,
  providerType: string,
  organizationId?: string
): Promise<ProviderConfig | null> {
  try {
    let query = supabase
      .from("ai_provider_configs")
      .select("id, provider_type, encrypted_api_key, api_key_secret_name, is_active, default_model, base_url")
      .eq("provider_type", providerType)
      .eq("is_active", true);

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      query = query.is("organization_id", null);
    }

    const { data, error } = await query.order("organization_id", { nullsFirst: false }).limit(1);

    if (error || !data?.length) {
      return null;
    }

    const row = data[0];
    return {
      id: row.id,
      providerType: row.provider_type,
      encryptedApiKey: row.encrypted_api_key,
      apiKeySecretName: row.api_key_secret_name,
      isActive: row.is_active,
      defaultModel: row.default_model,
      baseUrl: row.base_url,
    };
  } catch (err) {
    console.error("[ai-provider] Failed to fetch provider config:", err);
    return null;
  }
}

/**
 * Get API key from provider config (decrypt if needed)
 */
async function getApiKey(config: ProviderConfig): Promise<string | null> {
  // Check for encrypted API key first
  if (config.encryptedApiKey) {
    if (isEncryptionConfigured()) {
      try {
        return await decrypt(config.encryptedApiKey);
      } catch (err) {
        console.error("[ai-provider] Failed to decrypt API key:", err);
      }
    }
    // If not encrypted (legacy), return as-is
    // Check if it looks like it's not encrypted (starts with sk-, key_, etc.)
    if (config.encryptedApiKey.startsWith("sk-") || 
        config.encryptedApiKey.startsWith("key_") ||
        config.encryptedApiKey.startsWith("AIza")) {
      return config.encryptedApiKey;
    }
  }

  // Check for secret name reference
  if (config.apiKeySecretName) {
    return Deno.env.get(config.apiKeySecretName) || null;
  }

  return null;
}

/**
 * Call Lovable AI Gateway (default)
 */
async function callLovableGateway(
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return { success: false, error: "LOVABLE_API_KEY not configured", provider: "lovable", model };
  }

  try {
    const cleanModel = model.replace(/^openai\/|^google\/|^anthropic\//, '');
    const skipTemperature = cleanModel.includes("gpt-5") || cleanModel.includes("o3") || cleanModel.includes("o4");
    
    const body: any = {
      model,
      messages,
      max_completion_tokens: options.maxTokensOverride || config.max_tokens,
    };

    if (!skipTemperature && config.temperature !== undefined) {
      body.temperature = config.temperature;
    }

    if (options.tools) {
      body.tools = options.tools;
    }
    if (options.toolChoice) {
      body.tool_choice = options.toolChoice;
    }
    if (options.stream) {
      body.stream = true;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    // Inject trace headers if available
    if (options.traceId) headers["x-trace-id"] = options.traceId;
    if (options.spanId) headers["x-span-id"] = options.spanId;

    const MAX_EMPTY_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_EMPTY_RETRIES; attempt++) {
      if (attempt > 0) {
        console.warn(`[ai-provider] Retrying Lovable Gateway (attempt ${attempt + 1}/${MAX_EMPTY_RETRIES + 1}) after empty response`);
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }

      const response = await fetch(PROVIDER_ENDPOINTS.lovable, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ai-provider] Lovable Gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return { success: false, error: "Rate limit exceeded", provider: "lovable", model };
        }
        if (response.status === 402) {
          return { success: false, error: "Payment required", provider: "lovable", model };
        }
        return { success: false, error: `API error: ${response.status}`, provider: "lovable", model };
      }

      if (options.stream) {
        return { success: true, data: response.body, provider: "lovable", model };
      }

      // Safely parse JSON response
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error("[ai-provider] Lovable Gateway returned empty response (attempt " + (attempt + 1) + ")");
        if (attempt < MAX_EMPTY_RETRIES) continue; // retry
        return { success: false, error: "Empty response from AI gateway", provider: "lovable", model };
      }
    
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("[ai-provider] Failed to parse Lovable Gateway response:", responseText.substring(0, 200));
        return { success: false, error: "Invalid JSON response from AI gateway", provider: "lovable", model };
      }
      
      return { success: true, data, provider: "lovable", model };
    } // end retry loop

    return { success: false, error: "Empty response from AI gateway after retries", provider: "lovable", model };
  } catch (err) {
    console.error("[ai-provider] Lovable Gateway call failed:", err);
    return { success: false, error: String(err), provider: "lovable", model };
  }
}

/**
 * Call OpenAI directly
 */
async function callOpenAI(
  apiKey: string,
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  try {
    // Strip provider prefix if present
    const cleanModel = model.replace(/^openai\//, "");
    
    const body: any = {
      model: cleanModel,
      messages,
      max_completion_tokens: options.maxTokensOverride || config.max_tokens,
    };

    // Temperature not supported for newer models
    if (!cleanModel.includes("gpt-5") && !cleanModel.includes("o3") && !cleanModel.includes("o4")) {
      body.temperature = config.temperature;
    }

    if (options.tools) {
      body.tools = options.tools;
    }
    if (options.toolChoice) {
      body.tool_choice = options.toolChoice;
    }
    if (options.stream) {
      body.stream = true;
    }

    const response = await fetch(PROVIDER_ENDPOINTS.openai, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-provider] OpenAI error:", response.status, errorText);
      return { success: false, error: `OpenAI error: ${response.status}`, provider: "openai", model };
    }

    if (options.stream) {
      return { success: true, data: response.body, provider: "openai", model };
    }

    const data = await response.json();
    return { success: true, data, provider: "openai", model };
  } catch (err) {
    console.error("[ai-provider] OpenAI call failed:", err);
    return { success: false, error: String(err), provider: "openai", model };
  }
}

/**
 * Call Anthropic directly
 */
async function callAnthropic(
  apiKey: string,
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  try {
    // Strip provider prefix if present
    const cleanModel = model.replace(/^anthropic\//, "");
    
    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const body: any = {
      model: cleanModel,
      max_tokens: options.maxTokensOverride || config.max_tokens,
      messages: chatMessages,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    // Anthropic uses top_p instead of temperature sometimes
    if (config.temperature !== undefined) {
      body.temperature = config.temperature;
    }

    if (options.tools) {
      // Convert OpenAI tool format to Anthropic format
      body.tools = options.tools.map((t: any) => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description,
        input_schema: t.function?.parameters || t.parameters,
      }));
    }

    if (options.stream) {
      body.stream = true;
    }

    const response = await fetch(PROVIDER_ENDPOINTS.anthropic, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2024-01-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-provider] Anthropic error:", response.status, errorText);
      return { success: false, error: `Anthropic error: ${response.status}`, provider: "anthropic", model };
    }

    if (options.stream) {
      return { success: true, data: response.body, provider: "anthropic", model };
    }

    const data = await response.json();
    
    // Convert Anthropic response to OpenAI-like format
    const normalizedData = {
      choices: [{
        message: {
          role: "assistant",
          content: data.content?.[0]?.text || "",
          tool_calls: data.content?.filter((c: any) => c.type === "tool_use").map((c: any) => ({
            id: c.id,
            type: "function",
            function: {
              name: c.name,
              arguments: JSON.stringify(c.input),
            },
          })),
        },
        finish_reason: data.stop_reason,
      }],
      usage: {
        prompt_tokens: data.usage?.input_tokens,
        completion_tokens: data.usage?.output_tokens,
      },
    };

    return { success: true, data: normalizedData, provider: "anthropic", model };
  } catch (err) {
    console.error("[ai-provider] Anthropic call failed:", err);
    return { success: false, error: String(err), provider: "anthropic", model };
  }
}

/**
 * Call OpenRouter (200+ models via single API)
 */
async function callOpenRouter(
  apiKey: string,
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  try {
    // Strip openrouter/ prefix if present, keep provider/model format
    const cleanModel = model.replace(/^openrouter\//, "");
    
    const body: any = {
      model: cleanModel,
      messages,
      max_tokens: options.maxTokensOverride || config.max_tokens,
      temperature: config.temperature,
    };

    if (options.tools) {
      body.tools = options.tools;
    }
    if (options.toolChoice) {
      body.tool_choice = options.toolChoice;
    }
    if (options.stream) {
      body.stream = true;
    }

    const response = await fetch(PROVIDER_ENDPOINTS.openrouter, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://flowa.app",
        "X-Title": "Flowa Content Platform",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-provider] OpenRouter error:", response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded", provider: "openrouter", model };
      }
      if (response.status === 402) {
        return { success: false, error: "Payment required", provider: "openrouter", model };
      }
      return { success: false, error: `OpenRouter error: ${response.status}`, provider: "openrouter", model };
    }

    if (options.stream) {
      return { success: true, data: response.body, provider: "openrouter", model };
    }

    const data = await response.json();
    return { success: true, data, provider: "openrouter", model };
  } catch (err) {
    console.error("[ai-provider] OpenRouter call failed:", err);
    return { success: false, error: String(err), provider: "openrouter", model };
  }
}

/**
 * Call DashScope (Alibaba Cloud) - OpenAI-compatible API
 */
async function callDashScope(
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  const apiKey = Deno.env.get("DASHSCOPE_API_KEY");
  if (!apiKey) {
    return { success: false, error: "DASHSCOPE_API_KEY not configured", provider: "dashscope", model };
  }

  try {
    const body: any = {
      model,
      messages,
      max_tokens: options.maxTokensOverride || config.max_tokens,
      temperature: config.temperature,
    };

    if (options.tools) {
      body.tools = options.tools;
    }
    if (options.toolChoice) {
      body.tool_choice = options.toolChoice;
    }
    if (options.stream) {
      body.stream = true;
    }

    const response = await fetch(PROVIDER_ENDPOINTS.dashscope, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-provider] DashScope error:", response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded", provider: "dashscope", model };
      }
      if (response.status === 402) {
        return { success: false, error: "Payment required", provider: "dashscope", model };
      }
      return { success: false, error: `DashScope error: ${response.status}`, provider: "dashscope", model };
    }

    if (options.stream) {
      return { success: true, data: response.body, provider: "dashscope", model };
    }

    const data = await response.json();
    return { success: true, data, provider: "dashscope", model };
  } catch (err) {
    console.error("[ai-provider] DashScope call failed:", err);
    return { success: false, error: String(err), provider: "dashscope", model };
  }
}

/**
 * Call Gemini directly (without Lovable Gateway)
 */
async function callGeminiDirect(
  apiKey: string,
  messages: AIMessage[],
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  try {
    // Strip provider prefix if present
    const cleanModel = model.replace(/^google\//, "").replace(/^gemini\//, "");
    
    // Convert messages to Gemini format
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents: chatMessages,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: options.maxTokensOverride || config.max_tokens,
      },
    };

    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    if (options.tools) {
      // Convert OpenAI tool format to Gemini format
      body.tools = [{
        functionDeclarations: options.tools.map((t: any) => ({
          name: t.function?.name || t.name,
          description: t.function?.description || t.description,
          parameters: t.function?.parameters || t.parameters,
        })),
      }];
    }

    const endpoint = `${PROVIDER_ENDPOINTS.gemini}/${cleanModel}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-provider] Gemini error:", response.status, errorText);
      return { success: false, error: `Gemini error: ${response.status}`, provider: "gemini", model };
    }

    const data = await response.json();
    
    // Convert Gemini response to OpenAI-like format
    const candidate = data.candidates?.[0];
    const normalizedData = {
      choices: [{
        message: {
          role: "assistant",
          content: candidate?.content?.parts?.[0]?.text || "",
          tool_calls: candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any, i: number) => ({
            id: `call_${i}`,
            type: "function",
            function: {
              name: p.functionCall.name,
              arguments: JSON.stringify(p.functionCall.args),
            },
          })),
        },
        finish_reason: candidate?.finishReason?.toLowerCase(),
      }],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount,
        completion_tokens: data.usageMetadata?.candidatesTokenCount,
      },
    };

    return { success: true, data: normalizedData, provider: "gemini", model };
  } catch (err) {
    console.error("[ai-provider] Gemini call failed:", err);
    return { success: false, error: String(err), provider: "gemini", model };
  }
}

/**
 * Main AI call function with multi-provider support
 * Now includes Circuit Breaker pattern and Auto-Retry for resilience
 * 
 * Priority:
 * 1. Check circuit breaker - use fallback if circuit is open
 * 2. User-configured provider with API key
 * 3. Lovable AI Gateway (default/fallback)
 * 4. Auto-retry on transient failures
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { functionName, organizationId, messages, modelOverride, temperatureOverride } = options;

  // Get AI config for this function
  const config = await getAIConfig(functionName, organizationId);
  
  // Apply per-channel overrides if provided (Admin-configured)
  const requestedModel = modelOverride || config.model;
  const effectiveTemperature = temperatureOverride ?? config.temperature;
  
  // Check circuit breaker - may switch to fallback model
  const { model: effectiveModel, usingFallback } = await getEffectiveModel(requestedModel);
  
  // Create effective config with overrides
  const effectiveConfig = {
    ...config,
    model: effectiveModel,
    temperature: effectiveTemperature,
  };
  
  console.log(`[ai-provider] Function: ${functionName}, Model: ${effectiveModel}${modelOverride ? ' (override)' : ''}${usingFallback ? ' (fallback)' : ''}`);

  // Determine provider: forceProvider > auto-detection from model name
  const forceProvider = options.forceProvider || config.force_provider;
  const primaryProvider = forceProvider || getProviderFromModel(effectiveModel);
  console.log(`[ai-provider] Primary provider: ${primaryProvider}${forceProvider ? ' (forced)' : ''}`);

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[ai-provider] Missing Supabase credentials, using Lovable Gateway");
    return callWithCircuitBreaker(
      () => callLovableGateway(messages, effectiveModel, effectiveConfig, options),
      effectiveModel,
      options
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try to get user's provider config
  const providerConfig = await getProviderConfig(supabase, primaryProvider, organizationId);
  
  if (providerConfig) {
    const apiKey = await getApiKey(providerConfig);
    
    if (apiKey) {
      console.log(`[ai-provider] Using user's ${primaryProvider} API key`);
      
      const providerCall = async (): Promise<AICallResult> => {
        switch (primaryProvider) {
          case "openai":
            return callOpenAI(apiKey, messages, effectiveModel, effectiveConfig, options);
          case "anthropic":
            return callAnthropic(apiKey, messages, effectiveModel, effectiveConfig, options);
          case "gemini":
            return callGeminiDirect(apiKey, messages, effectiveModel, effectiveConfig, options);
          case "openrouter":
            return callOpenRouter(apiKey, messages, effectiveModel, effectiveConfig, options);
          case "dashscope":
            return callDashScope(messages, effectiveModel, effectiveConfig, options);
          default:
            return callLovableGateway(messages, effectiveModel, effectiveConfig, options);
        }
      };

      const result = await callWithCircuitBreaker(providerCall, effectiveModel, options);

      if (result.success) {
        return result;
      }

      // Fallback to Lovable Gateway ONLY if model is Lovable-compatible
      if (isLovableCompatibleModel(effectiveModel)) {
        console.warn(`[ai-provider] ${primaryProvider} failed, falling back to Lovable Gateway`);
        const fallbackResult = await callWithCircuitBreaker(
          () => callLovableGateway(messages, effectiveModel, effectiveConfig, options),
          effectiveModel,
          options
        );
        fallbackResult.fromFallback = true;
        return fallbackResult;
      } else {
        // Don't fallback - Lovable won't support this model anyway
        console.error(`[ai-provider] ${primaryProvider} failed, no fallback for model: ${effectiveModel}`);
        return result;
      }
    }
  }

  // Default: Use Lovable Gateway
  console.log("[ai-provider] Using Lovable AI Gateway (default)");
  return callWithCircuitBreaker(
    () => callLovableGateway(messages, effectiveModel, effectiveConfig, options),
    effectiveModel,
    options
  );
}

/**
 * Wrapper that applies circuit breaker and retry logic to AI calls
 */
async function callWithCircuitBreaker(
  fn: () => Promise<AICallResult>,
  model: string,
  options: AICallOptions
): Promise<AICallResult> {
  // Skip retry for streaming calls (they handle errors differently)
  if (options.stream) {
    const result = await fn();
    if (result.success) {
      await recordSuccess(model);
    } else {
      await recordFailure(model);
    }
    return result;
  }

  // Configure retry for non-streaming calls
  const retryConfig: RetryConfig = {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 4000,
    backoffMultiplier: 2,
  };

  try {
    const result = await withRetry(
      async () => {
        const res = await fn();
        if (!res.success) {
          // Convert failure result to error for retry logic
          const error = new Error(res.error || 'AI call failed');
          (error as any).status = res.error?.includes('429') ? 429 : 
                                   res.error?.includes('402') ? 402 :
                                   res.error?.includes('500') ? 500 : undefined;
          throw error;
        }
        return res;
      },
      (error, attempt) => {
        const shouldRetry = isRetryableError(error);
        if (shouldRetry) {
          console.log(`[ai-provider] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${model}: ${error.message}`);
        }
        return shouldRetry;
      },
      retryConfig,
      (attempt, delay, error) => {
        console.log(`[ai-provider] Waiting ${delay}ms before retry ${attempt} for ${model}`);
      }
    );
    
    await recordSuccess(model);
    return result;
  } catch (error) {
    await recordFailure(model);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      provider: getProviderFromModel(model),
      model,
    };
  }
}

// ============================================
// AI CALL WITH AUTOMATIC METRICS TRACKING
// Wrapper that auto-captures timing, tokens, and costs
// ============================================

/**
 * Estimate input tokens from messages array
 */
function estimateInputTokensFromMessages(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/**
 * Extract output tokens from AI result
 * Tries to get actual tokens from usage, falls back to estimation
 */
function extractOutputTokensFromResult(result: AICallResult): number {
  if (!result.success || !result.data) return 0;
  
  // Try to get from usage object (OpenAI/Anthropic format)
  if (result.data.usage?.completion_tokens) {
    return result.data.usage.completion_tokens;
  }
  if (result.data.usage?.output_tokens) {
    return result.data.usage.output_tokens;
  }
  
  // Estimate from response content
  const content = result.data.choices?.[0]?.message?.content || '';
  return estimateTokens(content);
}

/**
 * Extract input tokens from AI result
 * Tries to get actual tokens from usage, falls back to estimation
 */
function extractInputTokensFromResult(result: AICallResult, messages: Array<{ role: string; content: string }>): number {
  if (!result.success || !result.data) {
    return estimateInputTokensFromMessages(messages);
  }
  
  // Try to get from usage object
  if (result.data.usage?.prompt_tokens) {
    return result.data.usage.prompt_tokens;
  }
  if (result.data.usage?.input_tokens) {
    return result.data.usage.input_tokens;
  }
  
  // Fall back to estimation
  return estimateInputTokensFromMessages(messages);
}

/**
 * AI call with automatic metrics and cost tracking
 * 
 * This wrapper:
 * 1. Calls the AI (via callAI)
 * 2. Measures duration
 * 3. Estimates/extracts tokens
 * 4. Calculates cost using model pricing
 * 5. Saves metrics to ai_metrics table (non-blocking)
 * 6. Returns result with attached metrics
 * 
 * Usage:
 * ```ts
 * const result = await callAIWithMetrics(supabase, {
 *   functionName: 'generate-hooks',
 *   organizationId,
 *   userId,
 *   messages: [...]
 * });
 * // result.metrics contains { inputTokens, outputTokens, durationMs, estimatedCostUsd }
 * ```
 */
export async function callAIWithMetrics(
  supabase: any,
  options: AICallWithMetricsOptions
): Promise<AICallResult> {
  const startTime = performance.now();
  const traceId = generateTraceId();
  
  // Call the original AI function
  const result = await callAI(options);
  
  const durationMs = Math.round(performance.now() - startTime);
  
  // Extract or estimate tokens
  const inputTokens = extractInputTokensFromResult(result, options.messages);
  const outputTokens = extractOutputTokensFromResult(result);
  
  // Calculate cost using model pricing
  const estimatedCostUsd = estimateCost(result.model, inputTokens, outputTokens);
  
  // Attach metrics to result
  result.metrics = { 
    inputTokens, 
    outputTokens, 
    durationMs, 
    estimatedCostUsd 
  };
  
  // Auto-save to ai_metrics (non-blocking)
  const metrics: AIMetrics = {
    traceId,
    functionName: options.functionName,
    organizationId: options.organizationId,
    userId: options.userId,
    brandTemplateId: options.brandTemplateId,
    totalDurationMs: durationMs,
    aiCallDurationMs: durationMs,
    inputTokensEstimated: inputTokens,
    outputTokensEstimated: outputTokens,
    modelsUsed: { default: result.model },
    estimatedCostUsd,
    hadError: !result.success,
    errorMessage: result.error,
    contextSources: [],
    // Optional extended fields
    channels: options.channels,
    qualityMode: options.qualityMode,
    contentId: options.contentId,
    actionType: options.actionType,
    usedFallback: result.fromFallback,
    fallbackModel: result.fromFallback ? result.model : undefined,
  };
  
  saveMetrics(supabase, metrics).catch(err => {
    console.warn('[callAIWithMetrics] Failed to save metrics:', err);
  });
  
  return result;
}

/**
 * Batch call AI with metrics for multiple channels
 * Useful for multi-channel content generation
 */
export async function callAIWithMetricsBatch(
  supabase: any,
  baseOptions: Omit<AICallWithMetricsOptions, 'messages' | 'modelOverride'>,
  calls: Array<{
    channel: string;
    messages: Array<{ role: string; content: string }>;
    modelOverride?: string;
  }>
): Promise<{
  results: Map<string, AICallResult>;
  totalMetrics: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    estimatedCostUsd: number;
  };
}> {
  const startTime = performance.now();
  const results = new Map<string, AICallResult>();
  const channelDurations: Record<string, number> = {};
  const modelsUsed: Record<string, string> = {};
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let hadAnyError = false;
  
  // Run all calls in parallel
  await Promise.all(calls.map(async (call) => {
    const channelStart = performance.now();
    
    const result = await callAI({
      ...baseOptions,
      messages: call.messages,
      modelOverride: call.modelOverride,
    });
    
    const channelDuration = Math.round(performance.now() - channelStart);
    channelDurations[call.channel] = channelDuration;
    modelsUsed[call.channel] = result.model;
    
    const inputTokens = extractInputTokensFromResult(result, call.messages);
    const outputTokens = extractOutputTokensFromResult(result);
    const cost = estimateCost(result.model, inputTokens, outputTokens);
    
    result.metrics = { inputTokens, outputTokens, durationMs: channelDuration, estimatedCostUsd: cost };
    
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCost += cost;
    if (!result.success) hadAnyError = true;
    
    results.set(call.channel, result);
  }));
  
  const totalDuration = Math.round(performance.now() - startTime);
  
  // Save aggregated metrics
  const traceId = generateTraceId();
  const metrics: AIMetrics = {
    traceId,
    functionName: baseOptions.functionName,
    organizationId: baseOptions.organizationId,
    userId: baseOptions.userId,
    brandTemplateId: baseOptions.brandTemplateId,
    totalDurationMs: totalDuration,
    aiCallDurationMs: totalDuration,
    inputTokensEstimated: totalInputTokens,
    outputTokensEstimated: totalOutputTokens,
    modelsUsed,
    channelDurations,
    estimatedCostUsd: totalCost,
    hadError: hadAnyError,
    contextSources: [],
    channels: calls.map(c => c.channel),
    qualityMode: baseOptions.qualityMode,
    contentId: baseOptions.contentId,
    actionType: baseOptions.actionType,
  };
  
  saveMetrics(supabase, metrics).catch(err => {
    console.warn('[callAIWithMetricsBatch] Failed to save metrics:', err);
  });
  
  return {
    results,
    totalMetrics: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      durationMs: totalDuration,
      estimatedCostUsd: totalCost,
    },
  };
}


export async function callAISimple(
  functionName: string,
  systemPrompt: string,
  userPrompt: string,
  organizationId?: string
): Promise<AICallResult> {
  return callAI({
    functionName,
    organizationId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
}

// ============================================
// STREAMING DELTA ITERATOR
// Real-time token-by-token streaming from AI providers
// ============================================

export interface StreamDelta {
  content?: string;
  toolCall?: {
    index: number;
    id?: string;
    name?: string;
    arguments?: string;
  };
  done: boolean;
  finishReason?: string;
}

/**
 * Async generator to iterate over streaming deltas from OpenAI-compatible APIs
 * Supports: Lovable Gateway, OpenAI, OpenRouter, Anthropic (SSE mode)
 * 
 * Usage:
 * ```ts
 * const result = await callAI({ stream: true, ... });
 * if (result.success && result.data) {
 *   for await (const delta of iterateStreamDeltas(result.data)) {
 *     if (delta.content) {
 *       // Handle content token
 *       console.log(delta.content);
 *     }
 *     if (delta.done) break;
 *   }
 * }
 * ```
 */
export async function* iterateStreamDeltas(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamDelta> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const deltas = parseSSEBuffer(buffer);
          for (const delta of deltas) {
            yield delta;
          }
        }
        yield { done: true };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const delta = parseSSELine(line);
        if (delta) {
          if (delta.done) {
            yield delta;
            return; // Exit generator
          }
          yield delta;
        }
      }
    }
  } catch (error) {
    console.error('[iterateStreamDeltas] Stream error:', error);
    yield { done: true, finishReason: 'error' };
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
}

/**
 * Parse a single SSE line into a StreamDelta
 */
function parseSSELine(line: string): StreamDelta | null {
  const trimmed = line.trim();
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith(':')) {
    return null;
  }

  // Check for [DONE] signal
  if (trimmed === 'data: [DONE]') {
    return { done: true };
  }

  // Must be a data line
  if (!trimmed.startsWith('data: ')) {
    return null;
  }

  const jsonStr = trimmed.slice(6).trim();
  
  try {
    const json = JSON.parse(jsonStr);
    
    // Handle different response formats
    const choice = json.choices?.[0];
    
    if (!choice) {
      return null;
    }

    const delta = choice.delta;
    const finishReason = choice.finish_reason;

    if (finishReason) {
      return { done: true, finishReason };
    }

    if (!delta) {
      return null;
    }

    const result: StreamDelta = { done: false };

    // Content delta
    if (delta.content) {
      result.content = delta.content;
    }

    // Tool call delta
    if (delta.tool_calls?.length) {
      const tc = delta.tool_calls[0];
      result.toolCall = {
        index: tc.index ?? 0,
        id: tc.id,
        name: tc.function?.name,
        arguments: tc.function?.arguments,
      };
    }

    // Only yield if we have actual content
    if (result.content || result.toolCall) {
      return result;
    }

    return null;
  } catch {
    // Invalid JSON - likely a partial chunk, skip
    return null;
  }
}

/**
 * Parse multiple SSE lines from a buffer (for final flush)
 */
function parseSSEBuffer(buffer: string): StreamDelta[] {
  const deltas: StreamDelta[] = [];
  const lines = buffer.split('\n');
  
  for (const line of lines) {
    const delta = parseSSELine(line);
    if (delta) {
      deltas.push(delta);
    }
  }
  
  return deltas;
}
