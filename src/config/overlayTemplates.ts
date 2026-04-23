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
  layout: 'stack' | 'split' | 'banner_cards' | 'hero_text' | 'simple';
  requiredSlots: Array<'banner' | 'heroText' | 'headline' | 'cards' | 'cta' | 'footer' | 'summaryRibbon'>;
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
    semanticPurpose: string;
    visualPriority: string[];
    sectionOrder: string[];
    heroHeadlineRule: string;
    ctaRule: string;
    footerRule: string;
    textReductionOrder: string[];
    logoAvoidanceRule: string;
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
    aiRender: {
      preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'compact', maxCards: 1, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none',
      semanticPurpose: 'Poster chuyển đổi với headline lớn và CTA rõ ràng.',
      visualPriority: ['banner', 'headline', 'cta'],
      sectionOrder: ['banner', 'headline', 'cta'],
      heroHeadlineRule: 'Không dùng hero song song headline.',
      ctaRule: 'CTA ngắn, nổi bật, tách khỏi footer.',
      footerRule: 'Tránh footer nếu không phải contact-first.',
      textReductionOrder: ['description', 'footer', 'headline'],
      logoAvoidanceRule: 'Để trống vùng logo, không đặt CTA chạm vào.',
    },
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
    aiRender: {
      preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'required', ctaPolicy: 'none', footerPolicy: 'none',
      semanticPurpose: 'Infographic giáo dục với hero insight và cards hỗ trợ.',
      visualPriority: ['banner', 'heroText', 'cards'],
      sectionOrder: ['banner', 'heroText', 'cards'],
      heroHeadlineRule: 'Hero là chính, headline chỉ hỗ trợ khi cần.',
      ctaRule: 'Chỉ bật CTA nếu brief có ý định conversion.',
      footerRule: 'Tránh footer ở layout split đậm thông tin.',
      textReductionOrder: ['card_description', 'card_count', 'footer'],
      logoAvoidanceRule: 'Giữ cột cards và hero tránh xa vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'none', footerPolicy: 'none',
      semanticPurpose: 'Quote/emotion card với một block text chủ đạo.',
      visualPriority: ['heroText', 'banner'],
      sectionOrder: ['heroText', 'banner'],
      heroHeadlineRule: 'Không để headline cạnh tranh với quote chính.',
      ctaRule: 'Không dùng CTA trong mode quote chuẩn.',
      footerRule: 'Không dùng footer.',
      textReductionOrder: ['banner'],
      logoAvoidanceRule: 'Quote phải tránh hoàn toàn logo zone.',
    },
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
    aiRender: {
      preferredRatios: ['4:5', '1:1', '9:16'], narrowAdaptation: 'stack', maxCards: 4, heroPolicy: 'optional', ctaPolicy: 'optional', footerPolicy: 'none',
      semanticPurpose: 'List benefit/tips dễ scan.',
      visualPriority: ['banner', 'cards'],
      sectionOrder: ['banner', 'cards', 'cta'],
      heroHeadlineRule: 'Hero chỉ hỗ trợ, không được át danh sách.',
      ctaRule: 'CTA nếu có phải nằm sau list.',
      footerRule: 'Không dùng footer ở list dày.',
      textReductionOrder: ['card_description', 'card_count', 'cta'],
      logoAvoidanceRule: 'Mépp list trên/dưới phải tránh vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'optional', ctaPolicy: 'optional', footerPolicy: 'contact_bar',
      semanticPurpose: 'Layout trust/contact với footer là vùng chính.',
      visualPriority: ['headline', 'footer', 'cta'],
      sectionOrder: ['headline', 'cta', 'footer'],
      heroHeadlineRule: 'Hero nếu có phải nhỏ hơn headline.',
      ctaRule: 'CTA nằm trên footer band, không nhập chung footer.',
      footerRule: 'Rút ngắn contact trước khi đụng headline.',
      textReductionOrder: ['footer_item_length', 'footer_item_count', 'cta'],
      logoAvoidanceRule: 'Logo bottom-center cần extra clearance phía trên contact bar.',
    },
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
    aiRender: {
      preferredRatios: ['4:5', '1:1', '9:16'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'contact_bar',
      semanticPurpose: 'Canvas giáo dục dày thông tin có ribbon và contact context.',
      visualPriority: ['banner', 'cards', 'summaryRibbon', 'cta', 'footer'],
      sectionOrder: ['banner', 'cards', 'summaryRibbon', 'cta', 'footer'],
      heroHeadlineRule: 'Hero chỉ dùng khi là stat cực ngắn.',
      ctaRule: 'CTA gọn và tách padding khỏi footer.',
      footerRule: 'Footer ngắn, không lấn át cards.',
      textReductionOrder: ['card_description', 'summary_ribbon', 'footer_item_length', 'card_count'],
      logoAvoidanceRule: 'Ribbon/footer tránh hẳn vùng logo, nhất là bottom-center.',
    },
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
    aiRender: {
      preferredRatios: ['16:9', '1:1', '9:16'], narrowAdaptation: 'stack', maxCards: 2, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none',
      semanticPurpose: 'So sánh A/B hoặc before/after rõ ràng.',
      visualPriority: ['banner', 'cards', 'cta'],
      sectionOrder: ['banner', 'cards', 'cta'],
      heroHeadlineRule: 'Không thêm hero block vào layout so sánh.',
      ctaRule: 'CTA phụ trợ, không lấn át cặp so sánh.',
      footerRule: 'Tránh footer trừ khi cực cần.',
      textReductionOrder: ['card_description', 'footer', 'cta'],
      logoAvoidanceRule: 'Cột so sánh và CTA không được đè vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['4:5', '9:16', '1:1'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none',
      semanticPurpose: 'Quy trình/step-by-step tối ưu đọc tuần tự.',
      visualPriority: ['banner', 'cards', 'cta'],
      sectionOrder: ['banner', 'cards', 'cta'],
      heroHeadlineRule: 'Không để hero cạnh tranh với step spine.',
      ctaRule: 'CTA đặt sau toàn bộ sequence.',
      footerRule: 'Footer chỉ xuất hiện nếu còn đủ khoảng thở.',
      textReductionOrder: ['card_description', 'card_count', 'cta'],
      logoAvoidanceRule: 'Step spine và CTA phải tránh vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'optional', footerPolicy: 'compact',
      semanticPurpose: 'Stat-first composition với một con số không thể quên.',
      visualPriority: ['banner', 'heroText', 'headline'],
      sectionOrder: ['banner', 'heroText', 'headline', 'footer'],
      heroHeadlineRule: 'Hero number luôn là chính, headline chỉ giải thích ngắn.',
      ctaRule: 'CTA chỉ inline, không làm thành button lớn.',
      footerRule: 'Footer nếu có phải cực gọn.',
      textReductionOrder: ['footer', 'headline'],
      logoAvoidanceRule: 'Giữ khoảng thở quanh stat và vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['4:5', '16:9', '1:1'], narrowAdaptation: 'stack', maxCards: 3, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'compact',
      semanticPurpose: 'Product highlight với benefit chips và CTA rõ.',
      visualPriority: ['banner', 'headline', 'cards', 'cta'],
      sectionOrder: ['banner', 'headline', 'cards', 'cta', 'footer'],
      heroHeadlineRule: 'Hero chỉ dùng khi là claim/stat cực ngắn.',
      ctaRule: 'Wide có thể button-like, narrow phải compact.',
      footerRule: 'Footer chỉ là reinforcement ngắn.',
      textReductionOrder: ['card_description', 'footer', 'card_count'],
      logoAvoidanceRule: 'Benefit chips và CTA phải tránh logo zone.',
    },
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
    aiRender: {
      preferredRatios: ['1:1', '4:5', '16:9'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'required', ctaPolicy: 'optional', footerPolicy: 'none',
      semanticPurpose: 'Review/quote xây trust với CTA tiết chế.',
      visualPriority: ['heroText', 'headline', 'cta'],
      sectionOrder: ['heroText', 'headline', 'cta'],
      heroHeadlineRule: 'Quote/rating là chính, headline hỗ trợ độ tin cậy.',
      ctaRule: 'CTA mềm, định hướng trust hơn sales.',
      footerRule: 'Tránh footer nếu không cực cần.',
      textReductionOrder: ['cta', 'headline'],
      logoAvoidanceRule: 'Khối quote phải tránh vùng logo.',
    },
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
    aiRender: {
      preferredRatios: ['16:9', '1:1', '4:5'], narrowAdaptation: 'compact', maxCards: 0, heroPolicy: 'optional', ctaPolicy: 'none', footerPolicy: 'none',
      semanticPurpose: 'Editorial cover tối giản với hierarchy cao cấp.',
      visualPriority: ['headline'],
      sectionOrder: ['headline', 'banner'],
      heroHeadlineRule: 'Hero nếu có chỉ như kicker nhỏ, không phải headline thứ hai.',
      ctaRule: 'Không dùng CTA trong editorial mode.',
      footerRule: 'Không dùng footer.',
      textReductionOrder: ['banner'],
      logoAvoidanceRule: 'Vùng logo nên trống có chủ đích.',
    },
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
    aiRender: {
      preferredRatios: ['16:9', '4:5', '1:1'], narrowAdaptation: 'stack', maxCards: 3, heroPolicy: 'optional', ctaPolicy: 'required', footerPolicy: 'compact',
      semanticPurpose: 'Pain point → solution flow thuyết phục.',
      visualPriority: ['headline', 'cards', 'cta'],
      sectionOrder: ['headline', 'cards', 'cta', 'footer'],
      heroHeadlineRule: 'Hero chỉ dùng khi là nhãn ngắn của pain/result.',
      ctaRule: 'CTA phải là lời giải rõ ràng, tách khỏi cards.',
      footerRule: 'Footer luôn ở vai trò phụ.',
      textReductionOrder: ['card_description', 'footer', 'card_count'],
      logoAvoidanceRule: 'Cards và CTA phải route quanh logo zone.',
    },
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
    aiRender: {
      preferredRatios: ['1:1', '4:5', '9:16'], narrowAdaptation: 'reduce_cards', maxCards: 4, heroPolicy: 'none', ctaPolicy: 'required', footerPolicy: 'none',
      semanticPurpose: 'Checklist dễ scan, save-worthy.',
      visualPriority: ['banner', 'cards', 'cta'],
      sectionOrder: ['banner', 'cards', 'cta'],
      heroHeadlineRule: 'Không thêm hero cạnh tranh với checklist.',
      ctaRule: 'CTA nên giống lời nhắc save/share, không quá to.',
      footerRule: 'Không dùng footer trừ khi cực cần.',
      textReductionOrder: ['card_description', 'card_count', 'cta'],
      logoAvoidanceRule: 'Checklist spine và CTA tránh vùng logo.',
    },
  },
];

export function getTemplateById(id: string): OverlayTemplate | undefined {
  return OVERLAY_TEMPLATES.find(t => t.id === id);
}
