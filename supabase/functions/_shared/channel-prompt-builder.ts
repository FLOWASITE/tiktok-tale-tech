/**
 * Simplified Channel Prompt Builder for Real-time Streaming
 * 
 * This builder creates prompts for streaming text generation (no tool calling).
 * The AI outputs plain text content directly, which is then streamed token-by-token.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildExtendedBrandPrompt,
  EXTENDED_BRAND_SELECT,
  mapBrandDBToBrandContext,
  type BrandContext,
  type CustomerPersona,
} from "./prompt-utils.ts";

// ============================================
// TYPES
// ============================================

export interface ChannelConfig {
  channel: string;
  maxLength?: number;
  hashtagCount?: number;
  emojiStyle?: 'none' | 'minimal' | 'moderate' | 'heavy';
  cta?: string;
}

export interface StreamingPromptInput {
  topic: string;
  channel: string;
  brandTemplateId?: string;
  organizationId?: string;
  hook?: string;
  additionalContext?: string;
  contentGoal?: string;
  targetPersonaId?: string;
  language?: string;
  productIds?: string[];
}

export interface StreamingPrompt {
  system: string;
  user: string;
}

// ============================================
// CHANNEL-SPECIFIC CONSTRAINTS
// ============================================

const CHANNEL_CONSTRAINTS: Record<string, {
  maxChars: number;
  hashtagRange: [number, number];
  emojiLevel: string;
  format: string;
  platform: string;
}> = {
  facebook: {
    maxChars: 3000,
    hashtagRange: [3, 5],
    emojiLevel: 'moderate',
    format: 'Post with hook, body paragraphs, and CTA',
    platform: 'Facebook',
  },
  instagram: {
    maxChars: 2200,
    hashtagRange: [15, 25],
    emojiLevel: 'heavy',
    format: 'Caption with hook line, short paragraphs, hashtag block at end',
    platform: 'Instagram',
  },
  linkedin: {
    maxChars: 3000,
    hashtagRange: [3, 5],
    emojiLevel: 'minimal',
    format: 'Professional post with hook, insights, and professional CTA',
    platform: 'LinkedIn',
  },
  twitter: {
    maxChars: 280,
    hashtagRange: [1, 2],
    emojiLevel: 'none',
    format: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số 1/, 2/...',
    platform: 'X',
  },
  threads: {
    maxChars: 500,
    hashtagRange: [0, 3],
    emojiLevel: 'moderate',
    format: 'Conversational post, can be part of a thread',
    platform: 'Threads',
  },
  tiktok: {
    maxChars: 2200,
    hashtagRange: [3, 8],
    emojiLevel: 'heavy',
    format: 'Engaging caption for video, trendy hashtags',
    platform: 'TikTok',
  },
  youtube: {
    maxChars: 5000,
    hashtagRange: [3, 5],
    emojiLevel: 'moderate',
    format: 'Video description with timestamps, links section, hashtags',
    platform: 'YouTube',
  },
  zalo: {
    maxChars: 2000,
    hashtagRange: [0, 3],
    emojiLevel: 'moderate',
    format: 'Friendly post for Vietnamese audience',
    platform: 'Zalo',
  },
  telegram: {
    maxChars: 4096,
    hashtagRange: [0, 5],
    emojiLevel: 'moderate',
    format: 'Channel post with markdown formatting',
    platform: 'Telegram',
  },
  email: {
    maxChars: 10000,
    hashtagRange: [0, 0],
    emojiLevel: 'none',
    format: 'Email with subject line, greeting, body, signature',
    platform: 'Email',
  },
  website: {
    maxChars: 5000,
    hashtagRange: [0, 0],
    emojiLevel: 'none',
    format: 'Website content with headings, paragraphs, bullet points',
    platform: 'Website',
  },
  blog: {
    maxChars: 8000,
    hashtagRange: [0, 5],
    emojiLevel: 'none',
    format: 'Blog post with title, intro, sections, conclusion',
    platform: 'Blog',
  },
};

// ============================================
// CONTEXT FETCHERS
// ============================================

export interface FooterInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  company_name?: string;
}

export interface FetchedContext {
  brand: BrandContext | null;
  industry: any | null;
  selectedProducts: any[] | null;
  targetPersona: CustomerPersona | null;
  // Footer-related context
  footerInfo: FooterInfo | null;
  channelOverrides: Record<string, any> | null;
  brandAllowEmoji: boolean;
  companyName: string | null;
  tagline: string | null;
}

/**
 * Fetch brand and industry context for prompt building
 */
export async function fetchStreamingContext(
  input: StreamingPromptInput
): Promise<FetchedContext> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const emptyContext: FetchedContext = {
    brand: null,
    industry: null,
    selectedProducts: null,
    targetPersona: null,
    footerInfo: null,
    channelOverrides: null,
    brandAllowEmoji: true,
    companyName: null,
    tagline: null,
  };

  if (!supabaseUrl || !supabaseKey || !input.brandTemplateId) {
    return emptyContext;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch brand template with footer_info, channel_overrides, allow_emoji
    const { data: brandData } = await supabase
      .from("brand_templates")
      .select(`${EXTENDED_BRAND_SELECT}, footer_info, channel_overrides, allow_emoji, tagline`)
      .eq("id", input.brandTemplateId)
      .single();

    if (!brandData) {
      return emptyContext;
    }

    // Fetch personas
    const { data: personasData } = await supabase
      .from("customer_personas")
      .select("*")
      .eq("brand_template_id", input.brandTemplateId);

    // Fetch products if specified
    let selectedProducts: any[] = [];
    if (input.productIds?.length) {
      const { data: productsData } = await supabase
        .from("brand_products")
        .select("*")
        .in("id", input.productIds);
      selectedProducts = productsData || [];
    }

    // Fetch industry memory if available
    let industry = null;
    if (brandData.industry_template_id) {
      const { data: industryData } = await supabase
        .from("industry_templates")
        .select("*")
        .eq("id", brandData.industry_template_id)
        .single();
      industry = industryData;
    }

    // Map to BrandContext
    const brand = mapBrandDBToBrandContext(
      brandData,
      selectedProducts,
      personasData || []
    );

    // Find target persona
    let targetPersona: CustomerPersona | null = null;
    if (input.targetPersonaId && personasData) {
      const persona = personasData.find((p: any) => p.id === input.targetPersonaId);
      if (persona) {
        targetPersona = {
          name: persona.name,
          avatarEmoji: persona.avatar_emoji,
          occupation: persona.occupation,
          ageRange: persona.age_range,
          painPoints: persona.pain_points,
          desires: persona.desires,
          objections: persona.objections,
          buyingTriggers: persona.buying_triggers,
          isPrimary: persona.is_primary,
        };
      }
    }

    // Extract footer-related data
    const footerInfo: FooterInfo | null = brandData.footer_info || null;
    const channelOverrides = brandData.channel_overrides || null;
    const brandAllowEmoji = brandData.allow_emoji !== false;
    const companyName = brand?.brandName || footerInfo?.company_name || null;
    const tagline = brandData.tagline || null;

    return {
      brand,
      industry,
      selectedProducts,
      targetPersona,
      footerInfo,
      channelOverrides,
      brandAllowEmoji,
      companyName,
      tagline,
    };
  } catch (error) {
    console.error("[channel-prompt-builder] Error fetching context:", error);
    return emptyContext;
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

/**
 * Build a simplified prompt for streaming content generation
 * Returns plain text output (no tool calling/JSON)
 */
export function buildStreamingPrompt(
  input: StreamingPromptInput,
  context: FetchedContext
): StreamingPrompt {
  const channelInfo = CHANNEL_CONSTRAINTS[input.channel] || CHANNEL_CONSTRAINTS.facebook;
  const { brand, industry, targetPersona } = context;

  // Build system prompt
  const systemParts: string[] = [];

  systemParts.push(`Bạn là chuyên gia viết content ${channelInfo.platform} cho thương hiệu${brand ? ` "${brand.brandName}"` : ''}.`);
  systemParts.push(`\nNhiệm vụ: Viết NỘI DUNG HOÀN CHỈNH cho ${channelInfo.platform} về chủ đề được cung cấp.`);
  
  // Platform constraints
  systemParts.push(`\n## PLATFORM CONSTRAINTS (${channelInfo.platform})`);
  systemParts.push(`- Độ dài tối đa: ${channelInfo.maxChars} ký tự`);
  systemParts.push(`- Số hashtag: ${channelInfo.hashtagRange[0]}-${channelInfo.hashtagRange[1]}`);
  systemParts.push(`- Emoji: ${channelInfo.emojiLevel}`);
  systemParts.push(`- Format: ${channelInfo.format}`);

  // Brand context
  if (brand) {
    const brandSection = buildExtendedBrandPrompt(brand);
    if (brandSection) {
      systemParts.push(`\n${brandSection}`);
    }

    // Tone of voice
    if (brand.toneOfVoice?.length) {
      systemParts.push(`\n## TONE OF VOICE`);
      systemParts.push(`Giọng điệu: ${brand.toneOfVoice.join(", ")}`);
      if (brand.formality) {
        systemParts.push(`Mức độ formal: ${brand.formality}`);
      }
    }

    // Words to use/avoid
    if (brand.preferredWords?.length) {
      systemParts.push(`\nTừ nên dùng: ${brand.preferredWords.slice(0, 10).join(", ")}`);
    }
    if (brand.forbiddenWords?.length) {
      systemParts.push(`Từ TUYỆT ĐỐI không dùng: ${brand.forbiddenWords.join(", ")}`);
    }

    // Hashtags
    if (brand.brandHashtags?.length && channelInfo.hashtagRange[1] > 0) {
      systemParts.push(`\nBrand hashtags (nên dùng): ${brand.brandHashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`);
    }

    // CTA templates
    if (brand.ctaTemplates?.length) {
      systemParts.push(`\nCTA mẫu (dùng làm tham khảo): ${brand.ctaTemplates.slice(0, 3).join(" | ")}`);
    }
  }

  // Industry compliance
  if (industry) {
    systemParts.push(`\n## INDUSTRY COMPLIANCE`);
    if (industry.forbidden_terms?.length) {
      systemParts.push(`Từ cấm ngành: ${industry.forbidden_terms.join(", ")}`);
    }
    if (industry.compliance_rules) {
      const rules = typeof industry.compliance_rules === 'string' 
        ? JSON.parse(industry.compliance_rules) 
        : industry.compliance_rules;
      if (Array.isArray(rules) && rules.length) {
        systemParts.push(`Quy tắc tuân thủ:`);
        rules.slice(0, 3).forEach((r: any) => {
          systemParts.push(`- ${r.rule || r}`);
        });
      }
    }
  }

  // Target persona
  if (targetPersona) {
    systemParts.push(`\n## TARGET PERSONA: ${targetPersona.name}`);
    if (targetPersona.painPoints?.length) {
      systemParts.push(`Pain points: ${targetPersona.painPoints.slice(0, 3).join(", ")}`);
    }
    if (targetPersona.desires?.length) {
      systemParts.push(`Mong muốn: ${targetPersona.desires.slice(0, 3).join(", ")}`);
    }
  }

  // Output instructions
  systemParts.push(`\n## OUTPUT RULES`);
  systemParts.push(`- Viết TRỰC TIẾP nội dung, KHÔNG giải thích hay comment`);
  systemParts.push(`- KHÔNG wrap trong code blocks hay JSON`);
  systemParts.push(`- Bắt đầu bằng hook mạnh, kết thúc bằng CTA rõ ràng`);
  systemParts.push(`- Tuân thủ CHÍNH XÁC giới hạn ký tự của platform`);
  if (input.language === 'vi' || !input.language) {
    systemParts.push(`- Viết bằng tiếng Việt tự nhiên, không Tây hóa`);
  }

  const systemPrompt = systemParts.join('\n');

  // Build user prompt
  const userParts: string[] = [];
  
  userParts.push(`Viết content ${channelInfo.platform} về chủ đề:`);
  userParts.push(`"${input.topic}"`);

  if (input.hook) {
    userParts.push(`\nHook/Opening gợi ý: "${input.hook}"`);
  }

  if (input.contentGoal) {
    userParts.push(`\nMục tiêu content: ${input.contentGoal}`);
  }

  if (input.additionalContext) {
    userParts.push(`\nBối cảnh thêm: ${input.additionalContext}`);
  }

  if (context.selectedProducts?.length) {
    userParts.push(`\nSản phẩm liên quan:`);
    context.selectedProducts.forEach((p: any) => {
      userParts.push(`- ${p.name}${p.description ? `: ${p.description.slice(0, 100)}` : ''}`);
    });
  }

  userParts.push(`\n---\nBắt đầu viết nội dung ngay (không giải thích):`);

  const userPrompt = userParts.join('\n');

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channel: string): string {
  const names: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    threads: 'Threads',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    zalo: 'Zalo',
    zalo_oa: 'Zalo OA',
    telegram: 'Telegram',
    email: 'Email',
    website: 'Website',
    blog: 'Blog',
  };
  return names[channel] || channel;
}

// ============================================
// FOOTER INFO FORMATTER (Shared)
// ============================================

/**
 * Format footer info for a specific channel
 * This is shared between generate-multichannel and generate-multichannel-stream
 */
export function formatFooterInfo(
  footer: FooterInfo | null,
  channel: string,
  useEmoji: boolean,
  channelOverrides?: Record<string, any> | null,
  companyName?: string | null,
  tagline?: string | null
): string {
  if (!footer) return '';
  
  // Check if this channel has custom footer settings
  const channelOverride = channelOverrides?.[channel] as { 
    footer_enabled?: boolean; 
    footer_template?: string 
  } | undefined;
  
  // Check if this channel has footer disabled
  if (channelOverride?.footer_enabled === false) {
    return '';
  }
  
  // Replace template variables helper
  const replaceFooterVariables = (template: string): string => {
    return template
      .replace(/\{phone\}/g, footer?.phone || '')
      .replace(/\{email\}/g, footer?.email || '')
      .replace(/\{website\}/g, footer?.website || '')
      .replace(/\{address\}/g, footer?.address || '')
      .replace(/\{company\}/g, companyName || footer?.company_name || '');
  };
  
  // Check if this channel has a custom footer template
  if (channelOverride?.footer_template && channelOverride.footer_template.trim()) {
    return '\n\n' + replaceFooterVariables(channelOverride.footer_template);
  }
  
  const divider = '━━━━━━━━━━━━━━━━━━━━';
  
  // ======= FACEBOOK / INSTAGRAM / LINKEDIN - Card Style =======
  if (channel === 'facebook' || channel === 'instagram' || channel === 'linkedin') {
    const lines: string[] = ['\n\n' + divider];
    
    if (useEmoji) {
      lines.push('✨ **LIÊN HỆ NGAY** ✨');
      lines.push('');
      if (footer.phone) lines.push(`📞 **Hotline:** ${footer.phone}`);
      if (footer.email) lines.push(`📧 **Email:** ${footer.email}`);
      if (footer.website) lines.push(`🌐 **Website:** ${footer.website}`);
      if (footer.address) lines.push(`📍 **Địa chỉ:** ${footer.address}`);
    } else {
      lines.push('→ **LIÊN HỆ NGAY**');
      lines.push('');
      if (footer.phone) lines.push(`• **Hotline:** ${footer.phone}`);
      if (footer.email) lines.push(`• **Email:** ${footer.email}`);
      if (footer.website) lines.push(`• **Website:** ${footer.website}`);
      if (footer.address) lines.push(`• **Địa chỉ:** ${footer.address}`);
    }
    
    lines.push(divider);
    return lines.join('  \n');
  }
  
  // ======= EMAIL - Professional Signature Block =======
  if (channel === 'email') {
    const lines: string[] = ['\n\n---'];
    
    if (companyName) {
      lines.push(`\n**${companyName}**`);
      if (tagline) lines.push(`*${tagline}*`);
    }
    lines.push('');
    
    if (useEmoji) {
      if (footer.phone) lines.push(`📞 Hotline: ${footer.phone}`);
      if (footer.email) lines.push(`📧 Email: ${footer.email}`);
      if (footer.website) lines.push(`🌐 Website: ${footer.website}`);
      if (footer.address) lines.push(`📍 Địa chỉ: ${footer.address}`);
    } else {
      if (footer.phone) lines.push(`Tel: ${footer.phone}`);
      if (footer.email) lines.push(`Email: ${footer.email}`);
      if (footer.website) lines.push(`Web: ${footer.website}`);
      if (footer.address) lines.push(`Địa chỉ: ${footer.address}`);
    }
    
    return lines.join('  \n');
  }
  
  // ======= WEBSITE - Author Box with Company Branding =======
  if (channel === 'website') {
    const lines: string[] = ['\n\n---\n'];
    
    if (companyName) {
      lines.push(`### Về ${companyName}`);
    } else {
      lines.push('### Thông tin liên hệ');
    }
    lines.push('');
    
    if (tagline) lines.push(`*${tagline}*\n`);
    
    const contactParts: string[] = [];
    if (footer.phone) contactParts.push(useEmoji ? `📞 ${footer.phone}` : `Hotline: ${footer.phone}`);
    if (footer.email) contactParts.push(useEmoji ? `📧 ${footer.email}` : `Email: ${footer.email}`);
    if (footer.website) contactParts.push(useEmoji ? `🌐 ${footer.website}` : footer.website);
    
    if (contactParts.length) lines.push(contactParts.join(' | '));
    if (footer.address) lines.push(`\n${useEmoji ? '📍 ' : ''}${footer.address}`);
    
    return lines.join('  \n');
  }
  
  // ======= TWITTER/X - Compact with Bio Link =======
  if (channel === 'twitter') {
    const lines: string[] = [];
    
    if (useEmoji) {
      lines.push('\n\n—');
      if (footer.website) lines.push(`🔗 ${footer.website}`);
      if (footer.phone) lines.push(`📞 ${footer.phone}`);
    } else {
      lines.push('\n\n—');
      if (footer.website) lines.push(`→ ${footer.website}`);
      if (footer.phone) lines.push(`→ ${footer.phone}`);
    }
    
    return lines.length > 1 ? lines.join('  \n') : '';
  }
  
  // ======= TIKTOK / YOUTUBE - Compact CTA =======
  if (channel === 'tiktok' || channel === 'youtube') {
    if (!footer.website) return '';
    return useEmoji 
      ? `\n\n👉 Theo dõi: ${footer.website}` 
      : `\n\n→ Xem thêm: ${footer.website}`;
  }
  
  // ======= ZALO OA / TELEGRAM - Clean Professional =======
  if (channel === 'zalo_oa' || channel === 'zalo' || channel === 'telegram') {
    const lines: string[] = ['\n\n' + divider];
    lines.push('**THÔNG TIN LIÊN HỆ:**');
    lines.push('');
    
    if (footer.phone) lines.push(`→ Hotline: ${footer.phone}`);
    if (footer.email) lines.push(`→ Email: ${footer.email}`);
    if (footer.website) lines.push(`→ Website: ${footer.website}`);
    
    return lines.join('  \n');
  }
  
  // ======= THREADS - Compact Style with Contact =======
  if (channel === 'threads') {
    const lines: string[] = ['\n\n—'];
    
    if (useEmoji) {
      if (footer.website) lines.push(`🔗 ${footer.website}`);
      if (footer.phone) lines.push(`📞 ${footer.phone}`);
    } else {
      if (footer.website) lines.push(`→ ${footer.website}`);
      if (footer.phone) lines.push(`→ ${footer.phone}`);
    }
    
    return lines.length > 1 ? lines.join('  \n') : '';
  }
  
  return '';
}
