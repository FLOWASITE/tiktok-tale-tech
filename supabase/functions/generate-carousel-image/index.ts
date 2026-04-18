import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import { generateImageViaGeminiGen, isGeminiGenModel, mapAspectRatioToGeminiGen } from "../_shared/geminigen-image-generator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { sanitizeInput, logSecurityEvent } from "../_shared/prompt-guard.ts";
import { checkRateLimit, getRateLimitConfig, getUserPlanType, createRateLimitErrorResponse } from "../_shared/rate-limiter.ts";
import { createTrace } from "../_shared/tracing.ts";
import { lightenHex, darkenHex } from "../_shared/color-utils.ts";
import { isCircuitOpen, recordSuccess, recordFailure } from "../_shared/circuit-breaker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Slide Role Detection
// ============================================
function detectSlideRole(
  slideNumber: number,
  totalSlides: number,
  objective: string,
  carouselStyle: string
): string {
  if (carouselStyle === 'gallery') {
    if (slideNumber === 1) return 'hook';
    if (slideNumber === totalSlides) return 'cta';
    return 'visual';
  }

  if (slideNumber === 1) return 'hook';
  if (slideNumber === totalSlides) return 'cta';

  const objLower = (objective || '').toLowerCase();
  if (objLower.includes('data') || objLower.includes('số') || objLower.includes('thống kê')) return 'dataPoint';
  if (objLower.includes('quote') || objLower.includes('trích') || objLower.includes('cảm hứng')) return 'quote';

  return 'body';
}

// ============================================
// Image → Scene Description (for seamless continuity)
// ============================================
// PoYo / KIE / GeminiGen return only an image URL — no companion text.
// Without a scene description, the next slide cannot anchor its style and
// the seamless V2 continuity feature silently degrades to "model guesses
// from the previous image alone". For aesthetic / luxury verticals where
// visual consistency IS the product, we pay ~$0.001/slide to ask Gemini
// Flash Lite to describe the image so slide N+1 can consume it.
async function describeImageForContinuity(
  imageUrl: string,
  lovableApiKey: string | undefined,
): Promise<string | null> {
  if (!lovableApiKey || !imageUrl) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image's visual style, color palette, lighting, composition, and key subjects in 2-3 sentences. Plain prose only — no markdown, no JSON, no bullet points, no headings.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!resp.ok) {
      console.warn(`[describe] Failed status=${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    return sanitizeSceneDescription(raw);
  } catch (e) {
    console.warn("[describe] Error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Strip markdown / code-fence / JSON artifacts from a scene description and
 * cap at 300 chars. Used both for Gemini Flash describe output and for
 * Lovable Gateway's raw text response (previously sliced raw — bug).
 */
function sanitizeSceneDescription(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")          // code fences
    .replace(/^\s*[-*+]\s+/gm, "")              // bullet markers
    .replace(/^\s*#{1,6}\s+/gm, "")             // headings
    .replace(/[*_`#]/g, "")                     // inline md markers
    .replace(/\{[\s\S]*?\}/g, " ")              // JSON-ish blocks
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 10) return null;
  return cleaned.slice(0, 300);
}

// CarouselSlide interface (matches generate-carousel output)
interface CarouselSlide {
  slideNumber: number;
  objective: string;
  textContent: string | StructuredTextContent;
  designStyle: string;
  colorLayout: string;
  aspectRatio: string;
  technicalRequirements: string;
  fullPrompt: string;
}

// ============================================
// Structured Text Content (Phase 1.1)
// ============================================
interface StructuredTextContent {
  headline: string;
  subtitle?: string;
  caption?: string;
  dataValue?: string;
  dataLabel?: string;
}

function isStructuredTextContent(tc: unknown): tc is StructuredTextContent {
  return !!tc && typeof tc === 'object' && 'headline' in tc && typeof (tc as any).headline === 'string';
}

/**
 * Normalize textContent to a flat string for backward-compatible paths
 */
function textContentToString(tc: string | StructuredTextContent): string {
  if (typeof tc === 'string') return tc;
  const parts: string[] = [];
  if (tc.dataValue) parts.push(tc.dataValue);
  if (tc.dataLabel) parts.push(tc.dataLabel);
  parts.push(tc.headline);
  if (tc.subtitle) parts.push(tc.subtitle);
  if (tc.caption) parts.push(tc.caption);
  return parts.join('\n');
}

// ============================================
// Phase B: Parse text into multi-layer hierarchy
// Now supports structured textContent natively
// ============================================
interface TextLayer {
  text: string;
  role: 'headline' | 'subtitle' | 'body' | 'accent' | 'dataValue' | 'dataLabel' | 'caption';
}

function parseTextLayers(textContent: string | StructuredTextContent, slideRole: string): TextLayer[] | null {
  // === Structured textContent: use semantic fields directly ===
  if (isStructuredTextContent(textContent)) {
    const layers: TextLayer[] = [];

    if (textContent.dataValue) {
      layers.push({ text: textContent.dataValue, role: 'dataValue' });
    }
    if (textContent.dataLabel) {
      layers.push({ text: textContent.dataLabel, role: 'dataLabel' });
    }
    if (textContent.headline?.trim()) {
      layers.push({ text: textContent.headline, role: 'headline' });
    }
    if (textContent.subtitle) {
      layers.push({ text: textContent.subtitle, role: 'subtitle' });
    }
    if (textContent.caption) {
      layers.push({ text: textContent.caption, role: 'caption' });
    }
    // Always return layers for structured content (even single headline) to avoid legacy path
    return layers.length > 0 ? layers : null;
  }

  // === Legacy string textContent: heuristic parsing ===
  const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 1) return null;

  switch (slideRole) {
    case 'hook':
      return [
        { text: lines[0], role: 'headline' },
        ...lines.slice(1).map(l => ({ text: l, role: 'subtitle' as const })),
      ];
    case 'cta':
      return [
        { text: lines[0], role: 'headline' },
        ...lines.slice(1).map(l => ({ text: l, role: 'body' as const })),
      ];
    case 'dataPoint': {
      const isNumeric = /^\d+(\.\d+)?[%+]?$/.test(lines[0].trim());
      if (isNumeric) {
        return [
          { text: lines[0], role: 'dataValue' },
          ...lines.slice(1).map(l => ({ text: l, role: 'body' as const })),
        ];
      }
      return [
        { text: lines[0], role: 'headline' },
        ...lines.slice(1).map(l => ({ text: l, role: 'body' as const })),
      ];
    }
    case 'body':
    default:
      return [
        { text: lines[0], role: 'headline' },
        ...lines.slice(1).map(l => ({ text: l, role: 'body' as const })),
      ];
  }
}

// ============================================
// Phase B.1: Deduplicate text layers
// Fixes: dataValue "87%" + headline "87% DOANH NGHIỆP..." → "87%" shown twice
// ============================================
function deduplicateTextLayers(layers: TextLayer[]): TextLayer[] {
  const dataValueLayer = layers.find(l => l.role === 'dataValue');
  const headlineLayer = layers.find(l => l.role === 'headline');

  if (dataValueLayer && headlineLayer) {
    const dataVal = dataValueLayer.text.trim();
    const headline = headlineLayer.text.trim();

    if (headline.startsWith(dataVal)) {
      const remaining = headline.slice(dataVal.length).trim();
      if (!remaining) {
        // headline is just the dataValue → remove headline
        console.log(`[dedup] Headline identical to dataValue "${dataVal}" → removing headline layer`);
        return layers.filter(l => l.role !== 'headline');
      } else {
        // headline starts with dataValue → trim the duplicate prefix
        console.log(`[dedup] Headline starts with dataValue "${dataVal}" → trimming to "${remaining}"`);
        headlineLayer.text = remaining;
      }
    }
  }

  return layers;
}

// ============================================
// Phase D: Content-aware text density adjustment
// ============================================
function adjustOverlayForTextDensity(
  overlayConfig: Record<string, any>,
  textContent: string,
): Record<string, any> {
  const len = textContent.length;
  const adjusted = { ...overlayConfig };

  if (len > 120) {
    // Long text: shrink font, widen max area
    const currentFontSize = adjusted.fontSize || '1.5rem';
    const remMatch = currentFontSize.match?.(/([\d.]+)rem/);
    if (remMatch) {
      const scale = Math.max(0.6, 1 - (len - 120) / 400); // gradual shrink
      adjusted.fontSize = `${(parseFloat(remMatch[1]) * scale).toFixed(2)}rem`;
    }
    adjusted.maxWidth = '92%';
  } else if (len < 20) {
    // Short text: enlarge for dramatic effect
    const currentFontSize = adjusted.fontSize || '1.5rem';
    const remMatch = currentFontSize.match?.(/([\d.]+)rem/);
    if (remMatch) {
      adjusted.fontSize = `${(parseFloat(remMatch[1]) * 1.3).toFixed(2)}rem`;
    }
    adjusted.maxWidth = '60%';
  }

  return adjusted;
}

// ============================================
// Hardcoded Overlay Matrix (fallback when DB preset unavailable)
// ============================================
const FALLBACK_OVERLAY_MATRIX: Record<string, Record<string, any>> = {
  minimalist: {
    hook: { position: "center", fontWeight: 500, fontSize: "2.5rem", textAlign: "center", maxWidth: "70%", textTransform: "none", background: "none", textColor: "#1A1A1A" },
    body: { position: "bottom-left", fontWeight: 400, fontSize: "1rem", textAlign: "left", maxWidth: "80%", background: "none", textColor: "#1A1A1A" },
    cta:  { position: "center", fontWeight: 500, fontSize: "1.5rem", textAlign: "center", maxWidth: "60%", background: "none", textColor: "#1A1A1A" },
    dataPoint: { position: "center", fontWeight: 500, fontSize: "3rem", textAlign: "center", maxWidth: "70%", background: "none", textColor: "#2563EB" },
    quote: { position: "center", fontWeight: 400, fontSize: "1.75rem", textAlign: "center", maxWidth: "65%", background: "none", textColor: "#6B7280" },
  },
  flat_design: {
    hook:      { position: "center", fontWeight: 900, fontSize: "4rem", textAlign: "center", maxWidth: "90%", textTransform: "uppercase", background: "solid-block", textColor: "#FFFFFF" },
    body:      { position: "top-left", fontWeight: 700, fontSize: "1.25rem", textAlign: "left", maxWidth: "85%", background: "solid-block", textColor: "#FFFFFF" },
    dataPoint: { position: "center", fontWeight: 900, fontSize: "6rem", textAlign: "center", maxWidth: "90%", background: "none", textColor: "#FFC107" },
    cta:       { position: "bottom-center", fontWeight: 800, fontSize: "2rem", textAlign: "center", maxWidth: "90%", textTransform: "uppercase", background: "solid-block", textColor: "#FFFFFF" },
  },
  gradient: {
    hook: { position: "center", fontWeight: 700, fontSize: "3rem", textAlign: "center", maxWidth: "75%", background: "glass", textColor: "#FFFFFF" },
    body: { position: "center", fontWeight: 400, fontSize: "1.1rem", textAlign: "center", maxWidth: "70%", background: "glass", textColor: "#FFFFFF" },
    cta:  { position: "bottom-center", fontWeight: 700, fontSize: "1.75rem", textAlign: "center", maxWidth: "65%", background: "glass", textColor: "#FFFFFF" },
  },
  geometric: {
    hook: { position: "left-column", fontWeight: 700, fontSize: "2.75rem", textAlign: "left", maxWidth: "55%", background: "none", textColor: "#FFFFFF" },
    body: { position: "left-column", fontWeight: 400, fontSize: "1rem", textAlign: "left", maxWidth: "55%", background: "none", textColor: "#CBD5E1" },
    cta:  { position: "bottom-left", fontWeight: 600, fontSize: "1.5rem", textAlign: "left", maxWidth: "50%", textTransform: "uppercase", background: "none", textColor: "#C9A84C" },
  },
  illustration: {
    hook:  { position: "asymmetric-left", fontWeight: 700, fontSize: "2.5rem", textAlign: "left", maxWidth: "65%", background: "none", textColor: "#3D2C2E" },
    quote: { position: "center", fontWeight: 400, fontSize: "1.75rem", textAlign: "center", maxWidth: "70%", background: "none", textColor: "#6B5352" },
    body:  { position: "bottom-left", fontWeight: 400, fontSize: "1rem", textAlign: "left", maxWidth: "75%", background: "none", textColor: "#3D2C2E" },
    cta:   { position: "center", fontWeight: 600, fontSize: "1.5rem", textAlign: "center", maxWidth: "60%", background: "none", textColor: "#E07A5F" },
  },
  product_only: {
    hook:  { position: "top-center", fontWeight: 800, fontSize: "2.5rem", textAlign: "center", maxWidth: "85%", background: "none", textColor: "#111111" },
    body:  { position: "center-left", fontWeight: 800, fontSize: "2rem", textAlign: "left", maxWidth: "45%", background: "none", textColor: "#111111" },
    cta:   { position: "bottom-center", fontWeight: 700, fontSize: "1.25rem", textAlign: "center", maxWidth: "90%", textTransform: "uppercase", background: "cta-button", textColor: "#FFFFFF" },
  },
};

// ============================================
// Phase 3: Brand Color Deep Blending into Design Tokens
// ============================================
function blendBrandColors(
  presetTokens: Record<string, any>,
  presetKey: string,
  brandColors?: { textColor?: string; backgroundColor?: string } | null,
): Record<string, any> {
  if (!brandColors || (!brandColors.backgroundColor && !brandColors.textColor)) {
    return presetTokens;
  }

  const blended = JSON.parse(JSON.stringify(presetTokens));
  const primary = brandColors.backgroundColor || brandColors.textColor || '';
  const secondary = brandColors.textColor !== primary ? brandColors.textColor : null;

  if (!primary) return blended;

  // Ensure colors object exists
  if (!blended.colors) blended.colors = {};

  // Ensure background object exists
  if (!blended.colors.background) blended.colors.background = {};

  switch (presetKey) {
    case 'minimalist':
      // Light tint of brand as background, brand as accent
      blended.colors.background.primary = lightenHex(primary, 85);
      blended.colors.background.secondary = lightenHex(primary, 75);
      blended.colors.accent = primary;
      break;

    case 'flat_design':
      // Dark brand-tinted background for bold infographic look
      blended.colors.background.primary = darkenHex(primary, 40);
      blended.colors.background.secondary = darkenHex(primary, 30);
      blended.colors.accent = primary;
      if (secondary) blended.colors.secondary_accent = secondary;
      if (blended.colors.dataPalette && Array.isArray(blended.colors.dataPalette)) {
        blended.colors.dataPalette[0] = primary;
        if (secondary) blended.colors.dataPalette[1] = secondary;
      }
      break;

    case 'gradient':
      // Brand-derived gradient
      if (secondary && secondary !== primary) {
        blended.colors.gradientFrom = primary;
        blended.colors.gradientTo = secondary;
      } else {
        blended.colors.gradientFrom = primary;
        blended.colors.gradientTo = darkenHex(primary, 30);
      }
      blended.colors.background.primary = primary;
      blended.colors.background.secondary = darkenHex(primary, 20);
      blended.colors.accent = lightenHex(primary, 30);
      break;

    case 'geometric':
      // Dark brand-tinted background for corporate look
      blended.colors.background.primary = darkenHex(primary, 50);
      blended.colors.background.secondary = darkenHex(primary, 40);
      blended.colors.accent = primary;
      if (blended.effects && blended.effects.diagonalLine) {
        blended.effects.diagonalLine = `2px solid ${primary}40`;
      }
      break;

    case 'illustration':
      // Light brand-tinted background for illustration
      blended.colors.background.primary = lightenHex(primary, 80);
      blended.colors.background.secondary = lightenHex(primary, 70);
      blended.colors.accent = primary;
      if (secondary) blended.colors.secondary_accent = secondary;
      break;

    case 'product_only':
      blended.colors.background.primary = lightenHex(primary, 90);
      blended.colors.cta = primary;
      blended.colors.accent = primary;
      break;

    default:
      // For any unrecognized preset, still apply brand to background + accent
      blended.colors.background.primary = lightenHex(primary, 70);
      blended.colors.accent = primary;
      break;
  }

  return blended;
}

// lightenHex / darkenHex are imported from ../_shared/color-utils.ts (OKLCH-based,
// perceptually uniform — preserves brand hue when lightening saturated colors
// like purple, magenta, cyan that RGB linear-interp washes to gray).
// See color-utils.ts for math notes.

// ============================================
// Get Overlay Config — DB preset first, fallback to hardcoded
// ============================================
function getOverlayConfig(
  visualPreset: string,
  slideRole: string,
  dbOverlayConfig?: Record<string, any> | null
): Record<string, any> {
  if (dbOverlayConfig && dbOverlayConfig[slideRole]) {
    return dbOverlayConfig[slideRole];
  }
  if (dbOverlayConfig && dbOverlayConfig['body']) {
    return dbOverlayConfig['body'];
  }

  const styleConfig = FALLBACK_OVERLAY_MATRIX[visualPreset];
  if (!styleConfig) return FALLBACK_OVERLAY_MATRIX.minimalist.body;
  return styleConfig[slideRole] || styleConfig['body'] || FALLBACK_OVERLAY_MATRIX.minimalist.body;
}

// ============================================
// Fetch style preset from DB
// ============================================
async function fetchStylePreset(supabase: any, presetKey: string): Promise<{ tokens: any; overlay_config: any } | null> {
  console.log(`[DB Preset] Querying for preset_key: '${presetKey}' (type: ${typeof presetKey})`);
  
  if (!presetKey || presetKey === 'undefined' || presetKey === 'null') {
    console.warn(`[DB Preset] Invalid preset_key: '${presetKey}' — skipping DB query`);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('carousel_style_presets')
      .select('*')
      .eq('preset_key', presetKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`[DB Preset] ERROR for '${presetKey}':`, error.message, error.details, error.hint, error.code);
      return null;
    }
    
    if (!data) {
      console.warn(`[DB Preset] No data found for preset_key: '${presetKey}'`);
      return null;
    }
    
    console.log(`[DB Preset] SUCCESS — loaded: ${data.preset_key}`,
      `| tokens keys: ${Object.keys(data.tokens || {})}`,
      `| overlay roles: ${Object.keys(data.overlay_config || {})}`,
      `| colors: ${JSON.stringify(data.tokens?.colors ? { accent: data.tokens.colors.accent, bg: Object.keys(data.tokens.colors.background || {}) } : 'none')}`
    );
    return { tokens: data.tokens, overlay_config: data.overlay_config };
  } catch (e) {
    console.error(`[DB Preset] UNEXPECTED ERROR for '${presetKey}':`, e);
    return null;
  }
}

Deno.serve(withPerf({ functionName: 'generate-carousel-image', slowThresholdMs: 45000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch (bodyError) {
    console.error("[generate-carousel-image] Failed to read request body:", bodyError);
    return new Response(
      JSON.stringify({ error: "Failed to read request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { prompt, carouselId, slideNumber, textContent, brandColors, platform,
            carouselStyle, totalSlides, slideObjective, visualPreset, seamlessContext, carouselTopic,
            previousImageUrl } = requestBody;

    // ============================================
    // Distributed trace — propagate from generate-carousel
    // ============================================
    const incomingTraceId = req.headers.get("x-trace-id") || requestBody.traceId || carouselId || undefined;
    const trace = createTrace(incomingTraceId);
    const traceId = trace.traceId;
    const tlog = (msg: string, ...rest: any[]) =>
      console.log(`[trace=${traceId.slice(0, 8)} slide=${slideNumber}] ${msg}`, ...rest);
    const twarn = (msg: string, ...rest: any[]) =>
      console.warn(`[trace=${traceId.slice(0, 8)} slide=${slideNumber}] ${msg}`, ...rest);

    tlog(`Starting for carousel ${carouselId}`);

    // ============================================
    // 2.1 Prompt-injection guard on user-supplied prompt
    // ============================================
    if (typeof prompt === "string" && prompt.length > 0) {
      const promptGuard = sanitizeInput(prompt);
      if (promptGuard.riskLevel === "high") {
        // Log async, never block response on logging
        try {
          const tmpSupa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          logSecurityEvent(tmpSupa, undefined, undefined, promptGuard).catch(() => {});
        } catch { /* ignore */ }
        twarn("Prompt injection blocked", { flagged: promptGuard.flaggedPatterns });
        return new Response(
          JSON.stringify({
            error: "INPUT_BLOCKED",
            message: "Phát hiện mẫu prompt injection trong dữ liệu nhập.",
            flagged: promptGuard.flaggedPatterns,
            traceId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "x-trace-id": traceId } }
        );
      }
      // Replace with sanitized version downstream
      requestBody.prompt = promptGuard.sanitizedMessage;
    }


    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!carouselId || slideNumber === undefined) {
      return new Response(
        JSON.stringify({ error: "Carousel ID and slide number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Detect slide role ===
    const slideRole = detectSlideRole(
      slideNumber,
      totalSlides || 5,
      slideObjective || '',
      carouselStyle || ''
    );
    console.log(`[generate-carousel-image] Slide role: ${slideRole} (style=${carouselStyle}, preset=${visualPreset})`);

    // === STEP 0: Get AI config + DB style preset in parallel ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve organizationId + brand logo from carousel for proper config resolution
    let organizationId: string | undefined;
    let includeLogo = false;
    let brandTemplateId: string | null = null;
    let resolvedLogoUrl: string | null = null;
    try {
      const { data: carouselData } = await supabase
        .from('carousels')
        .select('organization_id, include_logo, brand_template_id')
        .eq('id', carouselId)
        .maybeSingle();
      organizationId = carouselData?.organization_id || undefined;
      includeLogo = !!carouselData?.include_logo;
      brandTemplateId = carouselData?.brand_template_id || null;
    } catch (e) {
      console.warn('[generate-carousel-image] Could not resolve carousel meta:', e);
    }

    // ============================================
    // 2.1 Per-user rate limit (carousel_image bucket — per minute)
    // Defends against cost-amplification across the 4-provider fallback chain.
    // ============================================
    try {
      const userIdForRl = await resolveUserId(req, supabase);
      if (userIdForRl) {
        const planType = await getUserPlanType(supabase, userIdForRl);
        const rlConfig = getRateLimitConfig(planType, "carousel_image");
        const rl = checkRateLimit(userIdForRl, rlConfig);
        if (!rl.allowed) {
          twarn(`Rate limit exceeded plan=${planType} resetAt=${rl.resetAt.toISOString()}`);
          return createRateLimitErrorResponse(rl, { ...corsHeaders, "x-trace-id": traceId });
        }
        tlog(`Rate limit OK plan=${planType} remaining=${rl.remaining}/${rlConfig.maxRequests}`);
      }
    } catch (rlErr) {
      // Don't fail request on rate-limit infrastructure error
      twarn("Rate limit check failed (allowing through):", rlErr);
    }

    // Resolve brand logo URL when includeLogo === true
    // Pattern: brand_templates.logo_url may be a full URL or a Storage path under 'brand-assets'
    if (includeLogo && brandTemplateId) {
      try {
        const { data: brand } = await supabase
          .from('brand_templates')
          .select('logo_url')
          .eq('id', brandTemplateId)
          .maybeSingle();
        const raw = brand?.logo_url || null;
        if (raw) {
          if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
            resolvedLogoUrl = raw;
          } else {
            // Assume Storage path. Try 'brand-assets' first; fall back to 'brand-logos' if needed.
            const { data: pub1 } = supabase.storage.from('brand-assets').getPublicUrl(raw);
            resolvedLogoUrl = pub1?.publicUrl || null;
          }
          console.log(`[generate-carousel-image] Brand logo resolved: ${resolvedLogoUrl ? 'YES' : 'NO'} (brand=${brandTemplateId})`);
        } else {
          console.warn(`[generate-carousel-image] include_logo=true but brand has no logo_url (brand=${brandTemplateId})`);
        }
      } catch (e) {
        console.warn('[generate-carousel-image] Could not resolve brand logo:', e);
      }
    }

    // Logo fingerprint (short hash) for downstream cache invalidation when admin swaps logo
    let logoFingerprint = 'no-logo';
    if (resolvedLogoUrl) {
      try {
        const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(resolvedLogoUrl));
        logoFingerprint = Array.from(new Uint8Array(hashBuf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 16);
      } catch { /* ignore */ }
    }

    const resolvedPresetKey = visualPreset || carouselStyle || 'minimalist';
    console.log(`[generate-carousel-image] Resolved preset key: '${resolvedPresetKey}' (visualPreset='${visualPreset}', carouselStyle='${carouselStyle}', orgId=${organizationId || 'none'})`);

    const [aiConfig, dbPreset] = await Promise.all([
      getAIConfig('generate-carousel-image', organizationId),
      fetchStylePreset(supabase, resolvedPresetKey),
    ]);

    console.log(`[generate-carousel-image] DB preset result: ${dbPreset ? 'LOADED' : 'NULL (using fallback)'}`);

    // === Phase 3: Blend brand colors into design tokens ===
    const presetKey = resolvedPresetKey;
    const blendedTokens = dbPreset?.tokens
      ? blendBrandColors(dbPreset.tokens, presetKey, brandColors)
      : null;
    
    if (blendedTokens && brandColors) {
      console.log(`[generate-carousel-image] Brand colors blended into preset '${presetKey}':`, JSON.stringify({
        gradientFrom: blendedTokens.colors?.gradientFrom,
        gradientTo: blendedTokens.colors?.gradientTo,
        accent: blendedTokens.colors?.accent,
      }));
    } else if (!dbPreset) {
      console.warn(`[generate-carousel-image] ⚠️ No DB tokens — image prompt will lack design token directives (colors, effects, typography mood)`);
    }

    // === Multi-provider routing: PoYo → KIE → Lovable AI ===
    const requestedModel = aiConfig.model;
    let imageModel = requestedModel;
    let modelUsed = requestedModel;
    let usedFallback = false;
    let fallbackFromModel: string | null = null;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // === Enterprise logo path: PoYo/KIE/GeminiGen are single-image providers
    // and in seamless mode `previousImageUrl` displaces the logo (slide 2..N
    // loses brand mark). When a brand has a real logo + includeLogo=true and
    // we'd otherwise pick a single-image provider while a previous slide
    // exists, force-route to Lovable AI Gateway which supports multi-image
    // (logo + previous + prompt) natively. Slide 1 still goes to the requested
    // provider since there's no `previousImageUrl` competing for the slot.
    const isSingleImageProvider =
      isPoyoModel(requestedModel) || isKieModel(requestedModel) || isGeminiGenModel(requestedModel);
    if (
      includeLogo && resolvedLogoUrl && previousImageUrl &&
      isSingleImageProvider && lovableApiKey
    ) {
      console.log(
        `[generate-carousel-image] Logo + previousImage + single-slot provider (${requestedModel}) → routing to Lovable Gateway for multi-image support (slide ${slideNumber})`,
      );
      imageModel = 'google/gemini-2.5-flash-image';
      // Leave requestedModel intact for telemetry; downstream branches check requested model name.
      // We do NOT mutate requestedModel: the multi-image fork below triggers on `!externalImageUrl`.
    }

    console.log(`[generate-carousel-image] Requested model: ${requestedModel} (effective image model: ${imageModel})`);

    // === STEP 1: Generate COMPLETE slide image (with text in prompt) ===
    const overlayConfig = getOverlayConfig(
      visualPreset || 'minimalist',
      slideRole,
      dbPreset?.overlay_config
    );
    const backgroundPrompt = buildBackgroundPrompt(
      prompt, platform, carouselStyle, slideNumber, totalSlides, slideRole,
      seamlessContext, blendedTokens, brandColors, carouselTopic, slideObjective,
      textContent, overlayConfig
    );

    // === Logo conditioning directive (only when we actually attach the logo image) ===
    // Models receive the logo as a real image input (multi-image), this text tells them HOW to use it.
    const logoDirective = (includeLogo && resolvedLogoUrl)
      ? `\n\n[REFERENCE IMAGE — BRAND LOGO]: One of the attached images is the EXACT brand logo. You MUST place it in the design WITHOUT redrawing, modifying its shape, colors, typography, or proportions. Position: top-right corner with ~5% padding from edges. Size: ~10–12% of canvas width. Do NOT invent a different logo. If unsure, omit the logo rather than guess.`
      : '';
    const finalPrompt = backgroundPrompt + logoDirective;

    console.log("[generate-carousel-image] Step 1: Generating background...");

    let imageBase64: string | null = null;
    let mimeType = "image/png";
    let externalImageUrl: string | null = null;
    let sceneDescription: string | null = null;

    // For single-input providers (PoYo/KIE/GeminiGen), prefer previousImageUrl for seamless continuity;
    // when no previous image exists (e.g. slide 1 or non-seamless), use the logo as the single reference.
    const singleRefImage = previousImageUrl || (includeLogo && resolvedLogoUrl) || undefined;

    // --- PoYo routing ---
    if (isPoyoModel(requestedModel) && !(await isCircuitOpen(requestedModel))) {
      const POYO_API_KEY = Deno.env.get('POYO_API_KEY');
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'POYO_API_KEY chưa được cấu hình. Vui lòng thêm trong project secrets.', errorCode: 'MISSING_API_KEY' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-carousel-image] Routing to PoYo.ai: ${requestedModel} (img2img=${previousImageUrl ? 'yes' : 'no'})`);
      try {
        externalImageUrl = await generateImageViaPoyo({
          prompt: finalPrompt,
          model: requestedModel,
          aspectRatio: mapAspectRatioToPoyo(platform === 'tiktok' ? '9:16' : '1:1'),
          // Single-image providers: previous slide takes priority for seamless continuity;
          // when absent, fall back to brand logo as the visual anchor.
          inputImage: singleRefImage,
        }, POYO_API_KEY);
        modelUsed = requestedModel;
        recordSuccess(requestedModel).catch(() => {});
      } catch (poyoErr) {
        recordFailure(requestedModel, undefined, supabase).catch(() => {});
        const errMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[generate-carousel-image] PoYo.ai failed: ${errMsg}`);

        if (errMsg.includes('POYO_AUTH_ERROR') || errMsg.includes('POYO_CREDITS_EXHAUSTED') || errMsg.includes('POYO_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ error: errMsg, errorCode: 'PROVIDER_ERROR' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // PoYo failed — try alternate PoYo model if different and its circuit is closed
        const altPoyoModel = requestedModel.includes('nano-banana-2') ? 'poyo/nano-banana-pro' : 'poyo/nano-banana-2-new';
        if (altPoyoModel !== requestedModel && POYO_API_KEY && !(await isCircuitOpen(altPoyoModel))) {
          console.log(`[generate-carousel-image] PoYo failed, trying alternate PoYo model: ${altPoyoModel}...`);
          try {
            externalImageUrl = await generateImageViaPoyo({
              prompt: finalPrompt,
              model: altPoyoModel,
              aspectRatio: mapAspectRatioToPoyo(platform === 'tiktok' ? '9:16' : '1:1'),
              inputImage: singleRefImage,
            }, POYO_API_KEY);
            modelUsed = `${altPoyoModel} (fallback from ${requestedModel})`;
            usedFallback = true;
            fallbackFromModel = requestedModel;
            recordSuccess(altPoyoModel).catch(() => {});
          } catch (altPoyoErr) {
            recordFailure(altPoyoModel, undefined, supabase).catch(() => {});
            console.error(`[generate-carousel-image] Alternate PoYo also failed:`, altPoyoErr instanceof Error ? altPoyoErr.message : altPoyoErr);
            // Fall through to Lovable Gateway (don't return early)
            console.log('[generate-carousel-image] Both PoYo models failed → falling through to Lovable Gateway');
          }
        } else {
          // Circuit open or no alt — fall through to Lovable Gateway
          console.log('[generate-carousel-image] PoYo failed and alt unavailable → falling through to Lovable Gateway');
        }
      }
    } else if (isPoyoModel(requestedModel)) {
      console.warn(`[circuit-breaker] PoYo model ${requestedModel} circuit OPEN → skipping to Lovable Gateway`);
    }
    // --- KIE routing ---
    else if (isKieModel(requestedModel) && !(await isCircuitOpen(requestedModel))) {
      const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'KIE_API_KEY chưa được cấu hình. Vui lòng thêm trong project secrets.', errorCode: 'MISSING_API_KEY' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-carousel-image] Routing to KIE.ai: ${requestedModel}`);
      try {
        externalImageUrl = await generateImageViaKie({
          prompt: finalPrompt,
          model: requestedModel,
          aspectRatio: mapAspectRatioToKie(platform === 'tiktok' ? '9:16' : '1:1'),
          outputFormat: 'jpeg',
          inputImage: singleRefImage,
        }, KIE_API_KEY);
        modelUsed = requestedModel;
        recordSuccess(requestedModel).catch(() => {});
      } catch (kieErr) {
        recordFailure(requestedModel, undefined, supabase).catch(() => {});
        const errMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[generate-carousel-image] KIE.ai failed: ${errMsg}`);

        if (errMsg.includes('KIE_AUTH_ERROR') || errMsg.includes('KIE_CREDITS_EXHAUSTED') || errMsg.includes('KIE_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ error: errMsg, errorCode: 'PROVIDER_ERROR' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fallback to PoYo (only if its circuit is closed)
        const POYO_KEY_FOR_KIE = Deno.env.get('POYO_API_KEY');
        const poyoFallbackModel = 'poyo/nano-banana-pro';
        if (POYO_KEY_FOR_KIE && !(await isCircuitOpen(poyoFallbackModel))) {
          console.log('[generate-carousel-image] KIE failed, falling back to PoYo (nano-banana-pro)...');
          try {
            externalImageUrl = await generateImageViaPoyo({
              prompt: finalPrompt,
              model: poyoFallbackModel,
              aspectRatio: mapAspectRatioToPoyo(platform === 'tiktok' ? '9:16' : '1:1'),
              inputImage: singleRefImage,
            }, POYO_KEY_FOR_KIE);
            modelUsed = `${poyoFallbackModel} (fallback from ${requestedModel})`;
            usedFallback = true;
            fallbackFromModel = requestedModel;
            recordSuccess(poyoFallbackModel).catch(() => {});
          } catch (poyoFallbackErr) {
            recordFailure(poyoFallbackModel, undefined, supabase).catch(() => {});
            console.error('[generate-carousel-image] PoYo fallback also failed:', poyoFallbackErr instanceof Error ? poyoFallbackErr.message : poyoFallbackErr);
            console.log('[generate-carousel-image] KIE+PoYo failed → falling through to Lovable Gateway');
          }
        } else {
          console.log('[generate-carousel-image] KIE failed and PoYo fallback unavailable → falling through to Lovable Gateway');
        }
      }
    } else if (isKieModel(requestedModel)) {
      console.warn(`[circuit-breaker] KIE model ${requestedModel} circuit OPEN → skipping to Lovable Gateway`);
    }
    // --- GeminiGen routing ---
    else if (isGeminiGenModel(requestedModel) && !(await isCircuitOpen(requestedModel))) {
      const GEMINIGEN_API_KEY = Deno.env.get('GEMINIGEN_API_KEY');
      if (!GEMINIGEN_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'GEMINIGEN_API_KEY chưa được cấu hình. Vui lòng thêm trong project secrets.', errorCode: 'MISSING_API_KEY' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-carousel-image] Routing to GeminiGen.ai: ${requestedModel}`);

      // Retry GeminiGen up to 2 times before falling back (intermittent failures are common)
      const GEMINIGEN_MAX_RETRIES = 2;
      let geminiGenSuccess = false;
      let lastGeminiGenErr = '';

      for (let attempt = 1; attempt <= GEMINIGEN_MAX_RETRIES; attempt++) {
        try {
          externalImageUrl = await generateImageViaGeminiGen({
            prompt: finalPrompt,
            model: requestedModel,
            aspectRatio: mapAspectRatioToGeminiGen(platform === 'tiktok' ? '9:16' : '1:1'),
            inputImage: singleRefImage,
          }, GEMINIGEN_API_KEY);
          modelUsed = requestedModel;
          geminiGenSuccess = true;
          recordSuccess(requestedModel).catch(() => {});
          break;
        } catch (geminiGenErr) {
          lastGeminiGenErr = geminiGenErr instanceof Error ? geminiGenErr.message : String(geminiGenErr);
          console.warn(`[generate-carousel-image] GeminiGen attempt ${attempt}/${GEMINIGEN_MAX_RETRIES} failed: ${lastGeminiGenErr}`);

          // Don't retry on auth/credits/rate-limit errors
          if (lastGeminiGenErr.includes('GEMINIGEN_AUTH_ERROR') || lastGeminiGenErr.includes('GEMINIGEN_CREDITS_EXHAUSTED') || lastGeminiGenErr.includes('GEMINIGEN_RATE_LIMIT')) {
            recordFailure(requestedModel, undefined, supabase).catch(() => {});
            return new Response(
              JSON.stringify({ error: lastGeminiGenErr, errorCode: 'PROVIDER_ERROR' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (attempt < GEMINIGEN_MAX_RETRIES) {
            console.log(`[generate-carousel-image] Retrying GeminiGen in 3s...`);
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      // Record final outcome (only failures, success already recorded above)
      if (!geminiGenSuccess) {
        recordFailure(requestedModel, undefined, supabase).catch(() => {});
      }

      // Fallback to PoYo if all GeminiGen retries failed (and PoYo circuit closed)
      if (!geminiGenSuccess) {
        console.error(`[generate-carousel-image] GeminiGen failed after ${GEMINIGEN_MAX_RETRIES} attempts: ${lastGeminiGenErr}`);
        const POYO_KEY_FOR_GEMINIGEN = Deno.env.get('POYO_API_KEY');
        const poyoFallbackModel = 'poyo/nano-banana-2-new';
        if (POYO_KEY_FOR_GEMINIGEN && !(await isCircuitOpen(poyoFallbackModel))) {
          console.log('[generate-carousel-image] Falling back to PoYo (nano-banana-2-new)...');
          try {
            externalImageUrl = await generateImageViaPoyo({
              prompt: finalPrompt,
              model: poyoFallbackModel,
              aspectRatio: mapAspectRatioToPoyo(platform === 'tiktok' ? '9:16' : '1:1'),
              inputImage: singleRefImage,
            }, POYO_KEY_FOR_GEMINIGEN);
            modelUsed = `${poyoFallbackModel} (fallback from ${requestedModel})`;
            usedFallback = true;
            fallbackFromModel = requestedModel;
            recordSuccess(poyoFallbackModel).catch(() => {});
          } catch (poyoFallbackErr) {
            recordFailure(poyoFallbackModel, undefined, supabase).catch(() => {});
            console.error('[generate-carousel-image] PoYo fallback also failed:', poyoFallbackErr instanceof Error ? poyoFallbackErr.message : poyoFallbackErr);
            console.log('[generate-carousel-image] GeminiGen+PoYo failed → falling through to Lovable Gateway');
          }
        } else {
          console.log('[generate-carousel-image] GeminiGen failed and PoYo fallback unavailable → falling through to Lovable Gateway');
        }
      }
    } else if (isGeminiGenModel(requestedModel)) {
      console.warn(`[circuit-breaker] GeminiGen model ${requestedModel} circuit OPEN → skipping to Lovable Gateway`);
    }

    // --- Lovable AI Gateway (default or fallback) ---
    if (!externalImageUrl) {
      const MAX_GATEWAY_RETRIES = 2;
      for (let gatewayAttempt = 0; gatewayAttempt <= MAX_GATEWAY_RETRIES; gatewayAttempt++) {
        if (gatewayAttempt > 0) {
          console.log(`[generate-carousel-image] Gateway retry ${gatewayAttempt}/${MAX_GATEWAY_RETRIES}...`);
          await new Promise(r => setTimeout(r, 2000 * gatewayAttempt));
        }

        // Build multi-image content array: [text prompt, optional previous-slide ref, optional logo ref]
        // Lovable AI Gateway / Gemini image models accept multi-image input via OpenAI-compatible content array.
        const userContent: any[] = [{ type: "text", text: finalPrompt }];
        if (previousImageUrl) {
          userContent.push({ type: "image_url", image_url: { url: previousImageUrl } });
        }
        if (includeLogo && resolvedLogoUrl) {
          userContent.push({ type: "image_url", image_url: { url: resolvedLogoUrl } });
        }
        const attachedImages = userContent.length - 1;
        if (gatewayAttempt === 0) {
          console.log(`[generate-carousel-image] Gateway payload: model=${imageModel}, refImages=${attachedImages} (logo=${includeLogo && !!resolvedLogoUrl}, prev=${!!previousImageUrl})`);
        }

        const bgResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: imageModel,
              messages: [{ role: "user", content: userContent }],
              modalities: ["image", "text"],
            }),
          }
        );

        if (!bgResponse.ok) {
          const errorText = await bgResponse.text();
          console.error("[generate-carousel-image] Background gen error:", bgResponse.status, errorText);
          
          if (bgResponse.status === 429) {
            if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
            return new Response(
              JSON.stringify({ error: "Đã vượt giới hạn API. Vui lòng thử lại sau.", errorCode: "RATE_LIMIT" }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (bgResponse.status === 402 || errorText.includes("CREDITS_EXHAUSTED") || errorText.includes("credits")) {
            return new Response(
              JSON.stringify({ error: "Đã hết credits AI. Vui lòng nâng cấp.", errorCode: "CREDITS_EXHAUSTED" }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
          return new Response(
            JSON.stringify({ error: "Lỗi tạo ảnh nền: " + errorText }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let bgData: any;
        let bgText: string;
        try {
          bgText = await bgResponse.text();
        } catch (bodyReadErr) {
          console.error("[generate-carousel-image] Failed to read response body:", bodyReadErr);
          if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
          return new Response(
            JSON.stringify({ error: "Kết nối tới AI bị gián đoạn. Vui lòng thử lại.", errorCode: "CONNECTION_ERROR" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!bgText || bgText.trim().length === 0) {
          console.error("[generate-carousel-image] Empty response body from AI gateway");
          if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
          return new Response(
            JSON.stringify({ error: "AI gateway trả về response rỗng. Vui lòng thử lại.", errorCode: "EMPTY_RESPONSE" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        try {
          bgData = JSON.parse(bgText);
        } catch (parseErr) {
          console.error("[generate-carousel-image] Failed to parse AI gateway response:", parseErr, "Raw:", bgText.slice(0, 200));
          if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
          return new Response(
            JSON.stringify({ error: "Không thể đọc phản hồi từ AI. Vui lòng thử lại.", errorCode: "PARSE_ERROR" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const messageImages = bgData.choices?.[0]?.message?.images;
        if (messageImages && messageImages.length > 0) {
          const imgUrl = messageImages[0].image_url?.url;
          if (imgUrl && imgUrl.startsWith("data:")) {
            const match = imgUrl.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              imageBase64 = match[2];
            }
          }
        }

        if (!imageBase64) {
          console.error(`[generate-carousel-image] No image data in response (attempt ${gatewayAttempt + 1})`);
          if (gatewayAttempt < MAX_GATEWAY_RETRIES) continue;
          return new Response(
            JSON.stringify({ error: "Không thể tạo ảnh nền. AI không trả về dữ liệu ảnh." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract scene description from AI text response (sanitize markdown/JSON)
        const aiResponseText = bgData.choices?.[0]?.message?.content || '';
        sceneDescription = sanitizeSceneDescription(aiResponseText);
        break; // Success — exit retry loop
      }

      if (!modelUsed.includes('fallback')) {
        modelUsed = imageModel;
      }
    }

    // Upload to storage
    const userId = await resolveUserId(req, supabase);
    let backgroundUrl: string;

    if (externalImageUrl) {
      // PoYo/KIE returned a public URL — download and re-upload to our storage for consistency
      try {
        const imgResponse = await fetch(externalImageUrl);
        if (!imgResponse.ok) throw new Error(`Failed to download: ${imgResponse.status}`);
        const imgBlob = await imgResponse.arrayBuffer();
        const imgBytes = new Uint8Array(imgBlob);
        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const bgFileName = `${carouselId}/slide-${slideNumber}-bg-${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("carousel-images")
          .upload(bgFileName, imgBytes, { contentType, upsert: true });

        if (uploadErr) {
          console.warn("[generate-carousel-image] Upload failed, using external URL:", uploadErr);
          backgroundUrl = externalImageUrl;
        } else {
          const { data: urlData } = supabase.storage.from("carousel-images").getPublicUrl(bgFileName);
          backgroundUrl = urlData.publicUrl;
        }
      } catch (dlErr) {
        console.warn("[generate-carousel-image] Download/upload failed, using external URL:", dlErr);
        backgroundUrl = externalImageUrl;
      }
    } else {
      // Lovable AI: upload base64
      const binaryString = atob(imageBase64!);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const extension = mimeType.split("/")[1] || "png";
      const bgFileName = `${carouselId}/slide-${slideNumber}-bg-${Date.now()}.${extension}`;

      const { error: bgUploadError } = await supabase.storage
        .from("carousel-images")
        .upload(bgFileName, bytes, { contentType: mimeType, upsert: true });

      if (bgUploadError) {
        console.error("[generate-carousel-image] Background upload error:", bgUploadError);
        return new Response(
          JSON.stringify({ error: "Lỗi upload ảnh nền: " + bgUploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: bgUrlData } = supabase.storage.from("carousel-images").getPublicUrl(bgFileName);
      backgroundUrl = bgUrlData.publicUrl;
    }

    console.log(`[generate-carousel-image] Background uploaded: ${backgroundUrl}, model: ${modelUsed}`);

    // ============================================
    // Populate sceneDescription for external providers (PoYo/KIE/GeminiGen).
    // These providers return only an image URL — no companion text — so the
    // seamless-V2 chain breaks at slide 2 unless we describe the result.
    // Lovable Gateway already populates sceneDescription from its own text
    // response (sanitized above), so skip there.
    // ============================================
    if (!sceneDescription && externalImageUrl) {
      const t0 = performance.now();
      sceneDescription = await describeImageForContinuity(backgroundUrl, lovableApiKey);
      const took = Math.round(performance.now() - t0);
      console.log(
        `[generate-carousel-image] sceneDescription via Gemini Flash Lite: ` +
        `${sceneDescription ? `${sceneDescription.length} chars` : 'NULL'} (${took}ms, slide=${slideNumber})`,
      );
    }
    if (!sceneDescription) {
      console.warn(
        `[generate-carousel-image] sceneDescription is NULL for slide=${slideNumber} ` +
        `(provider=${modelUsed}). Next slide will fall back to objective/fullPrompt.`,
      );
    }

    // === Gallery visual slides: skip overlay, return background directly ===
    if (slideRole === 'visual') {
      console.log(`[generate-carousel-image] Gallery visual slide — skipping overlay`);

      const totalDurationMs = Math.round(performance.now() - startTime);
      const inputTokens = estimateTokens(backgroundPrompt);
      const estimatedCostUsd = isImageModel(imageModel) ? estimateImageCost(imageModel) : estimateCost(imageModel, inputTokens, 0);
      saveMetrics(supabase, {
        traceId, functionName: 'generate-carousel-image', userId, totalDurationMs,
        aiCallDurationMs: totalDurationMs, inputTokensEstimated: inputTokens, outputTokensEstimated: 0,
        estimatedCostUsd, modelsUsed: { image: imageModel }, hadError: false,
        usedFallback, fallbackModel: fallbackFromModel,
        contextSources: [], contentId: carouselId, actionType: 'image_generation',
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: backgroundUrl,
          backgroundUrl,
          slideNumber,
          carouselId,
          hasOverlay: false,
          slideRole,
          sceneDescription,
          modelUsed,
          modelRequested: requestedModel,
          logoApplied: includeLogo && !!resolvedLogoUrl,
          logoFingerprint,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Text was rendered by AI directly in the image prompt — no overlay needed ===
    // (overlay-text-canvas is preserved but not called; text is part of the generated image)
    console.log(`[generate-carousel-image] Text-in-prompt mode — image already contains text, skipping overlay`);

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const model = imageModel;
    const inputTokens = estimateTokens(backgroundPrompt);
    const estimatedCostUsd = isImageModel(model) ? estimateImageCost(model) : estimateCost(model, inputTokens, 0);
    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-carousel-image',
      userId,
      totalDurationMs,
      aiCallDurationMs: totalDurationMs,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: 0,
      estimatedCostUsd,
      modelsUsed: { image: model },
      hadError: false,
      usedFallback,
      fallbackModel: fallbackFromModel,
      contextSources: [],
      contentId: carouselId,
      actionType: 'image_generation',
    }).catch(() => {});

    console.log(`[generate-carousel-image] Returning background image: ${backgroundUrl}`);
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: backgroundUrl,
        backgroundUrl,
        slideNumber,
        carouselId,
        hasOverlay: false,
        slideRole,
        sceneDescription,
        modelUsed,
        modelRequested: requestedModel,
        logoApplied: includeLogo && !!resolvedLogoUrl,
        logoFingerprint,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-carousel-image] Unexpected error:", error);

    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'generate-carousel-image',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_generation',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));

/**
 * Build a background-only prompt with:
 * - Safe zone instructions
 * - Style-specific directives
 * - Seamless continuity context (color palette + previous scene)
 * - DB design tokens (colors, typography hints)
 * - Phase C: Brand color integration
 */
function buildBackgroundPrompt(
  originalPrompt: string,
  platform?: string,
  carouselStyle?: string,
  slideNumber?: number,
  totalSlides?: number,
  slideRole?: string,
  seamlessContext?: {
    colorPalette?: string[] | null;
    previousSceneDescription?: string | null;
    sequencePosition?: number;
    totalInSequence?: number;
  } | null,
  dbTokens?: any | null,
  brandColors?: { textColor?: string; backgroundColor?: string } | null,
  carouselTopic?: string | null,
  slideObjective?: string | null,
  textContent?: any | null,
  overlayConfig?: Record<string, any> | null,
): string {
  // === Safe zone note: now a COMPLETE slide (text rendered by AI) ===
  let safeZoneNote = `
CRITICAL: This is a COMPLETE carousel slide image with BOTH visual background AND text rendered on it.
You MUST render the text exactly as specified below. The text is the most important element.
High resolution, professional design quality, 1080x1080px.
`;

  // Gallery hook: dark gradient for text readability
  if (carouselStyle === 'gallery' && slideRole === 'hook') {
    safeZoneNote += '\nThe image MUST have a natural dark gradient at the bottom third to ensure white text readability.';
  }

  // === TEXT RENDERING INSTRUCTION ===
  let textInstruction = '';
  if (textContent && slideRole !== 'visual') {
    const structured = typeof textContent === 'object' && textContent.headline
      ? textContent
      : { headline: typeof textContent === 'string' ? textContent : '' };
    const { headline, subtitle, caption, dataValue, dataLabel } = structured;

    // Position & background from overlayConfig
    const position = overlayConfig?.position || 'center';
    const background = overlayConfig?.background || 'none';

    // Build text block description
    const textParts: string[] = [];

    if (dataValue) {
      textParts.push(`— Display "${dataValue}" as a very large, bold number (biggest text on the image)`);
      if (dataLabel) {
        textParts.push(`— Below the number, display "${dataLabel}" in small uppercase letters`);
      }
    }

    if (headline) {
      textParts.push(`— Main headline text: "${headline}" — bold, prominent, easy to read`);
    }

    if (subtitle) {
      textParts.push(`— Subtitle text below headline: "${subtitle}" — smaller, lighter weight`);
    }

    if (caption) {
      textParts.push(`— Small caption at bottom: "${caption}" — subtle, small size`);
    }

    // Position instruction
    let positionDesc = 'centered on the image';
    if (position === 'bottom-left') positionDesc = 'in the bottom-left area';
    if (position === 'top-left') positionDesc = 'in the top-left area';
    if (position === 'top-center') positionDesc = 'in the top-center area';
    if (position === 'bottom-center') positionDesc = 'in the bottom-center area';
    if (position === 'left-column') positionDesc = 'in the left half of the image';
    if (position === 'center-left') positionDesc = 'in the center-left area';
    if (position === 'asymmetric-left') positionDesc = 'in the left area with asymmetric layout';

    // Background treatment
    let bgTreatment = '';
    if (background === 'glass') {
      bgTreatment = 'Place the text inside a frosted glass card (glassmorphism effect: semi-transparent white background with blur, rounded corners, subtle border).';
    } else if (background === 'solid-block') {
      bgTreatment = 'Place the text on a solid dark semi-transparent rectangle for high contrast readability.';
    } else if (background === 'cta-button') {
      bgTreatment = 'The last line of text should look like a call-to-action button (rounded rectangle, bright contrasting color).';
    } else {
      bgTreatment = 'Text should have subtle drop shadow or dark gradient behind it for readability against the background.';
    }

    // Font style from tokens
    let fontDesc = 'clean modern sans-serif font';
    if (dbTokens?.typography?.fontFamily?.heading) {
      const fontName = dbTokens.typography.fontFamily.heading.split(',')[0].replace(/'/g, '').trim();
      fontDesc = `${fontName} font or similar style`;
    }

    // Text color
    const textColor = overlayConfig?.textColor || '#FFFFFF';
    const colorDesc = textColor === '#FFFFFF' ? 'white' : textColor === '#1A1A1A' ? 'dark/black' : textColor;

    textInstruction = `

TEXT RENDERING (MANDATORY — this is the most important part):
All text must be rendered ${positionDesc}.
Text color: ${colorDesc}.
Font: ${fontDesc}.
${bgTreatment}

Text content to render (in EXACT order, top to bottom):
${textParts.join('\n')}

RULES FOR TEXT:
- Render the text EXACTLY as written above — do not change, translate, or rephrase any word.
- Text must be sharp, high-contrast, and perfectly readable.
- Text hierarchy: dataValue (largest) > headline (large) > subtitle (medium) > caption (small).
- If text is in Vietnamese, render the diacritics (dấu) correctly: ă, â, ê, ô, ơ, ư, đ and tone marks.
- DO NOT add any extra text, watermarks, or labels not specified above.
`;
  }

  // === Phase C: Brand Color injection (STRONG directive) ===
  let brandColorDirective = '';
  if (brandColors) {
    const colorParts: string[] = [];
    if (brandColors.backgroundColor) {
      colorParts.push(`PRIMARY BRAND COLOR: ${brandColors.backgroundColor} — This color MUST dominate the image (40-60% of visible color area). Use it for backgrounds, gradients, overlays, or large color blocks.`);
    }
    if (brandColors.textColor) {
      colorParts.push(`SECONDARY BRAND COLOR: ${brandColors.textColor} — Use for accents, highlights, and contrast elements.`);
    }
    if (colorParts.length > 0) {
      brandColorDirective = `
⚠️ MANDATORY BRAND COLOR DIRECTIVE (HIGHEST PRIORITY):
${colorParts.map(p => `- ${p}`).join('\n')}
- CRITICAL: The IMAGE BACKGROUND itself MUST use brand colors or tints/shades derived from them. Do NOT use preset default backgrounds like dark navy (#1A1A2E), corporate black (#0A1628), or blue-purple gradients (#667eea).
- FORBIDDEN: Do NOT default to generic blue (#3B82F6), teal, dark navy, or corporate black unless those exact colors are listed above.
- The brand colors above MUST be clearly visible and dominant in the final image.
- If the brand color is warm (red, orange, yellow), the image MUST feel warm. If cool (green, purple), reflect that temperature.
`;
    }
  }

  // === DB Design Tokens injection (filtered when brand colors exist) ===
  let tokenDirective = '';
  if (dbTokens) {
    const parts: string[] = [];
    // When brand colors are present, skip token colors to avoid conflict
    if (dbTokens.colors && !brandColors) {
      const c = dbTokens.colors;
      if (c.primary) parts.push(`Primary color: ${c.primary}`);
      if (c.accent) parts.push(`Accent color: ${c.accent}`);
      if (c.background) parts.push(`Background tone: ${c.background}`);
    }
    // Always keep mood — it doesn't conflict with brand colors
    if (dbTokens.colors?.mood) {
      parts.push(`Color mood: ${dbTokens.colors.mood}`);
    }
    if (dbTokens.typography?.mood) {
      parts.push(`Typography mood: ${dbTokens.typography.mood}`);
    }
    if (dbTokens.effects) {
      const fx: string[] = [];
      if (dbTokens.effects.grain) fx.push('subtle film grain');
      if (dbTokens.effects.blur) fx.push('soft depth blur');
      if (dbTokens.effects.glow) fx.push('neon glow accents');
      if (dbTokens.effects.shadow) fx.push('dramatic shadows');
      if (fx.length > 0) parts.push(`Visual effects: ${fx.join(', ')}`);
    }
    if (parts.length > 0) {
      tokenDirective = `\nDESIGN TOKENS (supplementary mood/effects only):\n${parts.map(p => `- ${p}`).join('\n')}\n`;
    }
  }

  // === Visual Continuity injection ===
  let seamlessDirective = '';
  if (seamlessContext) {
    const isSeamless = carouselStyle === 'seamless';
    const parts: string[] = [];

    if (seamlessContext.colorPalette && seamlessContext.colorPalette.length > 0) {
      // When brand colors exist, inject them at the front of the palette and soften the lock
      if (brandColors) {
        const brandHexes: string[] = [];
        if (brandColors.backgroundColor) brandHexes.push(brandColors.backgroundColor);
        if (brandColors.textColor && brandColors.textColor !== brandColors.backgroundColor) brandHexes.push(brandColors.textColor);
        // Merge: brand colors first, then palette colors (deduplicated)
        const mergedPalette = [...brandHexes, ...seamlessContext.colorPalette.filter(c => !brandHexes.includes(c))];
        parts.push(`COLOR PALETTE for visual continuity: ${mergedPalette.join(', ')}. The first ${brandHexes.length} color(s) are BRAND COLORS and must remain dominant. Other colors support continuity.`);
      } else {
        parts.push(`EXACT COLOR PALETTE to maintain visual continuity: ${seamlessContext.colorPalette.join(', ')}. Use ONLY these colors as the dominant palette.`);
      }
    }

    if (seamlessContext.previousSceneDescription) {
      const desc = seamlessContext.previousSceneDescription;
      
      // If it's a Series Bible (long, comprehensive context), use directly
      if (desc.length > 100) {
        parts.push(desc);
      } else if (isSeamless) {
        parts.push(`VISUAL WORLD for this series: "${desc}". This slide MUST exist in the SAME visual world — same environment, same lighting direction, same visual flow, same color temperature. The left edge of this image should seamlessly connect to the right edge of the previous slide.`);
      } else {
        parts.push(`VISUAL WORLD for this series: "${desc}". Maintain the SAME environment, lighting, photography style, and color temperature. Visual identity must be consistent across all slides.`);
      }
    }

    // Sibling slides context — helps AI understand the story arc
    if (seamlessContext.siblingSlidesSummary) {
      parts.push(`SERIES CONTEXT: This carousel contains: ${seamlessContext.siblingSlidesSummary}. Your slide must visually belong to this same story arc.`);
    }

    const pos = seamlessContext.sequencePosition || slideNumber || 1;
    const total = seamlessContext.totalInSequence || totalSlides || 5;
    if (isSeamless) {
      parts.push(`This is panel ${pos} of ${total} in a continuous panoramic artwork.`);
    } else {
      parts.push(`This is slide ${pos} of ${total} — keep consistent visual identity throughout the series.`);
    }

    if (parts.length > 0) {
      const header = isSeamless
        ? 'SEAMLESS CONTINUITY (CRITICAL — maintain visual flow between slides)'
        : 'VISUAL CONTINUITY (maintain consistent look across all slides)';
      seamlessDirective = `\n${header}:\n${parts.map(p => `- ${p}`).join('\n')}\n`;
    }
  }

  // Style-specific directives
  let styleDirective = '';
  if (carouselStyle === 'seamless') {
    styleDirective = `
SEAMLESS CAROUSEL STYLE:
- Visual elements MUST extend to the LEFT and RIGHT edges of the image.
- Use a consistent color palette and visual motif that connects with adjacent slides.
- Elements should appear to continue BEYOND the frame boundary.
- This is slide ${slideNumber || '?'} of ${totalSlides || '?'} — design as a FRAGMENT of a larger panoramic artwork.
- Background gradient/pattern must flow seamlessly when placed next to adjacent slides.
- Avoid centered compositions — use edge-bleeding elements (shapes, lines, gradients).
`;
  } else if (carouselStyle === 'listicle') {
    styleDirective = `
LISTICLE STYLE:
- Use a UNIFORM layout structure — same visual grid for every item slide.
- Clean, consistent background with space for a large number indicator.
- Professional, structured composition with clear visual hierarchy.
- Keep the same color palette and visual style across all slides.
`;
  } else if (carouselStyle === 'gallery') {
    if (slideRole === 'visual') {
      styleDirective = `
GALLERY / CINEMATIC VISUAL (MAXIMUM QUALITY):
- This is a FULL-BLEED cinematic photograph with NO text, NO graphics, NO UI elements, NO overlays whatsoever.
- Professional editorial photography quality, 8K resolution clarity, award-winning composition.
- Dramatic natural lighting with cinematic depth of field (shallow DoF for subject isolation).
- Rich vivid colors with intentional color grading (warm golden hour or cool blue hour tones).
- Strong composition following rule of thirds, leading lines, or symmetry.
- This image will be displayed at full resolution with nothing on top of it — visual quality is the ONLY priority.
- Capture authentic emotion, texture, and atmosphere — this should feel like a National Geographic or Vogue editorial photo.
`;
    } else {
      styleDirective = `
GALLERY / PHOTO DUMP STYLE:
- Focus 100% on VISUAL QUALITY — this is a photo collection.
- Use realistic, high-quality photography or artistic imagery.
- Rich colors, natural lighting, cinematic composition.
- NO infographic elements, NO structured layouts — just beautiful imagery.
- The image itself IS the content.
`;
    }
  } else if (carouselStyle === 'educational') {
    styleDirective = `
EDUCATIONAL CAROUSEL STYLE:
- This is slide ${slideNumber || '?'} of ${totalSlides || '?'} in an educational step-by-step sequence.
- Composition should feel like a page from a premium business e-book or professional course material.
- Each slide builds upon the previous one — maintain visual progression:
  * Slide 1 (Hook): Wide establishing shot, dramatic, attention-grabbing
  * Slides 2-${(totalSlides || 5) - 1}: Medium shots, focused on specific concepts, gradually brighter/more optimistic
  * Slide ${totalSlides || 5} (CTA): Open, inviting, forward-looking composition
- Background should SUPPORT the text content, not compete with it. Subtle, professional, not distracting.
`;
  }

  // Default fallback
  if (!styleDirective) {
    styleDirective = `
CAROUSEL COMPOSITION:
- This is slide ${slideNumber || '?'} of ${totalSlides || '?'}.
- Maintain consistent visual style, color palette, and mood across all slides.
`;
  }
  
  // Clean prompt: only strip font directives (we WANT text-related content now)
  const cleanedPrompt = originalPrompt
    .replace(/\bfont[\s-]*(family|size|style|weight|face)\b.*?(?=\n|$)/gi, '');

  // === Topic Relevance Lock ===
  let topicDirective = '';
  if (carouselTopic) {
    topicDirective = `\nTOPIC RELEVANCE (CRITICAL): The scene MUST be directly relevant to the topic "${carouselTopic}".`;
    if (slideObjective) {
      topicDirective += ` This slide's objective is: "${slideObjective}".`;
    }
    topicDirective += ` Do NOT use abstract generic backgrounds unrelated to this topic. Every visual element should reinforce the topic.`;
    topicDirective += `\nSLIDE UNIQUENESS: This is slide ${slideNumber} of ${totalSlides || 5}. Use a DIFFERENT camera angle and focal subject than other slides. This slide's unique focus: "${slideObjective || 'main topic'}". Vary between wide shot, medium shot, close-up, overhead, and side angle across slides.\n`;
  }

  // Assemble prompt: BRAND COLORS FIRST (AI prioritizes beginning of prompt)
  const brandColorReinforcement = brandColorDirective
    ? `\n⚠️ FINAL REMINDER: The brand colors specified at the top of this prompt MUST be clearly dominant. Do NOT produce a blue/black/teal image unless those are the brand colors.`
    : '';

  const prompt = [
    // PART 0: Brand colors FIRST — highest priority position
    brandColorDirective || '',

    // PART 1: Scene description
    cleanedPrompt,
    
    // PART 1.5: Topic lock
    topicDirective || '',
    
    // PART 2: Design tokens (mood/effects only when brand colors present)
    tokenDirective ? `\nDesign mood: ${tokenDirective.trim()}` : '',
    
    // PART 3: Continuity
    seamlessDirective || '',
    
    // PART 4: Style directive
    styleDirective || '',
    
    // PART 5: TEXT RENDERING
    textInstruction,
    
    // PART 6: Final constraints
    safeZoneNote,

    // PART 7: Brand color reinforcement (sandwich technique — end of prompt)
    brandColorReinforcement,
  ].filter(Boolean).join('\n');

  return prompt;
}

function getPlatformDimensions(platform?: string, carouselStyle?: string): { width: number; height: number } {
  // Gallery style: use portrait for more visual impact on mobile
  if (carouselStyle === 'gallery') {
    switch (platform) {
      case 'tiktok':
        return { width: 1080, height: 1920 };
      case 'facebook':
      default:
        return { width: 1080, height: 1350 }; // 4:5 for maximum feed real estate
    }
  }

  switch (platform) {
    case 'tiktok':
      return { width: 1080, height: 1920 };
    case 'facebook':
    default:
      return { width: 1080, height: 1080 };
  }
}
