/**
 * Overlay Template Presets
 * 
 * Predefined layout structures for hybrid image generation.
 * Each template defines a layout type and required element slots.
 * AI-generated content fills the slots; template controls the structure.
 */

export interface OverlayTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'ai' | 'conversion' | 'education' | 'trust' | 'editorial';
  /** Maps to StructuredOverlayRequest.layout */
  layout: 'stack' | 'split' | 'banner_cards' | 'hero_text' | 'simple';
  /** Which element slots this template requires */
  requiredSlots: Array<'banner' | 'heroText' | 'headline' | 'cards' | 'cta' | 'footer' | 'summaryRibbon'>;
  /** Default element overrides when AI doesn't provide required slots */
  defaults: {
    banner?: { position: 'top' | 'bottom' };
    heroText?: { fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
    cards?: { layout: 'grid-2x2' | 'horizontal' | 'vertical'; minCount: number; numbered?: boolean };
  };
  aiRender?: {
    preferredRatios: Array<'1:1' | '4:5' | '16:9' | '9:16'>;
    narrowAdaptation: 'stack' | 'compact' | 'reduce_cards';
    maxCards: number;
    heroPolicy: 'none' | 'optional' | 'required';
    ctaPolicy: 'none' | 'optional' | 'required';
    footerPolicy: 'none' | 'compact' | 'contact_bar';
  };
}

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'auto',
    name: 'AI tự chọn',
    description: 'AI phân tích nội dung và chọn layout phù hợp nhất',
    icon: '🤖',
    category: 'ai',
    layout: 'simple',
    requiredSlots: [],
    defaults: {},
  },
  {
    id: 'poster',
    name: 'Poster',
    description: 'Banner trên + Tiêu đề lớn + Nút CTA',
    icon: '📰',
    category: 'conversion',
    layout: 'stack',
    requiredSlots: ['banner', 'headline', 'cta'],
    defaults: {
      banner: { position: 'top' },
    },
    aiRender: { preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'compact', maxCards: 1, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none' },
  },
  {
    id: 'infographic',
    name: 'Infographic',
    description: 'Chia đôi: Hero text trái + Cards phải',
    icon: '📊',
    category: 'education',
    layout: 'split',
    requiredSlots: ['banner', 'heroText', 'cards'],
    defaults: {
      banner: { position: 'top' },
      heroText: { fontSize: '3xl', effect: 'gradient' },
      cards: { layout: 'grid-2x2', minCount: 4 },
    },
    aiRender: { preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'required', ctaPolicy: 'none', footerPolicy: 'none' },
  },
  {
    id: 'quote_card',
    name: 'Quote Card',
    description: 'Trích dẫn nổi bật + Banner dưới',
    icon: '💬',
    category: 'editorial',
    layout: 'hero_text',
    requiredSlots: ['heroText', 'banner'],
    defaults: {
      banner: { position: 'bottom' },
      heroText: { fontSize: '3xl', effect: 'gradient' },
    },
    aiRender: { preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'none', footerPolicy: 'none' },
  },
  {
    id: 'feature_list',
    name: 'Danh sách',
    description: 'Banner trên + Danh sách dọc các tính năng',
    icon: '📋',
    category: 'education',
    layout: 'banner_cards',
    requiredSlots: ['banner', 'cards'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'vertical', minCount: 3 },
    },
    aiRender: { preferredRatios: ['4:5', '1:1', '9:16'], narrowAdaptation: 'stack', maxCards: 4, heroPolicy: 'optional', ctaPolicy: 'optional', footerPolicy: 'none' },
  },
  {
    id: 'contact_card',
    name: 'Liên hệ',
    description: 'Tiêu đề + Thông tin liên hệ phía dưới',
    icon: '📇',
    category: 'trust',
    layout: 'stack',
    requiredSlots: ['headline', 'footer'],
    defaults: {},
    aiRender: { preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'optional', ctaPolicy: 'optional', footerPolicy: 'contact_bar' },
  },
  {
    id: 'education_infographic',
    name: 'Infographic GD',
    description: 'Tiêu đề lớn + Cards đánh số + Ribbon tóm tắt + Liên hệ',
    icon: '🎓',
    category: 'education',
    layout: 'stack',
    requiredSlots: ['banner', 'cards', 'summaryRibbon', 'cta', 'footer'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'vertical', minCount: 3, numbered: true },
    },
    aiRender: { preferredRatios: ['4:5', '1:1', '9:16'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'contact_bar' },
  },
  {
    id: 'comparison_card',
    name: 'So sánh',
    description: '2 cột A/B, before-after hoặc đúng-sai',
    icon: '⚖️',
    category: 'education',
    layout: 'split',
    requiredSlots: ['banner', 'cards', 'cta'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'horizontal', minCount: 2 },
    },
    aiRender: { preferredRatios: ['16:9', '1:1', '9:16'], narrowAdaptation: 'stack', maxCards: 2, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none' },
  },
  {
    id: 'timeline_steps',
    name: 'Từng bước',
    description: 'Quy trình 3-5 bước theo chiều dọc',
    icon: '🪜',
    category: 'education',
    layout: 'banner_cards',
    requiredSlots: ['banner', 'cards', 'cta'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'vertical', minCount: 3, numbered: true },
    },
    aiRender: { preferredRatios: ['4:5', '9:16', '1:1'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none' },
  },
  {
    id: 'stat_spotlight',
    name: 'Số liệu nổi bật',
    description: 'Hero number lớn + headline giải thích ngắn',
    icon: '📈',
    category: 'education',
    layout: 'hero_text',
    requiredSlots: ['banner', 'heroText', 'headline'],
    defaults: {
      banner: { position: 'top' },
      heroText: { fontSize: '3xl', effect: 'gradient' },
    },
    aiRender: { preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'optional', footerPolicy: 'compact' },
  },
  {
    id: 'product_spotlight',
    name: 'Spotlight SP',
    description: 'Headline + lợi ích chính + CTA mạnh',
    icon: '🛍️',
    category: 'conversion',
    layout: 'stack',
    requiredSlots: ['banner', 'headline', 'cards', 'cta'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'horizontal', minCount: 3 },
    },
    aiRender: { preferredRatios: ['4:5', '16:9', '1:1'], narrowAdaptation: 'stack', maxCards: 3, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'optional' as never },
  },
  {
    id: 'testimonial_card',
    name: 'Testimonial',
    description: 'Quote/review nổi bật + headline + CTA',
    icon: '🌟',
    category: 'trust',
    layout: 'hero_text',
    requiredSlots: ['heroText', 'headline', 'cta'],
    defaults: {
      heroText: { fontSize: '2xl', effect: 'gradient' },
    },
    aiRender: { preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'optional', footerPolicy: 'none' },
  },
  {
    id: 'editorial_cover',
    name: 'Editorial',
    description: 'Magazine cover tối giản, sang trọng',
    icon: '🖋️',
    category: 'editorial',
    layout: 'stack',
    requiredSlots: ['headline'],
    defaults: {},
    aiRender: { preferredRatios: ['16:9', '1:1', '4:5'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'optional', ctaPolicy: 'none', footerPolicy: 'none' },
  },
  {
    id: 'problem_solution',
    name: 'Vấn đề → Giải pháp',
    description: 'Pain point, giải pháp và CTA chuyển đổi',
    icon: '🧩',
    category: 'conversion',
    layout: 'split',
    requiredSlots: ['headline', 'cards', 'cta'],
    defaults: {
      cards: { layout: 'vertical', minCount: 3 },
    },
    aiRender: { preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'stack', maxCards: 3, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'compact' },
  },
  {
    id: 'checklist_card',
    name: 'Checklist',
    description: 'Danh sách nhanh, save-worthy, dễ scan',
    icon: '✅',
    category: 'education',
    layout: 'banner_cards',
    requiredSlots: ['banner', 'cards', 'cta'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'vertical', minCount: 4, numbered: true },
    },
    aiRender: { preferredRatios: ['1:1', '4:5', '9:16'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none' },
  },
];

export function getTemplateById(id: string): OverlayTemplate | undefined {
  return OVERLAY_TEMPLATES.find(t => t.id === id);
}
