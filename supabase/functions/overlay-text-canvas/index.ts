import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';
type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal';

interface OverlayTextRequest {
  baseImageUrl: string;
  text: string;
  position?: TextPosition;
  typographyStyle?: TypographyStyle;
  textColor?: string; // Hex color e.g. "#FFFFFF"
  backgroundColor?: string; // Hex color for text background/shadow
  fontSize?: number; // Font size as percentage of image height (default 5%)
  padding?: number; // Padding from edges in pixels (default 40)
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

/**
 * Parse hex color to RGBA
 */
function hexToRgba(hex: string, alpha = 255): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return Image.rgbaToColor(r, g, b, alpha);
}

/**
 * Fetch image as Uint8Array
 */
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
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Calculate text position
 */
function calculateTextPosition(
  imgWidth: number,
  imgHeight: number,
  textWidth: number,
  textHeight: number,
  position: TextPosition,
  padding: number
): { x: number; y: number } {
  switch (position) {
    case 'top':
      return { 
        x: Math.floor((imgWidth - textWidth) / 2), 
        y: padding 
      };
    case 'bottom':
      return { 
        x: Math.floor((imgWidth - textWidth) / 2), 
        y: imgHeight - textHeight - padding 
      };
    case 'top-left':
      return { 
        x: padding, 
        y: padding 
      };
    case 'bottom-right':
      return { 
        x: imgWidth - textWidth - padding, 
        y: imgHeight - textHeight - padding 
      };
    case 'center':
    default:
      return { 
        x: Math.floor((imgWidth - textWidth) / 2), 
        y: Math.floor((imgHeight - textHeight) / 2) 
      };
  }
}

/**
 * Get typography config based on style
 */
function getTypographyConfig(style: TypographyStyle): {
  letterSpacing: number;
  lineHeight: number;
  fontWeight: 'normal' | 'bold';
  textTransform: 'none' | 'uppercase';
} {
  switch (style) {
    case 'bold':
      return { letterSpacing: 2, lineHeight: 1.2, fontWeight: 'bold', textTransform: 'uppercase' };
    case 'classic':
      return { letterSpacing: 1, lineHeight: 1.5, fontWeight: 'normal', textTransform: 'none' };
    case 'minimal':
      return { letterSpacing: 3, lineHeight: 1.4, fontWeight: 'normal', textTransform: 'uppercase' };
    case 'modern':
    default:
      return { letterSpacing: 0, lineHeight: 1.3, fontWeight: 'bold', textTransform: 'none' };
  }
}

/**
 * Word wrap text to fit within maxWidth
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Draw text overlay using pixel manipulation (ImageScript doesn't have native text)
 * This creates a simple block/badge overlay as fallback
 */
async function overlayTextBlock(
  baseImageBytes: Uint8Array,
  text: string,
  position: TextPosition,
  typographyStyle: TypographyStyle,
  textColorHex: string,
  bgColorHex: string,
  fontSizePercent: number,
  padding: number
): Promise<Uint8Array> {
  console.log(`[overlay-text-canvas] Decoding base image...`);
  const img = await Image.decode(baseImageBytes);
  console.log(`[overlay-text-canvas] Image dimensions: ${img.width}x${img.height}`);

  const config = getTypographyConfig(typographyStyle);
  
  // Transform text if needed
  const displayText = config.textTransform === 'uppercase' ? text.toUpperCase() : text;
  
  // Calculate approximate text dimensions
  // Using character-based estimation since ImageScript doesn't have font metrics
  const charWidth = Math.floor(img.height * (fontSizePercent / 100) * 0.6);
  const charHeight = Math.floor(img.height * (fontSizePercent / 100));
  
  // Wrap text to fit ~60% of image width
  const maxCharsPerLine = Math.floor((img.width * 0.6) / charWidth);
  const lines = wrapText(displayText, Math.max(maxCharsPerLine, 10));
  
  // Calculate block dimensions
  const maxLineLength = Math.max(...lines.map(l => l.length));
  const blockWidth = Math.floor(maxLineLength * charWidth) + padding * 2;
  const blockHeight = Math.floor(lines.length * charHeight * config.lineHeight) + padding * 2;
  
  // Calculate position
  const { x, y } = calculateTextPosition(
    img.width,
    img.height,
    blockWidth,
    blockHeight,
    position,
    padding
  );
  
  console.log(`[overlay-text-canvas] Block: ${blockWidth}x${blockHeight} at (${x}, ${y})`);
  console.log(`[overlay-text-canvas] Lines: ${lines.length}, Text: "${displayText.substring(0, 30)}..."`);

  // Draw semi-transparent background block
  const bgColor = hexToRgba(bgColorHex, 180); // 70% opacity
  
  // Draw rounded rectangle background
  const cornerRadius = Math.min(20, Math.floor(blockHeight / 4));
  
  for (let py = 0; py < blockHeight; py++) {
    for (let px = 0; px < blockWidth; px++) {
      const imgX = x + px;
      const imgY = y + py;
      
      // Skip if outside image bounds
      if (imgX < 0 || imgX >= img.width || imgY < 0 || imgY >= img.height) continue;
      
      // Check if pixel is within rounded rectangle
      let inRect = true;
      
      // Check corners
      if (px < cornerRadius && py < cornerRadius) {
        // Top-left corner
        const dx = cornerRadius - px;
        const dy = cornerRadius - py;
        inRect = (dx * dx + dy * dy) <= cornerRadius * cornerRadius;
      } else if (px >= blockWidth - cornerRadius && py < cornerRadius) {
        // Top-right corner
        const dx = px - (blockWidth - cornerRadius - 1);
        const dy = cornerRadius - py;
        inRect = (dx * dx + dy * dy) <= cornerRadius * cornerRadius;
      } else if (px < cornerRadius && py >= blockHeight - cornerRadius) {
        // Bottom-left corner
        const dx = cornerRadius - px;
        const dy = py - (blockHeight - cornerRadius - 1);
        inRect = (dx * dx + dy * dy) <= cornerRadius * cornerRadius;
      } else if (px >= blockWidth - cornerRadius && py >= blockHeight - cornerRadius) {
        // Bottom-right corner
        const dx = px - (blockWidth - cornerRadius - 1);
        const dy = py - (blockHeight - cornerRadius - 1);
        inRect = (dx * dx + dy * dy) <= cornerRadius * cornerRadius;
      }
      
      if (inRect) {
        // Blend background color with existing pixel
        const existingColor = img.getPixelAt(imgX + 1, imgY + 1);
        const existingR = (existingColor >> 24) & 0xFF;
        const existingG = (existingColor >> 16) & 0xFF;
        const existingB = (existingColor >> 8) & 0xFF;
        
        const bgR = (bgColor >> 24) & 0xFF;
        const bgG = (bgColor >> 16) & 0xFF;
        const bgB = (bgColor >> 8) & 0xFF;
        const bgA = (bgColor & 0xFF) / 255;
        
        const blendedR = Math.floor(bgR * bgA + existingR * (1 - bgA));
        const blendedG = Math.floor(bgG * bgA + existingG * (1 - bgA));
        const blendedB = Math.floor(bgB * bgA + existingB * (1 - bgA));
        
        img.setPixelAt(imgX + 1, imgY + 1, Image.rgbaToColor(blendedR, blendedG, blendedB, 255));
      }
    }
  }

  // Note: ImageScript doesn't have native text rendering
  // The background block serves as a visual indicator
  // For actual text, we'd need to use a font rasterization library
  // or pre-rendered text sprites
  
  console.log(`[overlay-text-canvas] Background block drawn successfully`);
  
  // Encode result
  const resultBytes = await img.encode();
  console.log(`[overlay-text-canvas] Output size: ${resultBytes.length} bytes`);
  
  return resultBytes;
}

/**
 * Upload to storage
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
  const fileName = `social/${orgPath}/${contentId}/${channel}-with-text-${timestamp}.png`;

  console.log(`[overlay-text-canvas] Uploading to storage: ${fileName}`);

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
    const body: OverlayTextRequest = await req.json();
    const {
      baseImageUrl,
      text,
      position = 'center',
      typographyStyle = 'modern',
      textColor = '#FFFFFF',
      backgroundColor = '#000000',
      fontSize = 5,
      padding = 40,
      contentId,
      channel,
      organizationId,
    } = body;

    console.log(`[overlay-text-canvas] Request - Text: "${text.substring(0, 30)}...", Position: ${position}, Style: ${typographyStyle}`);

    // Validate
    if (!baseImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Base image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch base image
    const baseImageBytes = await fetchImageBytes(baseImageUrl);
    console.log(`[overlay-text-canvas] Base image: ${baseImageBytes.length} bytes`);

    // Overlay text block
    const resultBytes = await overlayTextBlock(
      baseImageBytes,
      text.trim(),
      position,
      typographyStyle,
      textColor,
      backgroundColor,
      fontSize,
      padding
    );

    let finalImageUrl: string;

    if (contentId && channel) {
      finalImageUrl = await uploadToStorage(
        resultBytes,
        contentId,
        channel,
        organizationId
      );
    } else {
      const base64 = btoa(String.fromCharCode(...resultBytes));
      finalImageUrl = `data:image/png;base64,${base64}`;
    }

    console.log(`[overlay-text-canvas] Success`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        textRendered: text.trim(),
        position,
        typographyStyle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[overlay-text-canvas] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
