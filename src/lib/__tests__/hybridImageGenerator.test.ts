import { describe, it, expect } from 'vitest';
import {
  decomposeRequest,
  applyTemplate,
  autoSelectTemplate,
  type StructuredOverlayConfig,
  type DecomposedRequest,
} from '../hybridImageUtils';

// Helper: minimal overlay config
function makeConfig(overrides: Partial<StructuredOverlayConfig> = {}): StructuredOverlayConfig {
  return {
    colors: { primary: '#DC2626', secondary: '#FFFFFF', text: '#FFFFFF' },
    ...overrides,
  };
}

// Helper: minimal decomposed request
function makeDecomposed(overlayOverrides: Partial<StructuredOverlayConfig> = {}): DecomposedRequest {
  return {
    backgroundPrompt: {
      description: 'Clean background',
      colorScheme: 'Primary: #DC2626',
      mood: 'professional',
      elements: [],
    },
    overlayConfig: makeConfig(overlayOverrides),
  };
}

// ============================================================
// autoSelectTemplate
// ============================================================
describe('autoSelectTemplate', () => {
  it('selects contact_card when description has ≥2 contact items and no cards', () => {
    const desc = 'Liên hệ: 0909123456, email test@example.com, địa chỉ 123 Đường ABC Quận 1';
    const config = makeConfig({ headline: 'Liên hệ chúng tôi' });
    expect(autoSelectTemplate(desc, config)).toBe('contact_card');
  });

  it('selects infographic when ≥4 cards', () => {
    const config = makeConfig({
      cards: {
        items: [
          { label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' },
        ],
        layout: 'grid-2x2',
      },
    });
    expect(autoSelectTemplate('some description', config)).toBe('infographic');
  });

  it('selects feature_list when 2-3 cards', () => {
    const config = makeConfig({
      cards: {
        items: [{ label: 'A' }, { label: 'B' }],
        layout: 'horizontal',
      },
    });
    expect(autoSelectTemplate('some description', config)).toBe('feature_list');
  });

  it('selects quote_card when heroText present and no cards', () => {
    const config = makeConfig({
      heroText: { text: '50%', fontSize: '3xl', effect: 'gradient' },
    });
    expect(autoSelectTemplate('some description', config)).toBe('quote_card');
  });

  it('selects poster when headline or cta present', () => {
    const config = makeConfig({ headline: 'Big Title' });
    expect(autoSelectTemplate('some description', config)).toBe('poster');
  });

  it('selects poster when cta present', () => {
    const config = makeConfig({ cta: 'Buy Now' });
    expect(autoSelectTemplate('some description', config)).toBe('poster');
  });

  it('defaults to poster when nothing matched', () => {
    const config = makeConfig();
    expect(autoSelectTemplate('generic text', config)).toBe('poster');
  });

  it('prefers contact_card over cards when contact info exists but no cards', () => {
    const desc = 'Hotline: 0909123456, Email: info@test.com';
    const config = makeConfig({ headline: 'Title' });
    expect(autoSelectTemplate(desc, config)).toBe('contact_card');
  });

  it('prefers infographic over contact_card when cards exist', () => {
    const desc = 'Call 0909123456, email test@company.com';
    const config = makeConfig({
      cards: {
        items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
        layout: 'grid-2x2',
      },
    });
    // Even though contact info exists, cards take priority
    expect(autoSelectTemplate(desc, config)).toBe('infographic');
  });

  it('selects comparison_card for before/after content', () => {
    const desc = 'Before after điều trị nám: da sáng hơn sau 8 tuần';
    const config = makeConfig({
      cards: {
        items: [{ label: 'Trước' }, { label: 'Sau' }],
        layout: 'horizontal',
      },
    });
    expect(autoSelectTemplate(desc, config)).toBe('comparison_card');
  });

  it('selects timeline_steps for step-by-step content', () => {
    const desc = '3 bước chăm da sau laser để phục hồi nhanh';
    const config = makeConfig({
      cards: {
        items: [{ label: 'Bước 1' }, { label: 'Bước 2' }, { label: 'Bước 3' }],
        layout: 'vertical',
      },
    });
    expect(autoSelectTemplate(desc, config)).toBe('timeline_steps');
  });

  it('selects stat_spotlight for KPI/stat-heavy content', () => {
    const desc = 'Tăng 92% tỷ lệ quay lại nhờ quy trình cá nhân hóa';
    const config = makeConfig({
      heroText: { text: '92%', fontSize: '3xl', effect: 'gradient' },
      headline: 'Tỷ lệ quay lại tăng mạnh',
    });
    expect(autoSelectTemplate(desc, config)).toBe('stat_spotlight');
  });

  it('selects testimonial_card for social-proof content', () => {
    const desc = 'Review khách hàng: feedback sau 3 buổi điều trị';
    const config = makeConfig({
      heroText: { text: 'RẤT HÀI LÒNG', fontSize: '2xl', effect: 'gradient' },
      headline: 'Khách hàng nói gì?',
    });
    expect(autoSelectTemplate(desc, config)).toBe('testimonial_card');
  });
});

// ============================================================
// decomposeRequest (regex fallback)
// ============================================================
describe('decomposeRequest', () => {
  it('extracts bullet items as cards', () => {
    const desc = '• Tăng trưởng nhanh\n• Giá cả phải chăng\n• Chất lượng cao';
    const result = decomposeRequest(desc);
    expect(result.overlayConfig.cards).toBeDefined();
    expect(result.overlayConfig.cards!.items.length).toBe(3);
  });

  it('extracts numbered items as cards', () => {
    const desc = '1. First item\n2. Second item\n3. Third item';
    const result = decomposeRequest(desc);
    expect(result.overlayConfig.cards).toBeDefined();
    expect(result.overlayConfig.cards!.items.length).toBe(3);
  });

  it('generates default overlay from narrative text', () => {
    const desc = 'Công ty ABC chuyên cung cấp giải pháp marketing. Giúp tăng doanh thu 200%. Đội ngũ chuyên nghiệp. Giá hợp lý.';
    const result = decomposeRequest(desc);
    // Should generate defaults: banner from first sentence, heroText from number
    expect(result.overlayConfig.banner || result.overlayConfig.heroText || result.overlayConfig.cards).toBeTruthy();
  });

  it('extracts footer contact info', () => {
    const desc = 'Liên hệ ngay! Hotline: 0909123456. Email: info@test.com. Địa chỉ 123 Đường Lê Lợi Quận 1';
    const result = decomposeRequest(desc);
    expect(result.overlayConfig.footer).toBeDefined();
    expect(result.overlayConfig.footer!.items.length).toBeGreaterThanOrEqual(2);
  });

  it('background prompt instructs NO text in image', () => {
    const result = decomposeRequest('Test description');
    expect(result.backgroundPrompt.description.toLowerCase()).toContain('do not include any text');
  });

  it('uses provided colors', () => {
    const result = decomposeRequest('Test', '#FF0000', '#00FF00');
    expect(result.overlayConfig.colors.primary).toBe('#FF0000');
    expect(result.overlayConfig.colors.secondary).toBe('#00FF00');
  });
});

// ============================================================
// applyTemplate
// ============================================================
describe('applyTemplate', () => {
  const description = 'Marketing giải pháp số. Tăng trưởng 50%. Chất lượng dịch vụ tốt. Đội ngũ chuyên nghiệp. Giá hợp lý.';

  describe('poster template', () => {
    it('ensures banner, headline, and cta exist', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('poster', decomposed, description);
      expect(result.overlayConfig.banner).toBeDefined();
      expect(result.overlayConfig.headline).toBeDefined();
      expect(result.overlayConfig.cta).toBeDefined();
    });

    it('preserves existing banner text', () => {
      const decomposed = makeDecomposed({
        banner: { text: 'EXISTING BANNER', bgColor: '#000', position: 'bottom' },
      });
      const result = applyTemplate('poster', decomposed, description);
      expect(result.overlayConfig.banner!.text).toBe('EXISTING BANNER');
      // But position should be overridden by template default
      expect(result.overlayConfig.banner!.position).toBe('top');
    });
  });

  describe('infographic template', () => {
    it('ensures cards with grid-2x2 layout and minCount 4', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('infographic', decomposed, description);
      expect(result.overlayConfig.cards).toBeDefined();
      expect(result.overlayConfig.cards!.layout).toBe('grid-2x2');
      expect(result.overlayConfig.cards!.items.length).toBeGreaterThanOrEqual(4);
    });

    it('forces grid-2x2 layout even if cards already exist with different layout', () => {
      const decomposed = makeDecomposed({
        cards: {
          items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }, { label: 'E' }],
          layout: 'vertical',
        },
      });
      const result = applyTemplate('infographic', decomposed, description);
      expect(result.overlayConfig.cards!.layout).toBe('grid-2x2');
    });

    it('ensures heroText with gradient effect', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('infographic', decomposed, description);
      expect(result.overlayConfig.heroText).toBeDefined();
      expect(result.overlayConfig.heroText!.effect).toBe('gradient');
    });
  });

  describe('contact_card template', () => {
    it('ensures headline and footer exist', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('contact_card', decomposed, description);
      expect(result.overlayConfig.headline).toBeDefined();
      expect(result.overlayConfig.footer).toBeDefined();
    });

    it('uses extracted contact info for footer when available', () => {
      const contactDesc = 'Liên hệ: 0909123456. Email: test@example.com';
      const decomposed = makeDecomposed();
      const result = applyTemplate('contact_card', decomposed, contactDesc);
      expect(result.overlayConfig.footer).toBeDefined();
      expect(result.overlayConfig.footer!.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('quote_card template', () => {
    it('ensures heroText with 3xl and gradient', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('quote_card', decomposed, description);
      expect(result.overlayConfig.heroText).toBeDefined();
      expect(result.overlayConfig.heroText!.fontSize).toBe('3xl');
      expect(result.overlayConfig.heroText!.effect).toBe('gradient');
    });

    it('ensures banner at bottom position', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('quote_card', decomposed, description);
      expect(result.overlayConfig.banner).toBeDefined();
      expect(result.overlayConfig.banner!.position).toBe('bottom');
    });
  });

  describe('feature_list template', () => {
    it('ensures cards with vertical layout and minCount 3', () => {
      const decomposed = makeDecomposed();
      const result = applyTemplate('feature_list', decomposed, description);
      expect(result.overlayConfig.cards).toBeDefined();
      expect(result.overlayConfig.cards!.layout).toBe('vertical');
      expect(result.overlayConfig.cards!.items.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('returns original when template is auto', () => {
    const decomposed = makeDecomposed({ headline: 'Test' });
    const result = applyTemplate('auto', decomposed, description);
    expect(result).toEqual(decomposed);
  });

  it('returns original when template ID is unknown', () => {
    const decomposed = makeDecomposed({ headline: 'Test' });
    const result = applyTemplate('nonexistent_template', decomposed, description);
    expect(result).toEqual(decomposed);
  });

  it('does not mutate original decomposed object', () => {
    const decomposed = makeDecomposed({ headline: 'Original' });
    const original = JSON.parse(JSON.stringify(decomposed));
    applyTemplate('poster', decomposed, description);
    expect(decomposed.overlayConfig.headline).toBe(original.overlayConfig.headline);
  });
});

// ============================================================
// Integration: autoSelectTemplate → applyTemplate
// ============================================================
describe('autoSelectTemplate → applyTemplate integration', () => {
  it('auto-selects and applies infographic for 4-card content', () => {
    const desc = 'Tổng quan dịch vụ marketing số';
    const decomposed = makeDecomposed({
      banner: { text: 'DỊCH VỤ', bgColor: '#DC2626', position: 'top' },
      cards: {
        items: [
          { label: 'SEO' }, { label: 'Ads' }, { label: 'Social' }, { label: 'Email' },
        ],
        layout: 'horizontal', // will be overridden
      },
    });

    const selectedTemplate = autoSelectTemplate(desc, decomposed.overlayConfig);
    expect(selectedTemplate).toBe('infographic');

    const result = applyTemplate(selectedTemplate, decomposed, desc);
    expect(result.overlayConfig.cards!.layout).toBe('grid-2x2'); // forced by template
    expect(result.overlayConfig.heroText).toBeDefined(); // required by infographic
  });

  it('auto-selects and applies contact_card for contact-heavy content', () => {
    const desc = 'Hotline: 0909123456. Email: info@company.com. Địa chỉ 123 Đường Nguyễn Huệ Quận 1';
    const decomposed = makeDecomposed({
      headline: 'Liên hệ tư vấn',
    });

    const selectedTemplate = autoSelectTemplate(desc, decomposed.overlayConfig);
    expect(selectedTemplate).toBe('contact_card');

    const result = applyTemplate(selectedTemplate, decomposed, desc);
    expect(result.overlayConfig.headline).toBeDefined();
    expect(result.overlayConfig.footer).toBeDefined();
    expect(result.overlayConfig.footer!.items.length).toBeGreaterThanOrEqual(2);
  });

  it('auto-selects and applies quote_card for stat-heavy content', () => {
    const desc = 'Giảm giá đặc biệt';
    const decomposed = makeDecomposed({
      heroText: { text: '50%', fontSize: '3xl', effect: 'none' },
      banner: { text: 'KHUYẾN MÃI', bgColor: '#DC2626', position: 'top' },
    });

    const selectedTemplate = autoSelectTemplate(desc, decomposed.overlayConfig);
    expect(selectedTemplate).toBe('quote_card');

    const result = applyTemplate(selectedTemplate, decomposed, desc);
    // heroText already existed so applyTemplate preserves it (doesn't override effect)
    expect(result.overlayConfig.heroText!.text).toBe('50%');
    expect(result.overlayConfig.banner!.position).toBe('bottom'); // forced by template
  });

  it('auto-selects poster as fallback for minimal content', () => {
    const desc = 'Sự kiện ra mắt sản phẩm mới';
    const decomposed = makeDecomposed();

    const selectedTemplate = autoSelectTemplate(desc, decomposed.overlayConfig);
    expect(selectedTemplate).toBe('poster');

    const result = applyTemplate(selectedTemplate, decomposed, desc);
    expect(result.overlayConfig.banner).toBeDefined();
    expect(result.overlayConfig.cta).toBeDefined();
  });
});
