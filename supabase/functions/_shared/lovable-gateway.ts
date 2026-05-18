// ============================================
// Lovable Gateway Shim
// Centralizes the direct chat-completions URL + API key used by
// edge functions that bypass `callAI()`. When SELF_HOSTED_MODE=true,
// routes to OpenRouter automatically (same OpenAI-compatible body shape,
// same google/gemini-* and openai/gpt-* model IDs).
//
// Usage:
//   import { getGatewayConfig } from "../_shared/lovable-gateway.ts";
//   const { url, apiKey } = getGatewayConfig();
//   const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, ... });
// ============================================

const SELF_HOST_FLAGS = ["SELF_HOSTED_MODE", "DISABLE_LOVABLE_GATEWAY"];

export function isSelfHosted(): boolean {
  for (const f of SELF_HOST_FLAGS) {
    const v = Deno.env.get(f);
    if (v === "true" || v === "1") return true;
  }
  return false;
}

export interface GatewayConfig {
  url: string;       // full chat-completions endpoint
  apiKey: string;    // bearer token
  provider: "lovable" | "openrouter";
}

export function getGatewayConfig(): GatewayConfig {
  if (isSelfHosted()) {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    if (!apiKey) {
      throw new Error(
        "SELF_HOSTED_MODE=true nhưng thiếu OPENROUTER_API_KEY. Set OPENROUTER_API_KEY trong env edge function.",
      );
    }
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      provider: "openrouter",
    };
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey,
    provider: "lovable",
  };
}

/**
 * Embeddings endpoint — Lovable Gateway exposes /v1/embeddings as well.
 * Self-hosted: route to OpenAI directly (OPENAI_API_KEY) because OpenRouter
 * does NOT support embeddings. Caller should pass an OpenAI model
 * (text-embedding-3-small) and slice down to 384 dims on output.
 */
export function getEmbeddingsGatewayConfig(): GatewayConfig {
  if (isSelfHosted()) {
    const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    if (!apiKey) {
      throw new Error(
        "SELF_HOSTED_MODE=true nhưng thiếu OPENAI_API_KEY (cần cho embeddings, OpenRouter không hỗ trợ).",
      );
    }
    return {
      url: "https://api.openai.com/v1/embeddings",
      apiKey,
      provider: "openrouter", // not strictly true, marker for "direct"
    };
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  return {
    url: "https://ai.gateway.lovable.dev/v1/embeddings",
    apiKey,
    provider: "lovable",
  };
}
