import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const { prompt, carouselId, slideNumber, textContent, brandColors, platform, carouselStyle, totalSlides } = await req.json();

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

    // === STEP 1: Generate background image (no text) ===
    const backgroundPrompt = buildBackgroundPrompt(prompt, platform);
    console.log("[generate-carousel-image] Step 1: Generating background...");
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const bgResponse = await fetch(
      "https://ai-gateway.lovable.dev/v1beta/models/google/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: backgroundPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
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
      if (errorText.includes("CREDITS_EXHAUSTED") || errorText.includes("credits")) {
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

    if (bgData.candidates && bgData.candidates[0]?.content?.parts) {
      for (const part of bgData.candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          break;
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

    // === STEP 2: Overlay text using overlay-text-canvas ===
    if (textContent && textContent.trim()) {
      console.log("[generate-carousel-image] Step 2: Overlaying text via Satori...");
      
      const dimensions = getPlatformDimensions(platform);
      
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
    const model = "google/gemini-3-pro-image-preview";
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
function buildBackgroundPrompt(originalPrompt: string, platform?: string): string {
  const safeZoneNote = `
CRITICAL INSTRUCTIONS:
- Do NOT render any text, letters, words, or typography on the image.
- This is a BACKGROUND image only — text will be overlaid programmatically.
- Leave 15% blank space at top and 20% at bottom for text overlay.
- Focus on mood, atmosphere, colors, and visual composition.
- High resolution, professional photography or illustration quality.
`;
  
  // Clean prompt: remove text-rendering directives
  const cleanedPrompt = originalPrompt
    .replace(/text\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/chữ\s*[:：].*?(?=\n|$)/gi, '')
    .replace(/typography.*?(?=\n|$)/gi, '')
    .replace(/font.*?(?=\n|$)/gi, '');

  return `${safeZoneNote}\n\nVisual concept:\n${cleanedPrompt}`;
}

function getPlatformDimensions(platform?: string): { width: number; height: number } {
  switch (platform) {
    case 'tiktok':
      return { width: 1080, height: 1920 }; // 9:16
    case 'facebook':
    default:
      return { width: 1080, height: 1080 }; // 1:1
  }
}
