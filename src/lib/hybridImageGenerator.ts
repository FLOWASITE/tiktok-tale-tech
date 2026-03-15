/**
 * Hybrid Image Generator
 * Decomposes complex image requests into:
 *   1. Background prompt (visual/atmosphere) → AI generation
 *   2. Overlay config (text, cards, structured elements) → Satori rendering
 * 
 * V2: AI-powered decomposition via Gemini Flash with regex fallback
 */

import { supabase } from '@/integrations/supabase/client';

export interface BackgroundPrompt {
  description: string;
  colorScheme: string;
  mood: string;
  elements: string[];
}

export interface OverlayBanner {
  text: string;
  bgColor: string;
  position: 'top' | 'bottom';
}

export interface OverlayHeroText {
  text: string;
  fontSize: 'xl' | '2xl' | '3xl';
  effect: 'none' | 'gradient';
}

export interface OverlayCardItem {
  icon?: string;
  label: string;
}

export interface OverlayCards {
  items: OverlayCardItem[];
  layout: 'grid-2x2' | 'horizontal' | 'vertical';
}

export interface StructuredOverlayConfig {
  banner?: OverlayBanner;
  heroText?: OverlayHeroText;
  cards?: OverlayCards;
  headline?: string;
  cta?: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

export interface DecomposedRequest {
  backgroundPrompt: BackgroundPrompt;
  overlayConfig: StructuredOverlayConfig;
}

/**
 * AI-powered decomposition using Gemini Flash via edge function.
 * Falls back to regex-based decomposition on failure.
 */
export async function decomposeRequestWithAI(
  description: string,
  primaryColor: string = '#DC2626',
  secondaryColor: string = '#FFFFFF'
): Promise<DecomposedRequest> {
  try {
    console.log('[HybridImageGen] Using AI decomposition via Gemini Flash...');
    
    const { data, error } = await supabase.functions.invoke('decompose-image-request', {
      body: { description, primaryColor, secondaryColor },
    });

    if (error) {
      console.warn('[HybridImageGen] AI decomposition failed, falling back to regex:', error.message);
      return decomposeRequest(description, primaryColor, secondaryColor);
    }

    // Validate required fields
    if (!data?.backgroundPrompt?.description || !data?.overlayConfig) {
      console.warn('[HybridImageGen] AI returned incomplete data, falling back to regex');
      return decomposeRequest(description, primaryColor, secondaryColor);
    }

    const result: DecomposedRequest = {
      backgroundPrompt: {
        description: data.backgroundPrompt.description,
        colorScheme: data.backgroundPrompt.colorScheme || `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
        mood: data.backgroundPrompt.mood || 'professional, modern',
        elements: data.backgroundPrompt.elements || [],
      },
      overlayConfig: {
        colors: data.overlayConfig.colors || { primary: primaryColor, secondary: secondaryColor, text: '#FFFFFF' },
        ...(data.overlayConfig.banner ? { banner: data.overlayConfig.banner } : {}),
        ...(data.overlayConfig.heroText ? { heroText: data.overlayConfig.heroText } : {}),
        ...(data.overlayConfig.headline ? { headline: data.overlayConfig.headline } : {}),
        ...(data.overlayConfig.cards ? { cards: data.overlayConfig.cards } : {}),
        ...(data.overlayConfig.cta ? { cta: data.overlayConfig.cta } : {}),
      },
    };

    console.log('[HybridImageGen] AI decomposition successful:', {
      bgElements: result.backgroundPrompt.elements.length,
      hasOverlayBanner: !!result.overlayConfig.banner,
      hasHeroText: !!result.overlayConfig.heroText,
      cardCount: result.overlayConfig.cards?.items?.length || 0,
    });

    return result;
  } catch (err) {
    console.warn('[HybridImageGen] AI decomposition error, falling back to regex:', err);
    return decomposeRequest(description, primaryColor, secondaryColor);
  }
}

/**
 * Regex-based decomposition (V1 fallback).
 * Used when AI decomposition fails or for quick local processing.
 */
export function decomposeRequest(
  description: string,
  primaryColor: string = '#DC2626',
  secondaryColor: string = '#FFFFFF'
): DecomposedRequest {
  const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
  
  const visualKeywords: string[] = [];
  const textElements: string[] = [];
  const cardItems: OverlayCardItem[] = [];
  let bannerText = '';
  let heroText = '';
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (lower.includes('banner') || lower.includes('tin nóng') || lower.includes('breaking')) {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) bannerText = quoted[1] || quoted[2] || '';
    }
    else if (lower.includes('số') && lower.includes('lớn') || lower.includes('hero') || lower.match(/"\d+%"/)) {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) heroText = quoted[1] || quoted[2] || '';
    }
    else if (line.match(/^[•\-\*►]\s/) || line.match(/^\d+[\.\)]\s/)) {
      const label = line.replace(/^[•\-\*►\d\.\)]\s*/, '').trim();
      if (label) cardItems.push({ label });
    }
    else if (
      lower.includes('nền') || lower.includes('background') ||
      lower.includes('skyline') || lower.includes('tông màu') ||
      lower.includes('phong cách') || lower.includes('style') ||
      lower.includes('minh họa') || lower.includes('illustration') ||
      lower.includes('mood') || lower.includes('nhân vật')
    ) {
      visualKeywords.push(line);
    }
    else {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) {
        textElements.push(quoted[1] || quoted[2] || '');
      } else {
        visualKeywords.push(line);
      }
    }
  }

  const visualDesc = visualKeywords.join('. ') || description.slice(0, 200);
  const backgroundPrompt: BackgroundPrompt = {
    description: `Clean visual background for infographic: ${visualDesc}. Color scheme: primary ${primaryColor}, secondary ${secondaryColor}. IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements, cards, or buttons in the image. Generate ONLY the visual background scene with atmosphere and illustrations.`,
    colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
    mood: 'professional, modern, corporate',
    elements: ['Clean background without any text, numbers, or UI elements'],
  };

  const overlayConfig: StructuredOverlayConfig = {
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
      text: '#FFFFFF',
    },
  };

  if (bannerText) {
    overlayConfig.banner = { text: bannerText, bgColor: primaryColor, position: 'top' };
  }

  if (heroText) {
    overlayConfig.heroText = { text: heroText, fontSize: '3xl', effect: 'gradient' };
  } else if (textElements.length > 0) {
    overlayConfig.headline = textElements[0];
  }

  if (cardItems.length > 0) {
    overlayConfig.cards = {
      items: cardItems.slice(0, 6),
      layout: cardItems.length <= 2 ? 'horizontal' : cardItems.length <= 4 ? 'grid-2x2' : 'vertical',
    };
  }

  return { backgroundPrompt, overlayConfig };
}
