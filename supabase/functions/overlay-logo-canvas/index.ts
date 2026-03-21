import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';

interface OverlayRequest {
  baseImageUrl: string;
  logoUrl: string;
  position: LogoPosition;
  logoStyle?: LogoStyle;
  logoSizePercent?: number; // Logo size as percentage of image width (default 15%)
  logoOpacity?: number; // Logo opacity 30-100% (default 100)
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
 * Calculate logo position based on position type (supports 9 positions)
 */
function calculatePosition(
  baseWidth: number,
  baseHeight: number,
  logoWidth: number,
  logoHeight: number,
  position: LogoPosition,
  padding: number
): { x: number; y: number } {
  const positions: Record<LogoPosition, { x: number; y: number }> = {
    'top-left': { x: padding, y: padding },
    'top-center': { x: Math.floor((baseWidth - logoWidth) / 2), y: padding },
    'top-right': { x: baseWidth - logoWidth - padding, y: padding },
    'center-left': { x: padding, y: Math.floor((baseHeight - logoHeight) / 2) },
    'center': { x: Math.floor((baseWidth - logoWidth) / 2), y: Math.floor((baseHeight - logoHeight) / 2) },
    'center-right': { x: baseWidth - logoWidth - padding, y: Math.floor((baseHeight - logoHeight) / 2) },
    'bottom-left': { x: padding, y: baseHeight - logoHeight - padding },
    'bottom-center': { x: Math.floor((baseWidth - logoWidth) / 2), y: baseHeight - logoHeight - padding },
    'bottom-right': { x: baseWidth - logoWidth - padding, y: baseHeight - logoHeight - padding },
  };
  return positions[position] || positions['bottom-right'];
}

/**
 * Draw a semi-transparent backdrop behind the logo for visibility
 */
function drawLogoBackdrop(
  baseImg: Image,
  x: number, y: number,
  width: number, height: number,
  backdropPadding: number = 8
): void {
  const bx = Math.max(0, x - backdropPadding);
  const by = Math.max(0, y - backdropPadding);
  const bw = Math.min(baseImg.width - bx, width + backdropPadding * 2);
  const bh = Math.min(baseImg.height - by, height + backdropPadding * 2);

  const backdrop = new Image(bw, bh);
  backdrop.fill(0x00000066); // ~40% opacity black
  baseImg.composite(backdrop, bx, by);
}

/**
 * Apply logo style effects using ImageScript's opacity method
 */
async function applyLogoStyle(
  logoImg: Image,
  style: LogoStyle,
  opacity: number,
): Promise<Image> {
  // Apply opacity first (30-100%) using ImageScript's built-in opacity method
  if (opacity < 100) {
    const opacityFactor = opacity / 100;
    logoImg.opacity(opacityFactor, false); // false = don't premultiply alpha
  }
  
  // Apply style-specific effects
  switch (style) {
    case 'subtle':
      // Additional opacity reduction for watermark effect
      logoImg.opacity(0.5, false);
      break;
    // Other styles (shadow, glass, pill) would need more complex rendering
    // For now, they default to clean
    case 'shadow':
    case 'glass':
    case 'pill':
    case 'outline':
    case 'clean':
    default:
      // No additional processing needed
      break;
  }
  
  return logoImg;
}

/**
 * Composite images using ImageScript (canvas-based, no AI)
 */
async function compositeImages(
  baseImageBytes: Uint8Array,
  logoBytes: Uint8Array,
  position: LogoPosition,
  logoStyle: LogoStyle,
  logoSizePercent: number,
  logoOpacity: number,
  padding: number
): Promise<Uint8Array> {
  console.log(`[overlay-logo-canvas] Decoding base image (${baseImageBytes.length} bytes)...`);
  const baseImg = await Image.decode(baseImageBytes);
  console.log(`[overlay-logo-canvas] Base image dimensions: ${baseImg.width}x${baseImg.height}`);

  // Resize base image to max 800px width for Zalo OA compatibility (<1MB)
  if (baseImg.width > 800) {
    const newHeight = Math.floor(baseImg.height * (800 / baseImg.width));
    console.log(`[overlay-logo-canvas] Resizing base image from ${baseImg.width}x${baseImg.height} to 800x${newHeight}`);
    baseImg.resize(800, newHeight);
  }
  
  // Validate base image
  if (baseImg.width === 0 || baseImg.height === 0) {
    throw new Error(`Invalid base image dimensions: ${baseImg.width}x${baseImg.height}`);
  }
  
  console.log(`[overlay-logo-canvas] Decoding logo (${logoBytes.length} bytes)...`);
  let logoImg = await Image.decode(logoBytes);
  console.log(`[overlay-logo-canvas] Logo dimensions: ${logoImg.width}x${logoImg.height}`);
  
  // Validate logo
  if (logoImg.width === 0 || logoImg.height === 0) {
    throw new Error(`Invalid logo dimensions: ${logoImg.width}x${logoImg.height}`);
  }
  
  // Calculate new logo size based on percentage of base image width
  const targetLogoWidth = Math.floor(baseImg.width * (logoSizePercent / 100));
  const aspectRatio = logoImg.height / logoImg.width;
  const targetLogoHeight = Math.floor(targetLogoWidth * aspectRatio);
  
  console.log(`[overlay-logo-canvas] Resizing logo from ${logoImg.width}x${logoImg.height} to ${targetLogoWidth}x${targetLogoHeight}`);
  
  // Resize logo
  logoImg.resize(targetLogoWidth, targetLogoHeight);
  
  // Apply style effects (opacity, watermark, etc.)
  console.log(`[overlay-logo-canvas] Applying style: ${logoStyle}, opacity: ${logoOpacity}%`);
  logoImg = await applyLogoStyle(logoImg, logoStyle, logoOpacity);
  
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
  
  // Draw semi-transparent backdrop behind logo for visibility
  drawLogoBackdrop(baseImg, x, y, targetLogoWidth, targetLogoHeight);
  
  // Composite logo onto base image
  baseImg.composite(logoImg, x, y);
  
  // Encode to JPEG (quality 80%) for smaller file size (<1MB for Zalo OA)
  const resultBytes = await baseImg.encodeJPEG(80);
  console.log(`[overlay-logo-canvas] Composite complete, output size: ${resultBytes.length} bytes (JPEG)`);
  
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
      logoStyle = 'clean',
      logoSizePercent = 15,
      logoOpacity: rawLogoOpacity = 100,
      padding = 20,
      contentId,
      channel,
      organizationId,
    } = body;

    // Enforce minimum opacity of 50% for visibility on complex backgrounds
    const logoOpacity = Math.max(rawLogoOpacity, 50);

    console.log(`[overlay-logo-canvas] Request - Position: ${position}, Style: ${logoStyle}, Size: ${logoSizePercent}%, Opacity: ${rawLogoOpacity}% → effective: ${logoOpacity}%`);

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
      logoStyle,
      logoSizePercent,
      logoOpacity,
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
