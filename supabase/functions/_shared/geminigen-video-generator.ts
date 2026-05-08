// ============================================
// GeminiGen.ai Video Generation Helper
// Async API: submit task → poll for result
// Supported model families (per https://geminigen.ai/pricing):
//   - Veo 2 / Veo 3 / Veo 3 Fast / Veo 3.1 (HD, FullHD, Fast, Lite)
//   - Sora 2 / Sora 2 Pro / Sora 2 HD
//   - Grok 3 (xAI)
//   - Bytedance Seedance 2.0 (Fast/Pro/Omni 480p|720p, VIP variants)
//   - Kling 3.0 / 2.6 / 2.5 / 2.1 / O1 (720p|1080p, edit, motion control, lipsync)
// ============================================
//
// ⚠️ ENDPOINT ASSUMPTION
// All video models route through the unified /uapi/v1/video-gen/veo endpoint
// with the family selected via the `model` form field. If GeminiGen splits
// endpoints per family, switch on prefix here:
//   veo* → /veo, sora* → /sora, grok* → /grok, seedance* → /seedance, kling* → /kling
// Docs: https://docs.geminigen.ai
// ============================================

const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai';
// Confirmed from official demo: https://github.com/AINNATE-GEMINIGEN/GEMINIGEN.AI-API-DEMO
const GEMINIGEN_VIDEO_ENDPOINT = '/uapi/v1/video-gen/veo';
const GEMINIGEN_HISTORY_ENDPOINT = '/uapi/v1/history';

export interface GeminiGenVideoParams {
  prompt: string;
  model: string;           // 'geminigen/veo-3', 'geminigen/veo-3-fast', 'geminigen/sora-2', ...
  aspectRatio?: string;    // '16:9', '9:16', '1:1'
  resolution?: '720p' | '1080p';
  duration?: number;       // seconds (5 | 10)
  negativePrompt?: string;
  startingFrameUrl?: string;  // image-to-video
  seed?: number;              // stable seed for identity consistency
}

export interface GeminiGenVideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  durationMs: number;
}

// GeminiGen API only accepts these exact model identifiers (per validation error from API):
//   'veo-2', 'veo-3', 'veo-3-fast', 'sora-2-free', 'sora-2'
// Map our internal model IDs (incl. veo-3.1*, sora-2-pro/hd) to a supported one.
const GEMINIGEN_MODEL_ALIAS: Record<string, string> = {
  'veo-3.1': 'veo-3',
  'veo-3.1-fast': 'veo-3-fast',
  'sora-2-pro': 'sora-2',
  'sora-2-hd': 'sora-2',
};
const GEMINIGEN_SUPPORTED = new Set(['veo-2', 'veo-3', 'veo-3-fast', 'sora-2-free', 'sora-2']);

function stripPrefix(model: string): string {
  const raw = model.startsWith('geminigen/') ? model.slice(10) : model;
  if (GEMINIGEN_SUPPORTED.has(raw)) return raw;
  if (GEMINIGEN_MODEL_ALIAS[raw]) return GEMINIGEN_MODEL_ALIAS[raw];
  // Fallback: best-effort family match, else default to veo-3-fast
  if (raw.startsWith('veo-3')) return raw.includes('fast') ? 'veo-3-fast' : 'veo-3';
  if (raw.startsWith('sora-2')) return 'sora-2';
  if (raw.startsWith('veo-2')) return 'veo-2';
  console.warn(`[geminigen-video] Unknown model "${raw}", falling back to veo-3-fast`);
  return 'veo-3-fast';
}

function mapAspectRatio(aspectRatio?: string): string {
  const supported = ['16:9', '9:16', '1:1'];
  const ratio = aspectRatio || '16:9';
  return supported.includes(ratio) ? ratio : '16:9';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recursively walk an object and return the first value that looks like a video URL. */
function findVideoUrlDeep(obj: unknown, depth = 0): string | undefined {
  if (depth > 6 || obj == null) return undefined;
  if (typeof obj === 'string') {
    if (/^https?:\/\/.+\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(obj)) return obj;
    return undefined;
  }
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const found = findVideoUrlDeep(it, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findVideoUrlDeep(v, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

/** Recursively find an image URL (for thumbnail fallback). */
function findImageUrlDeep(obj: unknown, depth = 0): string | undefined {
  if (depth > 6 || obj == null) return undefined;
  if (typeof obj === 'string') {
    if (/^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(obj)) return obj;
    return undefined;
  }
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const found = findImageUrlDeep(it, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findImageUrlDeep(v, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

async function submitVideoTask(params: GeminiGenVideoParams, apiKey: string): Promise<string> {
  const modelName = stripPrefix(params.model);
  const ratio = mapAspectRatio(params.aspectRatio);

  // GeminiGen video API expects multipart/form-data (verified via curl test)
  const formData = new FormData();
  formData.append('model', modelName);
  formData.append('prompt', params.prompt);
  formData.append('aspect_ratio', ratio);
  formData.append('resolution', params.resolution || '1080p');
  formData.append('duration', String(params.duration || 5));

  if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
  if (typeof params.seed === 'number' && params.seed > 0) {
    formData.append('seed', String(params.seed));
  }

  if (params.startingFrameUrl) {
    try {
      const imgResp = await fetch(params.startingFrameUrl);
      const imgBlob = await imgResp.blob();
      formData.append('input_image', imgBlob, 'input.png');
    } catch (e) {
      console.warn('[geminigen-video] Failed to fetch starting frame, text-only:', e);
    }
  }

  console.log(`[geminigen-video] Submit: model=${modelName}, ratio=${ratio}, duration=${params.duration || 5}s`);

  const response = await fetch(`${GEMINIGEN_BASE_URL}${GEMINIGEN_VIDEO_ENDPOINT}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[geminigen-video] Submit failed: ${response.status}`, errorText);

    if (response.status === 401 || response.status === 403) {
      throw new Error('GEMINIGEN_AUTH_ERROR: Invalid or expired API key');
    }
    if (response.status === 402) {
      throw new Error('GEMINIGEN_CREDITS_EXHAUSTED: Insufficient GeminiGen credits');
    }
    if (response.status === 429) {
      throw new Error('GEMINIGEN_RATE_LIMIT: Too many requests');
    }
    if (response.status === 404) {
      throw new Error(
        `GEMINIGEN_ENDPOINT_NOT_FOUND: ${GEMINIGEN_VIDEO_ENDPOINT} returns 404. ` +
        `Verify path in docs.geminigen.ai and update GEMINIGEN_VIDEO_ENDPOINT constant.`
      );
    }

    throw new Error(`GeminiGen video submit failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const uuid = data?.uuid || data?.data?.uuid || data?.task_id;
  if (!uuid) {
    console.error('[geminigen-video] No UUID in response:', JSON.stringify(data).slice(0, 300));
    throw new Error('GeminiGen video did not return a UUID');
  }

  console.log(`[geminigen-video] Task submitted: uuid=${uuid}`);
  return uuid;
}

async function pollVideoTask(uuid: string, apiKey: string): Promise<GeminiGenVideoResult> {
  // Video generation takes longer than image — 35 × 10s = 350s (~6 min) max
  const maxAttempts = 35;
  const pollInterval = 10_000;
  const startMs = Date.now();

  console.log(`[geminigen-video] Polling: uuid=${uuid}, max=${(maxAttempts * pollInterval) / 1000}s`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${GEMINIGEN_BASE_URL}${GEMINIGEN_HISTORY_ENDPOINT}/${uuid}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!response.ok) {
        console.warn(`[geminigen-video] Poll ${attempt + 1} error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const status = data?.status ?? data?.data?.status;
      console.log(`[geminigen-video] Attempt ${attempt + 1}/${maxAttempts}: status=${status}`);

      if (status === 2 || status === 'completed' || status === 'success') {
        console.log(`[geminigen-video] COMPLETED raw response for ${uuid}:`,
          JSON.stringify(data).slice(0, 1500));

        const videoUrl =
          data?.video_url || data?.data?.video_url ||
          data?.generate_result || data?.data?.generate_result ||
          data?.result_url || data?.data?.result_url ||
          data?.output_url || data?.data?.output_url ||
          data?.files?.[0]?.url || data?.videos?.[0]?.url ||
          findVideoUrlDeep(data);

        if (!videoUrl) {
          console.error(`[geminigen-video] Completed but no URL. Keys: ${JSON.stringify(Object.keys(data))}`);
          throw new Error('GeminiGen video succeeded but returned no video URL');
        }

        const thumbnailUrl =
          data?.thumbnail_url || data?.data?.thumbnail_url ||
          data?.files?.[0]?.thumbnail || findImageUrlDeep(data) || undefined;

        return {
          videoUrl,
          thumbnailUrl,
          durationMs: Date.now() - startMs,
        };
      }

      if (status === 3 || status === 'failed' || status === 'error') {
        const errorMsg = data?.error || data?.data?.error || 'Unknown GeminiGen video error';
        throw new Error(`GeminiGen video generation failed: ${errorMsg}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('GeminiGen video')) throw err;
      console.warn(`[geminigen-video] Poll ${attempt + 1} exception:`, err);
    }
  }

  throw new Error(`GeminiGen video timeout after ${(maxAttempts * pollInterval) / 1000}s for uuid=${uuid}`);
}

export async function generateVideoViaGeminiGen(
  params: GeminiGenVideoParams,
  apiKey: string,
): Promise<GeminiGenVideoResult> {
  if (!apiKey) {
    throw new Error('GEMINIGEN_API_KEY not configured in project secrets.');
  }

  const uuid = await submitVideoTask(params, apiKey);
  return await pollVideoTask(uuid, apiKey);
}

/** Submit only — for async pipeline (returns task UUID immediately). */
export async function submitGeminiGenVideoTask(
  params: GeminiGenVideoParams,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');
  return submitVideoTask(params, apiKey);
}

/** One-shot status check — for background poller. Does NOT poll in a loop. */
export async function checkGeminiGenVideoStatus(
  uuid: string,
  apiKey: string,
): Promise<{ status: 'processing' | 'completed' | 'failed'; videoUrl?: string; thumbnailUrl?: string; error?: string }> {
  try {
    const response = await fetch(`${GEMINIGEN_BASE_URL}${GEMINIGEN_HISTORY_ENDPOINT}/${uuid}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
      // Treat HTTP errors as transient — keep processing
      return { status: 'processing' };
    }

    const data = await response.json();
    const status = data?.status ?? data?.data?.status;

    if (status === 2 || status === 'completed' || status === 'success') {
      console.log(`[geminigen-video] COMPLETED raw response for ${uuid}:`,
        JSON.stringify(data).slice(0, 1500));

      const videoUrl =
        data?.video_url || data?.data?.video_url ||
        data?.generate_result || data?.data?.generate_result ||
        data?.result_url || data?.data?.result_url ||
        data?.output_url || data?.data?.output_url ||
        data?.files?.[0]?.url || data?.videos?.[0]?.url ||
        findVideoUrlDeep(data);

      if (!videoUrl) {
        console.error(`[geminigen-video] No URL found. Top-level keys:`, Object.keys(data));
        return { status: 'failed', error: 'Completed but no video URL returned' };
      }

      const thumbnailUrl =
        data?.thumbnail_url || data?.data?.thumbnail_url ||
        data?.files?.[0]?.thumbnail || findImageUrlDeep(data) || undefined;

      return { status: 'completed', videoUrl, thumbnailUrl };
    }

    if (status === 3 || status === 'failed' || status === 'error') {
      const errorMsg = data?.error || data?.data?.error || 'Unknown GeminiGen error';
      return { status: 'failed', error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) };
    }

    return { status: 'processing' };
  } catch (e) {
    console.warn('[geminigen-video] checkStatus exception:', e);
    return { status: 'processing' };
  }
}

export function isGeminiGenVideoModel(model: string): boolean {
  return model.startsWith('geminigen/');
}

export const GEMINIGEN_VIDEO_MODELS = [
  { id: 'geminigen/veo-3', label: 'Veo 3', maxDuration: 10 },
  { id: 'geminigen/veo-3-fast', label: 'Veo 3 Fast', maxDuration: 10 },
  { id: 'geminigen/veo-3.1', label: 'Veo 3.1', maxDuration: 10 },
  { id: 'geminigen/veo-3.1-fast', label: 'Veo 3.1 Fast', maxDuration: 10 },
  { id: 'geminigen/veo-2', label: 'Veo 2', maxDuration: 8 },
  { id: 'geminigen/sora-2', label: 'Sora 2', maxDuration: 10 },
] as const;
