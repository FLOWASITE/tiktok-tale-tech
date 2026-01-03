import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

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
 * Fetch image as Uint8Array
 */
async function fetchImageBytes(url: string): Promise<Uint8Array> {
  // Handle data URLs
  if (url.startsWith('data:')) {
    const base64Data = url.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Calculate logo position based on position type
 */
function calculatePosition(
  baseWidth: number,
  baseHeight: number,
  logoWidth: number,
  logoHeight: number,
  position: LogoPosition,
  padding: number
): { x: number; y: number } {
  switch (position) {
    case 'top-left':
      return { x: padding, y: padding };
    case 'top-right':
      return { x: baseWidth - logoWidth - padding, y: padding };
    case 'bottom-left':
      return { x: padding, y: baseHeight - logoHeight - padding };
    case 'bottom-right':
    default:
      return { x: baseWidth - logoWidth - padding, y: baseHeight - logoHeight - padding };
  }
}

/**
 * Composite images using ImageScript (canvas-based, no AI)
 */
async function compositeImages(
  baseImageBytes: Uint8Array,
  logoBytes: Uint8Array,
  position: LogoPosition,
  logoSizePercent: number,
  padding: number
): Promise<Uint8Array> {
  console.log(`[overlay-logo-canvas] Decoding base image...`);
  const baseImg = await Image.decode(baseImageBytes);
  
  console.log(`[overlay-logo-canvas] Decoding logo...`);
  const logoImg = await Image.decode(logoBytes);
  
  // Calculate new logo size based on percentage of base image width
  const targetLogoWidth = Math.floor(baseImg.width * (logoSizePercent / 100));
  const aspectRatio = logoImg.height / logoImg.width;
  const targetLogoHeight = Math.floor(targetLogoWidth * aspectRatio);
  
  console.log(`[overlay-logo-canvas] Resizing logo from ${logoImg.width}x${logoImg.height} to ${targetLogoWidth}x${targetLogoHeight}`);
  
  // Resize logo
  logoImg.resize(targetLogoWidth, targetLogoHeight);
  
  // Calculate position
  const { x, y } = calculatePosition(
    baseImg.width,
    baseImg.height,
    targetLogoWidth,
    targetLogoHeight,
    position,
    padding
  );
  
  console.log(`[overlay-logo-canvas] Compositing at position (${x}, ${y})`);
  
  // Composite logo onto base image
  baseImg.composite(logoImg, x, y);
  
  // Encode to PNG
  const resultBytes = await baseImg.encode();
  console.log(`[overlay-logo-canvas] Composite complete, output size: ${resultBytes.length} bytes`);
  
  return resultBytes;
}

/**
 * Upload composited image to storage
 */
async function uploadToStorage(
  imageBytes: Uint8Array,
  contentId: string,
  channel: string,
  organizationId?: string
): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const timestamp = Date.now();
  const orgPath = organizationId ? `org-${organizationId}` : 'unassigned';
  const fileName = `social/${orgPath}/${contentId}/${channel}-with-logo-${timestamp}.png`;

  console.log(`[overlay-logo-canvas] Uploading to storage: ${fileName}`);

  const { error: uploadError } = await supabase.storage
    .from("carousel-images")
    .upload(fileName, imageBytes, {
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

    // Fetch both images
    console.log(`[overlay-logo-canvas] Fetching images...`);
    const [baseImageBytes, logoBytes] = await Promise.all([
      fetchImageBytes(baseImageUrl),
      fetchImageBytes(logoUrl),
    ]);

    console.log(`[overlay-logo-canvas] Base image: ${baseImageBytes.length} bytes, Logo: ${logoBytes.length} bytes`);

    // Composite images using canvas-based approach (no AI)
    const compositedBytes = await compositeImages(
      baseImageBytes,
      logoBytes,
      position,
      logoSizePercent,
      padding
    );

    let finalImageUrl: string;

    // Upload to storage if we have content context
    if (contentId && channel) {
      finalImageUrl = await uploadToStorage(
        compositedBytes,
        contentId,
        channel,
        organizationId
      );
    } else {
      // Return as base64 data URL
      const base64 = btoa(String.fromCharCode(...compositedBytes));
      finalImageUrl = `data:image/png;base64,${base64}`;
    }

    console.log(`[overlay-logo-canvas] Success - Final URL length: ${finalImageUrl.length}`);

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
