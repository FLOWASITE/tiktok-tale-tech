import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import { generateImageViaGeminiGen, isGeminiGenModel, mapAspectRatioToGeminiGen } from "../_shared/geminigen-image-generator.ts";
import { generateImageViaNineRouter, isNineRouterImageModel } from "../_shared/ninerouter-image-generator.ts";
import { isCircuitOpen as cbIsOpen, recordSuccess as cbRecordSuccess, recordFailure as cbRecordFailure } from "../_shared/circuit-breaker.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateImageCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import {
  buildImagePrompt,
  buildSimpleImagePrompt,
  getChannelAspectRatio,
  computeStyleFromBrand,
  type Channel,
  type BrandImageContext,
  type PersonaContext,
  type ImageStylePreset,
  type ContentRole,
  type ContentAngle,
  type ImageContentType,
  type TextPosition,
  type TypographyStyle,
  type FooterInfo,
  type PromptMode,
} from "../_shared/image-prompt-builder.ts";
import { applyTextBudgetsToOverlay, buildAiRenderPlan, formatRenderSpecBrief } from "../image-render-spec.ts";
import { getOutputLanguage } from "../_shared/country-language-map.ts";
import { getGatewayConfig } from "../_shared/lovable-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateImageRequest {
  taskId?: string;
  contentId: string;
  channel: string;
  contentSummary: string;
  brandTemplateId: string;
  aspectRatio?: "16:9" | "1:1" | "9:16" | "4:5" | "2:3";
  journeyStage?: 'awareness' | 'consideration' | 'decision' | 'retention';
  contentType?: 'promotional' | 'educational' | 'entertainment' | 'inspirational';
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  // Content Role and Angle for strategic visuals
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  // Hook integration
  hookMessage?: string;
  hookType?: string;
  // NEW: Text-in-image params for Social Graphics
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
  // Prompt mode: full | brand_only | raw
  promptMode?: PromptMode;
  // AI Render mode: structured elements for AI to render text directly in image
  structuredElements?: {
    banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
    heroText?: { text: string; fontSize: string; effect: string };
    cards?: { items: { icon?: string; label: string }[]; layout: string };
    headline?: string;
    cta?: string;
    footer?: { items: { icon?: string; text: string }[] };
  };
  structuredColors?: { primary: string; secondary: string; text: string };
  // Template ID for layout guidance in AI render mode
  structuredTemplate?: string;
  // Logo safe zone for AI render mode — tells AI to keep area clear
  logoSafeZone?: { position: string; sizePercent: number };
}

interface ProviderDebugPayload {
  provider?: string;
  providerTimeout?: boolean;
  fallbackTried?: boolean;
  fallbackProvider?: string;
  errorCode?: string;
}

interface PersistencePayload {
  taskId?: string;
  contentId: string;
  channel: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  modelUsed: string;
  organizationId?: string | null;
  userId?: string | null;
  existingRowId?: string | null;
}

/**
 * Early-write: persist the prompt to channel_image_history BEFORE the AI provider
 * is called, so the prompt is debuggable even if the function times out or the
 * provider fails. Returns the row id (or null on failure — non-blocking).
 */
async function insertPendingPromptRow(
  supabase: any,
  params: {
    contentId: string;
    channel: string;
    prompt: string;
    aspectRatio: string;
    organizationId?: string | null;
    userId?: string | null;
  },
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('channel_image_history')
      .insert({
        content_id: params.contentId,
        channel: params.channel,
        image_url: 'pending://generation',
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio,
        is_selected: false,
        organization_id: params.organizationId,
        created_by: params.userId,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[generate-brand-image] insertPendingPromptRow failed:', error.message);
      return null;
    }
    return (data as any)?.id ?? null;
  } catch (err) {
    console.warn('[generate-brand-image] insertPendingPromptRow exception:', err);
    return null;
  }
}

const OVERLAY_TEXT_LIMITS = {
  maxChars: 68,
  maxWords: 12,
} as const;

function normalizeOverlayText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOverlayTextAcceptable(input?: string | null): boolean {
  const text = normalizeOverlayText(input);
  if (!text) return false;
  if (text.length > OVERLAY_TEXT_LIMITS.maxChars) return false;
  if (text.split(/\s+/).filter(Boolean).length > OVERLAY_TEXT_LIMITS.maxWords) return false;
  return true;
}

function detectOverlayTextLanguage(input?: string | null): 'vi' | 'th' | 'en' | 'unknown' {
  const text = normalizeOverlayText(input);
  if (!text) return 'unknown';
  if (/[\u0E00-\u0E7F]/u.test(text)) return 'th';
  if (/[ăâđêôơưĂÂĐÊÔƠƯàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/u.test(text)) return 'vi';
  if (/[A-Za-z]/.test(text)) return 'en';
  return 'unknown';
}

function doesOverlayTextMatchBrandLanguage(input: string | null | undefined, brandLanguage?: string | null): boolean {
  if (!brandLanguage) return true;
  const detectedLanguage = detectOverlayTextLanguage(input);
  if (detectedLanguage === 'unknown') return false;
  return detectedLanguage === brandLanguage;
}

async function updateImageTaskStatus(
  supabase: any,
  taskId: string | undefined,
  patch: Record<string, unknown>,
) {
  if (!taskId) return;

  try {
    await supabase
      .from('generation_tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch (error) {
    console.warn('[generate-brand-image] Failed to update generation task:', error);
  }
}


async function persistGeneratedImage(
  supabase: any,
  payload: PersistencePayload,
) {
  const {
    taskId,
    contentId,
    channel,
    imageUrl,
    prompt,
    aspectRatio,
    modelUsed,
    organizationId,
    userId,
    existingRowId,
  } = payload;

  // Unselect previous rows for this content+channel
  await supabase
    .from('channel_image_history')
    .update({ is_selected: false })
    .eq('content_id', contentId)
    .eq('channel', channel);

  if (existingRowId) {
    // Update the pending row created at prompt-build time
    await supabase
      .from('channel_image_history')
      .update({
        image_url: imageUrl,
        is_selected: true,
      })
      .eq('id', existingRowId);
  } else {
    // Fallback: no early row was created — insert fresh
    await supabase
      .from('channel_image_history')
      .insert({
        content_id: contentId,
        channel,
        image_url: imageUrl,
        prompt,
        aspect_ratio: aspectRatio,
        is_selected: true,
        organization_id: organizationId,
        created_by: userId,
      });
  }

  const { data: currentContent } = await supabase
    .from('multi_channel_contents')
    .select('channel_images')
    .eq('id', contentId)
    .single();

  const currentImages = (currentContent?.channel_images as Record<string, any>) || {};
  const existing = currentImages[channel];

  // ⚠️ Chỉ ghi khi channel chưa có ảnh, để KHÔNG đè URL final (sau STEP 2-4 logo/text/footer)
  // mà client-side pipeline đã lưu vào trước đó. STEP 1 raw URL chỉ làm fallback ban đầu.
  if (!existing?.url) {
    currentImages[channel] = {
      url: imageUrl,
      provider: modelUsed,
      aspectRatio,
    };

    await supabase
      .from('multi_channel_contents')
      .update({ channel_images: JSON.parse(JSON.stringify(currentImages)) })
      .eq('id', contentId);
  } else {
    console.log(`[generate-brand-image] Skipping channel_images update for ${channel} — existing URL preserved (likely overlay-final from client pipeline)`);
  }


  await updateImageTaskStatus(supabase, taskId, {
    status: 'completed',
    progress: 100,
    progress_message: 'Image generated and persisted',
    completed_at: new Date().toISOString(),
    result_type: 'channel_image_history',
    result_metadata: {
      imageUrl,
      aspectRatio,
      channel,
      contentId,
      prompt,
      modelUsed,
    },
  });
}

// Default model fallback (used when config not available)
const DEFAULT_IMAGE_MODELS = {
  primary: "google/gemini-3-pro-image-preview",
  fallback: "google/gemini-2.5-flash-image",
} as const;

// Lovable Cloud returns 504 IDLE_TIMEOUT if a function does not respond within
// 150s. Keep provider polling well below that and use fast fallback paths.
const EXTERNAL_PROVIDER_POLL_BUDGET = {
  // Keep primary provider polling well under 150s idle limit so PoYo fallback
  // still has budget to run. 25 × 3s = 75s primary, ~70s left for fallback.
  geminigenAttempts: 25,
} as const;

function isProviderCreditOrAuthError(message: string): boolean {
  return /AUTH_ERROR|CREDITS_EXHAUSTED|RATE_LIMIT|insufficient_credits|402|429/i.test(message);
}

function buildProviderFailureResponse(params: {
  error: string;
  errorCode?: string;
  provider?: string;
  providerTimeout?: boolean;
  fallbackTried?: boolean;
  fallbackProvider?: string | null;
}) {
  return new Response(
    JSON.stringify({
      success: false,
      error: params.error,
      errorCode: params.errorCode || 'PROVIDER_ERROR',
      provider: params.provider,
      providerTimeout: params.providerTimeout ?? false,
      fallbackTried: params.fallbackTried ?? false,
      fallbackProvider: params.fallbackProvider ?? null,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// Image quality validation thresholds
const QUALITY_THRESHOLDS = {
  minFileSizeBytes: 10000,    // 10KB minimum
  minDimensionPixels: 256,    // Minimum dimension
  maxRetries: 1, // Reduced from 2: combined with client retry = fewer wasted attempts
} as const;

// Map content_goal to journey stage
function mapContentGoalToJourneyStage(
  contentGoal?: string
): 'awareness' | 'consideration' | 'decision' | 'retention' | undefined {
  const mapping: Record<string, 'awareness' | 'consideration' | 'decision' | 'retention'> = {
    'brand_awareness': 'awareness',
    'engagement': 'awareness',
    'lead_generation': 'consideration',
    'traffic': 'consideration',
    'conversion': 'decision',
    'sales': 'decision',
    'retention': 'retention',
    'loyalty': 'retention',
  };
  return contentGoal ? mapping[contentGoal] : undefined;
}

// Validate image quality after generation
function validateImageQuality(base64Data: string): { valid: boolean; reason?: string; fileSize: number } {
  try {
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileSize = imageBytes.length;
    
    if (fileSize < QUALITY_THRESHOLDS.minFileSizeBytes) {
      return { 
        valid: false, 
        reason: `Image too small (${fileSize} bytes, min ${QUALITY_THRESHOLDS.minFileSizeBytes})`,
        fileSize 
      };
    }
    
    // Basic check for blank/white images (high entropy = good, low = potentially blank)
    // Simple variance check on a sample of bytes
    const sampleSize = Math.min(1000, imageBytes.length);
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(i * imageBytes.length / sampleSize);
      sum += imageBytes[idx];
      sumSq += imageBytes[idx] * imageBytes[idx];
    }
    const mean = sum / sampleSize;
    const variance = (sumSq / sampleSize) - (mean * mean);
    
    // Very low variance might indicate blank/uniform image
    if (variance < 100) {
      return { 
        valid: false, 
        reason: `Image appears blank or uniform (variance: ${variance.toFixed(2)})`,
        fileSize 
      };
    }
    
    return { valid: true, fileSize };
  } catch (err) {
    return { valid: false, reason: `Validation error: ${err}`, fileSize: 0 };
  }
}

// Generate image with smart retry and model fallback
async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  models: { primary: string; fallback: string } = DEFAULT_IMAGE_MODELS,
  maxRetries: number = QUALITY_THRESHOLDS.maxRetries
): Promise<{ imageData: string; model: string; attempts: number }> {
  let lastError: Error | null = null;
  let attempts = 0;
  
  // Try with primary model first, then fallback
  const modelsToTry = [models.primary, models.fallback];
  
  for (const model of modelsToTry) {
    for (let retry = 0; retry <= maxRetries; retry++) {
      attempts++;
      
      try {
        console.log(`[generate-brand-image] Attempt ${attempts} with model: ${model}`);
        
        const response = await fetch(getGatewayConfig().url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[generate-brand-image] Model ${model} error:`, response.status, errorText);
          
          // Rate limit or payment errors - throw immediately, no retry
          if (response.status === 429 || response.status === 402) {
            const err = new Error(`API_ERROR:${response.status}`);
            (err as any).statusCode = response.status;
            throw err;
          }
          
          lastError = new Error(`Model ${model} failed: ${response.status}`);
          continue;
        }

        const aiData = await response.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (!imageData) {
          lastError = new Error(`No image in response from ${model}`);
          continue;
        }

        // Extract base64 and validate quality
        const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
        const validation = validateImageQuality(base64Data);
        
        if (!validation.valid) {
          console.warn(`[generate-brand-image] Quality check failed: ${validation.reason}`);
          lastError = new Error(validation.reason || "Quality check failed");
          
          // If failed on primary, try fallback with simplified prompt
          if (model === models.primary && retry === maxRetries) {
            console.log("[generate-brand-image] Primary model exhausted, trying fallback...");
            break; // Move to fallback model
          }
          continue;
        }

        console.log(`[generate-brand-image] Success with ${model}, file size: ${validation.fileSize} bytes`);
        return { imageData, model, attempts };
        
      } catch (err) {
        // Check for API errors that should not be retried
        if (err instanceof Error && err.message.startsWith('API_ERROR:')) {
          throw err;
        }
        
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[generate-brand-image] Attempt ${attempts} failed:`, lastError.message);
        
        // Exponential backoff before retry
        if (retry < maxRetries) {
          const delay = 1000 * Math.pow(2, retry);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
  }
  
  throw lastError || new Error("All generation attempts failed");
}
/**
 * Convert structured overlay elements into natural language prompt text
 * for AI to render text directly in the generated image.
 */
function structuredElementsToPromptText(
  elements: GenerateImageRequest['structuredElements'],
  colors?: GenerateImageRequest['structuredColors'],
  templateId?: string,
  logoSafeZone?: GenerateImageRequest['logoSafeZone']
): string {
  if (!elements) return '';

  const parts: string[] = [];

  // Template-based layout instruction
  const layoutInstructions: Record<string, string> = {
    poster: 'LAYOUT: Stack layout — bold banner bar at the top edge, large centered headline in the middle, CTA button/text at the bottom. Clean vertical hierarchy.',
    infographic: 'LAYOUT: Split layout — left side (55%) features large hero text/number, right side (45%) contains a 2×2 grid of info cards. Banner bar spans full width at the top.',
    quote_card: 'LAYOUT: Centered large quote text with gradient/glow effect filling the middle of the image. Banner bar at the bottom edge.',
    feature_list: 'LAYOUT: Banner bar at the top edge, followed by a vertical list of feature cards stacked below with even spacing.',
    contact_card: 'LAYOUT: Headline text at the top, contact information (phone, website, address) displayed as a footer section at the bottom.',
  };

  if (templateId && templateId !== 'auto' && layoutInstructions[templateId]) {
    parts.push(`\n\n${layoutInstructions[templateId]}`);
  }

  parts.push('\nIMPORTANT — Render the following text elements DIRECTLY in the image with professional typography:');

  if (elements.banner) {
    const pos = elements.banner.position === 'top' ? 'top of the image' : 'bottom of the image';
    parts.push(`- A bold banner bar at the ${pos} with background color ${elements.banner.bgColor || colors?.primary || '#DC2626'}: "${elements.banner.text}"`);
  }

  if (elements.heroText) {
    const size = elements.heroText.fontSize === '3xl' ? 'very large' : elements.heroText.fontSize === '2xl' ? 'large' : 'medium-large';
    parts.push(`- A ${size} hero number/text displayed prominently: "${elements.heroText.text}"`);
  }

  if (elements.headline) {
    parts.push(`- A clear headline: "${elements.headline}"`);
  }

  if (elements.cards && elements.cards.items.length > 0) {
    const layout = elements.cards.layout === 'grid-2x2' ? 'arranged in a 2×2 grid' : elements.cards.layout === 'horizontal' ? 'arranged horizontally' : 'arranged vertically';
    const cardDescs = elements.cards.items.map(c => `${c.icon ? c.icon + ' ' : ''}${c.label}`).join('; ');
    parts.push(`- ${elements.cards.items.length} info cards ${layout}: ${cardDescs}`);
  }

  if (elements.cta) {
    parts.push(`- A call-to-action button or text: "${elements.cta}"`);
  }

  if (elements.footer && elements.footer.items.length > 0) {
    const footerItems = elements.footer.items
      .map((item) => `${item.icon ? item.icon + ' ' : ''}${item.text}`)
      .join('; ');
    parts.push(`- A bottom footer contact bar with concise contact details: ${footerItems}`);
  }

  if (colors) {
    parts.push(`\nColor scheme: primary ${colors.primary}, secondary ${colors.secondary}, text color ${colors.text}.`);
  }

  parts.push('\nCRITICAL TEXT RENDERING RULES:');
  parts.push('- Vietnamese diacritics (sắc, huyền, hỏi, ngã, nặng) MUST be rendered PERFECTLY — every accent mark matters');
  parts.push('- NEVER substitute similar-looking characters: ă≠a, â≠a, ơ≠o, ô≠o, ư≠u, ê≠e, đ≠d');
  parts.push('- Text must be crisp, high-contrast, and fully readable at social media viewing sizes');
  parts.push('- Use clean sans-serif typography with proper spacing (Noto Sans, Roboto, Be Vietnam Pro)');
  parts.push('- Cards should have subtle background (semi-transparent or frosted glass effect)');
  parts.push('- MINIMUM font size: headlines 48px+, body text 24px+, contact info 18px+');
  parts.push('- Add text shadow or semi-transparent backdrop behind ALL text for guaranteed readability');

  // Text Verification Checklist
  const allTexts: { label: string; text: string; charCount: number }[] = [];
  if (elements.banner?.text) allTexts.push({ label: 'Banner', text: elements.banner.text, charCount: elements.banner.text.length });
  if (elements.heroText?.text) allTexts.push({ label: 'Hero Text', text: elements.heroText.text, charCount: elements.heroText.text.length });
  if (elements.headline) allTexts.push({ label: 'Headline', text: elements.headline, charCount: elements.headline.length });
  if (elements.cta) allTexts.push({ label: 'CTA', text: elements.cta, charCount: elements.cta.length });
  if (elements.cards?.items) {
    elements.cards.items.forEach((c, i) => allTexts.push({ label: `Card ${i + 1}`, text: c.label, charCount: c.label.length }));
  }
  if (elements.footer?.items) {
    elements.footer.items.forEach((f, i) => allTexts.push({ label: `Footer ${i + 1}`, text: f.text, charCount: f.text.length }));
  }

  if (allTexts.length > 0) {
    parts.push('\n## TEXT VERIFICATION CHECKLIST (render each EXACTLY):');
    allTexts.forEach(t => {
      parts.push(`- ${t.label} (${t.charCount} chars): "${t.text}"`);
    });
    parts.push('- If you CANNOT render any text accurately (especially Vietnamese diacritics), LEAVE IT BLANK rather than rendering incorrectly');
    parts.push('- NEVER rephrase, abbreviate, or modify any text above');
  }

  // Logo safe zone instruction
  if (logoSafeZone) {
    const posLabels: Record<string, string> = {
      'top-left': 'top-left corner',
      'top-right': 'top-right corner',
      'bottom-left': 'bottom-left corner',
      'bottom-right': 'bottom-right corner',
      'top-center': 'top-center edge',
      'bottom-center': 'bottom-center edge',
      'center-left': 'center-left edge',
      'center-right': 'center-right edge',
      'center': 'center of the image',
    };
    const posLabel = posLabels[logoSafeZone.position] || logoSafeZone.position;
    const pct = logoSafeZone.sizePercent || 15;
    parts.push(`\n## LOGO SAFE ZONE (CRITICAL — DO NOT place any text, cards, banners, or elements here):`);
    parts.push(`- A brand logo will be overlaid at the ${posLabel} after generation`);
    parts.push(`- Keep that area (~${pct}% of image width/height) COMPLETELY CLEAR`);
    parts.push(`- Shift any overlapping text/cards/CTA AWAY from the logo zone`);
  }

  return parts.join('\n');
}

// Build marker — bump this string to force a clean redeploy and prove runtime is on the latest bundle.
const BUILD_MARKER = '2026-05-16-fix-image-idle-timeout-v1';

Deno.serve(withPerf({ functionName: 'generate-brand-image', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[generate-brand-image] build marker: ${BUILD_MARKER}`);

  const traceId = generateTraceId();
  const startTime = performance.now();
  let requestBody: GenerateImageRequest | null = null;

  try {
    const LOVABLE_API_KEY = getGatewayConfig().apiKey;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Resolve userId for cost tracking
    const userId = await resolveUserId(req, supabase);
    if (!userId) {
      console.warn("[generate-brand-image] WARNING: userId is undefined — image will have NULL created_by!");
    }

    requestBody = await req.json() as GenerateImageRequest;

    const {
      taskId,
      contentId,
      channel,
      contentSummary,
      brandTemplateId,
      aspectRatio,
      journeyStage,
      contentType,
      imageStylePreset,
      negativePrompt,
      // Params from request
      contentRole: requestedContentRole,
      contentAngle: requestedContentAngle,
      hookMessage: requestedHookMessage,
      hookType: requestedHookType,
      // NEW: Text-in-image params for Social Graphics
      imageContentType,
      textToInclude,
      textPosition,
      typographyStyle,
      // Prompt mode
      promptMode,
      // AI Render mode: structured elements
      structuredElements,
      structuredColors,
      // Template ID for layout guidance
      structuredTemplate,
      // Logo safe zone for AI render mode
      logoSafeZone,
    }: GenerateImageRequest = requestBody as GenerateImageRequest;

    // === Layer A: Cached return ===
    // Nếu multi_channel_contents.channel_images[channel].url đã tồn tại VÀ task hiện tại
    // không phải manual regenerate (force=false), trả về URL có sẵn — không tạo mới.
    // Điều này chặn case: user reload trang sau khi pipeline đã chạy xong → wizard
    // re-trigger pipeline → request đến đây → ta phát hiện ảnh đã có và return luôn.
    const isForceRegenerate = (requestBody as any)?.force === true;
    if (contentId && channel && !isForceRegenerate) {
      try {
        const { data: existingContent } = await supabase
          .from('multi_channel_contents')
          .select('channel_images')
          .eq('id', contentId)
          .maybeSingle();
        const cachedUrl = (existingContent?.channel_images as Record<string, { url?: string; aspectRatio?: string }> | null)?.[channel]?.url;
        if (cachedUrl) {
          console.log(`[generate-brand-image] ✅ CACHED: returning existing image for content=${contentId} channel=${channel}`);
          if (taskId) {
            await supabase
              .from('generation_tasks')
              .update({
                status: 'completed',
                progress: 100,
                error_message: 'Cached — image already exists',
                completed_at: new Date().toISOString(),
                result_metadata: { imageUrl: cachedUrl, cached: true },
              })
              .eq('id', taskId);
          }
          return new Response(
            JSON.stringify({ success: true, imageUrl: cachedUrl, cached: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (cacheErr) {
        console.warn('[generate-brand-image] Cached-return check failed (non-fatal):', cacheErr);
      }
    }

    // === Layer B: In-flight dedupe ===
    // Window 3 phút — đủ cho 1 image gen (~60s) + buffer; tránh stale lock khi edge timeout 504.
    // Auto-cleanup task cũ hơn window (edge function 504 không kịp update status).
    if (contentId && channel && !isForceRegenerate) {
      try {
        const STALE_MS = 3 * 60_000;
        const dedupeWindowStart = new Date(Date.now() - STALE_MS).toISOString();

        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            error_message: 'Stale task — auto-cleaned (edge timeout)',
            completed_at: new Date().toISOString(),
          })
          .eq('task_type', 'image_generation')
          .contains('input_params', { contentId, channel })
          .in('status', ['pending', 'generating'])
          .lt('created_at', dedupeWindowStart);

        const { data: recentTasks } = await supabase
          .from('generation_tasks')
          .select('id, status, created_at')
          .eq('task_type', 'image_generation')
          .contains('input_params', { contentId, channel })
          .in('status', ['pending', 'generating'])
          .gte('created_at', dedupeWindowStart)
          .order('created_at', { ascending: true })
          .limit(2);

        const otherActive = (recentTasks || []).filter((t: any) => t.id !== taskId);
        if (otherActive.length > 0) {
          console.warn(`[generate-brand-image] ⛔ DEDUPE: existing in-flight task ${otherActive[0].id} for content=${contentId} channel=${channel} — rejecting duplicate`);
          if (taskId) {
            await supabase
              .from('generation_tasks')
              .update({
                status: 'failed',
                error_message: `Duplicate request — task ${otherActive[0].id} đã chạy trước đó`,
                completed_at: new Date().toISOString(),
              })
              .eq('id', taskId);
          }
          return new Response(
            JSON.stringify({
              success: false,
              error: 'duplicate_request',
              message: `Đã có request đang xử lý cho ${channel} (task ${otherActive[0].id}). Vui lòng đợi ~2 phút.`,
              activeTaskId: otherActive[0].id,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (dedupeErr) {
        console.warn('[generate-brand-image] Dedupe check failed (non-fatal):', dedupeErr);
      }
    }


    await updateImageTaskStatus(supabase, taskId, {
      status: 'generating',
      progress: 10,
      progress_message: 'Image request accepted',
      started_at: new Date().toISOString(),
    });

    const normalizedTextToInclude = normalizeOverlayText(textToInclude);
    const textSuppressedBecauseTooLong = !!normalizedTextToInclude && !isOverlayTextAcceptable(normalizedTextToInclude);

    // === OPTIMIZATION: Parallel DB queries (saves ~1s per channel) ===
    const brandQueryPromise = supabase
      .from("brand_templates")
      .select("primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id, tone_of_voice, formality_level, country_code, footer_info")
      .eq("id", brandTemplateId)
      .single();

    const contentQueryPromise = contentId
      ? supabase
          .from("multi_channel_contents")
          .select("content_goal, content_role, content_angle, selected_hooks, global_hook")
          .eq("id", contentId)
          .single()
      : Promise.resolve({ data: null, error: null });

    const personaQueryPromise = (async () => {
      try {
        const result = await supabase
          .from("product_persona_mappings")
          .select(`
            customer_personas (
              name, age_range, gender, occupation, interests, communication_style
            )
          `)
          .eq("brand_template_id", brandTemplateId)
          .limit(1)
          .maybeSingle();
        return result;
      } catch (err) {
        console.warn("[generate-brand-image] Persona query failed, continuing without:", err);
        return { data: null, error: null };
      }
    })();

    const [brandResult, contentResult, personaResult] = await Promise.all([
      brandQueryPromise,
      contentQueryPromise,
      personaQueryPromise,
    ]);

    const { data: brandTemplate, error: brandError } = brandResult;
    if (brandError || !brandTemplate) {
      console.error("[generate-brand-image] Brand template not found:", brandError);
      throw new Error("Brand template not found");
    }
    console.log(`[generate-brand-image] step=brand_loaded brand=${brandTemplateId}`);

    // === OVERLAY RUNTIME RESOLUTION (single block — avoid TDZ) ===
    // All overlay-related variables MUST be resolved here before any prompt builder runs.
    const brandLanguage = getOutputLanguage(brandTemplate.country_code as string | undefined);
    const detectedOverlayLanguage = detectOverlayTextLanguage(normalizedTextToInclude);
    const textSuppressedBecauseLanguageMismatch =
      !!normalizedTextToInclude && !doesOverlayTextMatchBrandLanguage(normalizedTextToInclude, brandLanguage);
    const overlayHasUsableText =
      imageContentType === 'with_text' &&
      !textSuppressedBecauseTooLong &&
      !textSuppressedBecauseLanguageMismatch &&
      !!normalizedTextToInclude;
    const effectiveImageContentType: ImageContentType = overlayHasUsableText ? 'with_text' : 'background_only';
    const effectiveTextToInclude: string | undefined = overlayHasUsableText ? normalizedTextToInclude : undefined;

    console.log(`[generate-brand-image] step=overlay_resolved channel=${channel} contentId=${contentId} promptMode=${promptMode || 'full'} type=${effectiveImageContentType} brandLang=${brandLanguage} detectedLang=${detectedOverlayLanguage || 'n/a'} suppressed_long=${textSuppressedBecauseTooLong} suppressed_lang=${textSuppressedBecauseLanguageMismatch}`);
    if (effectiveImageContentType === 'with_text' && effectiveTextToInclude) {
      console.log(`[generate-brand-image] Text to include: "${effectiveTextToInclude.slice(0, 50)}..."`);
    }

    // Auto-select style if not provided
    let finalImageStylePreset = imageStylePreset;
    if (!finalImageStylePreset && brandTemplate) {
      finalImageStylePreset = computeStyleFromBrand(
        brandTemplate.industry as string[] | undefined,
        brandTemplate.tone_of_voice as string[] | undefined,
        brandTemplate.image_style as string | undefined,
        brandTemplate.formality_level as string | undefined
      );
      console.log(`[generate-brand-image] Auto-selected style: ${finalImageStylePreset}`);
    }

    // Process content data
    let finalJourneyStage = journeyStage;
    let finalContentRole: ContentRole | undefined = requestedContentRole;
    let finalContentAngle: ContentAngle | undefined = requestedContentAngle;
    let finalHookMessage: string | undefined = requestedHookMessage;
    let finalHookType: string | undefined = requestedHookType;

    const contentData = contentResult.data;
    if (contentData) {
      if (!finalJourneyStage && contentData.content_goal) {
        finalJourneyStage = mapContentGoalToJourneyStage(contentData.content_goal);
        console.log(`[generate-brand-image] Mapped content_goal "${contentData.content_goal}" to journeyStage "${finalJourneyStage}"`);
      }
      if (!finalContentRole && contentData.content_role) {
        finalContentRole = contentData.content_role as ContentRole;
      }
      if (!finalContentAngle && contentData.content_angle) {
        finalContentAngle = contentData.content_angle as ContentAngle;
      }
      if (!finalHookMessage) {
        const selectedHooks = contentData.selected_hooks as any[] | null;
        const channelHook = selectedHooks?.find((h: any) => h.channel === channel);
        if (channelHook?.opening_line) {
          finalHookMessage = channelHook.opening_line;
          finalHookType = channelHook.hook_type || channelHook.framework;
        } else if (contentData.global_hook) {
          const globalHook = contentData.global_hook as any;
          finalHookMessage = globalHook.opening_line;
          finalHookType = globalHook.hook_type || globalHook.framework;
        }
      }
    }

    // Process persona data
    let personaContext: PersonaContext | undefined;
    if (personaResult.data?.customer_personas) {
      const p = personaResult.data.customer_personas as any;
      personaContext = {
        name: p.name,
        ageRange: p.age_range,
        gender: p.gender,
        occupation: p.occupation,
        interests: p.interests,
        communicationStyle: p.communication_style,
      };
      console.log(`[generate-brand-image] Using persona context: ${personaContext.name}`);
    }

    // Determine aspect ratio - use provided or get optimal for channel
    const finalAspectRatio = aspectRatio || getChannelAspectRatio(channel as Channel);

    // Build brand context for enhanced prompt
    const brandContext: BrandImageContext = {
      brandName: brandTemplate.brand_name,
      brandColors: {
        primary: brandTemplate.primary_color || "#6366f1",
        secondary: brandTemplate.secondary_colors || [],
      },
      imageStyle: brandTemplate.image_style || "professional, modern, clean",
      logoUrl: brandTemplate.logo_url,
      industry: brandTemplate.industry || [],
    };

    // Parse footer_info from brand template
    const footerInfo: FooterInfo | undefined = brandTemplate.footer_info 
      ? (typeof brandTemplate.footer_info === 'string' 
          ? JSON.parse(brandTemplate.footer_info) 
          : brandTemplate.footer_info) as FooterInfo
      : undefined;

    // Build enhanced prompt using the shared utility
    let enhancedPrompt = buildImagePrompt({
      channel: channel as Channel,
      contentSummary,
      brand: brandContext,
      aspectRatio: finalAspectRatio,
      journeyStage: finalJourneyStage,
      contentType,
      persona: personaContext,
      imageStylePreset: finalImageStylePreset,  // Use computed style
      negativePrompt,
      // Pass content role, angle, and hook for strategic visuals
      contentRole: finalContentRole,
      contentAngle: finalContentAngle,
      hookMessage: finalHookMessage,
      hookType: finalHookType,
      // NEW: Pass text-in-image params for Social Graphics
      imageContentType: effectiveImageContentType,
      textToInclude: effectiveTextToInclude,
      // Rotate text position when caller didn't pin one — adds layout diversity
      textPosition: textPosition || (effectiveImageContentType === 'with_text' && effectiveTextToInclude
        ? (['center', 'top', 'bottom', 'top-left', 'bottom-right'] as const)[
            Math.floor(Math.random() * 5)
          ]
        : undefined),
      typographyStyle,
      // Country-specific character appearance
      countryCode: brandTemplate.country_code as string | undefined,
      // Footer/contact info for structured layout
      footerInfo,
      // Prompt mode (3-layer architecture)
      promptMode,
    });

    // AI Render mode: append structured text instructions to prompt
    let aiRenderPlan = undefined;
    if (structuredElements) {
      aiRenderPlan = buildAiRenderPlan({
        channel,
        aspectRatio: finalAspectRatio,
        suggestedLayout: structuredTemplate,
        overlay: structuredElements,
        logoSafeZone,
      });
      const budgetedElements = applyTextBudgetsToOverlay(structuredElements, aiRenderPlan.renderSpec);
      const structuredText = [
        `\n\n## CHANNEL-AWARE AI RENDER BRIEF:\n${formatRenderSpecBrief(aiRenderPlan.renderSpec)}`,
        `\n## LAYOUT BEHAVIOR:\n- Mode: ${aiRenderPlan.layoutBehavior.aiLayoutMode}\n- Density: ${aiRenderPlan.layoutBehavior.densityMode}\n- Text priority: ${aiRenderPlan.layoutBehavior.textStrategy}\n- CTA strategy: ${aiRenderPlan.layoutBehavior.ctaStrategy}\n- Footer strategy: ${aiRenderPlan.layoutBehavior.footerStrategy}\n- Logo protection: ${aiRenderPlan.layoutBehavior.logoProtection}\n- If layout becomes crowded, remove card descriptions first, then shorten footer, and preserve hero/headline/CTA accuracy.`,
        structuredElementsToPromptText(budgetedElements, structuredColors, structuredTemplate, logoSafeZone),
      ].join('\n');
      enhancedPrompt += structuredText;
      console.log(`[generate-brand-image] AI Render mode: appended structured text instructions (${structuredText.length} chars)`);
    }

    // AI Render mode enhancement: when text is included but no structured elements,
    // add Vietnamese text accuracy instructions to ensure correct diacritics
    if (effectiveImageContentType === 'with_text' && effectiveTextToInclude && !structuredElements) {
      enhancedPrompt += `\n\n## CRITICAL TEXT RENDERING RULES:
- Render the following text EXACTLY as provided — DO NOT modify, rephrase, or omit any word
- Vietnamese diacritics (sắc, huyền, hỏi, ngã, nặng) MUST be rendered PERFECTLY — every accent mark matters
- Text to render: "${effectiveTextToInclude}"
- Use clean sans-serif typography with proper spacing and high contrast
- Text must be crisp, fully readable, and well-positioned within the composition`;
      console.log(`[generate-brand-image] AI Render: added Vietnamese text accuracy rules for "${effectiveTextToInclude.slice(0, 40)}..."`);
    }

    // EARLY-WRITE: persist prompt before AI call so it survives timeouts/failures.
    // Admin-only viewable (column SELECT revoked from authenticated).
    const pendingHistoryId = await insertPendingPromptRow(supabase, {
      contentId,
      channel,
      prompt: enhancedPrompt,
      aspectRatio: finalAspectRatio,
      organizationId: brandTemplate.organization_id,
      userId,
    });
    console.log(`[generate-brand-image] Pending prompt row id: ${pendingHistoryId}`);

    console.log("[generate-brand-image] Starting image generation...");

    // Read model config from Admin Panel (DB) — falls back to default if not configured
    const aiConfig = await getAIConfig('generate-brand-image', brandTemplate.organization_id);
    const primaryModel = aiConfig.model;
    console.log(`[generate-brand-image] Using model from config: ${primaryModel}`);

    // Variables for result
    let imageData: string = '';
    let imageUrlFromKie: string | null = null;
    let imageUrlFromPoyo: string | null = null;
    let modelUsed: string = primaryModel;
    let totalAttempts: number = 1;
    const providerDebug: ProviderDebugPayload = {};
    const recommendedOverlayMode = structuredElements?.footer && !structuredElements?.headline && !structuredElements?.heroText && !structuredElements?.cards
      ? 'hybrid_footer'
      : structuredElements
        ? 'ai_render'
        : 'satori';
    const hasTextInstruction = Boolean(effectiveTextToInclude || structuredElements?.headline || structuredElements?.heroText?.text || structuredElements?.banner?.text || structuredElements?.cta || structuredElements?.cards?.items?.length);
    const hasFooterInstruction = Boolean(structuredElements?.footer?.items?.length || footerInfo?.phone || footerInfo?.website || footerInfo?.address || footerInfo?.email);
    const geminiGenMaxAttempts = EXTERNAL_PROVIDER_POLL_BUDGET.geminigenAttempts;

    // F1: Circuit breaker — skip external providers if circuit is OPEN, jump straight to Lovable AI
    const cbOpenForPrimary = await cbIsOpen(primaryModel).catch(() => false);
    if (cbOpenForPrimary) {
      console.warn(`[generate-brand-image] Circuit OPEN for ${primaryModel} — bypassing external provider, using Lovable AI fallback`);
      providerDebug.fallbackTried = true;
      providerDebug.fallbackProvider = 'lovable-ai (circuit-breaker)';
    }

    // Route to PoYo.ai, KIE.ai, or Lovable AI based on model prefix
    if (!cbOpenForPrimary && isPoyoModel(primaryModel)) {
      providerDebug.provider = 'poyo';
      const POYO_API_KEY = Deno.env.get('POYO_API_KEY');
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'POYO_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to PoYo.ai: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaPoyo({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToPoyo(finalAspectRatio),
        }, POYO_API_KEY);
        modelUsed = primaryModel;
        cbRecordSuccess(primaryModel).catch(() => {});
      } catch (poyoErr) {
        const poyoErrMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[generate-brand-image] PoYo.ai failed: ${poyoErrMsg}`);
        if (!isProviderCreditOrAuthError(poyoErrMsg)) cbRecordFailure(primaryModel, undefined, supabase).catch(() => {});

        if (poyoErrMsg.includes('POYO_AUTH_ERROR') || poyoErrMsg.includes('POYO_CREDITS_EXHAUSTED') || poyoErrMsg.includes('POYO_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: poyoErrMsg, errorCode: 'CREDITS_EXHAUSTED' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // PoYo failed — try alternate PoYo model
        const altModel = primaryModel.includes('nano-banana-2') ? 'poyo/nano-banana-pro' : 'poyo/nano-banana-2-new';
        if (altModel !== primaryModel && POYO_API_KEY) {
          console.log(`[generate-brand-image] PoYo failed, trying alternate PoYo model: ${altModel}...`);
          try {
            imageUrlFromPoyo = await generateImageViaPoyo({
              prompt: enhancedPrompt,
              model: altModel,
              aspectRatio: mapAspectRatioToPoyo(finalAspectRatio),
            }, POYO_API_KEY);
            modelUsed = `${altModel} (fallback from ${primaryModel})`;
          } catch (altErr) {
            console.error(`[generate-brand-image] Alternate PoYo also failed:`, altErr instanceof Error ? altErr.message : altErr);
            return new Response(
              JSON.stringify({ success: false, error: `PoYo generation failed: ${poyoErrMsg}`, errorCode: 'PROVIDER_ERROR' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ success: false, error: `PoYo generation failed: ${poyoErrMsg}`, errorCode: 'PROVIDER_ERROR' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (!cbOpenForPrimary && isGeminiGenModel(primaryModel)) {
      providerDebug.provider = 'geminigen';
      const GEMINIGEN_API_KEY = Deno.env.get('GEMINIGEN_API_KEY');
      if (!GEMINIGEN_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'GEMINIGEN_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to GeminiGen.ai: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaGeminiGen({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToGeminiGen(finalAspectRatio),
          maxAttempts: geminiGenMaxAttempts,
        }, GEMINIGEN_API_KEY);
        modelUsed = primaryModel;
        cbRecordSuccess(primaryModel).catch(() => {});
      } catch (geminiGenErr) {
        const errMsg = geminiGenErr instanceof Error ? geminiGenErr.message : String(geminiGenErr);
        console.error(`[generate-brand-image] GeminiGen.ai failed: ${errMsg}`);
        const isTimeout = errMsg.toLowerCase().includes('timeout');
        if (!isProviderCreditOrAuthError(errMsg)) cbRecordFailure(primaryModel, undefined, supabase).catch(() => {});
        providerDebug.providerTimeout = isTimeout;
        providerDebug.fallbackTried = true;
        providerDebug.errorCode = 'PROVIDER_ERROR';

        // Map GeminiGen model → PoYo equivalent
        const poyoEquivalentMap: Record<string, string> = {
          'geminigen/nano-banana-2': 'poyo/nano-banana-2-new',
          'geminigen/nano-banana-pro': 'poyo/nano-banana-pro',
          'geminigen/imagen-4': 'poyo/nano-banana-pro',
        };
        const poyoPrimary = poyoEquivalentMap[primaryModel] || 'poyo/nano-banana-2-new';
        const poyoAlt = poyoPrimary === 'poyo/nano-banana-2-new' ? 'poyo/nano-banana-pro' : 'poyo/nano-banana-2-new';

        const POYO_KEY = Deno.env.get('POYO_API_KEY');
        let poyoSucceeded = false;
        let poyoErrMsg = '';

        if (POYO_KEY) {
          providerDebug.fallbackProvider = 'poyo';
          for (const poyoModel of [poyoPrimary, poyoAlt]) {
            try {
              console.log(`[generate-brand-image] GeminiGen ${isTimeout ? 'timeout' : 'failed'}, falling back to PoYo (${poyoModel})...`);
              const poyoResult = await generateImageViaPoyo({
                prompt: enhancedPrompt,
                aspectRatio: mapAspectRatioToPoyo(aspectRatio),
                model: poyoModel,
                quality: 'standard',
              }, POYO_KEY);
              imageData = poyoResult.imageUrl;
              modelUsed = `${poyoModel} (fallback from ${primaryModel})`;
              totalAttempts = 1;
              poyoSucceeded = true;
              break;
            } catch (poyoErr) {
              poyoErrMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
              console.error(`[generate-brand-image] PoYo fallback (${poyoModel}) failed: ${poyoErrMsg}`);
              // If credits exhausted on PoYo, skip alt PoYo, go straight to Lovable
              if (isProviderCreditOrAuthError(poyoErrMsg)) break;
            }
          }
        } else {
          console.warn('[generate-brand-image] POYO_API_KEY not set, skipping PoYo fallback');
        }

        if (!poyoSucceeded) {
          providerDebug.fallbackProvider = POYO_KEY ? 'poyo→lovable-ai' : 'lovable-ai';
          console.log('[generate-brand-image] PoYo unavailable/failed, falling back to Lovable AI Gateway...');
          try {
            const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, DEFAULT_IMAGE_MODELS, 0);
            imageData = result.imageData;
            modelUsed = `${result.model} (fallback from ${primaryModel})`;
            totalAttempts = result.attempts;
          } catch (lovableFallbackErr) {
            const fallbackMsg = lovableFallbackErr instanceof Error ? lovableFallbackErr.message : String(lovableFallbackErr);
            console.error('[generate-brand-image] Lovable AI fallback also failed:', fallbackMsg);
            const allCredits = isProviderCreditOrAuthError(errMsg)
              && (!poyoErrMsg || isProviderCreditOrAuthError(poyoErrMsg))
              && isProviderCreditOrAuthError(fallbackMsg);
            const errorCode = allCredits
              ? 'CREDITS_EXHAUSTED'
              : isTimeout ? 'PROVIDER_TIMEOUT' : 'ALL_PROVIDERS_DOWN';
            const errorText = allCredits
              ? 'Tất cả provider tạo ảnh đều hết credits/quota. Vui lòng nạp thêm credits hoặc đổi model trong Admin.'
              : isTimeout
                ? `GeminiGen render quá chậm; PoYo${poyoErrMsg ? ` (${poyoErrMsg})` : ' không khả dụng'} và Lovable AI cũng fail: ${fallbackMsg}`
                : `Tất cả provider fail. GeminiGen: ${errMsg} | PoYo: ${poyoErrMsg || 'n/a'} | Lovable: ${fallbackMsg}`;
            return buildProviderFailureResponse({
              error: errorText,
              errorCode,
              provider: 'geminigen',
              providerTimeout: isTimeout,
              fallbackTried: true,
              fallbackProvider: providerDebug.fallbackProvider,
            });
          }
        }
      }
    } else if (!cbOpenForPrimary && isKieModel(primaryModel)) {
      providerDebug.provider = 'kie';
      const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'KIE_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to KIE.ai: ${primaryModel}`);
      try {
        imageUrlFromKie = await generateImageViaKie({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToKie(finalAspectRatio),
          outputFormat: 'jpeg',
        }, KIE_API_KEY);
        modelUsed = primaryModel;
        cbRecordSuccess(primaryModel).catch(() => {});
      } catch (kieErr) {
        const kieErrMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[generate-brand-image] KIE.ai failed: ${kieErrMsg}`);
        if (!isProviderCreditOrAuthError(kieErrMsg)) cbRecordFailure(primaryModel, undefined, supabase).catch(() => {});

        if (kieErrMsg.includes('KIE_AUTH_ERROR') || kieErrMsg.includes('KIE_CREDITS_EXHAUSTED') || kieErrMsg.includes('KIE_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: kieErrMsg, errorCode: 'CREDITS_EXHAUSTED' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fallback to PoYo
        const POYO_KEY_FOR_KIE = Deno.env.get('POYO_API_KEY');
        if (!POYO_KEY_FOR_KIE) {
          return new Response(
            JSON.stringify({ success: false, error: `KIE failed and POYO_API_KEY not configured: ${kieErrMsg}`, errorCode: 'PROVIDER_ERROR' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('[generate-brand-image] KIE failed, falling back to PoYo (nano-banana-pro)...');
        try {
          imageUrlFromPoyo = await generateImageViaPoyo({
            prompt: enhancedPrompt,
            model: 'poyo/nano-banana-pro',
            aspectRatio: mapAspectRatioToPoyo(finalAspectRatio),
          }, POYO_KEY_FOR_KIE);
          modelUsed = `poyo/nano-banana-pro (fallback from ${primaryModel})`;
        } catch (poyoFallbackErr) {
          const poyoMsg = poyoFallbackErr instanceof Error ? poyoFallbackErr.message : String(poyoFallbackErr);
          console.error('[generate-brand-image] PoYo fallback also failed:', poyoMsg);
          const isCredits = poyoMsg.includes('POYO_CREDITS_EXHAUSTED') || poyoMsg.includes('insufficient_credits');
          return new Response(
            JSON.stringify({
              success: false,
              error: isCredits
                ? 'Hết credits ở cả KIE và PoYo. Vui lòng nạp thêm credits cho provider tạo ảnh.'
                : `KIE and PoYo fallback both failed: ${kieErrMsg}`,
              errorCode: isCredits ? 'CREDITS_EXHAUSTED' : 'PROVIDER_ERROR',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (!cbOpenForPrimary && isNineRouterImageModel(primaryModel)) {
      providerDebug.provider = 'ninerouter';
      const NR_KEY = Deno.env.get('NINE_ROUTER_API_KEY');
      if (!NR_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'NINE_ROUTER_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`[generate-brand-image] Routing to 9Router: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaNineRouter({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: finalAspectRatio,
        }, NR_KEY);
        modelUsed = primaryModel;
        cbRecordSuccess(primaryModel).catch(() => {});
      } catch (nrErr) {
        const nrMsg = nrErr instanceof Error ? nrErr.message : String(nrErr);
        console.error(`[generate-brand-image] 9Router failed: ${nrMsg}`);
        if (!isProviderCreditOrAuthError(nrMsg)) cbRecordFailure(primaryModel, undefined, supabase).catch(() => {});
        if (nrMsg.includes('NINEROUTER_AUTH_ERROR') || nrMsg.includes('NINEROUTER_CREDITS_EXHAUSTED') || nrMsg.includes('NINEROUTER_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: nrMsg, errorCode: 'CREDITS_EXHAUSTED' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Fallback to Lovable AI — wrap so any failure surfaces as structured response (not 500)
        console.log('[generate-brand-image] 9Router failed, falling back to Lovable AI Gateway...');
        providerDebug.fallbackTried = true;
        providerDebug.fallbackProvider = 'lovable-ai';
        try {
          const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, DEFAULT_IMAGE_MODELS, 0);
          imageData = result.imageData;
          modelUsed = `${result.model} (fallback from ${primaryModel})`;
          totalAttempts = result.attempts;
        } catch (lovableErr) {
          const lovableMsg = lovableErr instanceof Error ? lovableErr.message : String(lovableErr);
          console.error('[generate-brand-image] 9Router→Lovable fallback also failed:', lovableMsg);
          const allCredits = isProviderCreditOrAuthError(nrMsg) && isProviderCreditOrAuthError(lovableMsg);
          return buildProviderFailureResponse({
            error: allCredits
              ? 'Tất cả provider tạo ảnh đều hết credits/quota. Vui lòng nạp thêm credits hoặc đổi model trong Admin.'
              : `9Router fail (${nrMsg}); Lovable AI fallback fail: ${lovableMsg}`,
            errorCode: allCredits ? 'CREDITS_EXHAUSTED' : 'ALL_PROVIDERS_DOWN',
            provider: 'ninerouter',
            fallbackTried: true,
            fallbackProvider: 'lovable-ai',
          });
        }
      }
    } else {
      // Lovable AI flow (existing)
      const fallbackModel = primaryModel === 'google/gemini-3-pro-image-preview'
        ? 'google/gemini-2.5-flash-image'
        : 'google/gemini-3-pro-image-preview';

      try {
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, { primary: primaryModel, fallback: fallbackModel });
        imageData = result.imageData;
        modelUsed = result.model;
        totalAttempts = result.attempts;
      } catch (err) {
        // Handle API errors
        if (err instanceof Error && err.message.startsWith('API_ERROR:')) {
          const statusCode = parseInt(err.message.split(':')[1]);
          if (statusCode === 429) {
            return new Response(
              JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later.", errorCode: "RATE_LIMIT" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (statusCode === 402) {
            return new Response(
              JSON.stringify({ success: false, error: "Đã hết credits AI. Vui lòng nạp thêm để tiếp tục.", errorCode: "CREDITS_EXHAUSTED" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        throw err;
      }
    }

    console.log(`[generate-brand-image] Generated with ${modelUsed} after ${totalAttempts} attempt(s)`);

    // Handle PoYo/KIE URL (already a public URL) vs Lovable AI (base64)
    let imageUrl: string;

    if (imageUrlFromPoyo) {
      // Also covers GeminiGen (reuses imageUrlFromPoyo variable)
      imageUrl = imageUrlFromPoyo;
      console.log(`[generate-brand-image] Using external image URL: ${imageUrl.slice(0, 80)}...`);
    } else if (imageUrlFromKie) {
      imageUrl = imageUrlFromKie;
      console.log(`[generate-brand-image] Using KIE image URL: ${imageUrl.slice(0, 80)}...`);
    } else {
      // Lovable AI returns base64 — detect format and upload to storage
      const contentTypeMatch = imageData.match(/^data:image\/([^;]+);base64,/);
      const detectedFormat = contentTypeMatch ? contentTypeMatch[1] : 'png';
      const imageMimeType = `image/${detectedFormat}`;
      const fileExtension = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;
      
      console.log(`[generate-brand-image] Detected image format: ${detectedFormat}`);

      const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      console.log(`[generate-brand-image] Image bytes: ${imageBytes.length}`);

      const fileName = `${contentId}/${channel}-${Date.now()}.${fileExtension}`;
      
      const { error: uploadError } = await supabase.storage
        .from("carousel-images")
        .upload(fileName, imageBytes, {
          contentType: imageMimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[generate-brand-image] Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("carousel-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
      console.log("[generate-brand-image] Image uploaded:", imageUrl);
    }

    // Persistence is recovery-critical: keep it alive even if client disconnects.
    const historySavePromise = persistGeneratedImage(supabase, {
      taskId,
      contentId,
      channel,
      imageUrl,
      prompt: enhancedPrompt,
      aspectRatio: finalAspectRatio,
      modelUsed,
      organizationId: brandTemplate.organization_id,
      userId,
      existingRowId: pendingHistoryId,
    }).catch((historyErr) => {
      console.error('[generate-brand-image] History save error:', historyErr);
      return updateImageTaskStatus(supabase, taskId, {
        status: 'failed',
        progress_message: historyErr instanceof Error ? historyErr.message : 'Persistence failed',
        completed_at: new Date().toISOString(),
      });
    });

    if (typeof (globalThis as any).EdgeRuntime !== 'undefined' && 'waitUntil' in (globalThis as any).EdgeRuntime) {
      (globalThis as any).EdgeRuntime.waitUntil(historySavePromise);
    } else {
      historySavePromise.catch(() => {});
    }

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const estimatedCostUsd = estimateImageCost(modelUsed.split(' ')[0]);
    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-brand-image',
      organizationId: brandTemplate.organization_id,
      userId,
      totalDurationMs,
      aiCallDurationMs: totalDurationMs,
      inputTokensEstimated: estimateTokens(enhancedPrompt),
      outputTokensEstimated: 0,
      estimatedCostUsd,
      modelsUsed: { image: modelUsed },
      hadError: false,
      contextSources: personaContext ? ['persona', 'brand'] : ['brand'],
      channels: [channel],
      contentId,
      actionType: 'image_generation',
      retryCount: totalAttempts - 1,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        taskId,
        imageUrl,
        prompt: enhancedPrompt,
        aspectRatio: finalAspectRatio,
        brandColors: {
          primary: brandContext.brandColors?.primary,
          secondary: brandContext.brandColors?.secondary,
        },
        aiRender: aiRenderPlan,
        recommendedOverlayMode,
        fallbackRecommended: recommendedOverlayMode !== 'ai_render',
        aiRenderPlanSummary: aiRenderPlan ? formatRenderSpecBrief(aiRenderPlan.renderSpec) : null,
        usedStructuredElements: Boolean(structuredElements),
        hasTextInstruction,
        hasFooterInstruction,
        effectiveImageContentType,
        textSuppressedBecauseTooLong,
        textSuppressedBecauseLanguageMismatch,
        detectedOverlayLanguage,
        brandLanguage,
        provider: providerDebug.provider,
        providerTimeout: providerDebug.providerTimeout ?? false,
        fallbackTried: providerDebug.fallbackTried ?? false,
        fallbackProvider: providerDebug.fallbackProvider ?? null,
        modelUsed,
        attempts: totalAttempts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-brand-image] Error:", error);

    // Save error metrics
    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'generate-brand-image',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_generation',
      }).catch(() => {});
    } catch {}

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    try {
      await updateImageTaskStatus(createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), requestBody?.taskId, {
        status: 'failed',
        progress_message: errorMessage,
        completed_at: new Date().toISOString(),
      });
    } catch {}
    const is402 = errorMessage.includes('402') || (error as any)?.statusCode === 402;
    const is429 = errorMessage.includes('429') || (error as any)?.statusCode === 429;
    const errorCode = is402 ? 'CREDITS_EXHAUSTED' : is429 ? 'RATE_LIMIT' : 'UNKNOWN';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode,
        fallback: !is402 && !is429,
      }),
      { status: is402 || is429 ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
