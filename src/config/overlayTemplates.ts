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
}

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'auto',
    name: 'AI tự chọn',
    description: 'AI phân tích nội dung và chọn layout phù hợp nhất',
    icon: '🤖',
    layout: 'simple',
    requiredSlots: [],
    defaults: {},
  },
  {
    id: 'poster',
    name: 'Poster',
    description: 'Banner trên + Tiêu đề lớn + Nút CTA',
    icon: '📰',
    layout: 'stack',
    requiredSlots: ['banner', 'headline', 'cta'],
    defaults: {
      banner: { position: 'top' },
    },
  },
  {
    id: 'infographic',
    name: 'Infographic',
    description: 'Chia đôi: Hero text trái + Cards phải',
    icon: '📊',
    layout: 'split',
    requiredSlots: ['banner', 'heroText', 'cards'],
    defaults: {
      banner: { position: 'top' },
      heroText: { fontSize: '3xl', effect: 'gradient' },
      cards: { layout: 'grid-2x2', minCount: 4 },
    },
  },
  {
    id: 'quote_card',
    name: 'Quote Card',
    description: 'Trích dẫn nổi bật + Banner dưới',
    icon: '💬',
    layout: 'hero_text',
    requiredSlots: ['heroText', 'banner'],
    defaults: {
      banner: { position: 'bottom' },
      heroText: { fontSize: '3xl', effect: 'gradient' },
    },
  },
  {
    id: 'feature_list',
    name: 'Danh sách',
    description: 'Banner trên + Danh sách dọc các tính năng',
    icon: '📋',
    layout: 'banner_cards',
    requiredSlots: ['banner', 'cards'],
    defaults: {
      banner: { position: 'top' },
      cards: { layout: 'vertical', minCount: 3 },
    },
  },
  {
    id: 'contact_card',
    name: 'Liên hệ',
    description: 'Tiêu đề + Thông tin liên hệ phía dưới',
    icon: '📇',
    layout: 'stack',
    requiredSlots: ['headline', 'footer'],
    defaults: {},
  },
];

export function getTemplateById(id: string): OverlayTemplate | undefined {
  return OVERLAY_TEMPLATES.find(t => t.id === id);
}
