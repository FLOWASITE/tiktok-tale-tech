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
 * Supported languages for role-channel content
 */
export type RoleChannelLanguage = 'vi' | 'th' | 'en';

/**
 * Role display information
 */
export const ROLE_DISPLAY_INFO: Record<ContentRole, Record<RoleChannelLanguage, {
  name: string;
  purpose: string;
}> & { icon: string; color: string }> = {
  seed: {
    icon: '🌱',
    color: 'green',
    vi: { name: 'Gieo hạt', purpose: 'Mở rộng nhận thức, thu hút attention, KHÔNG bán hàng' },
    th: { name: 'หว่านเมล็ด', purpose: 'เพิ่มการรับรู้ ดึงดูดความสนใจ ไม่ขายของ' },
    en: { name: 'Seed', purpose: 'Expand awareness, attract attention, NO selling' },
  },
  sprout: {
    icon: '🌿',
    color: 'blue',
    vi: { name: 'Nuôi dưỡng', purpose: 'Xây dựng niềm tin, thể hiện expertise' },
    th: { name: 'เพาะเลี้ยง', purpose: 'สร้างความไว้วางใจ แสดงความเชี่ยวชาญ' },
    en: { name: 'Sprout', purpose: 'Build trust, demonstrate expertise' },
  },
  harvest: {
    icon: '🌾',
    color: 'orange',
    vi: { name: 'Thu hoạch', purpose: 'Thúc đẩy hành động, chuyển đổi' },
    th: { name: 'เก็บเกี่ยว', purpose: 'กระตุ้นการดำเนินการ แปลงลูกค้า' },
    en: { name: 'Harvest', purpose: 'Drive action, convert' },
  },
};

/**
 * Get role display info for a specific language (backward compatible)
 */
export function getRoleDisplayInfo(role: ContentRole, lang: RoleChannelLanguage = 'vi') {
  const info = ROLE_DISPLAY_INFO[role];
  const localized = info[lang] || info['en'];
  return {
    name: localized.name,
    vietnameseName: info['vi'].name, // backward compat
    purpose: localized.purpose,
    icon: info.icon,
    color: info.color,
  };
}

/**
 * Recommended CTAs by role, channel, and language
 */
export const RECOMMENDED_CTAS: Record<ContentRole, Record<string, Record<RoleChannelLanguage, string[]>>> = {
  seed: {
    facebook: {
      vi: ['Bạn nghĩ sao?', 'Tag người cần biết', 'Share nếu đồng ý', 'Đã gặp trường hợp này chưa?'],
      th: ['คุณคิดยังไง?', 'แท็กคนที่ควรรู้', 'แชร์ถ้าเห็นด้วย', 'เคยเจอแบบนี้ไหม?'],
      en: ['What do you think?', 'Tag someone who needs this', 'Share if you agree', 'Have you experienced this?'],
    },
    instagram: {
      vi: ['Save lại nhé', 'Tag bạn bè', 'Comment số...', 'Double tap nếu...'],
      th: ['Save ไว้นะ', 'แท็กเพื่อน', 'คอมเมนต์...', 'Double tap ถ้า...'],
      en: ['Save this', 'Tag a friend', 'Comment...', 'Double tap if...'],
    },
    line: {
      vi: ['Share cho bạn bè', 'Bạn nghĩ sao?'],
      th: ['ส่งต่อให้เพื่อน', 'คุณคิดยังไง?', 'แชร์ในกลุ่ม', 'เพิ่มเพื่อน'],
      en: ['Share with friends', 'What do you think?'],
    },
    default: {
      vi: ['Bạn nghĩ sao?', 'Share ý kiến', 'Comment bên dưới'],
      th: ['คุณคิดยังไง?', 'แชร์ความคิดเห็น', 'คอมเมนต์ด้านล่าง'],
      en: ['What do you think?', 'Share your thoughts', 'Comment below'],
    },
  },
  sprout: {
    facebook: {
      vi: ['Lưu lại tham khảo', 'Share cho người cần', 'Comment kinh nghiệm của bạn'],
      th: ['บันทึกไว้อ้างอิง', 'แชร์ให้คนที่ต้องการ', 'คอมเมนต์ประสบการณ์ของคุณ'],
      en: ['Save for later', 'Share with someone who needs this', 'Comment your experience'],
    },
    instagram: {
      vi: ['Save để đọc lại', 'Share cho bạn bè', 'Bình luận chia sẻ'],
      th: ['Save ไว้อ่านอีกครั้ง', 'แชร์ให้เพื่อน', 'คอมเมนต์แชร์'],
      en: ['Save to read again', 'Share with friends', 'Comment and share'],
    },
    line: {
      vi: ['Lưu lại', 'Share cho người cần'],
      th: ['บันทึกไว้', 'ส่งต่อให้คนที่ต้องการ', 'แชร์ในกลุ่ม'],
      en: ['Save this', 'Share with someone who needs it'],
    },
    default: {
      vi: ['Lưu lại', 'Share cho người cần', 'Bình luận chia sẻ'],
      th: ['บันทึกไว้', 'แชร์ให้คนที่ต้องการ', 'คอมเมนต์แชร์'],
      en: ['Save this', 'Share with someone who needs it', 'Comment and share'],
    },
  },
  harvest: {
    facebook: {
      vi: ['Inbox ngay để nhận tư vấn', 'Đăng ký hôm nay', 'Click link để đặt hàng'],
      th: ['ทักข้อความเพื่อรับคำปรึกษา', 'สมัครวันนี้', 'คลิกลิงก์เพื่อสั่งซื้อ'],
      en: ['Message us for consultation', 'Sign up today', 'Click to order'],
    },
    instagram: {
      vi: ['DM để nhận ưu đãi', 'Link in bio', 'Comment "Tôi muốn" để nhận'],
      th: ['DM เพื่อรับสิทธิพิเศษ', 'Link in bio', 'คอมเมนต์ "สนใจ" เพื่อรับ'],
      en: ['DM for offers', 'Link in bio', 'Comment "I want" to get'],
    },
    line: {
      vi: ['Liên hệ ngay', 'Đăng ký hôm nay'],
      th: ['ทักแชทเลย', 'สมัครวันนี้', 'แอดเพื่อนรับส่วนลด', 'คลิกลิงก์สั่งซื้อ'],
      en: ['Contact us now', 'Sign up today'],
    },
    email: {
      vi: ['Đăng ký ngay', 'Nhận ưu đãi', 'Liên hệ hotline'],
      th: ['สมัครเลย', 'รับสิทธิพิเศษ', 'โทรหาเรา'],
      en: ['Sign up now', 'Get the offer', 'Contact our hotline'],
    },
    default: {
      vi: ['Liên hệ ngay', 'Đăng ký hôm nay', 'Inbox để tư vấn'],
      th: ['ติดต่อเลย', 'สมัครวันนี้', 'ทักข้อความเพื่อรับคำปรึกษา'],
      en: ['Contact us now', 'Sign up today', 'Message for consultation'],
    },
  },
};

/**
 * Get recommended CTAs for role, channel, and language
 */
export function getRecommendedCTAs(role: ContentRole, channel: string, lang: RoleChannelLanguage = 'vi'): string[] {
  const channelCTAs = RECOMMENDED_CTAS[role][channel] || RECOMMENDED_CTAS[role].default;
  if (!channelCTAs) return [];
  return channelCTAs[lang] || channelCTAs['en'] || [];
}

/**
 * Role-Channel behavior summary (localized)
 */
export const ROLE_CHANNEL_SUMMARY: Record<ContentRole, Record<RoleChannelLanguage, {
  hookGuidance: string;
  ctaGuidance: string;
  restrictions: string[];
  focus: string[];
}>> = {
  seed: {
    vi: {
      hookGuidance: 'Medium intensity - tạo tò mò, không giật tít quá mức',
      ctaGuidance: 'Soft - khuyến khích engagement, không bán hàng',
      restrictions: ['KHÔNG đề cập sản phẩm/dịch vụ cụ thể', 'KHÔNG urgency/scarcity', 'KHÔNG promotional language'],
      focus: ['Insight', 'Câu hỏi', 'Storytelling', 'Education'],
    },
    th: {
      hookGuidance: 'ความเข้มระดับกลาง - สร้างความอยากรู้ ไม่ clickbait',
      ctaGuidance: 'เบาๆ - กระตุ้น engagement ไม่ขายของ',
      restrictions: ['ห้ามพูดถึงสินค้า/บริการโดยตรง', 'ห้าม urgency/scarcity', 'ห้ามภาษาโปรโมท'],
      focus: ['Insight', 'คำถาม', 'เล่าเรื่อง', 'ให้ความรู้'],
    },
    en: {
      hookGuidance: 'Medium intensity - create curiosity, no clickbait',
      ctaGuidance: 'Soft - encourage engagement, no selling',
      restrictions: ['NO specific product/service mentions', 'NO urgency/scarcity', 'NO promotional language'],
      focus: ['Insight', 'Questions', 'Storytelling', 'Education'],
    },
  },
  sprout: {
    vi: {
      hookGuidance: 'Medium-Strong - thể hiện expertise',
      ctaGuidance: 'Medium - khuyến khích save/share, có thể soft CTA',
      restrictions: ['KHÔNG hard sell', 'Focus value trước, brand sau', 'Social proof có thể dùng nhưng không push'],
      focus: ['Case study', 'Tutorial', 'Behind the scenes', 'Expert insight'],
    },
    th: {
      hookGuidance: 'ระดับกลาง-แรง - แสดงความเชี่ยวชาญ',
      ctaGuidance: 'ระดับกลาง - กระตุ้น save/share ได้ CTA เบาๆ',
      restrictions: ['ห้าม hard sell', 'เน้นคุณค่าก่อน แบรนด์ทีหลัง', 'ใช้ social proof ได้แต่ไม่ push'],
      focus: ['Case study', 'สอนวิธี', 'เบื้องหลัง', 'มุมมองผู้เชี่ยวชาญ'],
    },
    en: {
      hookGuidance: 'Medium-Strong - demonstrate expertise',
      ctaGuidance: 'Medium - encourage save/share, soft CTA allowed',
      restrictions: ['NO hard sell', 'Value first, brand second', 'Social proof allowed but not pushy'],
      focus: ['Case study', 'Tutorial', 'Behind the scenes', 'Expert insight'],
    },
  },
  harvest: {
    vi: {
      hookGuidance: 'Strong-Viral - thu hút để convert',
      ctaGuidance: 'Strong - direct CTA, offer rõ ràng',
      restrictions: [],
      focus: ['Offer', 'Social proof', 'Urgency', 'Benefit stack'],
    },
    th: {
      hookGuidance: 'แรง-ไวรัล - ดึงดูดเพื่อแปลงลูกค้า',
      ctaGuidance: 'แรง - CTA ตรง ข้อเสนอชัดเจน',
      restrictions: [],
      focus: ['ข้อเสนอ', 'Social proof', 'ความเร่งด่วน', 'Benefit stack'],
    },
    en: {
      hookGuidance: 'Strong-Viral - attract to convert',
      ctaGuidance: 'Strong - direct CTA, clear offer',
      restrictions: [],
      focus: ['Offer', 'Social proof', 'Urgency', 'Benefit stack'],
    },
  },
};

/**
 * Get role-channel summary for a specific language
 */
export function getRoleChannelSummary(role: ContentRole, lang: RoleChannelLanguage = 'vi') {
  return ROLE_CHANNEL_SUMMARY[role][lang] || ROLE_CHANNEL_SUMMARY[role]['en'];
}

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
      product_mention: true,
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
