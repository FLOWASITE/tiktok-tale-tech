import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";

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
    layers.push({ text: textContent.headline, role: 'headline' });
    if (textContent.subtitle) {
      layers.push({ text: textContent.subtitle, role: 'subtitle' });
    }
    if (textContent.caption) {
      layers.push({ text: textContent.caption, role: 'caption' });
    }
    return layers.length > 1 ? layers : null; // Single headline → legacy path is fine
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

  switch (presetKey) {
    case 'minimalist':
      // Only replace accent
      blended.colors.accent = primary;
      break;

    case 'flat_design':
      blended.colors.accent = primary;
      if (secondary) blended.colors.secondary_accent = secondary;
      if (blended.colors.dataPalette && Array.isArray(blended.colors.dataPalette)) {
        blended.colors.dataPalette[0] = primary;
        if (secondary) blended.colors.dataPalette[1] = secondary;
      }
      break;

    case 'gradient':
      // Build brand-tinted gradient
      if (secondary && secondary !== primary) {
        blended.colors.gradientFrom = primary;
        blended.colors.gradientTo = secondary;
      } else {
        blended.colors.gradientFrom = primary;
        blended.colors.gradientTo = darkenHex(primary, 30);
      }
      blended.colors.accent = lightenHex(primary, 30);
      break;

    case 'geometric':
      // Replace gold accent with brand primary
      blended.colors.accent = primary;
      if (blended.effects && blended.effects.diagonalLine) {
        blended.effects.diagonalLine = `2px solid ${primary}40`;
      }
      break;

    case 'illustration':
      blended.colors.accent = primary;
      if (secondary) blended.colors.secondary_accent = secondary;
      break;

    case 'product_only':
      blended.colors.cta = primary;
      blended.colors.accent = primary;
      break;
  }

  return blended;
}

function darkenHex(hex: string, percent: number): string {
  try {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0xFF) - Math.round(255 * percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}

function lightenHex(hex: string, percent: number): string {
  try {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const requestBody = await req.json();
    const { prompt, carouselId, slideNumber, textContent, brandColors, platform,
            carouselStyle, totalSlides, slideObjective, visualPreset, seamlessContext } = requestBody;

    console.log(`[generate-carousel-image] Starting for carousel ${carouselId}, slide ${slideNumber}`);

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

    const resolvedPresetKey = visualPreset || carouselStyle || 'minimalist';
    console.log(`[generate-carousel-image] Resolved preset key: '${resolvedPresetKey}' (visualPreset='${visualPreset}', carouselStyle='${carouselStyle}')`);

    const [aiConfig, dbPreset] = await Promise.all([
      getAIConfig('generate-carousel-image'),
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

    console.log(`[generate-carousel-image] Requested model: ${requestedModel}`);

    // === STEP 1: Generate background image (no text) ===
    const backgroundPrompt = buildBackgroundPrompt(
      prompt, platform, carouselStyle, slideNumber, totalSlides, slideRole,
      seamlessContext, blendedTokens, brandColors
    );
    console.log("[generate-carousel-image] Step 1: Generating background...");

    let imageBase64: string | null = null;
    let mimeType = "image/png";
    let externalImageUrl: string | null = null;
    let sceneDescription: string | null = null;

    // --- PoYo routing ---
    if (isPoyoModel(requestedModel)) {
      const POYO_API_KEY = Deno.env.get('POYO_API_KEY');
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'POYO_API_KEY chưa được cấu hình. Vui lòng thêm trong project secrets.', errorCode: 'MISSING_API_KEY' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-carousel-image] Routing to PoYo.ai: ${requestedModel}`);
      try {
        externalImageUrl = await generateImageViaPoyo({
          prompt: backgroundPrompt,
          model: requestedModel,
          aspectRatio: mapAspectRatioToPoyo(platform === 'tiktok' ? '9:16' : '1:1'),
        }, POYO_API_KEY);
        modelUsed = requestedModel;
      } catch (poyoErr) {
        const errMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[generate-carousel-image] PoYo.ai failed: ${errMsg}`);

        if (errMsg.includes('POYO_AUTH_ERROR') || errMsg.includes('POYO_CREDITS_EXHAUSTED') || errMsg.includes('POYO_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ error: errMsg, errorCode: 'PROVIDER_ERROR' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fallback to Lovable AI
        console.log('[generate-carousel-image] PoYo failed, falling back to Lovable AI...');
        imageModel = 'google/gemini-3-pro-image-preview';
        modelUsed = `${imageModel} (fallback from ${requestedModel})`;
        usedFallback = true;
        fallbackFromModel = requestedModel;
      }
    }
    // --- KIE routing ---
    else if (isKieModel(requestedModel)) {
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
          prompt: backgroundPrompt,
          model: requestedModel,
          aspectRatio: mapAspectRatioToKie(platform === 'tiktok' ? '9:16' : '1:1'),
          outputFormat: 'jpeg',
        }, KIE_API_KEY);
        modelUsed = requestedModel;
      } catch (kieErr) {
        const errMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[generate-carousel-image] KIE.ai failed: ${errMsg}`);

        if (errMsg.includes('KIE_AUTH_ERROR') || errMsg.includes('KIE_CREDITS_EXHAUSTED') || errMsg.includes('KIE_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ error: errMsg, errorCode: 'PROVIDER_ERROR' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fallback to Lovable AI
        console.log('[generate-carousel-image] KIE failed, falling back to Lovable AI...');
        imageModel = 'google/gemini-3-pro-image-preview';
        modelUsed = `${imageModel} (fallback from ${requestedModel})`;
        usedFallback = true;
        fallbackFromModel = requestedModel;
      }
    }

    // --- Lovable AI Gateway (default or fallback) ---
    if (!externalImageUrl) {
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
            messages: [{ role: "user", content: backgroundPrompt }],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!bgResponse.ok) {
        const errorText = await bgResponse.text();
        console.error("[generate-carousel-image] Background gen error:", bgResponse.status, errorText);
        
        if (bgResponse.status === 429) {
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
        return new Response(
          JSON.stringify({ error: "Lỗi tạo ảnh nền: " + errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bgData = await bgResponse.json();
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
        console.error("[generate-carousel-image] No image data in background response");
        return new Response(
          JSON.stringify({ error: "Không thể tạo ảnh nền. AI không trả về dữ liệu ảnh." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract scene description from AI text response
      const aiResponseText = bgData.choices?.[0]?.message?.content || '';
      sceneDescription = aiResponseText.length > 10 ? aiResponseText.slice(0, 300) : null;

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
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 2: Overlay text using overlay-text-canvas ===
    const textStr = textContentToString(textContent);
    if (textStr && textStr.trim()) {
      console.log("[generate-carousel-image] Step 2: Overlaying text via Satori...");
      
      const dimensions = getPlatformDimensions(platform, carouselStyle);

      // Get dynamic overlay config — DB preset takes priority
      let overlayConfig = getOverlayConfig(
        visualPreset || 'minimalist',
        slideRole,
        dbPreset?.overlay_config
      );

      // Phase D: Adjust for text density
      overlayConfig = adjustOverlayForTextDensity(overlayConfig, textStr);
      console.log(`[generate-carousel-image] Overlay config:`, JSON.stringify(overlayConfig));

      // Phase B: Parse text layers (now supports structured textContent)
      const textLayers = parseTextLayers(textContent, slideRole);

      // Phase A: Gallery hook dark gradient
      const needsBottomGradient = (carouselStyle === 'gallery' && slideRole === 'hook');

      // Phase E: Decorations based on carouselStyle + visualPreset + slideRole
      const decorations: Record<string, any> = {};

      // Listicle: slide number badge + progress dots
      if (carouselStyle === 'listicle' && slideRole === 'body') {
        decorations.slideNumberBadge = slideNumber;
        decorations.progressDots = { current: slideNumber, total: totalSlides || 5 };
      }

      // Educational: step indicator for non-hook slides
      if (carouselStyle === 'educational' && slideRole !== 'hook') {
        decorations.stepIndicator = { current: slideNumber, total: totalSlides || 5 };
      }

      // flat_design: thick accent divider between headline and subtitle
      if (visualPreset === 'flat_design') {
        decorations.accentDivider = true;
      }

      // product_only: badge for hook slide
      if (visualPreset === 'product_only' && slideRole === 'hook') {
        decorations.hotBadge = true;
      }

      const hasDecorations = Object.keys(decorations).length > 0;

      try {
        const overlayResponse = await fetch(
          `${supabaseUrl}/functions/v1/overlay-text-canvas`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              baseImageUrl: backgroundUrl,
              text: textStr,
              carouselOverlay: {
                position: overlayConfig.position || 'center',
                fontWeight: overlayConfig.fontWeight || 600,
                fontSize: overlayConfig.fontSize || '1.5rem',
                textAlign: overlayConfig.textAlign || 'center',
                maxWidth: overlayConfig.maxWidth || '85%',
                textTransform: overlayConfig.textTransform || 'none',
                background: overlayConfig.background || 'none',
                textColor: overlayConfig.textColor || brandColors?.textColor || '#FFFFFF',
                fontFamily: overlayConfig.fontFamily,
                // Phase A: dark gradient for gallery hook
                bottomGradient: needsBottomGradient,
                // Phase B: multi-layer text
                textLayers: textLayers,
                // Phase C: brand colors for overlay treatments
                brandColors: brandColors || undefined,
                // Phase 3: blended accent color from brand tokens
                brandAccentColor: blendedTokens?.colors?.accent || undefined,
                // Phase E: decorations (listicle, educational, flat_design, product)
                decorations: hasDecorations ? decorations : undefined,
              },
              // Legacy params as fallback
              position: "center",
              typographyStyle: "bold",
              textColor: brandColors?.textColor || "#FFFFFF",
              backgroundColor: brandColors?.backgroundColor || "rgba(0,0,0,0.6)",
              imageWidth: dimensions.width,
              imageHeight: dimensions.height,
              contentId: carouselId,
              channel: `carousel-slide-${slideNumber}`,
            }),
          }
        );

        if (overlayResponse.ok) {
          const overlayData = await overlayResponse.json();
          if (overlayData.success && overlayData.imageUrl) {
            console.log(`[generate-carousel-image] Overlay complete: ${overlayData.imageUrl}`);
            return new Response(
              JSON.stringify({
                success: true,
                imageUrl: overlayData.imageUrl,
                backgroundUrl,
                slideNumber,
                carouselId,
                hasOverlay: true,
                slideRole,
                sceneDescription,
                modelUsed,
                modelRequested: requestedModel,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        console.warn("[generate-carousel-image] Overlay failed, returning background only");
      } catch (overlayError) {
        console.error("[generate-carousel-image] Overlay error:", overlayError);
      }
    }

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
});

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
  brandColors?: { textColor?: string; backgroundColor?: string } | null
): string {
  let safeZoneNote = `
CRITICAL INSTRUCTIONS:
- Do NOT render any text, letters, words, or typography on the image.
- This is a BACKGROUND image only — text will be overlaid programmatically.
- Leave 15% blank space at top and 20% at bottom for text overlay.
- Focus on mood, atmosphere, colors, and visual composition.
- High resolution, professional photography or illustration quality.
`;

  // Gallery hook: dark gradient for text readability
  if (carouselStyle === 'gallery' && slideRole === 'hook') {
    safeZoneNote += '\nThe image MUST have a natural dark gradient at the bottom third (like a sunset darkening toward horizon) to ensure white text readability. Do NOT add any text or graphics.';
  }

  // === Phase C: Brand Color injection into background prompt ===
  let brandColorDirective = '';
  if (brandColors) {
    const parts: string[] = [];
    if (brandColors.backgroundColor) {
      parts.push(`Brand primary color: ${brandColors.backgroundColor}`);
    }
    if (brandColors.textColor) {
      parts.push(`Brand accent/text color: ${brandColors.textColor}`);
    }
    if (parts.length > 0) {
      brandColorDirective = `\nBRAND IDENTITY COLORS (incorporate as dominant colors in the composition):\n${parts.map(p => `- ${p}`).join('\n')}\n`;
    }
  }

  // === DB Design Tokens injection ===
  let tokenDirective = '';
  if (dbTokens) {
    const parts: string[] = [];
    if (dbTokens.colors) {
      const c = dbTokens.colors;
      if (c.primary) parts.push(`Primary color: ${c.primary}`);
      if (c.accent) parts.push(`Accent color: ${c.accent}`);
      if (c.background) parts.push(`Background tone: ${c.background}`);
      if (c.mood) parts.push(`Color mood: ${c.mood}`);
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
      tokenDirective = `\nDESIGN TOKENS (from brand preset):\n${parts.map(p => `- ${p}`).join('\n')}\n`;
    }
  }

  // === Seamless Continuity injection ===
  let seamlessDirective = '';
  if (seamlessContext && carouselStyle === 'seamless') {
    const parts: string[] = [];

    if (seamlessContext.colorPalette && seamlessContext.colorPalette.length > 0) {
      parts.push(`EXACT COLOR PALETTE to maintain visual continuity: ${seamlessContext.colorPalette.join(', ')}. Use ONLY these colors as the dominant palette.`);
    }

    if (seamlessContext.previousSceneDescription) {
      parts.push(`PREVIOUS SLIDE depicted: "${seamlessContext.previousSceneDescription}". This slide MUST visually continue from that scene — same environment, same lighting direction, same visual flow. The left edge of this image should seamlessly connect to the right edge of the previous slide.`);
    }

    const pos = seamlessContext.sequencePosition || slideNumber || 1;
    const total = seamlessContext.totalInSequence || totalSlides || 5;
    parts.push(`This is panel ${pos} of ${total} in a continuous panoramic artwork.`);

    if (parts.length > 0) {
      seamlessDirective = `\nSEAMLESS CONTINUITY (CRITICAL — maintain visual flow between slides):\n${parts.map(p => `- ${p}`).join('\n')}\n`;
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
  }
  
  // Clean prompt: remove text-rendering directives
  const cleanedPrompt = originalPrompt
    .replace(/\btext\s*[:：]\s*["'].*?["'].*?(?=\n|$)/gi, '')
    .replace(/\bchữ\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/\btypography\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/\bfont[\s-]*(family|size|style|weight|face)\b.*?(?=\n|$)/gi, '')
    .replace(/\b(render|draw|write|display|show)\s+(text|words|letters|title|heading)\b.*?(?=\n|$)/gi, '');

  // Visual concept FIRST — this is what the AI should focus on
  // Technical constraints AFTER — these are guardrails
  const prompt = [
    // PART 1: Cảnh chính (AI image model tập trung vào đây)
    cleanedPrompt,
    
    // PART 2: Color & Brand (bổ sung, không override cảnh)
    brandColorDirective ? `\nColor guidance: ${brandColorDirective.trim()}` : '',
    tokenDirective ? `\nDesign mood: ${tokenDirective.trim()}` : '',
    
    // PART 3: Continuity (nếu seamless)
    seamlessDirective || '',
    
    // PART 4: Style directive (nếu có)
    styleDirective || '',
    
    // PART 5: Constraints (cuối cùng, ít ảnh hưởng nhất)
    '\nIMPORTANT: Do NOT render any text, letters, or words on the image. Leave 15% top and 20% bottom blank for text overlay. This is a background image only.',
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
