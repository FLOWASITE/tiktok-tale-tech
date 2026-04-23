/**
 * Pure utility functions for hybrid image generation.
 * Extracted to allow unit testing without Supabase client dependency.
 */

import { getTemplateById } from '@/config/overlayTemplates';

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
  /** Optional number for numbered card styling (e.g. 1, 2, 3) */
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
  renderSpec?: Record<string, unknown>;
  layoutBehavior?: Record<string, unknown>;
  templateInstruction?: Record<string, unknown>;
  suggestedLayout?:
    | 'poster'
    | 'infographic'
    | 'quote_card'
    | 'feature_list'
    | 'contact_card'
    | 'education_infographic'
    | 'comparison_card'
    | 'timeline_steps'
    | 'stat_spotlight'
    | 'testimonial_card'
    | 'product_spotlight'
    | 'editorial_cover'
    | 'problem_solution'
    | 'checklist_card';
}

export function extractFooterItemsFromText(description: string): OverlayFooterItem[] {
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

function generateDefaultOverlayFromSummary(
  description: string,
  primaryColor: string
): Partial<StructuredOverlayConfig> {
  const result: Partial<StructuredOverlayConfig> = {};
  const text = description.trim();

  const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const words = sentences[0].split(/\s+/).slice(0, 4).join(' ');
    result.banner = { text: words.toUpperCase().slice(0, 30), bgColor: primaryColor, position: 'top' };
  }

  const numberMatch = text.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
  if (numberMatch) {
    result.heroText = { text: numberMatch[0].trim().slice(0, 20), fontSize: '3xl', effect: 'gradient' };
  }

  const bulletItems = text.match(/(?:^|\n)\s*[•\-\*►]\s*(.+)/gm);
  const numberedItems = text.match(/(?:^|\n)\s*\d+[\.\)]\s*(.+)/gm);
  
  let cardLabels: string[] = [];
  if (bulletItems && bulletItems.length >= 2) {
    cardLabels = bulletItems.map(b => b.replace(/^[\s•\-\*►]+/, '').trim());
  } else if (numberedItems && numberedItems.length >= 2) {
    cardLabels = numberedItems.map(b => b.replace(/^[\s\d\.\)]+/, '').trim());
  } else if (sentences.length >= 3) {
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
 */
export function autoSelectTemplate(
  description: string,
  overlayConfig: StructuredOverlayConfig,
  channel?: string,
  aspectRatio?: string
): string {
  const normalized = description.toLowerCase();
  const hasAny = (terms: string[]) => terms.some((term) => normalized.includes(term));
  const hasContactInfo = extractFooterItemsFromText(description).length >= 2;
  const hasStepSignal = hasAny(['quy trình', 'các bước', 'bước ', 'hướng dẫn', 'timeline', 'lộ trình', 'step ', 'steps ']);
  const hasComparisonSignal = hasAny(['so sánh', 'before after', 'before/after', 'trước và sau', 'đúng và sai', 'cũ và mới', 'versus', ' a/b', 'vs ']);
  const hasStatSignal = /\d+[\d.,]*\s*(%|x|triệu|tỷ|k|m|nghìn)?/.test(normalized) && hasAny(['tăng', 'giảm', 'đạt', 'kpi', 'roi', 'roas', 'ctr', 'số liệu', 'thống kê', 'insight', 'data', 'tỷ lệ']);
  const hasTestimonialSignal = hasAny(['review', 'testimonial', 'feedback', 'khách hàng', 'đánh giá', 'case study', 'phản hồi', 'chứng thực']);
  const hasProductSignal = hasAny(['sản phẩm', 'launch', 'ra mắt', 'usp', 'ưu điểm', 'benefit', 'công dụng', 'combo', 'gói dịch vụ']);
  const hasChecklistSignal = hasAny(['checklist', 'check list', 'lưu ý', 'quick tips', 'tips', 'điều cần nhớ', 'cần biết', 'must-know']);
  const hasProblemSolutionSignal = hasAny(['vấn đề', 'pain point', 'nỗi đau', 'giải pháp', 'solution', 'khắc phục', 'cách xử lý']);
  const hasEditorialSignal = hasAny(['trend', 'xu hướng', 'góc nhìn', 'opinion', 'quan điểm', 'insight cá nhân', 'thought leadership', 'editorial']);
  const isTall = aspectRatio === '9:16' || aspectRatio === '4:5';
  const isWide = aspectRatio === '16:9';
  const socialContext = `${channel || ''}:${aspectRatio || ''}`;

  if (hasComparisonSignal) return isWide ? 'comparison_card' : 'comparison_card';
  if (hasStatSignal && overlayConfig.heroText) return 'stat_spotlight';
  if (hasStepSignal) return 'timeline_steps';
  if (hasTestimonialSignal) return 'testimonial_card';
  if (hasChecklistSignal) return 'checklist_card';
  if (hasProblemSolutionSignal) return 'problem_solution';
  if (hasProductSignal && (overlayConfig.cards || overlayConfig.cta)) return 'product_spotlight';
  if (hasEditorialSignal && (overlayConfig.headline || overlayConfig.heroText)) return isTall ? 'quote_card' : 'editorial_cover';

  if (hasContactInfo && overlayConfig.cards && overlayConfig.cards.items.length >= 3) return isTall ? 'contact_card' : 'education_infographic';
  if (hasContactInfo && !overlayConfig.cards) return 'contact_card';
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 4) return isTall ? 'timeline_steps' : 'infographic';
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 2) return isTall ? 'checklist_card' : 'feature_list';
  if (overlayConfig.heroText && !overlayConfig.cards) return 'quote_card';
  if ((overlayConfig.headline || overlayConfig.cta) && false) return 'poster';
  return 'poster';
}

/**
 * Apply a template preset to AI-decomposed content.
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

  if (template.requiredSlots.includes('heroText') && !overlay.heroText) {
    const numMatch = description.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
    overlay.heroText = {
      text: numMatch ? numMatch[0].trim().slice(0, 20) : description.split(/[.!?\n]/)[0]?.slice(0, 40) || 'Highlight',
      fontSize: template.defaults.heroText?.fontSize || '3xl',
      effect: template.defaults.heroText?.effect || 'gradient',
    };
  }

  if (template.requiredSlots.includes('headline') && !overlay.headline) {
    overlay.headline = description.split(/[.!?\n]/)[0]?.slice(0, 60) || 'Tiêu đề';
  }

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
    renderSpec: decomposed.renderSpec,
    layoutBehavior: decomposed.layoutBehavior,
    templateInstruction: decomposed.templateInstruction,
  };
}
