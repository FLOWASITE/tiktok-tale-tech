import type { LayoutElements, LogoMeta } from '../layout-helpers.ts';

export type RatioKey = 'square' | 'portrait' | 'landscape' | 'tall';

export interface RatioExpectation {
  forceStack: boolean;
  useCompactSectionGap: boolean;
  cardsShouldStack: boolean;
  allowedFooterModes?: Array<'single-row' | 'two-row' | 'vertical-compact'>;
}

export interface LayoutRegressionFixture {
  id: string;
  templateId: string;
  layout: 'stack' | 'split' | 'banner_cards' | 'hero_text' | 'simple';
  stress?: boolean;
  description: string;
  elements: LayoutElements;
  logoMeta?: LogoMeta;
  expectations: Record<RatioKey, RatioExpectation>;
}

const longHeadline = 'Giải pháp chăm sóc chuyên sâu giúp khách hàng rút ngắn thời gian phục hồi nhưng vẫn duy trì hiệu quả rõ ràng và an toàn';
const longCta = 'Đăng ký tư vấn cá nhân hóa ngay hôm nay để nhận lộ trình phù hợp';
const longAddress = '123 Nguyễn Huệ, phường Bến Nghé, Quận 1, TP.HCM, gần trục trung tâm và thuận tiện đỗ xe';

export const COMMON_RATIOS: Record<RatioKey, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1920, height: 1080 },
  tall: { width: 1080, height: 1920 },
};

export const LAYOUT_REGRESSION_FIXTURES: LayoutRegressionFixture[] = [
  {
    id: 'comparison-card-stress',
    templateId: 'comparison_card',
    layout: 'split',
    stress: true,
    description: 'So sánh trước và sau liệu trình để thấy khác biệt rõ ràng ở từng giai đoạn chăm sóc.',
    elements: {
      banner: { text: 'TRƯỚC / SAU', bgColor: '#0F172A', position: 'top' },
      cards: {
        layout: 'horizontal',
        items: [
          { label: 'Trước liệu trình da xỉn màu và dễ kích ứng sau mỗi lần thay đổi thời tiết', description: 'Bề mặt da thiếu đều màu, lỗ chân lông hiện rõ và trang điểm khó bám.' },
          { label: 'Sau 8 tuần da sáng đều hơn, nền da mịn và phản hồi tốt với routine mới', description: 'Khách hàng ghi nhận ít đỏ rát hơn và tự tin xuất hiện trước camera.' },
        ],
      },
      cta: longCta,
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: false },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'timeline-steps-stress',
    templateId: 'timeline_steps',
    layout: 'banner_cards',
    stress: true,
    description: 'Quy trình 4 bước phục hồi sau laser với lưu ý chi tiết cho từng mốc thời gian.',
    elements: {
      banner: { text: '4 BƯỚC', bgColor: '#0F172A', position: 'top' },
      cards: {
        layout: 'vertical',
        items: [
          { number: 1, label: 'Làm dịu da ngay 6 giờ đầu', description: 'Dùng xịt khoáng và tránh chạm tay trực tiếp lên bề mặt da.' },
          { number: 2, label: 'Bổ sung serum phục hồi hàng rào bảo vệ', description: 'Ưu tiên hoạt chất đơn giản, không hương liệu và không acid.' },
          { number: 3, label: 'Chống nắng nhiều lớp khi ra ngoài', description: 'Che chắn vật lý và thoa lại đều sau mỗi 2-3 giờ.' },
          { number: 4, label: 'Tái khám đúng lịch để bác sĩ đánh giá tiến triển', description: 'Điều chỉnh routine nếu da còn khô căng hoặc bong nhẹ.' },
        ],
      },
      cta: longCta,
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: true, cardsShouldStack: true },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'checklist-card',
    templateId: 'checklist_card',
    layout: 'banner_cards',
    description: 'Checklist nhanh trước buổi điều trị để khách hàng chuẩn bị đầy đủ.',
    elements: {
      banner: { text: 'CHECKLIST', bgColor: '#0F172A', position: 'top' },
      cards: {
        layout: 'vertical',
        items: [
          { number: 1, label: 'Ngủ đủ giấc vào tối hôm trước' },
          { number: 2, label: 'Không dùng retinol trong 3 ngày' },
          { number: 3, label: 'Ăn nhẹ và uống đủ nước' },
          { number: 4, label: 'Mang theo thông tin thuốc đang sử dụng' },
        ],
      },
      cta: 'Lưu lại để chuẩn bị đủ trước lịch hẹn',
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: true, cardsShouldStack: true },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'product-spotlight',
    templateId: 'product_spotlight',
    layout: 'stack',
    description: 'Ra mắt bộ sản phẩm phục hồi chuyên sâu với 3 lợi ích nổi bật và CTA mạnh.',
    elements: {
      banner: { text: 'NEW DROP', bgColor: '#0F172A', position: 'top' },
      headline: longHeadline,
      cards: {
        layout: 'horizontal',
        items: [
          { label: 'Làm dịu nhanh', description: 'Hỗ trợ da giảm đỏ trong routine tối giản.' },
          { label: 'Khóa ẩm bền', description: 'Giữ bề mặt da ổn định suốt ngày dài.' },
          { label: 'Hợp da nhạy cảm', description: 'Không hương liệu, dễ layer cùng treatment.' },
        ],
      },
      cta: longCta,
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: true, cardsShouldStack: true },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'problem-solution-stress',
    templateId: 'problem_solution',
    layout: 'split',
    stress: true,
    description: 'Nỗi đau thường gặp và cách xử lý phù hợp cho khách hàng bận rộn nhưng vẫn cần hiệu quả rõ ràng.',
    elements: {
      headline: longHeadline,
      cards: {
        layout: 'vertical',
        items: [
          { label: 'Da kích ứng sau treatment dày', description: 'Ưu tiên routine phục hồi tối giản và giảm hoạt chất chồng chéo.' },
          { label: 'Khó duy trì lịch chăm sóc đều', description: 'Thiết kế lịch 2 bước sáng, 3 bước tối để dễ bám theo.' },
          { label: 'Sợ chi phí tăng dần theo liệu trình', description: 'Chọn gói theo mục tiêu ưu tiên để không phát sinh ngoài kế hoạch.' },
        ],
      },
      cta: longCta,
      footer: {
        items: [
          { icon: 'phone', text: '0909 123 456' },
          { icon: 'mail', text: 'hello@flowa.one' },
        ],
      },
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['two-row', 'vertical-compact'] },
      portrait: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['two-row', 'vertical-compact'] },
      landscape: { forceStack: false, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['single-row', 'two-row'] },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['vertical-compact'] },
    },
  },
  {
    id: 'testimonial-card',
    templateId: 'testimonial_card',
    layout: 'hero_text',
    description: 'Feedback chân thực từ khách hàng sau khi theo đúng phác đồ cá nhân hóa.',
    elements: {
      heroText: { text: 'Rất an tâm khi điều trị ở đây', fontSize: '2xl', effect: 'gradient' },
      headline: 'Khách hàng quay lại vì cảm giác được theo sát từng tuần',
      cta: 'Xem thêm phản hồi thực tế',
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: false },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'stat-spotlight',
    templateId: 'stat_spotlight',
    layout: 'hero_text',
    description: 'Số liệu nổi bật cho chiến dịch chăm sóc khách hàng quay lại sau 3 tháng.',
    elements: {
      banner: { text: 'KPI', bgColor: '#0F172A', position: 'top' },
      heroText: { text: '92%', fontSize: '3xl', effect: 'gradient' },
      headline: 'Tỷ lệ khách hàng quay lại tăng mạnh nhờ quy trình theo dõi sau điều trị',
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
      portrait: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: true },
      landscape: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: false },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true },
    },
  },
  {
    id: 'contact-card-stress',
    templateId: 'contact_card',
    layout: 'stack',
    stress: true,
    description: 'Liên hệ để nhận lịch tư vấn và hướng dẫn chăm sóc sau điều trị.',
    logoMeta: { position: 'bottom-center', sizePercent: 16, padding: 24 },
    elements: {
      headline: 'Đặt lịch tư vấn để được bác sĩ đánh giá tình trạng da trước khi bắt đầu liệu trình',
      footer: {
        items: [
          { icon: 'phone', text: '0909 123 456' },
          { icon: 'mail', text: 'hello@flowa.one' },
          { icon: 'globe', text: 'flowa.one' },
          { icon: 'map-pin', text: longAddress },
        ],
      },
    },
    expectations: {
      square: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['two-row', 'vertical-compact'] },
      portrait: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: true, allowedFooterModes: ['vertical-compact'] },
      landscape: { forceStack: false, useCompactSectionGap: false, cardsShouldStack: false, allowedFooterModes: ['two-row'] },
      tall: { forceStack: true, useCompactSectionGap: true, cardsShouldStack: true, allowedFooterModes: ['vertical-compact'] },
    },
  },
];