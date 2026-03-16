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

// === Style-Adaptive Overlay Themes ===
interface OverlayStyleTheme {
  bannerBg: string;       // Banner background (rgba or 'primary')
  cardBg: string;         // Card background
  cardTextColor: string;  // Card label color
  borderRadius: number;
  fontWeight: number;
  textShadow: string;
  heroTextShadow: string;
  headlineBg: string;     // Headline container bg
}

const OVERLAY_STYLE_THEMES: Record<string, OverlayStyleTheme> = {
  photorealistic: {
    bannerBg: 'rgba(0,0,0,0.7)',
    cardBg: 'rgba(255,255,255,0.85)',
    cardTextColor: '#1a1a1a',
    borderRadius: 8,
    fontWeight: 600,
    textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
    heroTextShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    headlineBg: 'rgba(0,0,0,0.5)',
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
  },
  minimalist: {
    bannerBg: 'primary',
    cardBg: 'rgba(255,255,255,0.95)',
    cardTextColor: '#1a1a1a',
    borderRadius: 2,
    fontWeight: 400,
    textShadow: 'none',
    heroTextShadow: 'none',
    headlineBg: 'rgba(255,255,255,0.9)',
  },
  illustration: {
    bannerBg: 'primary',
    cardBg: 'rgba(255,255,255,0.9)',
    cardTextColor: '#1a1a1a',
    borderRadius: 12,
    fontWeight: 600,
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
    heroTextShadow: '1px 1px 3px rgba(0,0,0,0.2)',
    headlineBg: 'rgba(0,0,0,0.4)',
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
  },
  flat_design: {
    bannerBg: 'primary',
    cardBg: 'secondary',
    cardTextColor: '#1a1a1a',
    borderRadius: 0,
    fontWeight: 700,
    textShadow: 'none',
    heroTextShadow: 'none',
    headlineBg: 'rgba(0,0,0,0.4)',
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
  },
  gradient: {
    bannerBg: 'rgba(0,0,0,0.6)',
    cardBg: 'rgba(255,255,255,0.75)',
    cardTextColor: '#1a1a1a',
    borderRadius: 10,
    fontWeight: 600,
    textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
    heroTextShadow: '2px 2px 5px rgba(0,0,0,0.35)',
    headlineBg: 'rgba(0,0,0,0.45)',
  },
  geometric: {
    bannerBg: 'primary',
    cardBg: 'rgba(255,255,255,0.9)',
    cardTextColor: '#1a1a1a',
    borderRadius: 0,
    fontWeight: 600,
    textShadow: 'none',
    heroTextShadow: '1px 1px 2px rgba(0,0,0,0.2)',
    headlineBg: 'rgba(0,0,0,0.5)',
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
  },
  product_only: {
    bannerBg: 'rgba(255,255,255,0.9)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardTextColor: '#1a1a1a',
    borderRadius: 6,
    fontWeight: 500,
    textShadow: 'none',
    heroTextShadow: '1px 1px 2px rgba(0,0,0,0.15)',
    headlineBg: 'rgba(255,255,255,0.85)',
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
    cards?: { items: { icon?: string; label: string; number?: number }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
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
  const { elements, colors, logoMeta } = request;
  const theme = resolveTheme(request.imageStyle, colors);
  const children: any[] = [];
  const fontFamily = hasCustomFont ? 'Be Vietnam Pro' : 'sans-serif';

  // === Smart Density: reduce visual clutter ===
  if (elements.heroText && elements.headline) {
    delete elements.headline;
  }
  if (elements.cards?.items) {
    const isSquareOrTall = imageWidth <= imageHeight;
    const maxCards = isSquareOrTall ? 3 : 4;
    elements.cards.items = elements.cards.items.slice(0, maxCards);
  }
  if (elements.footer?.items) {
    elements.footer.items = elements.footer.items.slice(0, 4);
  }
  const elementCount = [elements.banner, elements.heroText, elements.headline, elements.cards, elements.cta, elements.footer].filter(Boolean).length;
  if (elementCount >= 5 && elements.cta) {
    delete elements.cta;
  }

  // Determine if split layout
  const isSplit = request.layout === 'split';

  // Determine banner text color based on banner bg brightness
  const bannerTextColor = theme.bannerBg.includes('255,255,255') ? '#1a1a1a' : '#FFFFFF';

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
          padding: `12px ${bannerPaddingRight}px 12px ${bannerPaddingLeft}px`,
          width: '100%',
          borderRadius: theme.borderRadius > 0 ? `${theme.borderRadius}px ${theme.borderRadius}px 0 0` : '0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: bannerTextColor,
              fontSize: Math.round(imageWidth * 0.03),
              fontFamily,
              fontWeight: theme.fontWeight,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textShadow: `${theme.textShadow}, 0 2px 8px rgba(0,0,0,0.5)`,
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

  // Cards grid
  if (elements.cards && elements.cards.items.length > 0) {
    const isGrid = elements.cards.layout === 'grid-2x2';
    const cardFontSize = Math.round(imageWidth * 0.02);
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
                  color: '#FFFFFF',
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

      cardChildren.push({
        type: 'span',
        props: {
          style: {
            color: theme.cardTextColor,
            fontSize: cardFontSize,
            fontFamily,
            fontWeight: theme.fontWeight >= 600 ? 500 : theme.fontWeight,
            flex: 1,
          },
          children: item.label,
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
            padding: hasNumberedCards ? '12px 16px' : '10px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
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

  // Summary ribbon (between cards and CTA)
  if (elements.summaryRibbon) {
    const ribbonFontSize = Math.round(imageWidth * 0.022);
    const ribbonBg = elements.summaryRibbon.bgColor || colors.primary;
    children.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(90deg, ${ribbonBg}, ${ribbonBg}dd)`,
          padding: '10px 28px',
          width: '90%',
          borderRadius: theme.borderRadius > 0 ? theme.borderRadius : 4,
          marginTop: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: '#FFFFFF',
              fontSize: ribbonFontSize,
              fontFamily,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.4,
              textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
            },
            children: elements.summaryRibbon.text,
          },
        },
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
          borderRadius: theme.borderRadius > 8 ? 24 : theme.borderRadius > 0 ? 12 : 0,
          marginTop: 8,
          ...(ctaMarginBottom > 0 ? { marginBottom: ctaMarginBottom } : {}),
        },
        children: {
          type: 'span',
          props: {
            style: {
              color: '#FFFFFF',
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
    const footerFontSize = Math.round(imageWidth * 0.018);
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
      if (elements.cards?.items) allTexts.push(...elements.cards.items.map(c => c.label));
      if (elements.footer?.items) allTexts.push(...elements.footer.items.map(f => f.text));
      const combinedText = allTexts.join(' ') || 'Default';

      console.log(`[overlay-text-canvas] Elements: banner=${!!elements.banner}, hero=${!!elements.heroText}, cards=${elements.cards?.items?.length || 0}`);

      const fontData2 = await loadGoogleFont(combinedText, 600);
      type Weight2 = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
      const fonts2 = fontData2 ? [{ name: 'Be Vietnam Pro', data: fontData2, weight: 600 as Weight2, style: 'normal' as const }] : [];
      if (fonts2.length === 0) {
        const fb = await loadGoogleFont(combinedText, 400);
        if (fb) fonts2.push({ name: 'Be Vietnam Pro', data: fb, weight: 400 as Weight2, style: 'normal' as const });
      }
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
