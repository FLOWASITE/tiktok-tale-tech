/**
 * Hybrid Image Generator
 * Decomposes complex image requests into:
 *   1. Background prompt (visual/atmosphere) → AI generation
 *   2. Overlay config (text, cards, structured elements) → Satori rendering
 */

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
 * Simple heuristic decomposition of a complex image description
 * into background (visual) and overlay (text/structured) parts.
 * 
 * For V1, this uses regex-based extraction.
 * Future versions can use AI (Gemini Flash) for smarter decomposition.
 */
export function decomposeRequest(
  description: string,
  primaryColor: string = '#DC2626',
  secondaryColor: string = '#FFFFFF'
): DecomposedRequest {
  const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract visual/atmosphere keywords for background
  const visualKeywords: string[] = [];
  const textElements: string[] = [];
  const cardItems: OverlayCardItem[] = [];
  let bannerText = '';
  let heroText = '';
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Detect banner text (breaking news style, "DỰ KIẾN", etc.)
    if (lower.includes('banner') || lower.includes('tin nóng') || lower.includes('breaking')) {
      const quoted = line.match(/[""]([^""]+)[""]|"([^"]+)"/);
      if (quoted) bannerText = quoted[1] || quoted[2] || '';
    }
    // Detect hero number/text (e.g., "100%", large text)
    else if (lower.includes('số') && lower.includes('lớn') || lower.includes('hero') || lower.match(/"\d+%"/)) {
      const quoted = line.match(/[""]([^""]+)[""]|"([^"]+)"/);
      if (quoted) heroText = quoted[1] || quoted[2] || '';
    }
    // Detect card/list items (bullet points with icons)
    else if (line.match(/^[•\-\*►]\s/) || line.match(/^\d+[\.\)]\s/)) {
      const label = line.replace(/^[•\-\*►\d\.\)]\s*/, '').trim();
      if (label) cardItems.push({ label });
    }
    // Visual/atmosphere descriptions
    else if (
      lower.includes('nền') || lower.includes('background') ||
      lower.includes('skyline') || lower.includes('tông màu') ||
      lower.includes('phong cách') || lower.includes('style') ||
      lower.includes('minh họa') || lower.includes('illustration') ||
      lower.includes('mood') || lower.includes('nhân vật')
    ) {
      visualKeywords.push(line);
    }
    // Default: try to extract quoted text as overlay, rest as visual
    else {
      const quoted = line.match(/[""]([^""]+)[""]|"([^"]+)"/);
      if (quoted) {
        textElements.push(quoted[1] || quoted[2] || '');
      } else {
        visualKeywords.push(line);
      }
    }
  }

  // Build background prompt (clean, no text, no structured elements)
  const visualDesc = visualKeywords.join('. ') || description.slice(0, 200);
  const backgroundPrompt: BackgroundPrompt = {
    description: `Clean visual background for infographic: ${visualDesc}. Color scheme: primary ${primaryColor}, secondary ${secondaryColor}. IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements, cards, or buttons in the image. Generate ONLY the visual background scene with atmosphere and illustrations.`,
    colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
    mood: 'professional, modern, corporate',
    elements: ['Clean background without any text, numbers, or UI elements'],
  };

  // Build overlay config
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
