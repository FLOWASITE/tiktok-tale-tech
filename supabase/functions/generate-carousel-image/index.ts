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
  // Gallery: middle slides are visual-only (no text overlay)
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
// Overlay Config Matrix — per visual preset + slide role
// ============================================
function getOverlayConfig(visualPreset: string, slideRole: string): Record<string, any> {
  const OVERLAY_MATRIX: Record<string, Record<string, any>> = {
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

  const styleConfig = OVERLAY_MATRIX[visualPreset];
  if (!styleConfig) return OVERLAY_MATRIX.minimalist.body;
  return styleConfig[slideRole] || styleConfig['body'] || OVERLAY_MATRIX.minimalist.body;
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
            carouselStyle, totalSlides, slideObjective, visualPreset } = requestBody;

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

    // === STEP 0: Get AI config for model selection ===
    const aiConfig = await getAIConfig('generate-carousel-image');
    const imageModel = aiConfig.model;
    console.log(`[generate-carousel-image] Using model: ${imageModel}`);

    // === STEP 1: Generate background image (no text) ===
    const backgroundPrompt = buildBackgroundPrompt(prompt, platform, carouselStyle, slideNumber, totalSlides, slideRole);
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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
      
      const dimensions = getPlatformDimensions(platform);

      // Get dynamic overlay config based on visual preset + slide role
      const overlayConfig = getOverlayConfig(visualPreset || 'minimalist', slideRole);
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
              // Dynamic overlay params from preset matrix
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
 * Build a background-only prompt: strips text rendering instructions,
 * focuses on visual composition with safe zones for overlay.
 */
function buildBackgroundPrompt(
  originalPrompt: string,
  platform?: string,
  carouselStyle?: string,
  slideNumber?: number,
  totalSlides?: number,
  slideRole?: string
): string {
  let safeZoneNote = `
CRITICAL INSTRUCTIONS:
- Do NOT render any text, letters, words, or typography on the image.
- This is a BACKGROUND image only — text will be overlaid programmatically.
- Leave 15% blank space at top and 20% at bottom for text overlay.
- Focus on mood, atmosphere, colors, and visual composition.
- High resolution, professional photography or illustration quality.
`;

  // Gallery hook: add dark gradient instruction for text readability
  if (carouselStyle === 'gallery' && slideRole === 'hook') {
    safeZoneNote += '\nThe image MUST have a natural dark gradient at the bottom third (like a sunset darkening toward horizon) to ensure white text readability. Do NOT add any text or graphics.';
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
      // Gallery visual slides: maximum cinematic quality
      styleDirective = `
GALLERY / CINEMATIC VISUAL:
- This is a FULL-BLEED cinematic photograph with NO text, NO graphics, NO UI elements, NO overlays whatsoever.
- Professional editorial photography quality, 8K resolution clarity.
- Dramatic natural lighting with depth of field.
- Rich vivid colors, strong composition following rule of thirds.
- This image will be displayed at full resolution with nothing on top of it — visual quality is the ONLY priority.
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

  return `${safeZoneNote}\n${styleDirective}\nVisual concept:\n${cleanedPrompt}`;
}

function getPlatformDimensions(platform?: string): { width: number; height: number } {
  switch (platform) {
    case 'tiktok':
      return { width: 1080, height: 1920 };
    case 'facebook':
    default:
      return { width: 1080, height: 1080 };
  }
}
