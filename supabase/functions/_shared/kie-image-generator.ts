// ============================================
// KIE.AI Image Generation Helper
// Async API: submit task → poll for result
// Supports: Flux Kontext, GPT-Image-1
// ============================================

const KIE_BASE_URL = 'https://api.kie.ai';

export interface KieGenerateParams {
  prompt: string;
  model: string;           // 'flux-kontext-pro' | 'flux-kontext-max' | 'gpt-image-1' | 'gpt-image-1.5'
  aspectRatio?: string;    // '1:1', '16:9', '9:16', '4:3', '3:4'
  outputFormat?: 'jpeg' | 'png' | 'webp';
  inputImage?: string;     // URL or base64 for image editing mode
  enableTranslation?: boolean;
  promptUpsampling?: boolean;
}

interface KieEndpoints {
  generate: string;
  poll: string;
}

/**
 * Route to correct KIE endpoints based on model name
 */
function getKieEndpoints(model: string): KieEndpoints {
  if (model.startsWith('flux-kontext')) {
    return {
      generate: '/api/v1/flux/kontext/generate',
      poll: '/api/v1/flux/kontext/record-info',
    };
  }
  if (model.startsWith('gpt-image')) {
    return {
      generate: '/api/v1/gpt4o-image/generate',
      poll: '/api/v1/gpt4o-image/record-info',
    };
  }
  // Default fallback: Flux Kontext Pro
  console.warn(`[kie-generator] Unknown model "${model}", defaulting to flux-kontext endpoints`);
  return {
    generate: '/api/v1/flux/kontext/generate',
    poll: '/api/v1/flux/kontext/record-info',
  };
}

/**
 * Map model name to KIE model identifier used in API requests
 */
function getKieModelName(model: string): string {
  const modelMap: Record<string, string> = {
    'flux-kontext-pro': 'flux-kontext-pro',
    'flux-kontext-max': 'flux-kontext-max',
    'gpt-image-1': 'gpt-image-1',
    'gpt-image-1.5': 'gpt-image-1.5',
  };
  return modelMap[model] || model;
}

/**
 * Extract image URL from KIE poll response (differs by model)
 */
function extractImageUrl(response: any, model: string): string | null {
  if (!response) return null;

  // Flux Kontext: response.resultImageUrl
  if (model.startsWith('flux-kontext')) {
    return response.resultImageUrl || response.result_image_url || null;
  }

  // GPT-Image-1: response.result_urls[0] or response.resultImageUrl
  if (model.startsWith('gpt-image')) {
    if (Array.isArray(response.result_urls) && response.result_urls.length > 0) {
      return response.result_urls[0];
    }
    return response.resultImageUrl || response.result_image_url || null;
  }

  // Generic fallback
  return (
    response.resultImageUrl ||
    response.result_image_url ||
    (Array.isArray(response.result_urls) ? response.result_urls[0] : null) ||
    null
  );
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Step 1: Submit image generation task to KIE.ai
 * Returns taskId for polling
 */
async function submitKieTask(params: KieGenerateParams, apiKey: string): Promise<string> {
  const { generate } = getKieEndpoints(params.model);
  const modelName = getKieModelName(params.model);

  // KIE.ai has a 3000 character limit for prompts — truncate intelligently
  let truncatedPrompt = params.prompt;
  const KIE_MAX_PROMPT_LENGTH = 2800; // Leave margin for safety
  if (truncatedPrompt.length > KIE_MAX_PROMPT_LENGTH) {
    console.warn(`[kie-generator] Prompt too long (${truncatedPrompt.length} chars), truncating to ${KIE_MAX_PROMPT_LENGTH}`);
    // Keep the first portion (most important: content context + channel specs)
    // and the critical rules at the end
    const criticalRulesMatch = truncatedPrompt.match(/## CRITICAL RULES[\s\S]*$/);
    const criticalRules = criticalRulesMatch ? criticalRulesMatch[0] : '';
    const mainContentBudget = KIE_MAX_PROMPT_LENGTH - criticalRules.length - 10;
    if (mainContentBudget > 500 && criticalRules) {
      truncatedPrompt = truncatedPrompt.slice(0, mainContentBudget) + '\n\n' + criticalRules;
    } else {
      truncatedPrompt = truncatedPrompt.slice(0, KIE_MAX_PROMPT_LENGTH);
    }
  }

  // Build request body for KIE.ai
  const body: Record<string, any> = {
    prompt: truncatedPrompt,
    model: modelName,
    aspectRatio: params.aspectRatio || '1:1',
    outputFormat: params.outputFormat || 'jpeg',
  };

  // Image editing mode (for background editing, etc.)
  if (params.inputImage) {
    body.inputImage = params.inputImage;
  }

  if (params.enableTranslation !== undefined) {
    body.enableTranslation = params.enableTranslation;
  }

  if (params.promptUpsampling !== undefined) {
    body.promptUpsampling = params.promptUpsampling;
  }

  console.log(`[kie-generator] Submitting task: model=${params.model}, endpoint=${generate}`);

  const response = await fetch(`${KIE_BASE_URL}${generate}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[kie-generator] Submit failed: ${response.status}`, errorText);

    if (response.status === 401) {
      throw new Error('KIE_AUTH_ERROR: Invalid or expired API key');
    }
    if (response.status === 402) {
      throw new Error('KIE_CREDITS_EXHAUSTED: Insufficient kie.ai credits');
    }
    if (response.status === 429) {
      throw new Error('KIE_RATE_LIMIT: Too many requests to kie.ai');
    }

    throw new Error(`KIE submit failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // KIE response typically: { code: 200, data: { taskId: '...' } }
  const taskId = data?.data?.taskId || data?.taskId;
  if (!taskId) {
    console.error('[kie-generator] No taskId in response:', JSON.stringify(data).slice(0, 300));
    throw new Error('KIE did not return a taskId');
  }

  console.log(`[kie-generator] Task submitted: taskId=${taskId}`);
  return taskId;
}

/**
 * Step 2: Poll KIE.ai until image is ready
 * Polls every 4 seconds, max 120 seconds (30 attempts)
 */
async function pollKieTask(taskId: string, model: string, apiKey: string): Promise<string> {
  const { poll } = getKieEndpoints(model);
  const maxAttempts = 30; // 30 × 4s = 120s timeout
  const pollInterval = 4000;

  console.log(`[kie-generator] Starting poll: taskId=${taskId}, max=${maxAttempts * pollInterval / 1000}s`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${KIE_BASE_URL}${poll}?taskId=${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn(`[kie-generator] Poll error ${response.status} on attempt ${attempt + 1}`);
        // Continue polling on transient errors
        continue;
      }

      const data = await response.json();
      const item = data?.data;

      if (!item) {
        console.warn(`[kie-generator] Empty data on attempt ${attempt + 1}`);
        continue;
      }

      const successFlag = item.successFlag ?? item.success_flag;
      console.log(`[kie-generator] Attempt ${attempt + 1}/${maxAttempts}: successFlag=${successFlag}`);

      if (successFlag === 1) {
        // Success! Extract image URL
        const imageUrl = extractImageUrl(item.response || item, model);
        if (!imageUrl) {
          console.error('[kie-generator] successFlag=1 but no image URL:', JSON.stringify(item).slice(0, 300));
          throw new Error('KIE generation succeeded but returned no image URL');
        }
        console.log(`[kie-generator] Image ready after ${(attempt + 1) * pollInterval / 1000}s`);
        return imageUrl;
      }

      if (successFlag === 2 || successFlag === 3) {
        // Failed or cancelled
        const errorMsg = item.errorMessage || item.error_message || 'Unknown KIE generation error';
        console.error(`[kie-generator] Generation failed: ${errorMsg}`);
        throw new Error(`KIE generation failed: ${errorMsg}`);
      }

      // successFlag === 0: still processing, continue polling
    } catch (err) {
      // Re-throw non-transient errors
      if (err instanceof Error && (
        err.message.startsWith('KIE generation failed') ||
        err.message.startsWith('KIE generation succeeded')
      )) {
        throw err;
      }
      console.warn(`[kie-generator] Poll attempt ${attempt + 1} error:`, err);
      // Continue on transient errors
    }
  }

  throw new Error(`KIE generation timeout after ${maxAttempts * pollInterval / 1000}s for taskId=${taskId}`);
}

/**
 * Main entry point: Generate image via KIE.ai
 * Handles the full async flow: submit → poll → return URL
 */
export async function generateImageViaKie(
  params: KieGenerateParams,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured. Please add it in project secrets.');
  }

  console.log(`[kie-generator] Starting generation: model=${params.model}, ratio=${params.aspectRatio || '1:1'}`);

  // Step 1: Submit task
  const taskId = await submitKieTask(params, apiKey);

  // Step 2: Poll for result
  const imageUrl = await pollKieTask(taskId, params.model, apiKey);

  return imageUrl;
}

/**
 * Check if a model ID is a KIE.ai model
 */
export function isKieModel(model: string): boolean {
  return (
    model.startsWith('flux-kontext') ||
    model.startsWith('gpt-image') ||
    model.startsWith('grok-imagine')
  );
}

/**
 * Map standard aspect ratio to KIE.ai format
 * KIE uses: '1:1', '16:9', '9:16', '4:3', '3:4', '21:9'
 */
export function mapAspectRatioToKie(aspectRatio?: string): string {
  if (!aspectRatio) return '1:1';

  // Most ratios are already compatible
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '21:9'];
  if (supported.includes(aspectRatio)) return aspectRatio;

  // Fallback mapping
  const fallbackMap: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '4:5': '4:5',
  };

  return fallbackMap[aspectRatio] || '1:1';
}
