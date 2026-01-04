// ============================================
// Multi-Provider AI Caller
// Dynamically routes AI calls to user's provider or Lovable Gateway
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAIConfig, AIFunctionConfig } from "./ai-config.ts";
import { decrypt, isEncryptionConfigured } from "./crypto.ts";

// Provider endpoint configurations
const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
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
  
  // OpenRouter models (200+ third-party models)
  "openrouter/": "openrouter",   // OpenRouter explicit prefix
  "anthropic/": "openrouter",    // Claude via OpenRouter
  "meta-llama/": "openrouter",   // Llama via OpenRouter
  "mistralai/": "openrouter",    // Mistral via OpenRouter
  "deepseek/": "openrouter",     // DeepSeek via OpenRouter
  "moonshotai/": "openrouter",   // Kimi models via OpenRouter
  "qwen/": "openrouter",         // Qwen models via OpenRouter
  "cohere/": "openrouter",       // Cohere models via OpenRouter
  "perplexity/": "openrouter",   // Perplexity models via OpenRouter
  "x-ai/": "openrouter",         // xAI/Grok models via OpenRouter
  "nvidia/": "openrouter",       // NVIDIA models via OpenRouter
  "01-ai/": "openrouter",        // Yi models via OpenRouter
};

export interface AICallOptions {
  functionName: string;
  organizationId?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  toolChoice?: any;
  stream?: boolean;
  maxTokensOverride?: number;
  // Per-channel model overrides (Admin-configured)
  modelOverride?: string;
  temperatureOverride?: number;
}

export interface AICallResult {
  success: boolean;
  data?: any;
  error?: string;
  provider: string;
  model: string;
  fromFallback?: boolean;
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
  messages: Array<{ role: string; content: string }>,
  model: string,
  config: AIFunctionConfig,
  options: AICallOptions
): Promise<AICallResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return { success: false, error: "LOVABLE_API_KEY not configured", provider: "lovable", model };
  }

  try {
    const body: any = {
      model,
      messages,
      temperature: config.temperature,
      max_completion_tokens: options.maxTokensOverride || config.max_tokens,
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

    const response = await fetch(PROVIDER_ENDPOINTS.lovable, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
      // Return the response body for streaming
      return { success: true, data: response.body, provider: "lovable", model };
    }

    const data = await response.json();
    return { success: true, data, provider: "lovable", model };
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
  messages: Array<{ role: string; content: string }>,
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
  messages: Array<{ role: string; content: string }>,
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
  messages: Array<{ role: string; content: string }>,
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
 * Call Gemini directly (without Lovable Gateway)
 */
async function callGeminiDirect(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
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
 * Priority:
 * 1. User-configured provider with API key
 * 2. Lovable AI Gateway (fallback)
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { functionName, organizationId, messages, modelOverride, temperatureOverride } = options;

  // Get AI config for this function
  const config = await getAIConfig(functionName, organizationId);
  
  // Apply per-channel overrides if provided (Admin-configured)
  const effectiveModel = modelOverride || config.model;
  const effectiveTemperature = temperatureOverride ?? config.temperature;
  
  // Create effective config with overrides
  const effectiveConfig = {
    ...config,
    model: effectiveModel,
    temperature: effectiveTemperature,
  };
  
  console.log(`[ai-provider] Function: ${functionName}, Model: ${effectiveModel}${modelOverride ? ' (override)' : ''}`);

  // Determine provider from model
  const primaryProvider = getProviderFromModel(effectiveModel);
  console.log(`[ai-provider] Primary provider: ${primaryProvider}`);

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[ai-provider] Missing Supabase credentials, using Lovable Gateway");
    return callLovableGateway(messages, effectiveModel, effectiveConfig, options);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try to get user's provider config
  const providerConfig = await getProviderConfig(supabase, primaryProvider, organizationId);
  
  if (providerConfig) {
    const apiKey = await getApiKey(providerConfig);
    
    if (apiKey) {
      console.log(`[ai-provider] Using user's ${primaryProvider} API key`);
      
      let result: AICallResult;
      
      switch (primaryProvider) {
        case "openai":
          result = await callOpenAI(apiKey, messages, effectiveModel, effectiveConfig, options);
          break;
        case "anthropic":
          result = await callAnthropic(apiKey, messages, effectiveModel, effectiveConfig, options);
          break;
        case "gemini":
          result = await callGeminiDirect(apiKey, messages, effectiveModel, effectiveConfig, options);
          break;
        case "openrouter":
          result = await callOpenRouter(apiKey, messages, effectiveModel, effectiveConfig, options);
          break;
        default:
          result = await callLovableGateway(messages, effectiveModel, effectiveConfig, options);
      }

      if (result.success) {
        return result;
      }

      // Fallback to Lovable Gateway ONLY if model is Lovable-compatible
      if (isLovableCompatibleModel(effectiveModel)) {
        console.warn(`[ai-provider] ${primaryProvider} failed, falling back to Lovable Gateway`);
        const fallbackResult = await callLovableGateway(messages, effectiveModel, effectiveConfig, options);
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
  return callLovableGateway(messages, effectiveModel, effectiveConfig, options);
}

/**
 * Simplified call for direct use (without all options)
 */
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
