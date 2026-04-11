// ============================================
// GeminiGen.ai Image Generation Helper
// Async API: submit task → poll for result
// Supports: Nano Banana Pro (Gemini 3 Pro), Nano Banana 2 (Gemini 3.1 Flash), Imagen 4
// ============================================

const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai';

export interface GeminiGenGenerateParams {
  prompt: string;
  model: string;           // 'geminigen/nano-banana-pro', 'geminigen/imagen-4', etc.
  aspectRatio?: string;    // '1:1', '16:9', '9:16', '4:3', '3:4'
  inputImage?: string;     // URL for image editing mode
  resolution?: '1K' | '2K' | '4K';
  style?: string;          // 'None', '3D Render', 'Photorealistic', 'Anime General', etc.
}

/**
 * Strip the 'geminigen/' prefix to get the raw model name for API
 */
function stripPrefix(model: string): string {
  return model.startsWith('geminigen/') ? model.slice(10) : model;
}

/**
 * Map aspect ratio to GeminiGen format
 */
function mapAspectRatio(aspectRatio?: string): string {
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const ratio = aspectRatio || '1:1';
  if (supported.includes(ratio)) return ratio;
  const aliasMap: Record<string, string> = {
    'square': '1:1',
    'landscape': '16:9',
    'portrait': '9:16',
    '4:5': '4:3',
  };
  return aliasMap[ratio] || '1:1';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Submit image generation task to GeminiGen.ai
 * Uses multipart/form-data as required by API
 * Returns UUID for polling
 */
async function submitTask(params: GeminiGenGenerateParams, apiKey: string): Promise<string> {
  const modelName = stripPrefix(params.model);
  const ratio = mapAspectRatio(params.aspectRatio);

  const formData = new FormData();
  formData.append('model', modelName);
  formData.append('prompt', params.prompt);
  formData.append('aspect_ratio', ratio);
  formData.append('resolution', params.resolution || '2K');
  
  if (params.style) {
    formData.append('style', params.style);
  }

  if (params.inputImage) {
    // Fetch the image and attach as file
    try {
      const imgResp = await fetch(params.inputImage);
      const imgBlob = await imgResp.blob();
      formData.append('input_image', imgBlob, 'input.png');
    } catch (e) {
      console.warn('[geminigen] Failed to fetch input image, proceeding without it');
    }
  }

  console.log(`[geminigen] Submitting task: model=${modelName}, ratio=${ratio}`);

  const response = await fetch(`${GEMINIGEN_BASE_URL}/uapi/v1/generate_image`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[geminigen] Submit failed: ${response.status}`, errorText);

    if (response.status === 401 || response.status === 403) {
      throw new Error('GEMINIGEN_AUTH_ERROR: Invalid or expired API key');
    }
    if (response.status === 402) {
      throw new Error('GEMINIGEN_CREDITS_EXHAUSTED: Insufficient GeminiGen credits');
    }
    if (response.status === 429) {
      throw new Error('GEMINIGEN_RATE_LIMIT: Too many requests to GeminiGen.ai');
    }

    throw new Error(`GeminiGen submit failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // GeminiGen response: { uuid: '...' } or { data: { uuid: '...' } }
  const uuid = data?.uuid || data?.data?.uuid || data?.task_id;
  if (!uuid) {
    console.error('[geminigen] No UUID in response:', JSON.stringify(data).slice(0, 300));
    throw new Error('GeminiGen did not return a UUID');
  }

  console.log(`[geminigen] Task submitted: uuid=${uuid}`);
  return uuid;
}

/**
 * Poll GeminiGen.ai until image is ready
 * status: 1=processing, 2=completed, 3=failed
 */
async function pollTask(uuid: string, apiKey: string): Promise<string> {
  const maxAttempts = 35; // 35 × 3s = 105s
  const pollInterval = 3000;

  console.log(`[geminigen] Starting poll: uuid=${uuid}, max=${maxAttempts * pollInterval / 1000}s`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${GEMINIGEN_BASE_URL}/uapi/v1/history/${uuid}`, {
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`[geminigen] Poll error ${response.status} on attempt ${attempt + 1}`);
        continue;
      }

      const data = await response.json();
      const status = data?.status ?? data?.data?.status;

      console.log(`[geminigen] Attempt ${attempt + 1}/${maxAttempts}: status=${status}`);

      if (status === 2 || status === 'completed' || status === 'success') {
        // Extract image URL
        const imageUrl = data?.generate_result || data?.data?.generate_result ||
                         data?.result_url || data?.data?.result_url ||
                         data?.files?.[0]?.url;

        if (!imageUrl) {
          console.error('[geminigen] Completed but no image URL:', JSON.stringify(data).slice(0, 300));
          throw new Error('GeminiGen generation succeeded but returned no image URL');
        }

        console.log(`[geminigen] Image ready after ${(attempt + 1) * pollInterval / 1000}s`);
        return imageUrl;
      }

      if (status === 3 || status === 'failed' || status === 'error') {
        const errorMsg = data?.error || data?.data?.error || 'Unknown GeminiGen generation error';
        console.error(`[geminigen] Generation failed: ${errorMsg}`);
        throw new Error(`GeminiGen generation failed: ${errorMsg}`);
      }

      // status === 1 or 'processing': continue polling
    } catch (err) {
      if (err instanceof Error && (
        err.message.startsWith('GeminiGen generation failed') ||
        err.message.startsWith('GeminiGen generation succeeded')
      )) {
        throw err;
      }
      console.warn(`[geminigen] Poll attempt ${attempt + 1} error:`, err);
    }
  }

  throw new Error(`GeminiGen generation timeout after ${maxAttempts * pollInterval / 1000}s for uuid=${uuid}`);
}

/**
 * Main entry point: Generate image via GeminiGen.ai
 */
export async function generateImageViaGeminiGen(
  params: GeminiGenGenerateParams,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINIGEN_API_KEY not configured. Please add it in project secrets.');
  }

  console.log(`[geminigen] Starting generation: model=${params.model}, ratio=${params.aspectRatio || '1:1'}`);

  const uuid = await submitTask(params, apiKey);
  const imageUrl = await pollTask(uuid, apiKey);

  return imageUrl;
}

/**
 * Check if a model ID is a GeminiGen model
 */
export function isGeminiGenModel(model: string): boolean {
  return model.startsWith('geminigen/');
}

/**
 * Map standard aspect ratio to GeminiGen format
 */
export function mapAspectRatioToGeminiGen(aspectRatio?: string): string {
  return mapAspectRatio(aspectRatio);
}
