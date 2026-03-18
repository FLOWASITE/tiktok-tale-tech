/**
 * Hybrid Image Generator
 * Decomposes complex image requests into:
 *   1. Background prompt (visual/atmosphere) → AI generation
 *   2. Overlay config (text, cards, structured elements) → Satori rendering
 * 
 * V2: AI-powered decomposition via Gemini Flash with regex fallback
 * V3: Template system — user picks a layout preset, AI fills content slots
 */

import { supabase } from '@/integrations/supabase/client';
import { getTemplateById, type OverlayTemplate } from '@/config/overlayTemplates';

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
  /** Optional description/subtitle for 2-line card rendering */
  description?: string;
  /** Optional number for numbered card styling */
  number?: number;
}

export interface OverlayCards {
  items: OverlayCardItem[];
  layout: 'grid-2x2' | 'horizontal' | 'vertical';
}

export interface OverlayFooterItem {
  icon?: string;
  text: string;
}

export interface OverlayFooter {
  items: OverlayFooterItem[];
}

export interface OverlaySummaryRibbon {
  text: string;
  bgColor?: string;
}

export interface StructuredOverlayConfig {
  banner?: OverlayBanner;
  heroText?: OverlayHeroText;
  cards?: OverlayCards;
  headline?: string;
  cta?: string;
  footer?: OverlayFooter;
  /** Summary ribbon displayed between cards and CTA/footer */
  summaryRibbon?: OverlaySummaryRibbon;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

export interface DecomposedRequest {
  backgroundPrompt: BackgroundPrompt;
  overlayConfig: StructuredOverlayConfig;
  layout?: 'stack' | 'split' | 'banner_cards' | 'hero_text' | 'simple';
  /** AI-suggested template ID based on content analysis */
  suggestedLayout?: 'poster' | 'infographic' | 'quote_card' | 'feature_list' | 'contact_card' | 'education_infographic';
}

/** Strategic context passed to AI decomposition for smarter layout selection */
export interface DecomposeContext {
  contentRole?: string;
  contentGoal?: string;
  contentAngle?: string;
  topic?: string;
  textToInclude?: string;
}

/**
 * AI-powered decomposition using Gemini Flash via edge function.
 * Falls back to regex-based decomposition on failure.
 */
export async function decomposeRequestWithAI(
  description: string,
  primaryColor: string = '#DC2626',
  secondaryColor: string = '#FFFFFF',
  context?: DecomposeContext,
  imageStyle?: string
): Promise<DecomposedRequest> {
  try {
    console.log('[HybridImageGen] Using AI decomposition via Gemini Flash...', {
      descLength: description.length,
      hasContext: !!context,
      contentRole: context?.contentRole,
      contentGoal: context?.contentGoal,
      imageStyle,
    });
    
    const { data, error } = await supabase.functions.invoke('decompose-image-request', {
      body: { description, primaryColor, secondaryColor, context, imageStyle },
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
        ...(data.overlayConfig.footer ? { footer: data.overlayConfig.footer } : {}),
        ...(data.overlayConfig.summaryRibbon ? { summaryRibbon: data.overlayConfig.summaryRibbon } : {}),
      },
      suggestedLayout: data.suggestedLayout || undefined,
    };

    console.log('[HybridImageGen] AI decomposition successful:', {
      bgElements: result.backgroundPrompt.elements.length,
      hasOverlayBanner: !!result.overlayConfig.banner,
      hasHeroText: !!result.overlayConfig.heroText,
      cardCount: result.overlayConfig.cards?.items?.length || 0,
      hasFooter: !!result.overlayConfig.footer,
    });

    return result;
  } catch (err) {
    console.warn('[HybridImageGen] AI decomposition error, falling back to regex:', err);
    return decomposeRequest(description, primaryColor, secondaryColor);
  }
}

function extractFooterItemsFromText(description: string): OverlayFooterItem[] {
  const source = description.trim();
  if (!source) return [];

  const items: OverlayFooterItem[] = [];
  const seen = new Set<string>();
  const pushUnique = (item: OverlayFooterItem) => {
    const key = item.text.toLowerCase();
    if (item.text && !seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  };

  const phones = source.match(/(?:\+?84|0)\d[\d\s.\-]{7,12}\d/g) || [];
  for (const raw of phones.slice(0, 2)) {
    pushUnique({ icon: '📞', text: raw.replace(/\s+/g, ' ').trim() });
  }

  const emails = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const email of emails.slice(0, 2)) {
    pushUnique({ icon: '📧', text: email.trim() });
  }

  const websites = source.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+\b/gi) || [];
  for (const site of websites.slice(0, 2)) {
    if (!site.includes('@')) {
      pushUnique({ icon: '🌐', text: site.trim() });
    }
  }

  const addressLine = source
    .split(/\n|\.|;/)
    .map((line) => line.trim())
    .find((line) => /(địa chỉ|address|addr|đường|street|phường|quận|district|ward)/i.test(line));

  if (addressLine) {
    const clean = addressLine.replace(/^(địa chỉ|address|addr)\s*[:\-]?\s*/i, '').trim();
    if (clean.length >= 6) {
      pushUnique({ icon: '📍', text: clean.slice(0, 80) });
    }
  }

  return items.slice(0, 4);
}

/**
 * Regex-based decomposition (V1 fallback).
 * Used when AI decomposition fails or for quick local processing.
 */
/**
 * Generate meaningful default overlay content from a narrative description.
 */
function generateDefaultOverlayFromSummary(
  description: string,
  primaryColor: string
): Partial<StructuredOverlayConfig> {
  const result: Partial<StructuredOverlayConfig> = {};
  const text = description.trim();

  // Extract a banner from first meaningful phrase (2-4 words uppercase)
  const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const words = sentences[0].split(/\s+/).slice(0, 4).join(' ');
    result.banner = { text: words.toUpperCase().slice(0, 30), bgColor: primaryColor, position: 'top' };
  }

  // Extract hero text: first number/percentage found, or a strong keyword
  const numberMatch = text.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
  if (numberMatch) {
    result.heroText = { text: numberMatch[0].trim().slice(0, 20), fontSize: '3xl', effect: 'gradient' };
  }

  // Generate cards from bullet points or sentences
  const bulletItems = text.match(/(?:^|\n)\s*[•\-\*►]\s*(.+)/gm);
  const numberedItems = text.match(/(?:^|\n)\s*\d+[\.\)]\s*(.+)/gm);
  
  let cardLabels: string[] = [];
  if (bulletItems && bulletItems.length >= 2) {
    cardLabels = bulletItems.map(b => b.replace(/^[\s•\-\*►]+/, '').trim());
  } else if (numberedItems && numberedItems.length >= 2) {
    cardLabels = numberedItems.map(b => b.replace(/^[\s\d\.\)]+/, '').trim());
  } else if (sentences.length >= 3) {
    // Use sentences as card content, skip the first (used as banner)
    cardLabels = sentences.slice(1, 5);
  }

  if (cardLabels.length >= 2) {
    result.cards = {
      items: cardLabels.slice(0, 4).map(label => ({ label: label.slice(0, 50) })),
      layout: cardLabels.length <= 2 ? 'horizontal' : 'grid-2x2',
    };
  }

  const footerItems = extractFooterItemsFromText(text);
  if (footerItems.length > 0) {
    result.footer = { items: footerItems };
  }

  return result;
}

/**
 * Regex-based decomposition (V1 fallback).
 * Now generates meaningful defaults when structured elements are not detected.
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

  const footerItems = extractFooterItemsFromText(description);
  if (footerItems.length > 0) {
    overlayConfig.footer = { items: footerItems };
  }

  // If regex didn't find structured overlay elements, generate meaningful defaults
  const hasOverlay = overlayConfig.banner || overlayConfig.heroText || overlayConfig.headline || overlayConfig.cards || overlayConfig.footer;
  if (!hasOverlay) {
    const defaults = generateDefaultOverlayFromSummary(description, primaryColor);
    if (defaults.banner) overlayConfig.banner = defaults.banner;
    if (defaults.heroText) overlayConfig.heroText = defaults.heroText;
    if (defaults.cards) overlayConfig.cards = defaults.cards;
    if (defaults.footer) overlayConfig.footer = defaults.footer;
  }

  return { backgroundPrompt, overlayConfig };
}

/**
 * Auto-select the best template based on content analysis.
 * Analyzes decomposed overlay config to pick the most suitable layout.
 */
export function autoSelectTemplate(
  description: string,
  overlayConfig: StructuredOverlayConfig
): string {
  // Has contact info (phone/email/address) + cards → education_infographic
  const hasContactInfo = extractFooterItemsFromText(description).length >= 2;
  if (hasContactInfo && overlayConfig.cards && overlayConfig.cards.items.length >= 3) return 'education_infographic';

  // Has contact info + no cards → contact_card
  if (hasContactInfo && !overlayConfig.cards) return 'contact_card';

  // Has 4+ cards → infographic (split layout, grid 2x2)
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 4) return 'infographic';

  // Has 2-3 cards → feature_list (banner + vertical list)
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 2) return 'feature_list';

  // Has heroText (big number/stat) + no cards → quote_card
  if (overlayConfig.heroText && !overlayConfig.cards) return 'quote_card';

  // Has headline or CTA → poster
  if (overlayConfig.headline || overlayConfig.cta) return 'poster';

  // Default: poster (most versatile)
  return 'poster';
}

/**
 * Apply a template preset to AI-decomposed content.
 * Keeps AI-generated text but overrides layout and ensures required slots exist.
 */
export function applyTemplate(
  templateId: string,
  decomposed: DecomposedRequest,
  description: string,
  primaryColor: string = '#DC2626'
): DecomposedRequest {
  if (templateId === 'auto') return decomposed;

  const template = getTemplateById(templateId);
  if (!template) return decomposed;

  const overlay = { ...decomposed.overlayConfig };

  // Ensure required banner slot
  if (template.requiredSlots.includes('banner') && !overlay.banner) {
    const words = description.split(/\s+/).slice(0, 4).join(' ');
    overlay.banner = {
      text: words.toUpperCase().slice(0, 30),
      bgColor: primaryColor,
      position: template.defaults.banner?.position || 'top',
    };
  } else if (overlay.banner && template.defaults.banner) {
    overlay.banner.position = template.defaults.banner.position;
  }

  // Ensure required heroText slot
  if (template.requiredSlots.includes('heroText') && !overlay.heroText) {
    const numMatch = description.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
    overlay.heroText = {
      text: numMatch ? numMatch[0].trim().slice(0, 20) : description.split(/[.!?\n]/)[0]?.slice(0, 40) || 'Highlight',
      fontSize: template.defaults.heroText?.fontSize || '3xl',
      effect: template.defaults.heroText?.effect || 'gradient',
    };
  }

  // Ensure required headline slot
  if (template.requiredSlots.includes('headline') && !overlay.headline) {
    overlay.headline = description.split(/[.!?\n]/)[0]?.slice(0, 60) || 'Tiêu đề';
  }

  // Ensure required cards slot
  if (template.requiredSlots.includes('cards') && !overlay.cards) {
    const sentences = description.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 5);
    const minCount = template.defaults.cards?.minCount || 3;
    const items = sentences.slice(0, Math.max(minCount, 2)).map(s => ({ label: s.slice(0, 50) }));
    while (items.length < minCount) items.push({ label: `Điểm ${items.length + 1}` });
    overlay.cards = {
      items,
      layout: template.defaults.cards?.layout || 'grid-2x2',
    };
  } else if (overlay.cards && template.defaults.cards) {
    overlay.cards.layout = template.defaults.cards.layout;
  }

  // Ensure required CTA slot
  if (template.requiredSlots.includes('cta') && !overlay.cta) {
    overlay.cta = 'Tìm hiểu thêm';
  }

  // Ensure required summaryRibbon slot
  if (template.requiredSlots.includes('summaryRibbon') && !overlay.summaryRibbon) {
    const sentences = description.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 10);
    overlay.summaryRibbon = {
      text: sentences[sentences.length - 1]?.slice(0, 80) || 'Liên hệ ngay để được tư vấn',
      bgColor: overlay.colors.primary,
    };
  }

  // Add numbered styling to cards when template requires it
  if (template.defaults.cards?.numbered && overlay.cards) {
    overlay.cards.items = overlay.cards.items.map((item, idx) => ({
      ...item,
      number: idx + 1,
    }));
  }

  // Ensure required footer slot
  if (template.requiredSlots.includes('footer') && !overlay.footer) {
    const footerItems = extractFooterItemsFromText(description);
    overlay.footer = {
      items: footerItems.length > 0 ? footerItems : [{ icon: '📩', text: 'Liên hệ để được tư vấn' }],
    };
  }

  return {
    backgroundPrompt: decomposed.backgroundPrompt,
    overlayConfig: overlay,
    layout: template.layout,
  };
}
