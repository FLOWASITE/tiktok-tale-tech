// ============================================
// Role-Channel Adaptation Engine v1.0
// Adapts channel behavior based on content role (Seed/Sprout/Harvest)
// ============================================

/**
 * Content role definitions
 * - Seed: Awareness - tạo nhận thức, không bán hàng
 * - Sprout: Trust Building - xây dựng niềm tin, expertise
 * - Harvest: Conversion - thúc đẩy hành động, chuyển đổi
 */
export type ContentRole = 'seed' | 'sprout' | 'harvest';

/**
 * Channel behavior configuration based on role
 */
export interface RoleChannelConfig {
  /** Hook intensity level */
  hookIntensity: 'soft' | 'medium' | 'strong' | 'viral';
  /** CTA strength */
  ctaStrength: 'none' | 'soft' | 'medium' | 'strong';
  /** Focus areas for content extraction */
  focusAreas: string[];
  /** Allowed promotional elements */
  promotionalAllowed: boolean;
  /** Urgency elements allowed */
  urgencyAllowed: boolean;
  /** Social proof emphasis */
  socialProofEmphasis: 'none' | 'light' | 'strong';
  /** Tone adjustment */
  toneAdjustment: string;
  /** Recommended content types */
  contentTypes: string[];
}

/**
 * Role-specific configurations per channel
 * Format: ROLE_CHANNEL_MATRIX[role][channel]
 */
export const ROLE_CHANNEL_MATRIX: Record<ContentRole, Record<string, RoleChannelConfig>> = {
  // ============================================
  // SEED ROLE - Awareness, no selling
  // ============================================
  seed: {
    facebook: {
      hookIntensity: 'medium',
      ctaStrength: 'soft',
      focusAreas: ['insight', 'question', 'storytelling'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Giáo dục, khơi gợi tư duy',
      contentTypes: ['Insight post', 'Question post', 'Story post'],
    },
    instagram: {
      hookIntensity: 'strong', // Visual platform needs strong hook
      ctaStrength: 'soft',
      focusAreas: ['visual_hook', 'emotion', 'relatability'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Inspirational, relatable',
      contentTypes: ['Carousel insight', 'Reel hook', 'Story quiz'],
    },
    linkedin: {
      hookIntensity: 'medium',
      ctaStrength: 'soft',
      focusAreas: ['professional_insight', 'data', 'lesson_learned'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'light',
      toneAdjustment: 'Thought leadership',
      contentTypes: ['Insight post', 'Industry trend', 'Personal lesson'],
    },
    twitter: {
      hookIntensity: 'strong',
      ctaStrength: 'none',
      focusAreas: ['hot_take', 'contrarian_view', 'quick_insight'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Bold, opinionated',
      contentTypes: ['Thread insight', 'Hot take', 'Quote tweet'],
    },
    tiktok: {
      hookIntensity: 'viral',
      ctaStrength: 'soft',
      focusAreas: ['shock_value', 'relatable_problem', 'curiosity'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Entertaining, educational',
      contentTypes: ['Problem reveal', 'Myth busting', 'Quick tip'],
    },
    youtube: {
      hookIntensity: 'strong',
      ctaStrength: 'soft',
      focusAreas: ['hook_5s', 'curiosity_gap', 'value_promise'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Educational, engaging',
      contentTypes: ['How-to', 'Explainer', 'Trend analysis'],
    },
    website: {
      hookIntensity: 'soft',
      ctaStrength: 'soft',
      focusAreas: ['seo_structure', 'comprehensive_info', 'trust_signals'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'light',
      toneAdjustment: 'Authoritative, helpful',
      contentTypes: ['Blog post', 'Guide', 'Pillar content'],
    },
    email: {
      hookIntensity: 'medium',
      ctaStrength: 'soft',
      focusAreas: ['value_first', 'education', 'nurture'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'none',
      toneAdjustment: 'Personal, helpful',
      contentTypes: ['Newsletter', 'Educational series', 'Welcome email'],
    },
  },

  // ============================================
  // SPROUT ROLE - Trust building, expertise
  // ============================================
  sprout: {
    facebook: {
      hookIntensity: 'medium',
      ctaStrength: 'medium',
      focusAreas: ['case_study', 'expertise', 'behind_scenes'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Expert, helpful',
      contentTypes: ['Case study', 'How-to', 'Behind the scenes'],
    },
    instagram: {
      hookIntensity: 'strong',
      ctaStrength: 'medium',
      focusAreas: ['transformation', 'process', 'results'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Authentic, trustworthy',
      contentTypes: ['Before/After', 'Process reveal', 'Testimonial'],
    },
    linkedin: {
      hookIntensity: 'medium',
      ctaStrength: 'medium',
      focusAreas: ['methodology', 'data_analysis', 'industry_insight'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Analytical, evidence-based',
      contentTypes: ['Case study', 'Data post', 'Methodology share'],
    },
    twitter: {
      hookIntensity: 'medium',
      ctaStrength: 'soft',
      focusAreas: ['quick_win', 'framework', 'actionable_tip'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'light',
      toneAdjustment: 'Helpful, generous',
      contentTypes: ['Thread tutorial', 'Quick framework', 'Pro tip'],
    },
    tiktok: {
      hookIntensity: 'strong',
      ctaStrength: 'medium',
      focusAreas: ['proof', 'transformation', 'education'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Authentic, proof-driven',
      contentTypes: ['Results showcase', 'Tutorial', 'Day in life'],
    },
    youtube: {
      hookIntensity: 'strong',
      ctaStrength: 'medium',
      focusAreas: ['deep_dive', 'tutorial', 'comparison'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Expert, thorough',
      contentTypes: ['Tutorial', 'Case study', 'Comparison'],
    },
    website: {
      hookIntensity: 'soft',
      ctaStrength: 'medium',
      focusAreas: ['detailed_guide', 'case_study', 'resource'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Expert, comprehensive',
      contentTypes: ['Ultimate guide', 'Case study', 'Resource hub'],
    },
    email: {
      hookIntensity: 'medium',
      ctaStrength: 'medium',
      focusAreas: ['exclusive_insight', 'case_study', 'actionable'],
      promotionalAllowed: false,
      urgencyAllowed: false,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Expert, personal',
      contentTypes: ['Case study email', 'Pro tips series', 'Exclusive insight'],
    },
  },

  // ============================================
  // HARVEST ROLE - Conversion, strong CTA
  // ============================================
  harvest: {
    facebook: {
      hookIntensity: 'strong',
      ctaStrength: 'strong',
      focusAreas: ['offer', 'urgency', 'social_proof', 'benefit'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Persuasive, benefit-focused',
      contentTypes: ['Offer post', 'Testimonial + CTA', 'Limited time'],
    },
    instagram: {
      hookIntensity: 'viral',
      ctaStrength: 'strong',
      focusAreas: ['desire', 'transformation', 'scarcity'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Aspirational, urgent',
      contentTypes: ['Product launch', 'Sale announcement', 'Result showcase + CTA'],
    },
    linkedin: {
      hookIntensity: 'medium',
      ctaStrength: 'strong',
      focusAreas: ['roi', 'results', 'professional_benefit'],
      promotionalAllowed: true,
      urgencyAllowed: false, // LinkedIn không nên urgent
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Professional, ROI-focused',
      contentTypes: ['Service announcement', 'Webinar invite', 'Demo offer'],
    },
    twitter: {
      hookIntensity: 'strong',
      ctaStrength: 'strong',
      focusAreas: ['offer', 'link', 'direct_ask'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'light',
      toneAdjustment: 'Direct, action-oriented',
      contentTypes: ['Launch thread', 'Offer announcement', 'Link + CTA'],
    },
    tiktok: {
      hookIntensity: 'viral',
      ctaStrength: 'strong',
      focusAreas: ['transformation', 'before_after', 'direct_cta'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Exciting, FOMO-inducing',
      contentTypes: ['Product demo', 'Results video + CTA', 'Flash sale'],
    },
    youtube: {
      hookIntensity: 'strong',
      ctaStrength: 'strong',
      focusAreas: ['value_stack', 'objection_handling', 'direct_offer'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Persuasive, value-focused',
      contentTypes: ['Product review + affiliate', 'Course promo', 'Service showcase'],
    },
    website: {
      hookIntensity: 'medium',
      ctaStrength: 'strong',
      focusAreas: ['landing_page', 'conversion_copy', 'trust_signals'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Persuasive, benefit-stacked',
      contentTypes: ['Sales page', 'Product page', 'Promo landing'],
    },
    email: {
      hookIntensity: 'strong',
      ctaStrength: 'strong',
      focusAreas: ['offer', 'deadline', 'exclusive_deal'],
      promotionalAllowed: true,
      urgencyAllowed: true,
      socialProofEmphasis: 'strong',
      toneAdjustment: 'Urgent, personal',
      contentTypes: ['Sales email', 'Flash sale', 'Last chance'],
    },
  },
};

// Default configs for channels not in matrix
const DEFAULT_ROLE_CONFIG: Record<ContentRole, RoleChannelConfig> = {
  seed: {
    hookIntensity: 'medium',
    ctaStrength: 'soft',
    focusAreas: ['insight', 'education'],
    promotionalAllowed: false,
    urgencyAllowed: false,
    socialProofEmphasis: 'none',
    toneAdjustment: 'Educational',
    contentTypes: ['Insight post'],
  },
  sprout: {
    hookIntensity: 'medium',
    ctaStrength: 'medium',
    focusAreas: ['expertise', 'case_study'],
    promotionalAllowed: false,
    urgencyAllowed: false,
    socialProofEmphasis: 'strong',
    toneAdjustment: 'Expert',
    contentTypes: ['Case study'],
  },
  harvest: {
    hookIntensity: 'strong',
    ctaStrength: 'strong',
    focusAreas: ['offer', 'benefit'],
    promotionalAllowed: true,
    urgencyAllowed: true,
    socialProofEmphasis: 'strong',
    toneAdjustment: 'Persuasive',
    contentTypes: ['Sales post'],
  },
};

/**
 * Get role-channel configuration
 */
export function getRoleChannelConfig(
  role: ContentRole,
  channel: string
): RoleChannelConfig {
  return ROLE_CHANNEL_MATRIX[role]?.[channel] || DEFAULT_ROLE_CONFIG[role];
}

/**
 * Build role-channel adaptation instruction for AI prompt
 */
export function buildRoleChannelInstruction(
  role: ContentRole,
  channels: string[]
): string {
  const roleLabels: Record<ContentRole, { name: string; purpose: string }> = {
    seed: { 
      name: 'SEED (Gieo hạt)', 
      purpose: 'Mở rộng nhận thức, thu hút attention, KHÔNG bán hàng' 
    },
    sprout: { 
      name: 'SPROUT (Nuôi dưỡng)', 
      purpose: 'Xây dựng niềm tin, thể hiện expertise' 
    },
    harvest: { 
      name: 'HARVEST (Thu hoạch)', 
      purpose: 'Thúc đẩy hành động, chuyển đổi' 
    },
  };

  const parts: string[] = [];
  parts.push(`\n## 🎭 ROLE-CHANNEL ADAPTATION`);
  parts.push(`Content Role: **${roleLabels[role].name}**`);
  parts.push(`Mục đích: ${roleLabels[role].purpose}`);
  
  parts.push(`\n### Channel-Specific Adaptations:`);
  
  for (const channel of channels) {
    const config = getRoleChannelConfig(role, channel);
    
    parts.push(`\n**${channel.toUpperCase()}:**`);
    parts.push(`- Hook: ${config.hookIntensity.toUpperCase()}`);
    parts.push(`- CTA: ${config.ctaStrength.toUpperCase()}`);
    parts.push(`- Focus: ${config.focusAreas.slice(0, 3).join(', ')}`);
    parts.push(`- Tone: ${config.toneAdjustment}`);
    
    if (role === 'seed') {
      parts.push(`- ⛔ KHÔNG promotion, KHÔNG urgency, KHÔNG bán hàng`);
    } else if (role === 'sprout') {
      parts.push(`- ✅ Social proof: ${config.socialProofEmphasis}`);
      parts.push(`- ⛔ KHÔNG hard sell, chỉ build trust`);
    } else if (role === 'harvest') {
      parts.push(`- ✅ Promotion: ALLOWED`);
      parts.push(`- ✅ Urgency: ${config.urgencyAllowed ? 'ALLOWED' : 'SOFT ONLY'}`);
      parts.push(`- ✅ Social proof: STRONG emphasis`);
    }
  }
  
  // Role-specific enforcement
  parts.push(`\n### ⚠️ ROLE ENFORCEMENT:`);
  if (role === 'seed') {
    parts.push(`- TUYỆT ĐỐI không đề cập sản phẩm/dịch vụ cụ thể`);
    parts.push(`- CTA chỉ là: "Tag người cần biết", "Bạn nghĩ sao?", "Share nếu đồng ý"`);
    parts.push(`- Mở đầu bằng insight/statistic/câu hỏi kích thích tư duy`);
  } else if (role === 'sprout') {
    parts.push(`- Có thể mention expertise nhưng KHÔNG push bán hàng`);
    parts.push(`- Focus vào VALUE và PROOF (case study, số liệu, testimonial)`);
    parts.push(`- CTA: "Lưu lại", "Share cho người cần", "Comment kinh nghiệm của bạn"`);
  } else if (role === 'harvest') {
    parts.push(`- Offer phải RÕ RÀNG và CỤ THỂ`);
    parts.push(`- Include: Benefit stack, Social proof, Urgency (nếu phù hợp)`);
    parts.push(`- CTA: Strong, Direct - "Inbox ngay", "Đăng ký hôm nay", "Liên hệ nhận ưu đãi"`);
  }
  
  return parts.join('\n');
}

/**
 * Validate content against role requirements
 */
export function validateRoleCompliance(
  role: ContentRole,
  channel: string,
  content: string
): { score: number; issues: string[]; passed: boolean } {
  const config = getRoleChannelConfig(role, channel);
  const issues: string[] = [];
  let score = 100;
  
  const contentLower = content.toLowerCase();
  
  // Role-specific validation
  if (role === 'seed') {
    // Check for prohibited promotional elements
    const promoPatterns = [
      /liên hệ.*ngay/i, /inbox.*ngay/i, /đặt.*hàng/i, /mua.*ngay/i,
      /giảm.*%/i, /ưu đãi.*%/i, /khuyến.*mãi/i, /sale/i,
    ];
    for (const pattern of promoPatterns) {
      if (pattern.test(content)) {
        issues.push('SEED: Có nội dung promotional (vi phạm)');
        score -= 20;
        break;
      }
    }
    
    // Check for urgency elements
    const urgencyPatterns = [/còn.*slot/i, /hết.*hạn/i, /chỉ.*hôm nay/i, /cuối.*cùng/i];
    for (const pattern of urgencyPatterns) {
      if (pattern.test(content)) {
        issues.push('SEED: Có urgency elements (vi phạm)');
        score -= 15;
        break;
      }
    }
  }
  
  if (role === 'sprout') {
    // Should have expertise/proof elements
    const proofPatterns = [/case study/i, /kết quả/i, /thực tế/i, /số liệu/i, /khách hàng/i];
    const hasProof = proofPatterns.some(p => p.test(content));
    if (!hasProof && config.socialProofEmphasis === 'strong') {
      issues.push('SPROUT: Thiếu social proof/case study');
      score -= 10;
    }
  }
  
  if (role === 'harvest') {
    // Must have clear CTA
    const ctaPatterns = [
      /liên hệ/i, /inbox/i, /đăng ký/i, /mua ngay/i, /đặt.*hàng/i,
      /tư vấn/i, /nhận.*ưu đãi/i, /click/i, /bấm/i,
    ];
    const hasCTA = ctaPatterns.some(p => p.test(content));
    if (!hasCTA) {
      issues.push('HARVEST: Thiếu CTA rõ ràng');
      score -= 15;
    }
    
    // Should have offer/benefit
    const benefitPatterns = [/miễn phí/i, /giảm/i, /ưu đãi/i, /bonus/i, /tặng/i];
    const hasBenefit = benefitPatterns.some(p => p.test(content));
    if (!hasBenefit && config.promotionalAllowed) {
      issues.push('HARVEST: Nên có offer/benefit cụ thể');
      score -= 5;
    }
  }
  
  return {
    score: Math.max(0, score),
    issues,
    passed: score >= 70,
  };
}

/**
 * Get recommended CTA patterns based on role and channel
 */
export function getRecommendedCTAs(role: ContentRole, channel: string): string[] {
  const ctaPatterns: Record<ContentRole, Record<string, string[]>> = {
    seed: {
      facebook: ['Bạn nghĩ sao?', 'Tag người cần biết', 'Share nếu đồng ý', 'Đã gặp trường hợp này chưa?'],
      instagram: ['Save lại nhé', 'Tag bạn bè', 'Comment số...', 'Double tap nếu...'],
      linkedin: ['Share your thoughts', 'What do you think?', 'Agree or disagree?'],
      twitter: ['Retweet if you agree', 'Thoughts?', 'Thread 🧵'],
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
  
  return ctaPatterns[role][channel] || ctaPatterns[role].default || [];
}
