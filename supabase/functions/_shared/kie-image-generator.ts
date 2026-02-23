// ============================================
// KIE.AI Image Generation Helper
// Supports TWO API patterns:
// 1. Legacy: Flux Kontext, GPT-Image (dedicated endpoints)
// 2. Unified Jobs API: Flux 2, Nano Banana, Grok Imagine
// ============================================

const KIE_BASE_URL = 'https://api.kie.ai';

export interface KieGenerateParams {
  prompt: string;
  model: string;
  aspectRatio?: string;    // '1:1', '16:9', '9:16', '4:3', '3:4'
  outputFormat?: 'jpeg' | 'png' | 'webp';
  inputImage?: string;     // URL or base64 for image editing mode
  enableTranslation?: boolean;
  promptUpsampling?: boolean;
  resolution?: string;     // '1K', '2K', '4K' for Flux 2 / Nano Banana Pro
}

// ============================================
// API Pattern Detection
// ============================================

/** Models using the new unified /api/v1/jobs API */
const UNIFIED_API_MODELS = [
  'flux-2/',
  'nano-banana',
  'grok-imagine/',
];

function isUnifiedApiModel(model: string): boolean {
  return UNIFIED_API_MODELS.some(prefix => model.startsWith(prefix));
}

// ============================================
// Legacy API (Flux Kontext, GPT-Image)
// ============================================

interface KieEndpoints {
  generate: string;
  poll: string;
}

function getLegacyEndpoints(model: string): KieEndpoints {
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
  console.warn(`[kie-generator] Unknown legacy model "${model}", defaulting to flux-kontext endpoints`);
  return {
    generate: '/api/v1/flux/kontext/generate',
    poll: '/api/v1/flux/kontext/record-info',
  };
}

function getLegacyModelName(model: string): string {
  const modelMap: Record<string, string> = {
    'flux-kontext-pro': 'flux-kontext-pro',
    'flux-kontext-max': 'flux-kontext-max',
    'gpt-image-1': 'gpt-image-1',
    'gpt-image-1.5': 'gpt-image-1.5',
  };
  return modelMap[model] || model;
}

function extractLegacyImageUrl(response: any, model: string): string | null {
  if (!response) return null;

  if (model.startsWith('flux-kontext')) {
    return response.resultImageUrl || response.result_image_url || null;
  }

  if (model.startsWith('gpt-image')) {
    if (Array.isArray(response.result_urls) && response.result_urls.length > 0) {
      return response.result_urls[0];
    }
    return response.resultImageUrl || response.result_image_url || null;
  }

  return (
    response.resultImageUrl ||
    response.result_image_url ||
    (Array.isArray(response.result_urls) ? response.result_urls[0] : null) ||
    null
  );
}

// ============================================
// Unified Jobs API (Flux 2, Nano Banana, Grok Imagine)
// ============================================

const UNIFIED_GENERATE_URL = '/api/v1/jobs/createTask';
const UNIFIED_POLL_URL = '/api/v1/jobs/recordInfo';

function extractUnifiedImageUrl(data: any): string | null {
  if (!data?.resultJson) return null;
  try {
    const result = typeof data.resultJson === 'string'
      ? JSON.parse(data.resultJson)
      : data.resultJson;
    if (Array.isArray(result.resultUrls) && result.resultUrls.length > 0) {
      return result.resultUrls[0];
    }
    return result.resultImageUrl || result.result_image_url || null;
  } catch {
    console.error('[kie-generator] Failed to parse resultJson:', data.resultJson);
    return null;
  }
}

// ============================================
// Common Helpers
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncatePrompt(prompt: string): string {
  const KIE_MAX_PROMPT_LENGTH = 2800;
  if (prompt.length <= KIE_MAX_PROMPT_LENGTH) return prompt;

  console.warn(`[kie-generator] Prompt too long (${prompt.length} chars), truncating to ${KIE_MAX_PROMPT_LENGTH}`);
  const criticalRulesMatch = prompt.match(/## CRITICAL RULES[\s\S]*$/);
  const criticalRules = criticalRulesMatch ? criticalRulesMatch[0] : '';
  const mainContentBudget = KIE_MAX_PROMPT_LENGTH - criticalRules.length - 10;
  if (mainContentBudget > 500 && criticalRules) {
    return prompt.slice(0, mainContentBudget) + '\n\n' + criticalRules;
  }
  return prompt.slice(0, KIE_MAX_PROMPT_LENGTH);
}

function handleHttpError(status: number, errorText: string): never {
  if (status === 401) throw new Error('KIE_AUTH_ERROR: Invalid or expired API key');
  if (status === 402) throw new Error('KIE_CREDITS_EXHAUSTED: Insufficient kie.ai credits');
  if (status === 429) throw new Error('KIE_RATE_LIMIT: Too many requests to kie.ai');
  throw new Error(`KIE submit failed (${status}): ${errorText.slice(0, 200)}`);
}

// ============================================
// Legacy Flow: Submit + Poll
// ============================================

async function submitLegacyTask(params: KieGenerateParams, apiKey: string): Promise<string> {
  const { generate } = getLegacyEndpoints(params.model);
  const modelName = getLegacyModelName(params.model);
  const truncatedPrompt = truncatePrompt(params.prompt);

  const body: Record<string, any> = {
    prompt: truncatedPrompt,
    model: modelName,
    aspectRatio: params.aspectRatio || '1:1',
    outputFormat: params.outputFormat || 'jpeg',
  };

  if (params.inputImage) body.inputImage = params.inputImage;
  if (params.enableTranslation !== undefined) body.enableTranslation = params.enableTranslation;
  if (params.promptUpsampling !== undefined) body.promptUpsampling = params.promptUpsampling;

  console.log(`[kie-generator] Legacy submit: model=${params.model}, endpoint=${generate}`);

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
    console.error(`[kie-generator] Legacy submit failed: ${response.status}`, errorText);
    handleHttpError(response.status, errorText);
  }

  const data = await response.json();
  const taskId = data?.data?.taskId || data?.taskId;
  if (!taskId) {
    console.error('[kie-generator] No taskId in legacy response:', JSON.stringify(data).slice(0, 300));
    throw new Error('KIE did not return a taskId');
  }

  console.log(`[kie-generator] Legacy task submitted: taskId=${taskId}`);
  return taskId;
}

async function pollLegacyTask(taskId: string, model: string, apiKey: string): Promise<string> {
  const { poll } = getLegacyEndpoints(model);
  const maxAttempts = 30;
  const pollInterval = 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${KIE_BASE_URL}${poll}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.warn(`[kie-generator] Legacy poll error ${response.status} on attempt ${attempt + 1}`);
        continue;
      }

      const data = await response.json();
      const item = data?.data;
      if (!item) continue;

      const successFlag = item.successFlag ?? item.success_flag;
      console.log(`[kie-generator] Legacy poll ${attempt + 1}/${maxAttempts}: successFlag=${successFlag}`);

      if (successFlag === 1) {
        const imageUrl = extractLegacyImageUrl(item.response || item, model);
        if (!imageUrl) throw new Error('KIE generation succeeded but returned no image URL');
        console.log(`[kie-generator] Legacy image ready after ${(attempt + 1) * pollInterval / 1000}s`);
        return imageUrl;
      }

      if (successFlag === 2 || successFlag === 3) {
        const errorMsg = item.errorMessage || item.error_message || 'Unknown KIE generation error';
        throw new Error(`KIE generation failed: ${errorMsg}`);
      }
    } catch (err) {
      if (err instanceof Error && (
        err.message.startsWith('KIE generation failed') ||
        err.message.startsWith('KIE generation succeeded')
      )) throw err;
      console.warn(`[kie-generator] Legacy poll attempt ${attempt + 1} error:`, err);
    }
  }

  throw new Error(`KIE generation timeout after ${maxAttempts * pollInterval / 1000}s for taskId=${taskId}`);
}

// ============================================
// Unified Jobs Flow: Submit + Poll
// ============================================

/** Map short model names to KIE API model names */
function getUnifiedModelName(model: string): string {
  const MODEL_MAP: Record<string, string> = {
    'nano-banana': 'nano-banana',
    'nano-banana-edit': 'google/nano-banana-edit',
    'nano-banana-pro': 'nano-banana-pro',
  };
  return MODEL_MAP[model] || model;
}

async function submitUnifiedTask(params: KieGenerateParams, apiKey: string): Promise<string> {
  const truncatedPrompt = truncatePrompt(params.prompt);
  const apiModelName = getUnifiedModelName(params.model);

  const input: Record<string, any> = {
    prompt: truncatedPrompt,
    aspect_ratio: params.aspectRatio || '1:1',
  };

  // Flux 2 & Nano Banana Pro support resolution
  if (params.resolution) {
    input.resolution = params.resolution;
  }

  // Image editing mode
  if (params.inputImage) {
    input.image_urls = [params.inputImage];
  }

  const body: Record<string, any> = {
    model: apiModelName,
    input,
  };

  console.log(`[kie-generator] Unified submit: model=${params.model} → API model=${apiModelName}`);

  const response = await fetch(`${KIE_BASE_URL}${UNIFIED_GENERATE_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[kie-generator] Unified submit failed: ${response.status}`, errorText);
    handleHttpError(response.status, errorText);
  }

  const data = await response.json();
  const taskId = data?.data?.taskId || data?.taskId;
  if (!taskId) {
    console.error('[kie-generator] No taskId in unified response:', JSON.stringify(data).slice(0, 300));
    throw new Error('KIE did not return a taskId');
  }

  console.log(`[kie-generator] Unified task submitted: taskId=${taskId}`);
  return taskId;
}

async function pollUnifiedTask(taskId: string, apiKey: string): Promise<string> {
  const maxAttempts = 30;
  const pollInterval = 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(pollInterval);

    try {
      const response = await fetch(`${KIE_BASE_URL}${UNIFIED_POLL_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.warn(`[kie-generator] Unified poll error ${response.status} on attempt ${attempt + 1}`);
        continue;
      }

      const data = await response.json();
      const item = data?.data;
      if (!item) continue;

      const state = item.state;
      console.log(`[kie-generator] Unified poll ${attempt + 1}/${maxAttempts}: state=${state}`);

      if (state === 'success') {
        const imageUrl = extractUnifiedImageUrl(item);
        if (!imageUrl) throw new Error('KIE generation succeeded but returned no image URL');
        console.log(`[kie-generator] Unified image ready after ${(attempt + 1) * pollInterval / 1000}s`);
        return imageUrl;
      }

      if (state === 'fail') {
        const errorMsg = item.failMsg || item.failCode || 'Unknown KIE generation error';
        throw new Error(`KIE generation failed: ${errorMsg}`);
      }

      // waiting, queuing, generating → continue polling
    } catch (err) {
      if (err instanceof Error && (
        err.message.startsWith('KIE generation failed') ||
        err.message.startsWith('KIE generation succeeded')
      )) throw err;
      console.warn(`[kie-generator] Unified poll attempt ${attempt + 1} error:`, err);
    }
  }

  throw new Error(`KIE generation timeout after ${maxAttempts * pollInterval / 1000}s for taskId=${taskId}`);
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Generate image via KIE.ai
 * Automatically routes to Legacy or Unified API based on model
 */
export async function generateImageViaKie(
  params: KieGenerateParams,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('KIE_API_KEY not configured. Please add it in project secrets.');
  }

  console.log(`[kie-generator] Starting generation: model=${params.model}, ratio=${params.aspectRatio || '1:1'}`);

  if (isUnifiedApiModel(params.model)) {
    // New unified jobs API
    const taskId = await submitUnifiedTask(params, apiKey);
    return await pollUnifiedTask(taskId, apiKey);
  } else {
    // Legacy dedicated endpoints
    const taskId = await submitLegacyTask(params, apiKey);
    return await pollLegacyTask(taskId, params.model, apiKey);
  }
}

/**
 * Check if a model ID is a KIE.ai model
 */
export function isKieModel(model: string): boolean {
  return (
    model.startsWith('flux-kontext') ||
    model.startsWith('gpt-image') ||
    model.startsWith('grok-imagine') ||
    model.startsWith('flux-2/') ||
    model.startsWith('nano-banana')
  );
}

/**
 * Map standard aspect ratio to KIE.ai format
 */
export function mapAspectRatioToKie(aspectRatio?: string): string {
  if (!aspectRatio) return '1:1';
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4', '4:5', '3:2', '2:3', '21:9'];
  if (supported.includes(aspectRatio)) return aspectRatio;
  return '1:1';
}
