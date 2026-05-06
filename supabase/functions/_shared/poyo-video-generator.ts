// ============================================
// PoYo.ai Video Generation Helper
// Async API: submit task → poll for result
// Supports: Seedance 2 (ByteDance), Sora 2 (OpenAI), Happy Horse (Alibaba)
// ============================================
//
// Pattern mirrors poyo-image-generator.ts (submit → poll status).
// PoYo endpoints:
//   POST /api/generate/submit            { model, input: { prompt, ... } } → { data: { task_id } }
//   GET  /api/generate/status/{task_id}                                    → { data: { status, files: [{ file_url }] } }
// ============================================

const POYO_BASE_URL = 'https://api.poyo.ai';

export const POYO_VIDEO_MODELS = [
  'poyo/seedance-2',
  'poyo/sora-2',
  'poyo/happy-horse',
] as const;

export type PoyoVideoModel = typeof POYO_VIDEO_MODELS[number];

export interface PoyoVideoParams {
  prompt: string;
  model: PoyoVideoModel;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number;            // seconds (5 | 10)
  resolution?: '720p' | '1080p';
  startingFrameUrl?: string;    // image-to-video (first frame)
  endingFrameUrl?: string;      // Seedance supports last frame too
  negativePrompt?: string;
  seed?: number;                // stable seed for identity consistency
}

export interface PoyoVideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  durationMs: number;
}

function stripPrefix(model: string): string {
  return model.startsWith('poyo/') ? model.slice(5) : model;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitPoyoVideoTask(params: PoyoVideoParams, apiKey: string): Promise<string> {
  const modelName = stripPrefix(params.model);
  const aspect = params.aspectRatio || '9:16';

  // PoYo API requires duration between 4 and 10 — clamp accordingly
  const rawDuration = params.duration ?? 5;
  const clampedDuration = Math.max(4, Math.min(10, rawDuration));
  if (rawDuration !== clampedDuration) {
    console.warn(`[poyo-video] Clamped duration ${rawDuration}s → ${clampedDuration}s (PoYo range=4-10s)`);
  }

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: aspect,
    duration: clampedDuration,
    resolution: params.resolution ?? '1080p',
  };

  if (params.startingFrameUrl) input.first_frame_url = params.startingFrameUrl;
  if (params.endingFrameUrl) input.last_frame_url = params.endingFrameUrl;
  if (params.negativePrompt) input.negative_prompt = params.negativePrompt;
  if (typeof params.seed === 'number' && params.seed > 0) input.seed = params.seed;

  const body = { model: modelName, input };

  console.log(`[poyo-video] Submit: model=${modelName}, aspect=${aspect}, duration=${input.duration}s`);

  const response = await fetch(`${POYO_BASE_URL}/api/generate/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[poyo-video] Submit failed ${response.status}:`, errorText.slice(0, 300));
    if (response.status === 401) throw new Error('POYO_AUTH_ERROR: Invalid PoYo API key');
    if (response.status === 402) throw new Error('POYO_CREDITS_EXHAUSTED: Insufficient PoYo credits');
    if (response.status === 429) throw new Error('POYO_RATE_LIMIT: Too many requests');
    throw new Error(`PoYo video submit failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  console.log(`[poyo-video] Submit response:`, JSON.stringify(data).slice(0, 500));

  const embeddedCode = data?.code;
  const embeddedErrType = data?.error?.type || data?.error?.code;
  const embeddedMsg = data?.error?.message || data?.message;
  if (embeddedCode === 402 || embeddedErrType === 'insufficient_credits_error') {
    throw new Error('POYO_CREDITS_EXHAUSTED: Insufficient PoYo credits');
  }
  if (embeddedCode === 401) throw new Error('POYO_AUTH_ERROR: Invalid PoYo API key');
  if (embeddedCode === 429) throw new Error('POYO_RATE_LIMIT: Too many requests');
  // Catch any other embedded error before checking task_id
  if (embeddedCode && embeddedCode >= 400) {
    throw new Error(`POYO_ERROR_${embeddedCode}: ${embeddedMsg || 'Unknown PoYo error'}`);
  }

  const taskId = data?.data?.task_id || data?.task_id;
  if (!taskId) {
    console.error('[poyo-video] No task_id:', JSON.stringify(data).slice(0, 300));
    throw new Error('PoYo did not return a task_id');
  }
  console.log(`[poyo-video] Task submitted: ${taskId}`);
  return taskId;
}

/**
 * Poll PoYo until video is ready.
 * Default: every 5s, max 30 attempts (~150s) — at the edge of edge function wall clock.
 * For background polling pattern (Phase 3), use submitPoyoVideoTask only and let
 * pg_cron poller handle status checks asynchronously.
 */
async function pollPoyoVideoTask(taskId: string, apiKey: string): Promise<PoyoVideoResult> {
  const maxAttempts = 28;
  const pollInterval = 5000;
  const start = Date.now();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    const response = await fetch(`${POYO_BASE_URL}/api/generate/status/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.warn(`[poyo-video] Poll error ${response.status} on attempt ${attempt + 1}`);
      continue;
    }

    const data = await response.json();
    const status = data?.data?.status || data?.status;
    console.log(`[poyo-video] Attempt ${attempt + 1}/${maxAttempts}: status=${status}`);

    if (status === 'finished' || status === 'completed' || status === 'success') {
      const files = data?.data?.files || data?.files || [];
      const videoUrl = files[0]?.file_url || files[0]?.url || data?.data?.result_url;
      const thumbnailUrl = files[0]?.thumbnail_url || data?.data?.thumbnail_url;
      if (!videoUrl) {
        console.error('[poyo-video] Finished but no video URL:', JSON.stringify(data).slice(0, 300));
        throw new Error('PoYo finished but returned no video URL');
      }
      return { videoUrl, thumbnailUrl, durationMs: Date.now() - start };
    }

    if (status === 'failed' || status === 'error') {
      const reason = data?.data?.error || data?.error || 'Unknown PoYo error';
      throw new Error(`PoYo video generation failed: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
    }
  }

  throw new Error(`POYO_TIMEOUT: Video did not complete within ${(maxAttempts * pollInterval) / 1000}s — switch to async polling`);
}

/**
 * Convenience: submit + poll inline. Use only when wall clock budget allows.
 * For Phase 3 (async pattern), call submitPoyoVideoTask directly and persist task_id.
 */
export async function generateVideoViaPoyo(
  params: PoyoVideoParams,
  apiKey: string,
): Promise<PoyoVideoResult> {
  const taskId = await submitPoyoVideoTask(params, apiKey);
  return pollPoyoVideoTask(taskId, apiKey);
}

export { submitPoyoVideoTask, pollPoyoVideoTask };

/** One-shot status check — for background poller. Does NOT loop. */
export async function checkPoyoVideoStatus(
  taskId: string,
  apiKey: string,
): Promise<{ status: 'processing' | 'completed' | 'failed'; videoUrl?: string; thumbnailUrl?: string; error?: string }> {
  try {
    const response = await fetch(`${POYO_BASE_URL}/api/generate/status/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // Transient — keep processing
      return { status: 'processing' };
    }

    const data = await response.json();
    const status = data?.data?.status || data?.status;

    if (status === 'finished' || status === 'completed' || status === 'success') {
      const files = data?.data?.files || data?.files || [];
      const videoUrl = files[0]?.file_url || files[0]?.url || data?.data?.result_url;
      const thumbnailUrl = files[0]?.thumbnail_url || data?.data?.thumbnail_url;
      if (!videoUrl) return { status: 'failed', error: 'PoYo finished but returned no video URL' };
      return { status: 'completed', videoUrl, thumbnailUrl };
    }

    if (status === 'failed' || status === 'error') {
      const reason = data?.data?.error || data?.error || 'Unknown PoYo error';
      return { status: 'failed', error: typeof reason === 'string' ? reason : JSON.stringify(reason) };
    }

    return { status: 'processing' };
  } catch (e) {
    console.warn('[poyo-video] checkStatus exception:', e);
    return { status: 'processing' };
  }
}
