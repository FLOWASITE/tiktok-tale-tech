// ============================================
// 9Router Image Generation Helper
// OpenAI-compatible /v1/images/generations endpoint
// Supports: gemini, openai, flux, fal, stability, recraft, minimax, nanobanana
// ============================================

const NINE_ROUTER_BASE_URL_DEFAULT = 'http://localhost:20128';

export interface NineRouterGenerateParams {
  prompt: string;
  model: string;           // '9router/<provider>/<model>' e.g. '9router/gemini/gemini-3-pro-image-preview'
  aspectRatio?: string;    // '1:1', '16:9', '9:16', '4:3', '3:4'
  inputImage?: string;     // URL for img2img / edit mode (flux-kontext, nano-banana-edit, fal)
  maxAttempts?: number;    // Poll attempts when async (default 30 × 3s = 90s)
}

const DEFAULT_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 3000;

/**
 * Strip the '9router/' prefix to get the raw model name for upstream API.
 * Keeps the inner '<provider>/<model>' which 9Router uses for routing.
 */
function stripPrefix(model: string): string {
  return model.startsWith('9router/') ? model.slice(8) : model;
}

/**
 * Map aspect ratio → OpenAI-style `size` (pixels).
 * 9Router/Gemini ignores size; OpenAI/Recraft use exact size; Stability/Fal map to aspect ratio internally.
 */
function aspectToSize(aspectRatio?: string): string {
  const ratio = aspectRatio || '1:1';
  const map: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '4:3': '1408x1024',
    '3:4': '1024x1408',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '21:9': '1920x1080',
  };
  return map[ratio] || '1024x1024';
}

/**
 * Sub-provider doesn't honour `size` field — skip to avoid API errors.
 */
function shouldSkipSize(innerModel: string): boolean {
  return /gemini|nano-?banana|huggingface/i.test(innerModel);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaseUrl(): string {
  return (Deno.env.get('NINE_ROUTER_BASE_URL') || NINE_ROUTER_BASE_URL_DEFAULT).replace(/\/+$/, '');
}

/**
 * Try to extract image URL from a 9Router response payload.
 * Handles OpenAI shape + common variants.
 */
function extractImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, any>;
  const first = Array.isArray(d.data) ? d.data[0] : null;
  if (first?.url) return first.url as string;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (typeof d.url === 'string') return d.url;
  if (typeof d.image_url === 'string') return d.image_url;
  if (Array.isArray(d.images) && d.images[0]?.url) return d.images[0].url;
  return null;
}

/**
 * Poll a task id when 9Router returns `{ task_id, status: 'pending' }`
 * (FLUX / Fal / Nano-banana edit mode).
 */
async function pollTask(taskId: string, apiKey: string, maxAttempts: number): Promise<string> {
  const baseUrl = getBaseUrl();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(POLL_INTERVAL_MS);
    try {
      const r = await fetch(`${baseUrl}/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!r.ok) {
        console.warn(`[ninerouter] Poll ${attempt + 1} HTTP ${r.status}`);
        continue;
      }
      const data = await r.json();
      const status = data?.status || data?.state;
      if (status === 'completed' || status === 'success' || status === 'succeeded') {
        const url = extractImageUrl(data) || extractImageUrl(data?.result) || extractImageUrl(data?.output);
        if (!url) throw new Error('9Router task completed but no image URL found');
        return url;
      }
      if (status === 'failed' || status === 'error') {
        throw new Error(`9Router task failed: ${data?.error || 'unknown'}`);
      }
      // status: pending / processing → continue
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('9Router task')) throw err;
      console.warn(`[ninerouter] Poll attempt ${attempt + 1} error:`, err);
    }
  }
  throw new Error(`9Router task timeout after ${(maxAttempts * POLL_INTERVAL_MS) / 1000}s for task=${taskId}`);
}

/**
 * Main entry point — generate image via 9Router /v1/images/generations.
 */
export async function generateImageViaNineRouter(
  params: NineRouterGenerateParams,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('NINE_ROUTER_API_KEY not configured. Please add it in project secrets.');
  }

  const baseUrl = getBaseUrl();
  const innerModel = stripPrefix(params.model);

  const body: Record<string, unknown> = {
    model: innerModel,
    prompt: params.prompt,
    response_format: 'url',
  };

  if (!shouldSkipSize(innerModel)) {
    body.size = aspectToSize(params.aspectRatio);
  }

  // img2img / edit mode — flux-kontext, nano-banana-edit, fal-ai use `image` field
  if (params.inputImage) {
    body.image = params.inputImage;
  }

  console.log(`[ninerouter] POST /v1/images/generations model=${innerModel} ratio=${params.aspectRatio || '1:1'} hasInput=${!!params.inputImage}`);

  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ninerouter] HTTP ${response.status}:`, errorText.slice(0, 300));

    if (response.status === 401 || response.status === 403) {
      throw new Error('NINEROUTER_AUTH_ERROR: Invalid or expired NINE_ROUTER_API_KEY');
    }
    if (response.status === 402) {
      throw new Error('NINEROUTER_CREDITS_EXHAUSTED: Insufficient 9Router credits');
    }
    if (response.status === 429) {
      throw new Error('NINEROUTER_RATE_LIMIT: Too many requests to 9Router');
    }
    throw new Error(`9Router image generation failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // Sync response (OpenAI/Gemini/Recraft/MiniMax/Stability)
  const directUrl = extractImageUrl(data);
  if (directUrl) {
    console.log(`[ninerouter] Sync response → image ready`);
    return directUrl;
  }

  // Async response (FLUX / Fal / Nano-banana)
  const taskId = data?.task_id || data?.id;
  if (taskId && (data?.status === 'pending' || data?.status === 'processing' || data?.status === 'queued')) {
    console.log(`[ninerouter] Async task submitted: ${taskId} → polling`);
    return await pollTask(String(taskId), apiKey, params.maxAttempts ?? DEFAULT_POLL_ATTEMPTS);
  }

  console.error('[ninerouter] Unrecognized response:', JSON.stringify(data).slice(0, 400));
  throw new Error('9Router returned unrecognized response (no url, no task_id)');
}

/**
 * Check if a model ID is routed via 9Router image endpoint.
 * Image models always nest sub-provider: '9router/<provider>/<model>'.
 * Chat models are flat ('9router/glm-4.6') — they have no second slash and
 * MUST NOT be routed here.
 */
export function isNineRouterImageModel(model: string): boolean {
  if (!model.startsWith('9router/')) return false;
  // require '9router/<provider>/<model>' — at least 2 slashes
  return model.split('/').length >= 3;
}

/**
 * Map standard aspect ratio → 9Router-compatible value (passthrough).
 * Exposed for parity with poyo/kie/geminigen helpers in caller code.
 */
export function mapAspectRatioToNineRouter(aspectRatio?: string): string {
  return aspectRatio || '1:1';
}
