import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface OverlayRequest {
  imageUrl: string;
  logoUrl: string;
  position?: LogoPosition;
  logoScale?: number; // 0.05 to 0.25 (5% to 25% of image width)
  padding?: number; // pixels from edge
  contentId: string;
  channel: string;
}

Deno.serve(withPerf({ functionName: 'overlay-brand-logo', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const userId = await resolveUserId(req, supabase);

    const {
      imageUrl,
      logoUrl,
      position = "bottom-right",
      logoScale = 0.12,
      padding = 20,
      contentId,
      channel,
    }: OverlayRequest = await req.json();

    console.log(`[overlay-brand-logo] Overlaying logo at ${position} for ${channel}`);

    // Fetch the base image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch base image");
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();

    // Fetch the logo
    const logoResponse = await fetch(logoUrl);
    if (!logoResponse.ok) {
      throw new Error("Failed to fetch logo");
    }
    const logoArrayBuffer = await logoResponse.arrayBuffer();

    // Use Canvas API via Deno to composite images
    // Note: For production, consider using a more robust image library
    // This implementation uses a simple approach with base64 manipulation
    
    // For now, we'll use the Lovable AI to do the image composition
    // since Deno doesn't have native canvas support without external deps
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert images to base64 for AI processing (chunked to avoid stack overflow)
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    };

    const imageBase64 = arrayBufferToBase64(imageArrayBuffer);
    const logoBase64 = arrayBufferToBase64(logoArrayBuffer);

    // Determine position description
    const positionDesc: Record<LogoPosition, string> = {
      "top-left": "top-left corner",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-right": "bottom-right corner",
    };

    // Use Gemini to edit the image and add logo
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Add this logo to the ${positionDesc[position]} of the main image. The logo should be small (about ${Math.round(logoScale * 100)}% of image width) with ${padding}px padding from the edges. Keep the logo crisp and clear. Preserve the original image quality exactly as is - only add the logo overlay.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${logoBase64}`,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[overlay-brand-logo] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const editedImageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageData) {
      console.error("[overlay-brand-logo] No image in response");
      throw new Error("Failed to overlay logo");
    }

    // Upload the final image
    const finalBase64 = editedImageData.replace(/^data:image\/\w+;base64,/, "");
    const finalBytes = Uint8Array.from(atob(finalBase64), (c) => c.charCodeAt(0));

    const fileName = `${contentId}/${channel}-final-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("carousel-images")
      .upload(fileName, finalBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("carousel-images")
      .getPublicUrl(fileName);

    console.log("[overlay-brand-logo] Final image uploaded:", publicUrlData.publicUrl);

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const model = "google/gemini-3-pro-image-preview";
    const estimatedCostUsd = isImageModel(model) ? estimateImageCost(model) : estimateCost(model, 500, 0);
    saveMetrics(supabase, {
      traceId,
      functionName: 'overlay-brand-logo',
      userId,
      totalDurationMs,
      aiCallDurationMs: totalDurationMs,
      inputTokensEstimated: 500,
      outputTokensEstimated: 0,
      estimatedCostUsd,
      modelsUsed: { image: model },
      hadError: false,
      contextSources: [],
      channels: [channel],
      contentId,
      actionType: 'image_edit',
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrlData.publicUrl,
        position,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[overlay-brand-logo] Error:", error);

    // Save error metrics
    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      saveMetrics(supabase, {
        traceId,
        functionName: 'overlay-brand-logo',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_edit',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
