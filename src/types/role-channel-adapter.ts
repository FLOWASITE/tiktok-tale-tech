// ============================================
// Role-Channel Adaptation Types
// Frontend types for content role adaptation
// ============================================

/**
 * Content role in the Content Orchestration Flow
 */
export type ContentRole = 'seed' | 'sprout' | 'harvest';

/**
 * Channel behavior configuration based on role
 */
export interface RoleChannelConfig {
  hookIntensity: 'soft' | 'medium' | 'strong' | 'viral';
  ctaStrength: 'none' | 'soft' | 'medium' | 'strong';
  focusAreas: string[];
  promotionalAllowed: boolean;
  urgencyAllowed: boolean;
  socialProofEmphasis: 'none' | 'light' | 'strong';
  toneAdjustment: string;
  contentTypes: string[];
}

/**
 * Role validation result
 */
export interface RoleComplianceResult {
  score: number;
  issues: string[];
  passed: boolean;
}

/**
 * Role display information
 */
export const ROLE_DISPLAY_INFO: Record<ContentRole, {
  name: string;
  vietnameseName: string;
  purpose: string;
  icon: string;
  color: string;
}> = {
  seed: {
    name: 'Seed',
    vietnameseName: 'Gieo hạt',
    purpose: 'Mở rộng nhận thức, thu hút attention, KHÔNG bán hàng',
    icon: '🌱',
    color: 'green',
  },
  sprout: {
    name: 'Sprout',
    vietnameseName: 'Nuôi dưỡng',
    purpose: 'Xây dựng niềm tin, thể hiện expertise',
    icon: '🌿',
    color: 'blue',
  },
  harvest: {
    name: 'Harvest',
    vietnameseName: 'Thu hoạch',
    purpose: 'Thúc đẩy hành động, chuyển đổi',
    icon: '🌾',
    color: 'orange',
  },
};

/**
 * Recommended CTAs by role and channel
 */
export const RECOMMENDED_CTAS: Record<ContentRole, Record<string, string[]>> = {
  seed: {
    facebook: ['Bạn nghĩ sao?', 'Tag người cần biết', 'Share nếu đồng ý', 'Đã gặp trường hợp này chưa?'],
    instagram: ['Save lại nhé', 'Tag bạn bè', 'Comment số...', 'Double tap nếu...'],
    linkedin: ['Share your thoughts', 'What do you think?', 'Agree or disagree?'],
    twitter: ['Retweet if you agree', 'Thoughts?', 'Thread 🧵'],
    youtube: ['Subscribe để không bỏ lỡ', 'Like nếu thấy hay'],
    default: ['Bạn nghĩ sao?', 'Share ý kiến', 'Comment bên dưới'],
  },
  sprout: {
    facebook: ['Lưu lại tham khảo', 'Share cho người cần', 'Comment kinh nghiệm của bạn'],
    instagram: ['Save để đọc lại', 'Share cho bạn bè', 'Bình luận chia sẻ'],
    linkedin: ['Save for later', 'Share with your network', 'Comment your experience'],
    youtube: ['Subscribe để không bỏ lỡ', 'Like + Comment', 'Check link dưới'],
    default: ['Lưu lại', 'Share cho người cần', 'Bình luận chia sẻ'],
  },
  harvest: {
    facebook: ['Inbox ngay để nhận tư vấn', 'Đăng ký hôm nay', 'Click link để đặt hàng'],
    instagram: ['DM để nhận ưu đãi', 'Link in bio', 'Comment "Tôi muốn" để nhận'],
    linkedin: ['Book a call', 'DM for details', 'Check link in comments'],
    email: ['Đăng ký ngay', 'Nhận ưu đãi', 'Liên hệ hotline'],
    default: ['Liên hệ ngay', 'Đăng ký hôm nay', 'Inbox để tư vấn'],
  },
};

/**
 * Get recommended CTAs for role and channel
 */
export function getRecommendedCTAs(role: ContentRole, channel: string): string[] {
  return RECOMMENDED_CTAS[role][channel] || RECOMMENDED_CTAS[role].default || [];
}

/**
 * Role-Channel behavior summary (simplified for frontend)
 */
export const ROLE_CHANNEL_SUMMARY: Record<ContentRole, {
  hookGuidance: string;
  ctaGuidance: string;
  restrictions: string[];
  focus: string[];
}> = {
  seed: {
    hookGuidance: 'Medium intensity - tạo tò mò, không giật tít quá mức',
    ctaGuidance: 'Soft - khuyến khích engagement, không bán hàng',
    restrictions: [
      'KHÔNG đề cập sản phẩm/dịch vụ cụ thể',
      'KHÔNG urgency/scarcity',
      'KHÔNG promotional language',
    ],
    focus: ['Insight', 'Câu hỏi', 'Storytelling', 'Education'],
  },
  sprout: {
    hookGuidance: 'Medium-Strong - thể hiện expertise',
    ctaGuidance: 'Medium - khuyến khích save/share, có thể soft CTA',
    restrictions: [
      'KHÔNG hard sell',
      'Focus value trước, brand sau',
      'Social proof có thể dùng nhưng không push',
    ],
    focus: ['Case study', 'Tutorial', 'Behind the scenes', 'Expert insight'],
  },
  harvest: {
    hookGuidance: 'Strong-Viral - thu hút để convert',
    ctaGuidance: 'Strong - direct CTA, offer rõ ràng',
    restrictions: [],
    focus: ['Offer', 'Social proof', 'Urgency', 'Benefit stack'],
  },
};

/**
 * Check if role allows certain content type
 */
export function isContentTypeAllowedForRole(
  role: ContentRole,
  contentType: 'promotional' | 'urgency' | 'direct_cta' | 'product_mention'
): boolean {
  const allowedMap: Record<ContentRole, Record<string, boolean>> = {
    seed: {
      promotional: false,
      urgency: false,
      direct_cta: false,
      product_mention: false,
    },
    sprout: {
      promotional: false,
      urgency: false,
      direct_cta: false,
      product_mention: true, // Can mention as case study
    },
    harvest: {
      promotional: true,
      urgency: true,
      direct_cta: true,
      product_mention: true,
    },
  };
  
  return allowedMap[role]?.[contentType] ?? false;
}
