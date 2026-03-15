import satori from "https://esm.sh/satori@0.10.14";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';
type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal' | 'clean' | 'outline' | 'glow';

interface OverlayTextRequest {
  baseImageUrl: string;
  text: string;
  position?: TextPosition;
  typographyStyle?: TypographyStyle;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  padding?: number;
  contentId?: string;
  channel?: string;
  organizationId?: string;
  imageWidth?: number;
  imageHeight?: number;
}

// === Structured Multi-block Overlay (V2) ===
interface StructuredOverlayRequest {
  baseImageUrl: string;
  layout: 'banner_cards' | 'hero_text' | 'simple';
  elements: {
    banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
    heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
    cards?: { items: { icon?: string; label: string }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
    headline?: string;
    cta?: string;
  };
  colors: { primary: string; secondary: string; text: string };
  imageWidth?: number;
  imageHeight?: number;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

function isStructuredRequest(body: any): body is StructuredOverlayRequest {
  return body.layout && body.elements;
}

// Position styles mapping (Flexbox)
function getPositionStyles(position: TextPosition): Record<string, string | number> {
  switch (position) {
    case 'top':
      return { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 60 };
    case 'bottom':
      return { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60 };
    case 'top-left':
      return { alignItems: 'flex-start', justifyContent: 'flex-start', padding: 60 };
    case 'bottom-right':
      return { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 60 };
    case 'center':
    default:
      return { alignItems: 'center', justifyContent: 'center' };
  }
}

// Check if style needs background box
function hasBackground(style: TypographyStyle): boolean {
  const noBackgroundStyles = ['clean', 'outline', 'glow'];
  return !noBackgroundStyles.includes(style);
}

// Typography styles mapping
function getTypographyStyles(style: TypographyStyle): {
  fontWeight: number;
  letterSpacing: string;
  textTransform: string;
  textShadow?: string;
} {
  switch (style) {
    // --- Styles with background box ---
    case 'classic':
      return { fontWeight: 400, letterSpacing: '0.02em', textTransform: 'none' };
    case 'bold':
      return { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' };
    case 'minimal':
      return { fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase' };
    case 'modern':
      return { fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'none' };
    
    // --- Styles WITHOUT background (text-shadow for contrast) ---
    case 'clean':
      return { 
        fontWeight: 600, 
        letterSpacing: '-0.01em', 
        textTransform: 'none',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)'
      };
    case 'outline':
      return { 
        fontWeight: 700, 
        letterSpacing: '0.02em', 
        textTransform: 'none',
        textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 3px 3px 6px rgba(0,0,0,0.5)'
      };
    case 'glow':
      return { 
        fontWeight: 600, 
        letterSpacing: '0.01em', 
        textTransform: 'none',
        textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.5), 2px 2px 8px rgba(0,0,0,0.9)'
      };
      
    default:
      return { fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'none' };
  }
}

/**
 * Load Google Font with Vietnamese support
 */
async function loadGoogleFont(text: string, weight: number = 600): Promise<ArrayBuffer | null> {
  try {
    const fontFamily = 'Be+Vietnam+Pro';
    const encodedText = encodeURIComponent(text);
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weight}&text=${encodedText}`;
    
    console.log(`[overlay-text-canvas] Loading font...`);
    
    const cssResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!cssResponse.ok) {
      console.error(`[overlay-text-canvas] Font CSS fetch failed: ${cssResponse.status}`);
      return null;
    }
    
    const css = await cssResponse.text();
    
    // Extract font URL from CSS
    const fontUrlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2[^)]*)\)/) ||
                         css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
    
    if (!fontUrlMatch) {
      console.error('[overlay-text-canvas] Could not extract font URL');
      return null;
    }
    
    const fontUrl = fontUrlMatch[1];
    console.log(`[overlay-text-canvas] Fetching font...`);
    
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      console.error(`[overlay-text-canvas] Font fetch failed: ${fontResponse.status}`);
      return null;
    }
    
    const fontData = await fontResponse.arrayBuffer();
    console.log(`[overlay-text-canvas] Font loaded: ${fontData.byteLength} bytes`);
    return fontData;
  } catch (error) {
    console.error(`[overlay-text-canvas] Font loading error:`, error);
    return null;
  }
}

/**
 * Calculate dynamic font size based on text length and image dimensions
 */
function calculateFontSize(textLength: number, imageWidth: number, imageHeight: number): number {
  const baseSize = Math.min(imageWidth, imageHeight) * 0.08;
  
  if (textLength < 20) {
    return Math.min(Math.round(baseSize * 1.2), 64);
  } else if (textLength < 50) {
    return Math.min(Math.round(baseSize), 48);
  } else if (textLength < 100) {
    return Math.min(Math.round(baseSize * 0.75), 36);
  } else {
    return Math.min(Math.round(baseSize * 0.6), 28);
  }
}

/**
 * Upload to Supabase storage
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
  const fileName = `social/${orgPath}/${contentId}/${channel}-with-text-${timestamp}.svg`;

  console.log(`[overlay-text-canvas] Uploading to storage: ${fileName}`);

  // Use Blob to avoid request body size issues with large SVGs
  const blob = new Blob([imageBytes], { type: "image/svg+xml" });

  const { error: uploadError } = await supabase.storage
    .from("carousel-images")
    .upload(fileName, blob, {
      contentType: "image/svg+xml",
      upsert: true,
      duplex: "half",
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("carousel-images")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Build the Satori-compatible element tree (plain objects, not JSX)
 */
function buildElement(
  baseImageUrl: string,
  displayText: string,
  positionStyles: Record<string, string | number>,
  typographyConfig: { fontWeight: number; letterSpacing: string; textShadow?: string },
  fontSize: number,
  textColor: string,
  backgroundColor: string,
  padding: number,
  hasCustomFont: boolean,
  imageWidth: number,
  imageHeight: number,
  typographyStyle: TypographyStyle
) {
  const showBackground = hasBackground(typographyStyle);
  
  return {
    type: 'div',
    props: {
      style: {
        width: imageWidth,
        height: imageHeight,
        display: 'flex',
        backgroundImage: `url(${baseImageUrl})`,
        backgroundSize: `${imageWidth}px ${imageHeight}px`,
        backgroundPosition: 'center',
        ...positionStyles,
      },
      children: {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // Only apply background if style needs it
            backgroundColor: showBackground ? backgroundColor : 'transparent',
            padding: showBackground ? `${padding / 2}px ${padding}px` : `${padding / 4}px`,
            borderRadius: showBackground ? 16 : 0,
            maxWidth: '85%',
          },
          children: {
            type: 'span',
            props: {
              style: {
                color: textColor,
                fontSize: fontSize,
                fontFamily: hasCustomFont ? 'Be Vietnam Pro' : 'sans-serif',
                fontWeight: typographyConfig.fontWeight,
                letterSpacing: typographyConfig.letterSpacing,
                textAlign: 'center',
                lineHeight: 1.3,
                // Apply text-shadow for no-background styles
                textShadow: typographyConfig.textShadow || 'none',
              },
              children: displayText,
            },
          },
        },
      },
    },
  };
}

/**
 * Build structured multi-block element tree for Satori
 */
function buildStructuredElement(
  baseImageUrl: string,
  request: StructuredOverlayRequest,
  hasCustomFont: boolean,
  imageWidth: number,
  imageHeight: number,
) {
  const { elements, colors } = request;
  const children: any[] = [];
  const fontFamily = hasCustomFont ? 'Be Vietnam Pro' : 'sans-serif';

  // Banner (top or bottom)
  if (elements.banner) {
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: elements.banner.bgColor || colors.primary,
          padding: '12px 24px',
          width: '100%',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: '#FFFFFF',
              fontSize: Math.round(imageWidth * 0.03),
              fontFamily,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            },
            children: elements.banner.text,
          },
        },
      },
    });
  }

  // Hero text (large centered text)
  if (elements.heroText) {
    const sizeMap = { xl: 0.06, '2xl': 0.08, '3xl': 0.12 };
    const fontSize = Math.round(imageWidth * (sizeMap[elements.heroText.fontSize] || 0.08));
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          flexGrow: 1,
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: colors.primary,
              fontSize,
              fontFamily,
              fontWeight: 700,
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            },
            children: elements.heroText.text,
          },
        },
      },
    });
  }

  // Headline
  if (elements.headline) {
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 32px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: 12,
          maxWidth: '85%',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: colors.text || '#FFFFFF',
              fontSize: Math.round(imageWidth * 0.035),
              fontFamily,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.4,
            },
            children: elements.headline,
          },
        },
      },
    });
  }

  // Cards grid
  if (elements.cards && elements.cards.items.length > 0) {
    const isGrid = elements.cards.layout === 'grid-2x2';
    const cardFontSize = Math.round(imageWidth * 0.02);
    
    const cardElements = elements.cards.items.map(item => ({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 8,
          padding: '10px 16px',
          ...(isGrid ? { width: '48%' } : { flex: '1' }),
        },
        children: [
          ...(item.icon ? [{
            type: 'span',
            props: { style: { fontSize: cardFontSize * 1.2 }, children: item.icon },
          }] : [{
            type: 'div',
            props: {
              style: {
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: colors.primary,
              },
            },
          }]),
          {
            type: 'span',
            props: {
              style: {
                color: '#1a1a1a',
                fontSize: cardFontSize,
                fontFamily,
                fontWeight: 500,
              },
              children: item.label,
            },
          },
        ],
      },
    }));

    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexWrap: isGrid ? 'wrap' : 'nowrap',
          gap: 8,
          padding: '12px 24px',
          justifyContent: 'center',
          ...(isGrid ? { maxWidth: '80%' } : {}),
        },
        children: cardElements,
      },
    });
  }

  // CTA button
  if (elements.cta) {
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 32px',
          backgroundColor: colors.primary,
          borderRadius: 24,
          marginTop: 8,
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: '#FFFFFF',
              fontSize: Math.round(imageWidth * 0.025),
              fontFamily,
              fontWeight: 600,
            },
            children: elements.cta,
          },
        },
      },
    });
  }

  return {
    type: 'div',
    props: {
      style: {
        width: imageWidth,
        height: imageHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: elements.banner ? 'flex-start' : 'center',
        backgroundImage: `url(${baseImageUrl})`,
        backgroundSize: `${imageWidth}px ${imageHeight}px`,
        backgroundPosition: 'center',
      },
      children: children.length === 1 ? children[0] : children,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      baseImageUrl,
      text,
      position = 'center',
      typographyStyle = 'modern',
      textColor = '#FFFFFF',
      backgroundColor = 'rgba(0, 0, 0, 0.6)',
      padding = 40,
      contentId,
      channel,
      organizationId,
      imageWidth = 1200,
      imageHeight = 630,
    } = body;

    console.log(`[overlay-text-canvas] === SATORI TEXT OVERLAY ===`);
    console.log(`[overlay-text-canvas] Text: "${text.substring(0, 50)}..."`);
    console.log(`[overlay-text-canvas] Position: ${position}, Style: ${typographyStyle}`);
    console.log(`[overlay-text-canvas] Dimensions: ${imageWidth}x${imageHeight}`);

    // Validate inputs
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

    const cleanText = text.trim();
    const typographyConfig = getTypographyStyles(typographyStyle);
    const positionStyles = getPositionStyles(position);
    
    // Apply text transform
    const displayText = typographyConfig.textTransform === 'uppercase' 
      ? cleanText.toUpperCase() 
      : cleanText;
    
    // Calculate font size
    const fontSize = calculateFontSize(displayText.length, imageWidth, imageHeight);
    console.log(`[overlay-text-canvas] Font size: ${fontSize}px, Text length: ${displayText.length}`);
    
    // Load font for the text
    const fontData = await loadGoogleFont(displayText, typographyConfig.fontWeight);
    
    // Prepare fonts array for Satori
    type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    const fonts = fontData ? [{
      name: 'Be Vietnam Pro',
      data: fontData,
      weight: typographyConfig.fontWeight as Weight,
      style: 'normal' as const,
    }] : [];

    console.log(`[overlay-text-canvas] Generating SVG with Satori...`);
    console.log(`[overlay-text-canvas] Has background: ${hasBackground(typographyStyle)}`);
    
    // Build the element tree
    const element = buildElement(
      baseImageUrl,
      displayText,
      positionStyles,
      typographyConfig,
      fontSize,
      textColor,
      backgroundColor,
      padding,
      fonts.length > 0,
      imageWidth,
      imageHeight,
      typographyStyle
    );

    // Generate SVG using Satori
    // Satori requires at least one valid font
    if (fonts.length === 0) {
      // If no custom font, load a basic fallback
      console.log(`[overlay-text-canvas] Loading fallback font...`);
      const fallbackFontData = await loadGoogleFont(displayText, 400);
      if (fallbackFontData) {
        fonts.push({
          name: 'Be Vietnam Pro',
          data: fallbackFontData,
          weight: 400 as Weight,
          style: 'normal' as const,
        });
      }
    }
    
    if (fonts.length === 0) {
      throw new Error('Could not load any fonts');
    }
    
    const svg = await satori(element as any, {
      width: imageWidth,
      height: imageHeight,
      fonts,
    });

    console.log(`[overlay-text-canvas] SVG generated: ${svg.length} chars`);

    // Convert SVG string to Uint8Array
    const encoder = new TextEncoder();
    const svgBytes = encoder.encode(svg);

    let finalImageUrl: string;

    if (contentId && channel) {
      finalImageUrl = await uploadToStorage(
        svgBytes,
        contentId,
        channel,
        organizationId
      );
      console.log(`[overlay-text-canvas] Uploaded to: ${finalImageUrl}`);
    } else {
      // Return as base64 data URL
      const base64 = btoa(svg);
      finalImageUrl = `data:image/svg+xml;base64,${base64}`;
      console.log(`[overlay-text-canvas] Returning as base64 data URL`);
    }

    console.log(`[overlay-text-canvas] === SUCCESS ===`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        textRendered: displayText,
        position,
        typographyStyle,
        fontSize,
        format: 'svg',
        dimensions: { width: imageWidth, height: imageHeight },
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
