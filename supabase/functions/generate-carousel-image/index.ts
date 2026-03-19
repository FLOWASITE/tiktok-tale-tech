import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

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
// Get Overlay Config — DB preset first, fallback to hardcoded
// ============================================
function getOverlayConfig(
  visualPreset: string,
  slideRole: string,
  dbOverlayConfig?: Record<string, any> | null
): Record<string, any> {
  // Priority 1: DB preset overlay_config
  if (dbOverlayConfig && dbOverlayConfig[slideRole]) {
    return dbOverlayConfig[slideRole];
  }
  // Also check DB for 'body' fallback
  if (dbOverlayConfig && dbOverlayConfig['body']) {
    return dbOverlayConfig['body'];
  }

  // Priority 2: Hardcoded fallback
  const styleConfig = FALLBACK_OVERLAY_MATRIX[visualPreset];
  if (!styleConfig) return FALLBACK_OVERLAY_MATRIX.minimalist.body;
  return styleConfig[slideRole] || styleConfig['body'] || FALLBACK_OVERLAY_MATRIX.minimalist.body;
}

// ============================================
// Fetch style preset from DB
// ============================================
async function fetchStylePreset(supabase: any, presetKey: string): Promise<{ tokens: any; overlay_config: any } | null> {
  try {
    const { data, error } = await supabase
      .from('carousel_style_presets')
      .select('tokens, overlay_config')
      .eq('preset_key', presetKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`[generate-carousel-image] No DB preset for '${presetKey}', using fallback`);
      return null;
    }
    console.log(`[generate-carousel-image] Loaded DB preset: ${presetKey}`);
    return data;
  } catch (e) {
    console.warn(`[generate-carousel-image] Error fetching preset:`, e);
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

    const [aiConfig, dbPreset] = await Promise.all([
      getAIConfig('generate-carousel-image'),
      fetchStylePreset(supabase, visualPreset || carouselStyle || 'minimalist'),
    ]);

    const imageModel = aiConfig.model;
    console.log(`[generate-carousel-image] Using model: ${imageModel}`);

    // === STEP 1: Generate background image (no text) ===
    const backgroundPrompt = buildBackgroundPrompt(
      prompt, platform, carouselStyle, slideNumber, totalSlides, slideRole,
      seamlessContext, dbPreset?.tokens
    );
    console.log("[generate-carousel-image] Step 1: Generating background...");
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
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
    let imageBase64: string | null = null;
    let mimeType = "image/png";

    const messageImages = bgData.choices?.[0]?.message?.images;
    if (messageImages && messageImages.length > 0) {
      const imageUrl = messageImages[0].image_url?.url;
      if (imageUrl && imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
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

    // Upload background to storage
    const userId = await resolveUserId(req, supabase);

    const binaryString = atob(imageBase64);
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
    const backgroundUrl = bgUrlData.publicUrl;
    console.log(`[generate-carousel-image] Background uploaded: ${backgroundUrl}`);

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
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 2: Overlay text using overlay-text-canvas ===
    if (textContent && textContent.trim()) {
      console.log("[generate-carousel-image] Step 2: Overlaying text via Satori...");
      
      const dimensions = getPlatformDimensions(platform, carouselStyle);

      // Get dynamic overlay config — DB preset takes priority
      const overlayConfig = getOverlayConfig(
        visualPreset || 'minimalist',
        slideRole,
        dbPreset?.overlay_config
      );
      console.log(`[generate-carousel-image] Overlay config:`, JSON.stringify(overlayConfig));
      
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
              text: textContent,
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
  dbTokens?: any | null
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
    .replace(/text\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/chữ\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/typography.*?(?=\n|$)/gi, '')
    .replace(/font.*?(?=\n|$)/gi, '');

  return `${safeZoneNote}${tokenDirective}${seamlessDirective}${styleDirective}\nVisual concept:\n${cleanedPrompt}`;
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
