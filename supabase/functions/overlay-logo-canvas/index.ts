import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface OverlayRequest {
  baseImageUrl: string;
  logoUrl: string;
  position: LogoPosition;
  logoSizePercent?: number; // Logo size as percentage of image width (default 12%)
  padding?: number; // Padding from edges in pixels (default 20)
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

/**
 * Fetch image and return as base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  // Handle data URLs
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to base64 using chunked approach
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

/**
 * Get image dimensions from base64 PNG/JPEG
 * Simple approach: Use Lovable AI to composite the images
 */
async function compositeWithAI(
  baseImageUrl: string,
  logoUrl: string,
  position: LogoPosition,
  logoSizePercent: number,
  padding: number
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Build position description
  const positionDescriptions: Record<LogoPosition, string> = {
    'top-left': `top-left corner with ${padding}px padding from edges`,
    'top-right': `top-right corner with ${padding}px padding from edges`,
    'bottom-left': `bottom-left corner with ${padding}px padding from edges`,
    'bottom-right': `bottom-right corner with ${padding}px padding from edges`,
  };

  const prompt = `Composite these two images:
1. Use the first image as the base/background
2. Overlay the second image (logo) in the ${positionDescriptions[position]}
3. Scale the logo to approximately ${logoSizePercent}% of the base image width
4. Preserve the logo's transparency if it has any
5. Do not modify the base image content in any way other than adding the logo
6. Output the final composited image`;

  console.log(`[overlay-logo-canvas] Compositing with position: ${position}, size: ${logoSizePercent}%`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: baseImageUrl } },
            { type: "image_url", image_url: { url: logoUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[overlay-logo-canvas] AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Đã vượt giới hạn API. Vui lòng thử lại sau.");
    }
    if (response.status === 402) {
      throw new Error("Hết credits. Vui lòng nạp thêm tại Settings.");
    }
    throw new Error(`AI compositing failed: ${errorText}`);
  }

  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageData) {
    throw new Error("AI did not return composited image");
  }

  return imageData;
}

/**
 * Upload composited image to storage
 */
async function uploadToStorage(
  imageData: string,
  contentId: string,
  channel: string,
  organizationId?: string
): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Remove data URL prefix if present
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  const chunkSize = 8192;
  for (let i = 0; i < binaryString.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, binaryString.length);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }

  const timestamp = Date.now();
  const orgPath = organizationId ? `org-${organizationId}` : 'unassigned';
  const fileName = `social/${orgPath}/${contentId}/${channel}-with-logo-${timestamp}.png`;

  console.log(`[overlay-logo-canvas] Uploading to storage: ${fileName}`);

  const { error: uploadError } = await supabase.storage
    .from("carousel-images")
    .upload(fileName, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("carousel-images")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: OverlayRequest = await req.json();
    const {
      baseImageUrl,
      logoUrl,
      position = 'bottom-right',
      logoSizePercent = 12,
      padding = 20,
      contentId,
      channel,
      organizationId,
    } = body;

    console.log(`[overlay-logo-canvas] Request - Position: ${position}, Size: ${logoSizePercent}%`);

    // Validate required fields
    if (!baseImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Base image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!logoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Logo URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Composite images using AI
    const compositedImage = await compositeWithAI(
      baseImageUrl,
      logoUrl,
      position,
      logoSizePercent,
      padding
    );

    let finalImageUrl = compositedImage;

    // Upload to storage if we have content context
    if (contentId && channel) {
      finalImageUrl = await uploadToStorage(
        compositedImage,
        contentId,
        channel,
        organizationId
      );
    }

    console.log(`[overlay-logo-canvas] Success - Final URL: ${finalImageUrl.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[overlay-logo-canvas] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
