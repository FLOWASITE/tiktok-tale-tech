import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'subtle';

interface OverlayRequest {
  baseImageUrl: string;
  logoUrl: string;
  position: LogoPosition;
  logoStyle?: LogoStyle;
  logoSizePercent?: number;
  logoOpacity?: number;
  padding?: number;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

/** Fetch image as Uint8Array */
async function fetchImageBytes(url: string): Promise<Uint8Array> {
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
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Calculate logo position (9 positions) */
function calculatePosition(
  baseW: number, baseH: number,
  logoW: number, logoH: number,
  position: LogoPosition, padding: number
): { x: number; y: number } {
  const positions: Record<LogoPosition, { x: number; y: number }> = {
    'top-left': { x: padding, y: padding },
    'top-center': { x: Math.floor((baseW - logoW) / 2), y: padding },
    'top-right': { x: baseW - logoW - padding, y: padding },
    'center-left': { x: padding, y: Math.floor((baseH - logoH) / 2) },
    'center': { x: Math.floor((baseW - logoW) / 2), y: Math.floor((baseH - logoH) / 2) },
    'center-right': { x: baseW - logoW - padding, y: Math.floor((baseH - logoH) / 2) },
    'bottom-left': { x: padding, y: baseH - logoH - padding },
    'bottom-center': { x: Math.floor((baseW - logoW) / 2), y: baseH - logoH - padding },
    'bottom-right': { x: baseW - logoW - padding, y: baseH - logoH - padding },
  };
  return positions[position] || positions['bottom-right'];
}

/**
 * Draw a rounded rectangle backdrop (frosted glass effect)
 * Uses pixel-level masking for rounded corners
 */
function drawGlassBackdrop(
  baseImg: Image,
  x: number, y: number,
  width: number, height: number,
  backdropPadding: number,
  radius: number
): void {
  const bx = Math.max(0, x - backdropPadding);
  const by = Math.max(0, y - backdropPadding);
  const bw = Math.min(baseImg.width - bx, width + backdropPadding * 2);
  const bh = Math.min(baseImg.height - by, height + backdropPadding * 2);

  const backdrop = new Image(bw, bh);
  // White frosted glass: rgba(255, 255, 255, 0.18)
  const glassColor = 0xFFFFFF2E; // white with ~18% opacity

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      // Check if pixel is inside rounded rect
      if (isInsideRoundedRect(px, py, bw, bh, radius)) {
        backdrop.setPixelAt(px + 1, py + 1, glassColor);
      }
    }
  }
  baseImg.composite(backdrop, bx, by);
}

/** Check if point is inside a rounded rectangle */
function isInsideRoundedRect(
  px: number, py: number,
  w: number, h: number,
  r: number
): boolean {
  r = Math.min(r, w / 2, h / 2);
  // Check corners
  if (px < r && py < r) {
    return (px - r) ** 2 + (py - r) ** 2 <= r ** 2;
  }
  if (px >= w - r && py < r) {
    return (px - (w - r)) ** 2 + (py - r) ** 2 <= r ** 2;
  }
  if (px < r && py >= h - r) {
    return (px - r) ** 2 + (py - (h - r)) ** 2 <= r ** 2;
  }
  if (px >= w - r && py >= h - r) {
    return (px - (w - r)) ** 2 + (py - (h - r)) ** 2 <= r ** 2;
  }
  return true;
}

/**
 * Create a drop shadow by compositing a darkened copy behind the logo
 */
function drawDropShadow(
  baseImg: Image,
  logoImg: Image,
  x: number, y: number,
  offsetX: number, offsetY: number
): void {
  // Create shadow: clone logo, fill all opaque pixels with black at 30% opacity
  const shadow = logoImg.clone();
  const w = shadow.width;
  const h = shadow.height;

  for (let py = 1; py <= h; py++) {
    for (let px = 1; px <= w; px++) {
      const pixel = shadow.getPixelAt(px, py);
      const alpha = pixel & 0xFF; // extract alpha
      if (alpha > 0) {
        // Black with reduced alpha (~30% of original alpha)
        const shadowAlpha = Math.floor(alpha * 0.3);
        shadow.setPixelAt(px, py, (0x000000 << 8) | shadowAlpha);
      }
    }
  }

  // Composite shadow offset behind logo
  const sx = Math.max(0, x + offsetX);
  const sy = Math.max(0, y + offsetY);
  baseImg.composite(shadow, sx, sy);
}

/**
 * Apply logo style and return processed logo
 */
function applyLogoStyle(
  logoImg: Image,
  style: LogoStyle,
  opacity: number
): Image {
  // Apply base opacity (50-100%)
  if (opacity < 100) {
    logoImg.opacity(opacity / 100, false);
  }

  if (style === 'subtle') {
    // Watermark: reduce to 40% opacity
    logoImg.opacity(0.4, false);
  }

  return logoImg;
}

/** Composite images with refined aesthetics */
async function compositeImages(
  baseImageBytes: Uint8Array,
  logoBytes: Uint8Array,
  position: LogoPosition,
  logoStyle: LogoStyle,
  logoSizePercent: number,
  logoOpacity: number,
  padding: number,
  channel?: string
): Promise<{ bytes: Uint8Array; format: 'png' | 'jpeg' }> {
  const baseImg = await Image.decode(baseImageBytes);
  console.log(`[overlay-logo] Base: ${baseImg.width}x${baseImg.height}`);

  // Channel-specific resize
  const isZalo = channel === 'zalo_oa';
  const maxWidth = isZalo ? 1280 : 1200;
  if (baseImg.width > maxWidth) {
    const newH = Math.floor(baseImg.height * (maxWidth / baseImg.width));
    baseImg.resize(maxWidth, newH);
  }

  if (baseImg.width === 0 || baseImg.height === 0) {
    throw new Error(`Invalid base image: ${baseImg.width}x${baseImg.height}`);
  }

  let logoImg = await Image.decode(logoBytes);
  if (logoImg.width === 0 || logoImg.height === 0) {
    throw new Error(`Invalid logo: ${logoImg.width}x${logoImg.height}`);
  }

  // Resize logo
  const targetW = Math.floor(baseImg.width * (logoSizePercent / 100));
  const targetH = Math.floor(targetW * (logoImg.height / logoImg.width));
  logoImg.resize(targetW, targetH);

  // Apply opacity + style
  logoImg = applyLogoStyle(logoImg, logoStyle, logoOpacity);

  // Calculate position
  const { x, y } = calculatePosition(
    baseImg.width, baseImg.height,
    targetW, targetH,
    position, padding
  );

  console.log(`[overlay-logo] Style: ${logoStyle}, Pos: (${x},${y}), Size: ${targetW}x${targetH}`);

  // Style-specific backdrop/effects
  switch (logoStyle) {
    case 'shadow':
      // Drop shadow: offset 3px down-right, 30% opacity black
      drawDropShadow(baseImg, logoImg, x, y, 3, 3);
      break;

    case 'glass':
    case 'pill':
      // Frosted glass backdrop with rounded corners
      drawGlassBackdrop(baseImg, x, y, targetW, targetH, 12, 10);
      break;

    case 'subtle':
    case 'clean':
    default:
      // No backdrop — logo sits directly on image
      break;
  }

  // Composite logo
  baseImg.composite(logoImg, x, y);

  // Output: PNG for quality (Zalo OA gets JPEG for size limit)
  if (isZalo) {
    const bytes = await baseImg.encodeJPEG(90);
    console.log(`[overlay-logo] Output: JPEG ${bytes.length} bytes (Zalo OA)`);
    return { bytes, format: 'jpeg' };
  }

  const bytes = await baseImg.encode();
  console.log(`[overlay-logo] Output: PNG ${bytes.length} bytes`);
  return { bytes, format: 'png' };
}

/** Upload to storage */
async function uploadToStorage(
  imageBytes: Uint8Array,
  format: 'png' | 'jpeg',
  contentId: string,
  channel: string,
  organizationId?: string
): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ext = format === 'png' ? 'png' : 'jpg';
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const orgPath = organizationId ? `org-${organizationId}` : 'unassigned';
  const fileName = `social/${orgPath}/${contentId}/${channel}-with-logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("carousel-images")
    .upload(fileName, imageBytes, { contentType: mime, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from("carousel-images").getPublicUrl(fileName);
  return data.publicUrl;
}

Deno.serve(withPerf({ functionName: 'overlay-logo-canvas', slowThresholdMs: 30000 }, async (req) => {
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
      logoOpacity: rawOpacity = 100,
      padding = 30,
      contentId,
      channel,
      organizationId,
    } = body;

    const logoOpacity = Math.max(rawOpacity, 50);

    if (!baseImageUrl || !logoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Base image URL and Logo URL are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [baseImageBytes, logoBytes] = await Promise.all([
      fetchImageBytes(baseImageUrl),
      fetchImageBytes(logoUrl),
    ]);

    const { bytes, format } = await compositeImages(
      baseImageBytes, logoBytes,
      position, logoStyle, logoSizePercent, logoOpacity, padding, channel
    );

    let finalImageUrl: string;
    if (contentId && channel) {
      finalImageUrl = await uploadToStorage(bytes, format, contentId, channel, organizationId);
    } else {
      const base64 = btoa(String.fromCharCode(...bytes));
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      finalImageUrl = `data:${mime};base64,${base64}`;
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: finalImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[overlay-logo-canvas] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
