// ============================================
// Embedding helper — self-host friendly
// Centralizes embedding generation so we can swap Lovable Gateway → OpenAI/DashScope
// in one place when SELF_HOSTED_MODE=true.
//
// Default: OpenAI text-embedding-3-small (1536-dim) → truncated/padded to 384
// Why 384? Matches DB pgvector columns (gte-small native dim).
// ============================================

const DEFAULT_DIMS = 384;

export interface EmbeddingOptions {
  text: string;
  dims?: number; // default 384 to match DB columns
  model?: string; // override default
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: string;
  dims: number;
}

function isSelfHosted(): boolean {
  const flag = Deno.env.get("SELF_HOSTED_MODE") || Deno.env.get("DISABLE_LOVABLE_GATEWAY");
  return flag === "true" || flag === "1";
}

/**
 * Generate embedding via best available provider.
 *
 * Routing:
 * - Self-host OR no LOVABLE_API_KEY: OpenAI text-embedding-3-small (native truncate to 384)
 * - Fallback: DashScope text-embedding-v3 (1024-dim → pad/truncate)
 * - Lovable Cloud: google/text-embedding-004 via Lovable Gateway (legacy path, 768-dim → truncate)
 */
export async function callEmbedding(opts: EmbeddingOptions): Promise<EmbeddingResult> {
  const text = opts.text.slice(0, 8000);
  const targetDims = opts.dims ?? DEFAULT_DIMS;
  const selfHost = isSelfHosted();

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const dashscopeKey = Deno.env.get("DASHSCOPE_API_KEY");

  // Path 1: OpenAI direct (preferred for self-host, supports native `dimensions` param)
  if ((selfHost || !lovableKey) && openaiKey) {
    return await embedOpenAI(text, targetDims, openaiKey);
  }

  // Path 2: OpenAI via OpenRouter
  if ((selfHost || !lovableKey) && openrouterKey) {
    return await embedOpenRouter(text, targetDims, openrouterKey);
  }

  // Path 3: DashScope fallback
  if (dashscopeKey) {
    return await embedDashScope(text, targetDims, dashscopeKey);
  }

  // Path 4: Lovable Gateway (default on Lovable Cloud)
  if (lovableKey) {
    return await embedLovableGateway(text, targetDims, lovableKey);
  }

  throw new Error("No embedding provider configured (need OPENAI_API_KEY / OPENROUTER_API_KEY / DASHSCOPE_API_KEY / LOVABLE_API_KEY)");
}

async function embedOpenAI(text: string, dims: number, apiKey: string): Promise<EmbeddingResult> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: dims, // OpenAI native truncate
    }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { embedding: data.data[0].embedding, model: "text-embedding-3-small", provider: "openai", dims };
}

async function embedOpenRouter(text: string, dims: number, apiKey: string): Promise<EmbeddingResult> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
      dimensions: dims,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter embedding ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { embedding: data.data[0].embedding, model: "openai/text-embedding-3-small", provider: "openrouter", dims };
}

async function embedDashScope(text: string, dims: number, apiKey: string): Promise<EmbeddingResult> {
  const res = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-v3", input: text }),
  });
  if (!res.ok) throw new Error(`DashScope embedding ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let vec: number[] = data.data[0].embedding;
  vec = resizeVector(vec, dims);
  return { embedding: vec, model: "text-embedding-v3", provider: "dashscope", dims };
}

async function embedLovableGateway(text: string, dims: number, apiKey: string): Promise<EmbeddingResult> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/text-embedding-004", input: text }),
  });
  if (!res.ok) throw new Error(`Lovable Gateway embedding ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let vec: number[] = data.data?.[0]?.embedding ?? [];
  vec = resizeVector(vec, dims);
  return { embedding: vec, model: "google/text-embedding-004", provider: "lovable", dims };
}

function resizeVector(vec: number[], targetDims: number): number[] {
  if (vec.length === targetDims) return vec;
  if (vec.length > targetDims) return vec.slice(0, targetDims);
  const out = [...vec];
  while (out.length < targetDims) out.push(0);
  return out;
}
