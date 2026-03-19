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

// === Style-Adaptive Overlay Themes (V2 — Design System) ===
interface OverlayStyleTheme {
  bannerBg: string;       // Banner background (rgba or 'primary')
  cardBg: string;         // Card background
  cardTextColor: string;  // Card label color
  borderRadius: number;
  fontWeight: number;
  textShadow: string;
  heroTextShadow: string;
  headlineBg: string;     // Headline container bg
  // V2 additions for 6 Design Styles
  fontFamily: string;           // Body font family (Google Fonts name)
  headingFontFamily?: string;   // Heading font (falls back to fontFamily)
  spacingMultiplier: number;    // 1.0 = default, 1.5 = airy/minimalist, 0.8 = tight/infographic
  preferredLayout?: string;     // Layout hint for decompose-image-request
  ctaBorderRadius?: number;     // Override CTA button border-radius
  cardBoxShadow?: string;       // Override card box-shadow
  bannerLetterSpacing?: string; // Override banner letter-spacing
}

const OVERLAY_STYLE_THEMES: Record<string, OverlayStyleTheme> = {
  // === Clean Modern (minimalist) ===
  // Negative space 40-50%, monochromatic, sans-serif neutral, hairline borders
  minimalist: {
    bannerBg: 'rgba(255,255,255,0.92)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardTextColor: '#1a1a1a',
    borderRadius: 2,
    fontWeight: 400,
    textShadow: 'none',
    heroTextShadow: 'none',
    headlineBg: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter',
    spacingMultiplier: 1.5,
    preferredLayout: 'hero_text',
    cardBoxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    bannerLetterSpacing: '0.1em',
  },
  // === Bold Infographic (flat_design) ===
  // Blocky, high-contrast, oversized text, solid icons
  flat_design: {
    bannerBg: 'primary',
    cardBg: 'secondary',
    cardTextColor: '#1a1a1a',
    borderRadius: 0,
    fontWeight: 700,
    textShadow: 'none',
    heroTextShadow: 'none',
    headlineBg: 'rgba(0,0,0,0.4)',
    fontFamily: 'Montserrat',
    spacingMultiplier: 0.8,
    preferredLayout: 'banner_cards',
    ctaBorderRadius: 0,
    cardBoxShadow: 'none',
    bannerLetterSpacing: '0.08em',
  },
  // === Gradient Flow (gradient) ===
  // Neon gradients, glassmorphism-like, rounded cards, modern sans-serif
  gradient: {
    bannerBg: 'rgba(0,0,0,0.5)',
    cardBg: 'rgba(255,255,255,0.18)',
    cardTextColor: '#FFFFFF',
    borderRadius: 16,
    fontWeight: 600,
    textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
    heroTextShadow: '0 0 20px rgba(255,255,255,0.3), 2px 2px 5px rgba(0,0,0,0.35)',
    headlineBg: 'rgba(0,0,0,0.35)',
    fontFamily: 'Plus Jakarta Sans',
    spacingMultiplier: 1.1,
    preferredLayout: 'hero_text',
    ctaBorderRadius: 24,
    cardBoxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
    bannerLetterSpacing: '0.03em',
  },
  // === Corporate (geometric) ===
  // Navy/charcoal, strict grid, serif headings, sharp shapes
  geometric: {
    bannerBg: 'primary',
    cardBg: 'rgba(255,255,255,0.92)',
    cardTextColor: '#1a1a1a',
    borderRadius: 0,
    fontWeight: 600,
    textShadow: 'none',
    heroTextShadow: '1px 1px 2px rgba(0,0,0,0.2)',
    headlineBg: 'rgba(0,0,0,0.5)',
    fontFamily: 'Open Sans',
    headingFontFamily: 'Playfair Display',
    spacingMultiplier: 1.0,
    preferredLayout: 'split',
    ctaBorderRadius: 0,
    cardBoxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    bannerLetterSpacing: '0.06em',
  },
  // === Story Visual (illustration) ===
  // Warm/pastel tones, asymmetrical, rounded, hand-drawn feel
  illustration: {
    bannerBg: 'primary',
    cardBg: 'rgba(255,248,240,0.9)',
    cardTextColor: '#2d1810',
    borderRadius: 16,
    fontWeight: 600,
    textShadow: '1px 1px 2px rgba(0,0,0,0.15)',
    heroTextShadow: '1px 1px 3px rgba(0,0,0,0.2)',
    headlineBg: 'rgba(0,0,0,0.35)',
    fontFamily: 'Nunito',
    spacingMultiplier: 1.2,
    preferredLayout: 'hero_text',
    ctaBorderRadius: 24,
    cardBoxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    bannerLetterSpacing: '0.04em',
  },
  // === Product Focus (product_only) ===
  // Center-focus, clean bg, bold CTA, contrast accent
  product_only: {
    bannerBg: 'rgba(255,255,255,0.92)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardTextColor: '#1a1a1a',
    borderRadius: 8,
    fontWeight: 700,
    textShadow: 'none',
    heroTextShadow: '1px 1px 2px rgba(0,0,0,0.15)',
    headlineBg: 'rgba(255,255,255,0.85)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
    preferredLayout: 'simple',
    ctaBorderRadius: 8,
    cardBoxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    bannerLetterSpacing: '0.05em',
  },
  // === Legacy styles (keep backward compatibility) ===
  photorealistic: {
    bannerBg: 'rgba(0,0,0,0.7)',
    cardBg: 'rgba(255,255,255,0.85)',
    cardTextColor: '#1a1a1a',
    borderRadius: 8,
    fontWeight: 600,
    textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
    heroTextShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    headlineBg: 'rgba(0,0,0,0.5)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
  },
  cinematic: {
    bannerBg: 'rgba(0,0,0,0.8)',
    cardBg: 'rgba(0,0,0,0.6)',
    cardTextColor: '#f0f0f0',
    borderRadius: 4,
    fontWeight: 700,
    textShadow: '0 0 12px rgba(255,200,100,0.6), 2px 2px 6px rgba(0,0,0,0.8)',
    heroTextShadow: '0 0 20px rgba(255,180,80,0.5), 3px 3px 8px rgba(0,0,0,0.7)',
    headlineBg: 'rgba(0,0,0,0.7)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
  },
  watercolor: {
    bannerBg: 'rgba(255,255,255,0.45)',
    cardBg: 'rgba(255,255,255,0.5)',
    cardTextColor: '#2d2d2d',
    borderRadius: 16,
    fontWeight: 500,
    textShadow: '1px 1px 2px rgba(255,255,255,0.6)',
    heroTextShadow: '1px 1px 3px rgba(255,255,255,0.5)',
    headlineBg: 'rgba(255,255,255,0.4)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.2,
  },
  '3d_render': {
    bannerBg: 'rgba(0,0,0,0.7)',
    cardBg: 'rgba(255,255,255,0.8)',
    cardTextColor: '#1a1a1a',
    borderRadius: 12,
    fontWeight: 700,
    textShadow: '2px 3px 6px rgba(0,0,0,0.5)',
    heroTextShadow: '3px 4px 8px rgba(0,0,0,0.5)',
    headlineBg: 'rgba(0,0,0,0.6)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
  },
  abstract: {
    bannerBg: 'rgba(0,0,0,0.65)',
    cardBg: 'rgba(255,255,255,0.7)',
    cardTextColor: '#1a1a1a',
    borderRadius: 12,
    fontWeight: 600,
    textShadow: '1px 1px 4px rgba(0,0,0,0.3)',
    heroTextShadow: '2px 2px 6px rgba(0,0,0,0.4)',
    headlineBg: 'rgba(0,0,0,0.5)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
  },
  isometric: {
    bannerBg: 'rgba(0,0,0,0.7)',
    cardBg: 'rgba(255,255,255,0.85)',
    cardTextColor: '#1a1a1a',
    borderRadius: 8,
    fontWeight: 600,
    textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
    heroTextShadow: '2px 3px 6px rgba(0,0,0,0.4)',
    headlineBg: 'rgba(0,0,0,0.55)',
    fontFamily: 'Be Vietnam Pro',
    spacingMultiplier: 1.0,
  },
};

const DEFAULT_THEME: OverlayStyleTheme = OVERLAY_STYLE_THEMES.photorealistic;

function resolveTheme(imageStyle: string | undefined, colors: { primary: string; secondary: string }): OverlayStyleTheme {
  const theme = (imageStyle && OVERLAY_STYLE_THEMES[imageStyle]) || DEFAULT_THEME;
  // Resolve 'primary'/'secondary' placeholders to actual colors
  return {
    ...theme,
    bannerBg: theme.bannerBg === 'primary' ? colors.primary : theme.bannerBg,
    cardBg: theme.cardBg === 'secondary' ? colors.secondary : theme.cardBg,
  };
}

// === Structured Multi-block Overlay (V2) ===
interface LogoMeta {
  position: string;    // e.g. 'top-left', 'bottom-right'
  sizePercent: number; // e.g. 15
  padding: number;     // e.g. 20
}

interface StructuredOverlayRequest {
  baseImageUrl: string;
  layout: 'banner_cards' | 'hero_text' | 'simple' | 'split';
  elements: {
    banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
    heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
    cards?: { items: { icon?: string; label: string; description?: string; number?: number }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
    headline?: string;
    cta?: string;
    footer?: { items: Array<{ icon?: string; text: string }> };
    summaryRibbon?: { text: string; bgColor?: string };
  };
  colors: { primary: string; secondary: string; text: string };
  imageStyle?: string;
  imageWidth?: number;
  imageHeight?: number;
  contentId?: string;
  channel?: string;
  organizationId?: string;
  logoMeta?: LogoMeta;
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
 * Load Google Font with Vietnamese support — now supports dynamic font family
 */
async function loadGoogleFont(text: string, weight: number = 600, family: string = 'Be Vietnam Pro'): Promise<ArrayBuffer | null> {
  try {
    const fontFamily = family.replace(/\s+/g, '+');
    const encodedText = encodeURIComponent(text);
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weight}&text=${encodedText}`;
    
    const cssResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!cssResponse.ok) {
      console.error(`[overlay-text-canvas] Font CSS fetch failed for ${family} wt=${weight}: ${cssResponse.status}`);
      return null;
    }
    
    const css = await cssResponse.text();
    
    const fontUrlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2[^)]*)\)/) ||
                         css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
    
    if (!fontUrlMatch) {
      console.error(`[overlay-text-canvas] Could not extract font URL for ${family}`);
      return null;
    }
    
    const fontUrl = fontUrlMatch[1];
    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) {
      console.error(`[overlay-text-canvas] Font fetch failed: ${fontResponse.status}`);
      return null;
    }
    
    const fontData = await fontResponse.arrayBuffer();
    console.log(`[overlay-text-canvas] Font ${family} wt=${weight} loaded: ${fontData.byteLength} bytes`);
    return fontData;
  } catch (error) {
    console.error(`[overlay-text-canvas] Font loading error:`, error);
    return null;
  }
}

/**
 * Load multiple font weights in parallel for professional typography
 * V2: supports per-style font families with fallback to Be Vietnam Pro
 */
async function loadMultipleFontWeights(
  text: string,
  bodyFamily: string = 'Be Vietnam Pro',
  headingFamily?: string
): Promise<Array<{ name: string; data: ArrayBuffer; weight: 100|200|300|400|500|600|700|800|900; style: 'normal' }>> {
  const bodyWeights = [400, 600, 700] as const;
  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 100|200|300|400|500|600|700|800|900; style: 'normal' }> = [];
  
  // Load body font weights
  const bodyResults = await Promise.all(bodyWeights.map(w => loadGoogleFont(text, w, bodyFamily)));
  for (let i = 0; i < bodyWeights.length; i++) {
    if (bodyResults[i]) {
      fonts.push({ name: bodyFamily, data: bodyResults[i]!, weight: bodyWeights[i] as any, style: 'normal' });
    }
  }
  
  // Load heading font if different from body
  if (headingFamily && headingFamily !== bodyFamily) {
    const headingWeights = [600, 700] as const;
    const headingResults = await Promise.all(headingWeights.map(w => loadGoogleFont(text, w, headingFamily)));
    for (let i = 0; i < headingWeights.length; i++) {
      if (headingResults[i]) {
        fonts.push({ name: headingFamily, data: headingResults[i]!, weight: headingWeights[i] as any, style: 'normal' });
      }
    }
  }
  
  // Fallback: if primary font failed, try Be Vietnam Pro
  if (fonts.length === 0 && bodyFamily !== 'Be Vietnam Pro') {
    console.log(`[overlay-text-canvas] Primary font ${bodyFamily} failed, falling back to Be Vietnam Pro`);
    const fb = await loadGoogleFont(text, 400, 'Be Vietnam Pro');
    if (fb) fonts.push({ name: 'Be Vietnam Pro', data: fb, weight: 400, style: 'normal' });
  }
  
  // Last resort fallback
  if (fonts.length === 0) {
    const fb = await loadGoogleFont(text, 400);
    if (fb) fonts.push({ name: 'Be Vietnam Pro', data: fb, weight: 400, style: 'normal' });
  }
  
  console.log(`[overlay-text-canvas] Loaded ${fonts.length} font weights: ${fonts.map(f => `${f.name}@${f.weight}`).join(', ')}`);
  return fonts;
}

/**
 * Get relative luminance of a hex color (WCAG formula)
 */
function getLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Auto-select text color (black or white) for maximum contrast on a given background
 */
function getContrastTextColor(bgColor: string): string {
  // Handle hex colors
  if (bgColor.startsWith('#')) {
    return getLuminance(bgColor) > 0.4 ? '#1a1a1a' : '#FFFFFF';
  }
  // Handle rgba - extract RGB values
  const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]) / 255;
    const g = parseInt(rgbaMatch[2]) / 255;
    const b = parseInt(rgbaMatch[3]) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return lum > 0.4 ? '#1a1a1a' : '#FFFFFF';
  }
  // Default to white for unknown formats
  return '#FFFFFF';
}

/**
 * Smart text fitting: auto-scale font size down when text is too long for available width.
 * Returns a clamped font size that prevents text overflow.
 */
function fitTextToWidth(text: string, maxWidthPx: number, baseFontSize: number, minFontSize: number = 12): number {
  // Approximate: Vietnamese chars are ~0.55em wide on average
  const avgCharWidth = baseFontSize * 0.55;
  const estimatedTextWidth = text.length * avgCharWidth;
  
  if (estimatedTextWidth <= maxWidthPx) return baseFontSize;
  
  // Scale down proportionally
  const scaleFactor = maxWidthPx / estimatedTextWidth;
  const scaled = Math.round(baseFontSize * scaleFactor);
  return Math.max(scaled, minFontSize);
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

// ============================================
// Carousel Overlay: Extended Position Mapping
// ============================================
function getCarouselPositionStyles(position: string): Record<string, string | number> {
  switch (position) {
    case 'center':
      return { display: 'flex', alignItems: 'center', justifyContent: 'center' };
    case 'bottom-left':
      return { display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: '0 0 15% 10%' };
    case 'top-left':
      return { display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '12% 0 0 10%' };
    case 'top-center':
      return { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12%' };
    case 'bottom-center':
      return { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '15%' };
    case 'left-column':
      return { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '10%' };
    case 'asymmetric-left':
      return { display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '25% 0 0 12%' };
    case 'center-left':
      return { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '8%' };
    default:
      return { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  }
}

// ============================================
// Carousel Overlay: Background Treatment Styles
// ============================================
function getBackgroundTreatmentStyles(background: string): Record<string, string | number> | null {
  switch (background) {
    case 'glass':
      return {
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.18)',
        padding: '20px 28px',
      };
    case 'solid-block':
      return {
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 20px',
      };
    case 'cta-button':
      return {
        background: '#E53E3E',
        borderRadius: 12,
        padding: '16px 40px',
      };
    case 'none':
    default:
      return null;
  }
}


function buildStructuredElement(
  baseImageUrl: string,
  request: StructuredOverlayRequest,
  hasCustomFont: boolean,
  imageWidth: number,
  imageHeight: number,
) {
  const { elements, colors, logoMeta } = request;
  const theme = resolveTheme(request.imageStyle, colors);
  const children: any[] = [];
  const fontFamily = hasCustomFont ? theme.fontFamily : 'sans-serif';
  const headingFontFamily = hasCustomFont ? (theme.headingFontFamily || theme.fontFamily) : 'sans-serif';
  const sp = theme.spacingMultiplier; // spacing multiplier

  // === Smart Density: reduce visual clutter ===
  // Detect education_infographic mode (has summaryRibbon = dense layout designed for it)
  const isEducationInfographic = !!elements.summaryRibbon;
  
  if (elements.heroText && elements.headline) {
    delete elements.headline;
  }
  if (elements.cards?.items) {
    const isSquareOrTall = imageWidth <= imageHeight;
    // Education infographic allows more cards (up to 5)
    const maxCards = isEducationInfographic ? 5 : (isSquareOrTall ? 3 : 4);
    elements.cards.items = elements.cards.items.slice(0, maxCards);
  }
  if (elements.footer?.items) {
    elements.footer.items = elements.footer.items.slice(0, 4);
  }
  const elementCount = [elements.banner, elements.heroText, elements.headline, elements.cards, elements.cta, elements.footer, elements.summaryRibbon].filter(Boolean).length;
  // Don't strip CTA for education_infographic — it's designed for dense layouts
  if (elementCount >= 6 && elements.cta && !isEducationInfographic) {
    delete elements.cta;
  }

  // Determine if split layout — auto-convert to stack for portrait/square
  const isPortraitOrSquare = imageWidth <= imageHeight;
  const isSplit = request.layout === 'split' && !isPortraitOrSquare; // fallback to stack on portrait

  // Determine banner text color based on contrast validation
  const bannerTextColor = getContrastTextColor(theme.bannerBg);

  // === Safe-area logic: if logo is in a top corner, add padding so banner text avoids it ===
  const logoInTopArea = logoMeta && (logoMeta.position === 'top-left' || logoMeta.position === 'top-right' || logoMeta.position === 'top-center');
  const logoInBottomArea = logoMeta && (logoMeta.position === 'bottom-left' || logoMeta.position === 'bottom-right' || logoMeta.position === 'bottom-center');
  const logoInCenterArea = logoMeta && (logoMeta.position === 'center-left' || logoMeta.position === 'center-right' || logoMeta.position === 'center');
  const logoSafeWidth = logoMeta ? Math.ceil(imageWidth * (logoMeta.sizePercent / 100)) + (logoMeta.padding * 2) : 0;
  const logoSafeHeight = logoMeta ? Math.ceil(imageWidth * (logoMeta.sizePercent / 100) * 0.75) + (logoMeta.padding * 2) : 0;

  // Banner (top or bottom)
  if (elements.banner) {
    // Determine banner safe-area padding based on logo position
    let bannerPaddingLeft = 24;
    let bannerPaddingRight = 24;
    const bannerIsTop = elements.banner.position !== 'bottom';

    if (bannerIsTop && logoInTopArea && logoMeta) {
      if (logoMeta.position === 'top-left') bannerPaddingLeft = logoSafeWidth;
      if (logoMeta.position === 'top-right') bannerPaddingRight = logoSafeWidth;
    }
    if (!bannerIsTop && logoInBottomArea && logoMeta) {
      if (logoMeta.position === 'bottom-left') bannerPaddingLeft = logoSafeWidth;
      if (logoMeta.position === 'bottom-right') bannerPaddingRight = logoSafeWidth;
    }

    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bannerBg,
          padding: `${Math.round(12 * sp)}px ${bannerPaddingRight}px ${Math.round(12 * sp)}px ${bannerPaddingLeft}px`,
          width: '100%',
          borderRadius: theme.borderRadius > 0 ? `${theme.borderRadius}px ${theme.borderRadius}px 0 0` : '0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: bannerTextColor,
              fontSize: fitTextToWidth(elements.banner.text, imageWidth - bannerPaddingLeft - bannerPaddingRight - 48, Math.round(imageWidth * (isEducationInfographic ? 0.04 : 0.03)), 14),
              fontFamily,
              fontWeight: theme.fontWeight,
              letterSpacing: theme.bannerLetterSpacing || '0.05em',
              textTransform: 'uppercase',
              textShadow: `${theme.textShadow}, 0 2px 8px rgba(0,0,0,0.5)`,
            },
            children: elements.banner.text,
          },
        },
      },
    });
  }

  // Hero text (large centered text or number circle)
  if (elements.heroText) {
    const sizeMap = { xl: 0.06, '2xl': 0.08, '3xl': 0.12 };
    const baseFontSize = Math.round(imageWidth * (sizeMap[elements.heroText.fontSize] || 0.08));
    const fontSize = fitTextToWidth(elements.heroText.text.trim(), imageWidth * 0.75, baseFontSize, 18);
    const heroTrimmed = elements.heroText.text.trim();
    // Expanded hero matching: pure numbers, numbers with % or +, decimal numbers
    const isNumericHero = /^\d+(\.\d+)?[%+]?$/.test(heroTrimmed);
    // Split hero: "3 THAY ĐỔI" → number in circle + side label
    const splitHeroMatch = heroTrimmed.match(/^(\d+)\s+(.+)$/);
    
    if (isNumericHero) {
      // Hero Number Circle: large styled circle with number inside
      const circleDiameter = Math.round(imageWidth * 0.15);
      const circleTextColor = getContrastTextColor(colors.primary);
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
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: circleDiameter,
                height: circleDiameter,
                borderRadius: circleDiameter / 2,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary}cc)`,
                boxShadow: `0 8px 32px ${colors.primary}88, 0 4px 16px rgba(0,0,0,0.3)`,
                border: `4px solid rgba(255,255,255,0.3)`,
              },
              children: {
                type: 'span',
                props: {
                  style: {
                    color: circleTextColor,
                    fontSize: fitTextToWidth(heroTrimmed, circleDiameter * 0.7, Math.round(circleDiameter * 0.6), 16),
                    fontFamily,
                    fontWeight: 700,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  },
                  children: heroTrimmed,
                },
              },
            },
          },
        },
      });
    } else if (splitHeroMatch) {
      // Split hero: number in circle + side label (e.g. "3 THAY ĐỔI")
      const circleNum = splitHeroMatch[1];
      const sideLabel = splitHeroMatch[2];
      const circleDiameter = Math.round(imageWidth * 0.12);
      const circleTextColor = getContrastTextColor(colors.primary);
      const sideFontSize = fitTextToWidth(sideLabel, imageWidth * 0.45, Math.round(imageWidth * 0.05), 16);
      children.push({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '20px',
            flexGrow: 1,
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: circleDiameter,
                  height: circleDiameter,
                  borderRadius: circleDiameter / 2,
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.primary}cc)`,
                  boxShadow: `0 8px 32px ${colors.primary}88, 0 4px 16px rgba(0,0,0,0.3)`,
                  border: `3px solid rgba(255,255,255,0.3)`,
                  flexShrink: 0,
                },
                children: {
                  type: 'span',
                  props: {
                    style: {
                      color: circleTextColor,
                      fontSize: Math.round(circleDiameter * 0.55),
                      fontFamily,
                      fontWeight: 700,
                    },
                    children: circleNum,
                  },
                },
              },
            },
            {
              type: 'span',
              props: {
                style: {
                  color: colors.primary,
                  fontSize: sideFontSize,
                  fontFamily,
                  fontWeight: 700,
                  textShadow: theme.heroTextShadow,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                },
                children: sideLabel,
              },
            },
          ],
        },
      });
    } else {
      // Regular hero text
      children.push({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            flexGrow: 1,
            ...(logoInCenterArea && logoMeta ? {
              paddingLeft: logoMeta.position === 'center-left' || logoMeta.position === 'center' ? logoSafeWidth : 20,
              paddingRight: logoMeta.position === 'center-right' || logoMeta.position === 'center' ? logoSafeWidth : 20,
            } : {}),
          },
          children: {
            type: 'span',
            props: {
              style: {
                color: colors.primary,
                fontSize,
                fontFamily,
                fontWeight: theme.fontWeight >= 600 ? 700 : 600,
                textShadow: theme.heroTextShadow,
              },
              children: elements.heroText.text,
            },
          },
        },
      });
    }
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
          backgroundColor: theme.headlineBg,
          borderRadius: theme.borderRadius,
          maxWidth: '85%',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: colors.text || '#FFFFFF',
              fontSize: Math.round(imageWidth * 0.035),
              fontFamily,
              fontWeight: theme.fontWeight,
              textAlign: 'center',
              lineHeight: 1.4,
              textShadow: theme.textShadow,
            },
            children: elements.headline,
          },
        },
      },
    });
  }

  // Cards grid — responsive: force vertical on portrait, use min(w,h) for font scaling
  if (elements.cards && elements.cards.items.length > 0) {
    // Auto-override card layout based on aspect ratio
    const effectiveCardLayout = isPortraitOrSquare ? 'vertical' : elements.cards.layout;
    const isGrid = effectiveCardLayout === 'grid-2x2';
    const fontBase = Math.min(imageWidth, imageHeight); // scale by smaller dimension
    const cardFontSize = Math.max(Math.round(fontBase * (isEducationInfographic && elementCount >= 5 ? 0.022 : 0.025)), 14);
    const cardDescFontSize = Math.max(Math.round(imageWidth * 0.015), 12);
    const hasNumberedCards = elements.cards.items.some(item => item.number != null);
    
    const cardElements = elements.cards.items.map((item, idx) => {
      const gradientAngle = idx % 2 === 0 ? '135deg' : '225deg';
      const isLightCard = theme.cardBg.includes('255,255,255');
      const cardGradient = isLightCard
        ? `linear-gradient(${gradientAngle}, rgba(255,255,255,0.92), rgba(240,240,255,0.85))`
        : `linear-gradient(${gradientAngle}, ${theme.cardBg}, rgba(0,0,0,0.5))`;

      // Build card children: numbered circle or icon/dot + label
      const cardChildren: any[] = [];

      if (hasNumberedCards && item.number != null) {
        // Large numbered circle
        const numSize = Math.round(imageWidth * 0.04);
        cardChildren.push({
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: numSize,
              height: numSize,
              borderRadius: numSize / 2,
              backgroundColor: colors.primary,
              flexShrink: 0,
            },
            children: {
              type: 'span',
              props: {
                style: {
                  color: getContrastTextColor(colors.primary),
                  fontSize: Math.round(numSize * 0.55),
                  fontFamily,
                  fontWeight: 700,
                },
                children: String(item.number),
              },
            },
          },
        });
      } else if (item.icon) {
        cardChildren.push({
          type: 'span',
          props: { style: { fontSize: cardFontSize * 1.2 }, children: item.icon },
        });
      } else {
        cardChildren.push({
          type: 'div',
          props: {
            style: {
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: colors.primary,
            },
          },
        });
      }

      // Card text: label + optional description (2-line rendering)
      // Dynamic contrast: validate card text color against actual card background
      const resolvedCardBg = theme.cardBg;
      const effectiveCardTextColor = getContrastTextColor(
        resolvedCardBg.startsWith('rgba') || resolvedCardBg.startsWith('#') ? resolvedCardBg : theme.cardTextColor
      );
      // Fit label font to available card width (approx 70% of card width)
      const cardAvailWidth = isGrid ? imageWidth * 0.35 : imageWidth * 0.6;
      const fittedCardFontSize = fitTextToWidth(item.label, cardAvailWidth, cardFontSize, 12);
      
      const textChildren: any[] = [{
        type: 'span',
        props: {
          style: {
            color: effectiveCardTextColor,
            fontSize: fittedCardFontSize,
            fontFamily,
            fontWeight: theme.fontWeight >= 600 ? 600 : theme.fontWeight,
            flex: 1,
          },
          children: item.label,
        },
      }];

      if (item.description) {
        textChildren.push({
          type: 'span',
          props: {
            style: {
              color: effectiveCardTextColor,
              fontSize: cardDescFontSize,
              fontFamily,
              fontWeight: 400,
              opacity: 0.7,
              marginTop: 2,
            },
            children: item.description,
          },
        });
      }

      cardChildren.push({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
          children: textChildren.length === 1 ? textChildren[0] : textChildren,
        },
      });

      return {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: hasNumberedCards ? 12 : 8,
            background: cardGradient,
            borderRadius: theme.borderRadius,
            padding: hasNumberedCards ? `${Math.round(14 * sp)}px ${Math.round(20 * sp)}px` : `${Math.round(10 * sp)}px ${Math.round(16 * sp)}px`,
            boxShadow: theme.cardBoxShadow || '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
            ...(isGrid ? { width: '48%' } : { flex: '1' }),
          },
          children: cardChildren,
        },
      };
    });

    // Cards safe-area: avoid logo at center-left/center-right/center
    let cardsPaddingLeft = 24;
    let cardsPaddingRight = 24;
    if (logoInCenterArea && logoMeta) {
      if (logoMeta.position === 'center-left') cardsPaddingLeft = logoSafeWidth;
      if (logoMeta.position === 'center-right') cardsPaddingRight = logoSafeWidth;
      if (logoMeta.position === 'center') {
        cardsPaddingLeft = logoSafeWidth;
        cardsPaddingRight = logoSafeWidth;
      }
    }

    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexWrap: isGrid ? 'wrap' : 'nowrap',
          gap: 8,
          padding: `12px ${cardsPaddingRight}px 12px ${cardsPaddingLeft}px`,
          justifyContent: 'center',
          ...(isGrid ? { maxWidth: '80%' } : {}),
        },
        children: cardElements,
      },
    });
  }

  // Summary ribbon (between cards and CTA) — enhanced visual
  if (elements.summaryRibbon) {
    const ribbonFontSize = Math.round(imageWidth * 0.024);
    const ribbonBg = elements.summaryRibbon.bgColor || colors.primary;
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ribbonBg}, ${ribbonBg}bb)`,
          padding: '14px 32px',
          width: '90%',
          borderRadius: theme.borderRadius > 0 ? theme.borderRadius : 6,
          marginTop: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          borderLeft: `5px solid ${colors.secondary || '#FFFFFF'}`,
        },
        children: [
          {
            type: 'span',
            props: {
              style: { fontSize: ribbonFontSize * 1.1, marginRight: 8 },
              children: '📌',
            },
          },
          {
            type: 'span',
            props: {
              style: {
                color: getContrastTextColor(ribbonBg),
                fontSize: ribbonFontSize,
                fontFamily,
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.4,
                textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
              },
              children: elements.summaryRibbon.text,
            },
          },
        ],
      },
    });
  }

  // CTA button
  if (elements.cta) {
    // CTA safe-area: avoid logo at bottom-center
    const ctaMarginBottom = (logoMeta && logoMeta.position === 'bottom-center') ? logoSafeHeight : 0;

    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 32px',
          backgroundColor: colors.primary,
          borderRadius: theme.ctaBorderRadius ?? (theme.borderRadius > 8 ? 24 : theme.borderRadius > 0 ? 12 : 0),
          marginTop: 8,
          boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 2px 6px ${colors.primary}66`,
          ...(ctaMarginBottom > 0 ? { marginBottom: ctaMarginBottom } : {}),
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: getContrastTextColor(colors.primary),
              fontSize: Math.round(imageWidth * 0.025),
              fontFamily,
              fontWeight: theme.fontWeight,
            },
            children: elements.cta,
          },
        },
      },
    });
  }

  // Footer contact bar
  if (elements.footer && elements.footer.items.length > 0) {
    const footerFontSize = Math.round(imageWidth * (isEducationInfographic ? 0.022 : 0.018));
    const footerItems = elements.footer.items.map(item => ({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        },
        children: [
          ...(item.icon ? [{
            type: 'span',
            props: { style: { fontSize: footerFontSize * 1.1 }, children: item.icon },
          }] : []),
          {
            type: 'span',
            props: {
              style: {
                color: bannerTextColor,
                fontSize: footerFontSize,
                fontFamily,
                fontWeight: 400,
              },
              children: item.text,
            },
          },
        ],
      },
    }));

    // Footer safe-area: avoid logo at bottom-left/bottom-right
    let footerPaddingLeft = 24;
    let footerPaddingRight = 24;
    if (logoInBottomArea && logoMeta) {
      if (logoMeta.position === 'bottom-left') footerPaddingLeft = logoSafeWidth;
      if (logoMeta.position === 'bottom-right') footerPaddingRight = logoSafeWidth;
    }

    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          backgroundColor: theme.bannerBg,
          padding: `8px ${footerPaddingRight}px 8px ${footerPaddingLeft}px`,
          width: '100%',
          borderRadius: theme.borderRadius > 0 ? `0 0 ${theme.borderRadius}px ${theme.borderRadius}px` : '0',
          marginTop: 'auto',
        },
        children: footerItems,
      },
    });
  }

  // === Build final layout ===
  // If split layout: banner top, [hero left | cards right], footer bottom
  if (isSplit && (elements.heroText || elements.headline) && elements.cards) {
    // Extract banner and footer from children (they stay full-width)
    const bannerEl = elements.banner ? children.shift() : null;
    const footerEl = elements.footer ? children.pop() : null;

    // Left column: hero/headline + CTA
    const leftChildren: any[] = [];
    const rightChildren: any[] = [];

    // Separate hero/headline (left) from cards (right)
    for (const child of children) {
      // Heuristic: cards container has flexWrap or gap:8 + multiple children
      // We tag by checking if it's the cards section
      rightChildren.length === 0 && leftChildren.length < 3
        ? leftChildren.push(child)
        : rightChildren.push(child);
    }

    // If we have cards, move last element from left if it looks like cards
    if (rightChildren.length === 0 && leftChildren.length > 1) {
      rightChildren.push(leftChildren.pop());
    }

    const splitRow = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'row',
          flexGrow: 1,
          width: '100%',
          gap: 12,
          padding: '12px 24px',
          alignItems: 'center',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexDirection: 'column', width: '55%', gap: 12, justifyContent: 'center',
                ...(logoMeta && logoMeta.position === 'center-left' ? { paddingLeft: logoSafeWidth } : {}),
              },
              children: leftChildren.length === 1 ? leftChildren[0] : leftChildren,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', flexDirection: 'column', width: '45%', gap: 8, justifyContent: 'center',
                ...(logoMeta && logoMeta.position === 'center-right' ? { paddingRight: logoSafeWidth } : {}),
              },
              children: rightChildren.length === 1 ? rightChildren[0] : rightChildren,
            },
          },
        ],
      },
    };

    const finalChildren: any[] = [];
    if (bannerEl) finalChildren.push(bannerEl);
    finalChildren.push(splitRow);
    if (footerEl) finalChildren.push(footerEl);

    return {
      type: 'div',
      props: {
        style: {
          width: imageWidth,
          height: imageHeight,
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: `url(${baseImageUrl})`,
          backgroundSize: `${imageWidth}px ${imageHeight}px`,
          backgroundPosition: 'center',
        },
        children: finalChildren.length === 1 ? finalChildren[0] : finalChildren,
      },
    };
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

    // === Dispatch: Structured vs Simple ===
    if (isStructuredRequest(body)) {
      console.log(`[overlay-text-canvas] === STRUCTURED MULTI-BLOCK OVERLAY ===`);
      const sr = body as StructuredOverlayRequest;
      const { baseImageUrl, elements, imageWidth = 1200, imageHeight = 630, contentId, channel, organizationId } = sr;

      if (!baseImageUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Base image URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allTexts: string[] = [];
      if (elements.banner?.text) allTexts.push(elements.banner.text);
      if (elements.heroText?.text) allTexts.push(elements.heroText.text);
      if (elements.headline) allTexts.push(elements.headline);
      if (elements.cta) allTexts.push(elements.cta);
      if (elements.cards?.items) {
        allTexts.push(...elements.cards.items.map(c => c.label));
        allTexts.push(...elements.cards.items.filter(c => c.description).map(c => c.description!));
      }
      if (elements.footer?.items) allTexts.push(...elements.footer.items.map(f => f.text));
      if (elements.summaryRibbon?.text) allTexts.push(elements.summaryRibbon.text);
      const combinedText = allTexts.join(' ') || 'Default';

      console.log(`[overlay-text-canvas] Elements: banner=${!!elements.banner}, hero=${!!elements.heroText}, cards=${elements.cards?.items?.length || 0}`);

      // Load multiple font weights — resolve theme for dynamic font family
      const resolvedTheme = resolveTheme(sr.imageStyle, sr.colors);
      const fonts2 = await loadMultipleFontWeights(combinedText, resolvedTheme.fontFamily, resolvedTheme.headingFontFamily);
      if (fonts2.length === 0) throw new Error('Could not load any fonts');

      const element2 = buildStructuredElement(baseImageUrl, sr, true, imageWidth, imageHeight);
      const svg2 = await satori(element2 as any, { width: imageWidth, height: imageHeight, fonts: fonts2 });

      const encoder2 = new TextEncoder();
      const svgBytes2 = encoder2.encode(svg2);
      let finalUrl2: string;
      if (contentId && channel) {
        finalUrl2 = await uploadToStorage(svgBytes2, contentId, channel, organizationId);
      } else {
        finalUrl2 = `data:image/svg+xml;base64,${btoa(svg2)}`;
      }

      return new Response(
        JSON.stringify({ success: true, imageUrl: finalUrl2, format: 'svg', layout: sr.layout, dimensions: { width: imageWidth, height: imageHeight } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Simple (legacy) text overlay ===
    // Check for carousel-specific overlay config
    const carouselOverlay = body.carouselOverlay as {
      position?: string;
      fontWeight?: number;
      fontSize?: string;
      textAlign?: string;
      maxWidth?: string;
      textTransform?: string;
      background?: string;
      textColor?: string;
      fontFamily?: string;
      // Phase A: dark gradient for gallery hook
      bottomGradient?: boolean;
      // Phase B: multi-layer text hierarchy
      textLayers?: Array<{ text: string; role: 'headline' | 'subtitle' | 'body' | 'accent' }>;
      // Phase C: brand color blending
      brandColors?: { textColor?: string; backgroundColor?: string };
      // Phase E: decorations (listicle, educational, flat_design, product)
      decorations?: {
        slideNumberBadge?: number;
        progressDots?: { current: number; total: number };
        stepIndicator?: { current: number; total: number };
        accentDivider?: boolean;
        hotBadge?: boolean;
      };
    } | undefined;

    const hasCarouselOverlay = !!carouselOverlay;

    const body2 = body as OverlayTextRequest;
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

    // Validate inputs first before logging
    if (!text || (typeof text === 'string' && text.trim().length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!baseImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Base image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Carousel Overlay Mode: dynamic position, font, background ===
    if (hasCarouselOverlay) {
      console.log(`[overlay-text-canvas] === CAROUSEL OVERLAY MODE ===`);
      console.log(`[overlay-text-canvas] Config:`, JSON.stringify(carouselOverlay));
      
      const cleanText = text.trim();
      const transform = carouselOverlay.textTransform || 'none';
      const displayText = transform === 'uppercase' ? cleanText.toUpperCase() : cleanText;

      // Convert rem fontSize to px (base 16, clamp to 15% canvas height)
      const remMatch = (carouselOverlay.fontSize || '1.5rem').match(/([\d.]+)rem/);
      let fontSizePx = remMatch ? parseFloat(remMatch[1]) * 16 : 24;
      const maxFontSize = Math.round(imageHeight * 0.15);
      fontSizePx = Math.min(fontSizePx, maxFontSize);
      // Smart fit: scale down if text is too long
      const maxWidthPercent = parseInt(carouselOverlay.maxWidth || '85%') / 100;
      fontSizePx = fitTextToWidth(displayText, imageWidth * maxWidthPercent, fontSizePx, 14);

      // Position mapping → flexbox styles
      const carouselPositionStyles = getCarouselPositionStyles(carouselOverlay.position || 'center');

      // Load font (use specified family or fallback)
      const fontFamily = carouselOverlay.fontFamily || 'Be Vietnam Pro';
      const fontWeight = carouselOverlay.fontWeight || 600;
      type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
      const fontsToLoad = [400, fontWeight, 700].filter((v, i, a) => a.indexOf(v) === i);
      const fonts: Array<{ name: string; data: ArrayBuffer; weight: Weight; style: 'normal' }> = [];

      const fontResults = await Promise.allSettled(
        fontsToLoad.map(w => loadGoogleFont(displayText, w, fontFamily))
      );
      for (let i = 0; i < fontsToLoad.length; i++) {
        const result = fontResults[i];
        if (result.status === 'fulfilled' && result.value) {
          fonts.push({ name: fontFamily, data: result.value, weight: fontsToLoad[i] as Weight, style: 'normal' });
        }
      }
      // Fallback font
      if (fonts.length === 0) {
        const fb = await loadGoogleFont(displayText, 400, 'Be Vietnam Pro');
        if (fb) fonts.push({ name: 'Be Vietnam Pro', data: fb, weight: 400, style: 'normal' });
      }
      if (fonts.length === 0) throw new Error('Could not load any fonts');

      // Phase C: resolve background treatment with brand colors
      const bgTreatment = getBackgroundTreatmentStyles(carouselOverlay.background || 'none');
      if (bgTreatment && carouselOverlay.brandColors?.backgroundColor) {
        const brandBg = carouselOverlay.brandColors.backgroundColor;
        if (carouselOverlay.background === 'solid-block') {
          bgTreatment.background = brandBg;
        } else if (carouselOverlay.background === 'glass') {
          // Extract hex and use as glass tint
          if (brandBg.startsWith('#')) {
            const r = parseInt(brandBg.slice(1, 3), 16);
            const g = parseInt(brandBg.slice(3, 5), 16);
            const b = parseInt(brandBg.slice(5, 7), 16);
            bgTreatment.background = `rgba(${r},${g},${b},0.15)`;
            bgTreatment.border = `1px solid rgba(${r},${g},${b},0.25)`;
          }
        }
      }

      // === Phase B: Build multi-layer text elements OR single text ===
      const textLayers = carouselOverlay.textLayers;
      let contentChildren: any;

      if (textLayers && textLayers.length > 0) {
        // Multi-layer rendering
        console.log(`[overlay-text-canvas] Multi-layer text: ${textLayers.length} layers`);
        const layerElements = textLayers.map((layer) => {
          let layerFontSize = fontSizePx;
          let layerFontWeight = fontWeight;
          let layerOpacity = 1;
          let layerLineHeight = 1.35;

          switch (layer.role) {
            case 'headline':
              layerFontSize = Math.round(fontSizePx * 1.4);
              layerFontWeight = Math.min(fontWeight + 200, 900);
              break;
            case 'subtitle':
              layerFontSize = Math.round(fontSizePx * 0.65);
              layerFontWeight = 400;
              layerOpacity = 0.85;
              layerLineHeight = 1.5;
              break;
            case 'body':
              layerFontSize = Math.round(fontSizePx * 0.7);
              layerFontWeight = 400;
              layerOpacity = 0.9;
              layerLineHeight = 1.5;
              break;
            case 'accent':
              layerFontSize = Math.round(fontSizePx * 2.2);
              layerFontWeight = 900;
              break;
          }

          // Fit each layer independently
          layerFontSize = fitTextToWidth(layer.text, imageWidth * maxWidthPercent, layerFontSize, 12);

          return {
            type: 'span',
            props: {
              style: {
                color: carouselOverlay.textColor || '#FFFFFF',
                fontSize: layerFontSize,
                fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
                fontWeight: layerFontWeight,
                textAlign: carouselOverlay.textAlign || 'center',
                lineHeight: layerLineHeight,
                opacity: layerOpacity,
                textShadow: (carouselOverlay.background === 'none')
                  ? '2px 2px 4px rgba(0,0,0,0.7), -1px -1px 2px rgba(0,0,0,0.4)'
                  : 'none',
                marginTop: layer.role === 'headline' ? 0 : 4,
              },
              children: layer.text,
            },
          };
        });

        contentChildren = layerElements.length === 1 ? layerElements[0] : layerElements;
      } else {
        // Single text (legacy)
        contentChildren = {
          type: 'span',
          props: {
            style: {
              color: carouselOverlay.textColor || '#FFFFFF',
              fontSize: fontSizePx,
              fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
              fontWeight: fontWeight,
              textAlign: carouselOverlay.textAlign || 'center',
              lineHeight: 1.35,
              textShadow: (carouselOverlay.background === 'none')
                ? '2px 2px 4px rgba(0,0,0,0.7), -1px -1px 2px rgba(0,0,0,0.4)'
                : 'none',
            },
            children: displayText,
          },
        };
      }

      const textWrapper = bgTreatment
        ? { type: 'div', props: { style: { ...bgTreatment, maxWidth: carouselOverlay.maxWidth || '85%', display: 'flex', flexDirection: 'column', alignItems: carouselOverlay.textAlign === 'left' ? 'flex-start' : carouselOverlay.textAlign === 'right' ? 'flex-end' : 'center' }, children: contentChildren } }
        : { type: 'div', props: { style: { maxWidth: carouselOverlay.maxWidth || '85%', display: 'flex', flexDirection: 'column', alignItems: carouselOverlay.textAlign === 'left' ? 'flex-start' : carouselOverlay.textAlign === 'right' ? 'flex-end' : 'center' }, children: contentChildren } };

      // === Build children array for the root element ===
      const rootChildren: any[] = [];

      // Phase A: bottom gradient overlay for gallery hook
      if (carouselOverlay.bottomGradient) {
        console.log(`[overlay-text-canvas] Adding programmatic dark gradient overlay`);
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: imageWidth,
              height: Math.round(imageHeight * 0.4),
              background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.65))',
            },
          },
        });
      }

      // Phase E: Listicle slide number badge (top-left)
      if (carouselOverlay.decorations?.slideNumberBadge) {
        const badgeSize = Math.round(imageWidth * 0.08);
        const badgeFontSize = Math.round(badgeSize * 0.5);
        const primaryColor = carouselOverlay.brandColors?.backgroundColor || '#E53E3E';
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: Math.round(imageHeight * 0.06),
              left: Math.round(imageWidth * 0.06),
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            },
            children: {
              type: 'span',
              props: {
                style: {
                  color: getContrastTextColor(primaryColor),
                  fontSize: badgeFontSize,
                  fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
                  fontWeight: 800,
                },
                children: String(carouselOverlay.decorations.slideNumberBadge),
              },
            },
          },
        });
      }

      // Phase E: Educational step indicator (top-right)
      if (carouselOverlay.decorations?.stepIndicator) {
        const { current, total } = carouselOverlay.decorations.stepIndicator;
        const stepFontSize = Math.round(imageWidth * 0.025);
        const primaryColor = carouselOverlay.brandColors?.backgroundColor || '#3B82F6';
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: Math.round(imageHeight * 0.05),
              right: Math.round(imageWidth * 0.05),
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: '6px 14px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    color: primaryColor,
                    fontSize: stepFontSize,
                    fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
                    fontWeight: 700,
                  },
                  children: String(current),
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: stepFontSize * 0.85,
                    fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
                    fontWeight: 400,
                  },
                  children: `/ ${total}`,
                },
              },
            ],
          },
        });
      }

      // Phase E: Product "HOT" badge (top-right corner)
      if (carouselOverlay.decorations?.hotBadge) {
        const badgeFontSize = Math.round(imageWidth * 0.025);
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: Math.round(imageHeight * 0.05),
              right: Math.round(imageWidth * 0.05),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#E53E3E',
              borderRadius: 4,
              padding: '4px 14px',
              boxShadow: '0 2px 8px rgba(229,62,62,0.4)',
            },
            children: {
              type: 'span',
              props: {
                style: {
                  color: '#FFFFFF',
                  fontSize: badgeFontSize,
                  fontFamily: fonts.length > 0 ? fontFamily : 'sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                },
                children: 'HOT',
              },
            },
          },
        });
      }

      // Text content wrapper
      rootChildren.push(textWrapper);

      // Phase E: Accent divider for flat_design (after text wrapper)
      if (carouselOverlay.decorations?.accentDivider) {
        const dividerColor = carouselOverlay.brandColors?.backgroundColor || '#F59E0B';
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              width: 60,
              height: 4,
              backgroundColor: dividerColor,
              borderRadius: 2,
              marginTop: 4,
            },
          },
        });
      }

      // Phase E: Listicle progress dots (bottom center)
      if (carouselOverlay.decorations?.progressDots) {
        const { current, total } = carouselOverlay.decorations.progressDots;
        const dotSize = Math.round(imageWidth * 0.012);
        const dotElements = [];
        for (let i = 1; i <= total; i++) {
          dotElements.push({
            type: 'div',
            props: {
              style: {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: i === current ? (carouselOverlay.textColor || '#FFFFFF') : 'rgba(255,255,255,0.35)',
              },
            },
          });
        }
        rootChildren.push({
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: Math.round(imageHeight * 0.04),
              left: 0,
              width: imageWidth,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Math.round(dotSize * 0.8),
            },
            children: dotElements,
          },
        });
      }

      const element = {
        type: 'div',
        props: {
          style: {
            width: imageWidth,
            height: imageHeight,
            display: 'flex',
            position: 'relative',
            backgroundImage: `url(${baseImageUrl})`,
            backgroundSize: `${imageWidth}px ${imageHeight}px`,
            backgroundPosition: 'center',
            ...carouselPositionStyles,
          },
          children: rootChildren.length === 1 ? rootChildren[0] : rootChildren,
        },
      };

      const svg = await satori(element as any, { width: imageWidth, height: imageHeight, fonts });
      const encoder = new TextEncoder();
      const svgBytes = encoder.encode(svg);

      let finalImageUrl: string;
      if (contentId && channel) {
        finalImageUrl = await uploadToStorage(svgBytes, contentId, channel, organizationId);
      } else {
        finalImageUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      }

      console.log(`[overlay-text-canvas] Carousel overlay complete: ${finalImageUrl.substring(0, 80)}...`);
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: finalImageUrl,
          textRendered: displayText,
          fontSize: fontSizePx,
          format: 'svg',
          dimensions: { width: imageWidth, height: imageHeight },
          mode: 'carousel_overlay',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Legacy simple text overlay (unchanged) ===
    console.log(`[overlay-text-canvas] === SATORI TEXT OVERLAY ===`);
    console.log(`[overlay-text-canvas] Text: "${text.substring(0, 50)}..."`);
    console.log(`[overlay-text-canvas] Position: ${position}, Style: ${typographyStyle}`);
    console.log(`[overlay-text-canvas] Dimensions: ${imageWidth}x${imageHeight}`);

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
    // Load multiple font weights for legacy path too
    const fontWeights = [400, 600, 700] as const;
    type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    const fonts: Array<{ name: string; data: ArrayBuffer; weight: Weight; style: 'normal' }> = [];
    
    const fontResults = await Promise.allSettled(
      fontWeights.map(w => loadGoogleFont(displayText, w))
    );
    for (let i = 0; i < fontWeights.length; i++) {
      const result = fontResults[i];
      if (result.status === 'fulfilled' && result.value) {
        fonts.push({
          name: 'Be Vietnam Pro',
          data: result.value,
          weight: fontWeights[i] as Weight,
          style: 'normal' as const,
        });
      }
    }

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
