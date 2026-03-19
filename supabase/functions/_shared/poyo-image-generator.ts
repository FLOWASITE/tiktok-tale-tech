// ============================================
// PoYo.ai Image Generation Helper
// Unified async API: submit task → poll for result
// Supports: Nano Banana 2 (Gemini 3.1 Flash), Nano Banana Pro (Gemini 3 Pro),
//           GPT-4o Image, GPT Image 1.5, Z-Image,
//           Flux 2 Pro/Flex, Seedream 4.5, Grok Imagine + Edit variants
// ============================================

const POYO_BASE_URL = 'https://api.poyo.ai';

export interface PoyoGenerateParams {
  prompt: string;
  model: string;           // 'poyo/gpt-4o-image', 'poyo/z-image', etc.
  aspectRatio?: string;    // '1:1', '16:9', '9:16', '4:3', '3:4', '1:4', '4:1', '1:8', '8:1'
  inputImage?: string;     // URL for image editing mode
  resolution?: '1K' | '2K' | '4K'; // For nano-banana-2-new models
}

/**
 * Strip the 'poyo/' prefix to get the raw model name for API
 */
function stripPoyoPrefix(model: string): string {
  return model.startsWith('poyo/') ? model.slice(5) : model;
}

/**
 * Map aspect ratio to PoYo size format
 */
function mapAspectRatioToSize(aspectRatio?: string): string {
  // PoYo API expects ratio format (e.g. '16:9'), NOT pixel dimensions
  const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1'];
  const ratio = aspectRatio || '1:1';
  if (validRatios.includes(ratio)) {
    return ratio;
  }
  // Map common aliases
  const aliasMap: Record<string, string> = {
    'square': '1:1',
    'landscape': '16:9',
    'portrait': '9:16',
  };
  return aliasMap[ratio] || '1:1';
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Step 1: Submit image generation task to PoYo.ai
 * Returns task_id for polling
 */
async function submitPoyoTask(params: PoyoGenerateParams, apiKey: string): Promise<string> {
  const modelName = stripPoyoPrefix(params.model);
  const size = mapAspectRatioToSize(params.aspectRatio);

  const body: Record<string, any> = {
    model: modelName,
    input: {
      prompt: params.prompt,
      size,
    },
  };

  // Resolution support for nano-banana-2-new models
  if (params.resolution && (modelName === 'nano-banana-2-new' || modelName === 'nano-banana-2-new-edit')) {
    body.input.resolution = params.resolution;
  }

  // Image editing mode
  if (params.inputImage) {
    body.input.image_url = params.inputImage;
  }

  console.log(`[poyo-generator] Submitting task: model=${modelName}, size=${size}`);

  const response = await fetch(`${POYO_BASE_URL}/api/generate/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[poyo-generator] Submit failed: ${response.status}`, errorText);

    if (response.status === 401) {
      throw new Error('POYO_AUTH_ERROR: Invalid or expired API key');
    }
    if (response.status === 402) {
      throw new Error('POYO_CREDITS_EXHAUSTED: Insufficient PoYo.ai credits');
    }
    if (response.status === 429) {
      throw new Error('POYO_RATE_LIMIT: Too many requests to PoYo.ai');
    }

    throw new Error(`PoYo submit failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // PoYo response: { code: 200, data: { task_id: '...' } }
  const taskId = data?.data?.task_id || data?.task_id;
  if (!taskId) {
    console.error('[poyo-generator] No task_id in response:', JSON.stringify(data).slice(0, 300));
    throw new Error('PoYo did not return a task_id');
  }

  console.log(`[poyo-generator] Task submitted: task_id=${taskId}`);
  return taskId;
}

/**
 * Step 2: Poll PoYo.ai until image is ready
 * Polls every 3 seconds, max 60 seconds (20 attempts)
 * Reduced from 120s to leave headroom for fallback within edge function wall clock limit.
 */
async function pollPoyoTask(taskId: string, apiKey: string): Promise<string> {
  const maxAttempts = 35; // 35 × 3s = 105s timeout (fits within 150s edge function limit)
  const pollInterval = 3000;

  console.log(`[poyo-generator] Starting poll: task_id=${taskId}, max=${maxAttempts * pollInterval / 1000}s`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${POYO_BASE_URL}/api/generate/status/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn(`[poyo-generator] Poll error ${response.status} on attempt ${attempt + 1}`);
        continue;
      }

      const data = await response.json();
      const status = data?.data?.status || data?.status;

      console.log(`[poyo-generator] Attempt ${attempt + 1}/${maxAttempts}: status=${status}`);

      if (status === 'finished' || status === 'completed' || status === 'success') {
        // Extract image URL from files array
        const files = data?.data?.files || data?.files || [];
        const imageUrl = files[0]?.file_url || files[0]?.url || data?.data?.result_url;
        
        if (!imageUrl) {
          console.error('[poyo-generator] Finished but no image URL:', JSON.stringify(data).slice(0, 300));
          throw new Error('PoYo generation succeeded but returned no image URL');
        }
        
        console.log(`[poyo-generator] Image ready after ${(attempt + 1) * pollInterval / 1000}s`);
        return imageUrl;
      }

      if (status === 'failed' || status === 'error') {
        const errorMsg = data?.data?.error || data?.error || 'Unknown PoYo generation error';
        console.error(`[poyo-generator] Generation failed: ${errorMsg}`);
        throw new Error(`PoYo generation failed: ${errorMsg}`);
      }

      // status === 'processing' or 'pending': continue polling
    } catch (err) {
      if (err instanceof Error && (
        err.message.startsWith('PoYo generation failed') ||
        err.message.startsWith('PoYo generation succeeded')
      )) {
        throw err;
      }
      console.warn(`[poyo-generator] Poll attempt ${attempt + 1} error:`, err);
    }
  }

  throw new Error(`PoYo generation timeout after ${maxAttempts * pollInterval / 1000}s for task_id=${taskId}`);
}

/**
 * Main entry point: Generate image via PoYo.ai
 * Handles the full async flow: submit → poll → return URL
 */
export async function generateImageViaPoyo(
  params: PoyoGenerateParams,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('POYO_API_KEY not configured. Please add it in project secrets.');
  }

  console.log(`[poyo-generator] Starting generation: model=${params.model}, ratio=${params.aspectRatio || '1:1'}`);

  const taskId = await submitPoyoTask(params, apiKey);
  const imageUrl = await pollPoyoTask(taskId, apiKey);

  return imageUrl;
}

/**
 * Check if a model ID is a PoYo.ai model
 */
export function isPoyoModel(model: string): boolean {
  return model.startsWith('poyo/');
}

/**
 * Map standard aspect ratio to PoYo.ai format
 */
export function mapAspectRatioToPoyo(aspectRatio?: string): string {
  if (!aspectRatio) return '1:1';
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '1:4', '4:1', '1:8', '8:1'];
  return supported.includes(aspectRatio) ? aspectRatio : '1:1';
}
