import { ContentGoal } from './multichannel';
import { ContentPurpose, MarketingFramework, FunnelStage, EmotionalTone } from './topicDiscovery';

// Re-export ContentGoal for convenience
export type { ContentGoal } from './multichannel';

export interface QuickStartTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  suggestedTopicTemplate: string;
  emotionalTone: EmotionalTone;
  funnelStage: FunnelStage;
  contentPurpose?: ContentPurpose;
  marketingFramework?: MarketingFramework;
}

export const QUICK_START_TEMPLATES: Record<ContentGoal, QuickStartTemplate[]> = {
  // ============================================
  // EDUCATION - 3 templates
  // ============================================
  education: [
    {
      id: 'howto_guide',
      label: '📚 Hướng dẫn từng bước',
      icon: 'BookOpen',
      description: 'How-to guide, tutorial chi tiết cho người mới',
      suggestedTopicTemplate: '{Chủ đề} cho người mới bắt đầu: Hướng dẫn từ A-Z',
      emotionalTone: 'educate',
      funnelStage: 'tofu',
    },
    {
      id: 'mistakes_avoid',
      label: '⚠️ Sai lầm cần tránh',
      icon: 'AlertTriangle',
      description: 'Top X sai lầm phổ biến và cách khắc phục',
      suggestedTopicTemplate: '5 sai lầm {lĩnh vực} phổ biến và cách tránh',
      emotionalTone: 'educate',
      funnelStage: 'tofu',
    },
    {
      id: 'faq_explainer',
      label: '❓ Giải đáp thắc mắc',
      icon: 'HelpCircle',
      description: 'FAQ, Q&A giải đáp câu hỏi thường gặp',
      suggestedTopicTemplate: 'Giải đáp 10 câu hỏi thường gặp về {chủ đề}',
      emotionalTone: 'educate',
      funnelStage: 'tofu',
    },
  ],

  // ============================================
  // AWARENESS - 3 templates
  // ============================================
  awareness: [
    {
      id: 'brand_story',
      label: '💫 Câu chuyện thương hiệu',
      icon: 'Heart',
      description: 'Brand story, sứ mệnh, giá trị cốt lõi',
      suggestedTopicTemplate: 'Vì sao chúng tôi ra đời? Câu chuyện đằng sau {brand}',
      emotionalTone: 'inspire',
      funnelStage: 'tofu',
    },
    {
      id: 'behind_scenes',
      label: '🎬 Hậu trường',
      icon: 'Camera',
      description: 'Behind the scenes, một ngày làm việc',
      suggestedTopicTemplate: 'Một ngày làm việc tại {brand}: Hậu trường bạn chưa biết',
      emotionalTone: 'entertain',
      funnelStage: 'tofu',
    },
    {
      id: 'team_intro',
      label: '👥 Giới thiệu đội ngũ',
      icon: 'Users',
      description: 'Team intro, founder story, văn hóa công ty',
      suggestedTopicTemplate: 'Gặp gỡ đội ngũ {brand}: Những con người tạo nên thành công',
      emotionalTone: 'inspire',
      funnelStage: 'tofu',
    },
  ],

  // ============================================
  // ENGAGEMENT - 3 templates
  // ============================================
  engagement: [
    {
      id: 'poll_question',
      label: '🗳️ Khảo sát/Bình chọn',
      icon: 'Vote',
      description: 'Poll, quiz, câu hỏi tương tác với audience',
      suggestedTopicTemplate: 'Bạn thuộc team nào? [Khảo sát] {chủ đề A} vs {chủ đề B}',
      emotionalTone: 'entertain',
      funnelStage: 'tofu',
    },
    {
      id: 'trending_react',
      label: '🔥 Trending/Hot topic',
      icon: 'Flame',
      description: 'Reactive content, góc nhìn về xu hướng đang hot',
      suggestedTopicTemplate: '[Góc nhìn] {Trending topic}: Chúng tôi nghĩ gì?',
      emotionalTone: 'entertain',
      funnelStage: 'tofu',
    },
    {
      id: 'challenge_ugc',
      label: '🎯 Thử thách/UGC',
      icon: 'Zap',
      description: 'Challenge, kêu gọi tham gia, user-generated content',
      suggestedTopicTemplate: 'Thử thách 7 ngày: {Hành động} cùng {brand}',
      emotionalTone: 'inspire',
      funnelStage: 'mofu',
    },
  ],

  // ============================================
  // EXPERTISE - 3 templates
  // ============================================
  expertise: [
    {
      id: 'industry_insight',
      label: '🔬 Phân tích chuyên sâu',
      icon: 'Microscope',
      description: 'Deep-dive, phân tích xu hướng ngành',
      suggestedTopicTemplate: '[Phân tích] Xu hướng {ngành} 2025: Dự báo từ chuyên gia',
      emotionalTone: 'educate',
      funnelStage: 'mofu',
    },
    {
      id: 'case_study',
      label: '📊 Case Study',
      icon: 'FileBarChart',
      description: 'Case study thực tế với kết quả đo được',
      suggestedTopicTemplate: '[Case Study] Làm sao {khách hàng} đạt {kết quả} với {giải pháp}',
      emotionalTone: 'convince',
      funnelStage: 'mofu',
    },
    {
      id: 'myth_busting',
      label: '🧠 Phản biện quan điểm',
      icon: 'Lightbulb',
      description: 'Myth-busting, góc nhìn khác biệt, đập tan ngộ nhận',
      suggestedTopicTemplate: '{Quan điểm phổ biến} - Sự thật hay ngộ nhận?',
      emotionalTone: 'educate',
      funnelStage: 'mofu',
    },
  ],

  // ============================================
  // CONVERSION - 6 templates (based on ContentPurpose)
  // ============================================
  conversion: [
    {
      id: 'service_intro',
      label: '📦 Giới thiệu dịch vụ',
      icon: 'Package',
      description: 'Highlight lợi ích, quy trình, giá trị dịch vụ',
      suggestedTopicTemplate: 'Dịch vụ {tên dịch vụ}: {Lợi ích chính} cho {đối tượng}',
      emotionalTone: 'convince',
      funnelStage: 'bofu',
      contentPurpose: 'service_intro',
      marketingFramework: 'FAB',
    },
    {
      id: 'product_launch',
      label: '🚀 Ra mắt sản phẩm',
      icon: 'Rocket',
      description: 'Launch sản phẩm mới, tính năng nổi bật',
      suggestedTopicTemplate: '[NEW] Giới thiệu {sản phẩm}: {Tính năng nổi bật}',
      emotionalTone: 'inspire',
      funnelStage: 'bofu',
      contentPurpose: 'product_launch',
      marketingFramework: 'AIDA',
    },
    {
      id: 'promotion',
      label: '🎁 Khuyến mãi/Ưu đãi',
      icon: 'Gift',
      description: 'Giảm giá, combo, quà tặng, flash sale',
      suggestedTopicTemplate: '[Ưu đãi {thời hạn}] {Sản phẩm/Dịch vụ} giảm {%}',
      emotionalTone: 'convince',
      funnelStage: 'bofu',
      contentPurpose: 'promotion',
      marketingFramework: 'PAS',
    },
    {
      id: 'lead_generation',
      label: '🎯 Thu hút khách hàng',
      icon: 'Target',
      description: 'Lead magnet, đăng ký tư vấn miễn phí',
      suggestedTopicTemplate: '[Miễn phí] {Lead magnet}: {Giá trị nhận được}',
      emotionalTone: 'convince',
      funnelStage: 'mofu',
      contentPurpose: 'lead_generation',
      marketingFramework: 'PAS',
    },
    {
      id: 'testimonial_request',
      label: '⭐ Đánh giá khách hàng',
      icon: 'Star',
      description: 'Social proof, câu chuyện khách hàng thành công',
      suggestedTopicTemplate: '[Feedback] {Tên khách hàng}: "{Quote ấn tượng}"',
      emotionalTone: 'inspire',
      funnelStage: 'bofu',
      contentPurpose: 'testimonial_request',
      marketingFramework: 'STAR',
    },
    {
      id: 'upsell',
      label: '📈 Bán thêm/Nâng cấp',
      icon: 'TrendingUp',
      description: 'Cross-sell, upsell, bundle đặc biệt',
      suggestedTopicTemplate: 'Nâng cấp {sản phẩm cũ} → {sản phẩm mới}: {Lợi ích}',
      emotionalTone: 'convince',
      funnelStage: 'bofu',
      contentPurpose: 'upsell',
      marketingFramework: 'FAB',
    },
  ],
};

/**
 * Get templates for a specific content goal
 */
export function getTemplatesForGoal(goal: ContentGoal): QuickStartTemplate[] {
  return QUICK_START_TEMPLATES[goal] || [];
}

/**
 * Find a template by its ID across all goals
 */
export function getTemplateById(templateId: string): QuickStartTemplate | undefined {
  for (const templates of Object.values(QUICK_START_TEMPLATES)) {
    const found = templates.find(t => t.id === templateId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Get the content goal for a given template ID
 */
export function getGoalForTemplate(templateId: string): ContentGoal | undefined {
  for (const [goal, templates] of Object.entries(QUICK_START_TEMPLATES)) {
    if (templates.some(t => t.id === templateId)) {
      return goal as ContentGoal;
    }
  }
  return undefined;
}
