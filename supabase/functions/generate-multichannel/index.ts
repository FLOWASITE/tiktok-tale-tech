import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { getAIConfig, getChannelModelConfigs } from "../_shared/ai-config.ts";
import { callAI } from "../_shared/ai-provider.ts";
import {
  generateChannelStreaming,
  getChannelDisplayName,
  createSSEResponse,
  delay as streamDelay,
  type StreamingContext,
  type StreamingProgressEvent,
} from "../_shared/streaming-handler.ts";
import { formatFooterInfo, type FooterInfo } from "../_shared/channel-prompt-builder.ts";
import { 
  buildExtendedBrandPrompt,
  buildJourneyStageMessagingSection,
  type BrandContext as ExtendedBrandContext,
  type CustomerPersona,
  type JourneyStageMessagingData,
  type JourneyStage,
} from "../_shared/prompt-utils.ts";
import {
  runSelfCritiqueLoop,
  CRITIQUE_CONFIG,
  type CritiqueResult,
} from "../_shared/self-critique.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EditedPreview {
  original: string;
  edited: string;
}

interface FormData {
  topic: string;
  industry?: string;
  contentGoal?: string; // Now optional - auto-derived from journeyStage
  contentAngle?: string; // Phase 6: Content Angle support
  channels: string[];
  brandTemplateId?: string;
  brandVoiceVariantId?: string;
  organization_id?: string;
  editedPreviews?: Record<string, EditedPreview>;
  contentPurpose?: string;
  marketingFramework?: string;
  targetJourneyStage?: JourneyStage;
  targetPersonaId?: string;
  targetProductId?: string;
  stream?: boolean; // NEW: Enable real-time SSE streaming
  campaignId?: string;
  // Action mode parameters
  action?: 'create' | 'expand' | 'regenerate' | 'preview'; // 'create' = default, 'preview' = ultra-fast no-save
  contentId?: string; // Required when action='expand' or 'regenerate'
  newChannels?: string[]; // Required when action='expand' - channels to add
  channel?: string; // Required when action='regenerate' - single channel to regenerate
  previewChannel?: string; // Required when action='preview' - single channel to preview
  enableCritique?: boolean; // Optional for regenerate: run Self-Critique (default: false)
}

// Channel content column mapping (for expand mode)
const CHANNEL_COLUMN_MAP: Record<string, string> = {
  website: 'website_content',
  facebook: 'facebook_content',
  instagram: 'instagram_content',
  twitter: 'twitter_content',
  google_maps: 'google_maps_content',
  linkedin: 'linkedin_content',
  email: 'email_content',
  youtube: 'youtube_content',
  zalo_oa: 'zalo_oa_content',
  telegram: 'telegram_content',
  tiktok: 'tiktok_content',
  threads: 'threads_content',
};

// Journey Stage → Content Goal Mapping
// Auto-derive contentGoal from journeyStage to reduce user input
const JOURNEY_TO_GOAL_MAP: Record<JourneyStage, string> = {
  awareness: 'awareness',
  consideration: 'education', // So sánh, đánh giá → cần giáo dục
  decision: 'conversion',
  loyalty: 'engagement', // Giữ chân, tương tác
};

// Brand Voice label mappings
const brandPositioningLabels: Record<string, string> = {
  business: "Doanh nghiệp",
  expert: "Chuyên gia",
  agency: "Agency",
  consultant: "Tư vấn",
};

const toneOfVoiceLabels: Record<string, string> = {
  expert: "Chuyên gia",
  calm: "Điềm tĩnh",
  confident: "Tự tin",
  friendly: "Thân thiện",
  analytical: "Phân tích",
  serious: "Nghiêm túc",
  inspirational: "Truyền cảm hứng",
};

const formalityLevelLabels: Record<string, string> = {
  very_formal: "Rất trang trọng",
  professional: "Chuyên nghiệp",
  neutral: "Trung lập",
  casual: "Gần gũi",
};

const languageStyleLabels: Record<string, string> = {
  clear_direct: "Rõ ràng, trực tiếp",
  structured: "Có cấu trúc",
  no_exaggeration: "Không khoa trương",
  no_over_emotion: "Không cảm tính quá mức",
};

interface BrandVoice {
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
}

interface IndustryMemory {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_terms: string[];
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
    cta_policy?: 'soft' | 'medium' | 'hard';
  };
  channel_settings: Record<string, {
    risk_level: 'low' | 'medium' | 'high';
    notes: string;
  }>;
  // NEW fields
  metadata: {
    applies_to: string[];
    legal_basis: string[];
  };
  argument_patterns: {
    valid_patterns: string[];
    forbidden_patterns: string[];
  };
  system_rules: string[];
  preferred_words: string[];
  forbidden_words: string[];
}

interface MergedRules {
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_words: string[];
  preferred_words: string[];
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
}

// Fetch Industry Memory from database - SINGLE SOURCE OF TRUTH
async function fetchIndustryMemory(
  supabase: any, 
  industryTemplateId: string, 
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    const { data, error } = await supabase
      .from('industry_templates')
      .select(`
        id,
        code,
        version,
        status,
        target_audience,
        brand_voice,
        channel_settings,
        compliance_rules,
        claim_restrictions,
        forbidden_terms,
        metadata,
        argument_patterns,
        system_rules,
        industry_template_translations!inner (
          name,
          preferred_words,
          forbidden_words
        )
      `)
      .eq('id', industryTemplateId)
      .eq('status', 'stable')
      .eq('industry_template_translations.language_code', languageCode)
      .single();

    if (error || !data) {
      console.warn(`Industry Memory ${industryTemplateId} not found or not stable - skipping rules`);
      return null;
    }

    // Access new columns (may not be in types yet)
    const rawData = data as any;
    const translation = rawData.industry_template_translations?.[0];

    return {
      id: rawData.id,
      code: rawData.code,
      name: translation?.name || rawData.code,
      version: rawData.version || '1.0',
      target_audience: rawData.target_audience,
      compliance_rules: rawData.compliance_rules || [],
      claim_restrictions: rawData.claim_restrictions || [],
      forbidden_terms: rawData.forbidden_terms || [],
      brand_voice: rawData.brand_voice || {},
      channel_settings: rawData.channel_settings || {},
      // NEW fields
      metadata: rawData.metadata || { applies_to: [], legal_basis: [] },
      argument_patterns: rawData.argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: rawData.system_rules || [],
      preferred_words: translation?.preferred_words || [],
      forbidden_words: translation?.forbidden_words || [],
    };
  } catch (err) {
    console.error('Error fetching Industry Memory:', err);
    return null;
  }
}

/**
 * CRITICAL: Merge Industry Memory with Brand Voice
 * 
 * PRIORITY CASCADE (CORRECT ORDER):
 * 1. Industry Memory (LOCKED - cannot be overridden)
 * 2. Brand Voice (customizable, but cannot violate Industry)
 * 3. System Defaults
 */
function buildMergedRules(
  industryMemory: IndustryMemory | null,
  brandVoice: BrandVoice
): MergedRules {
  if (!industryMemory) {
    // No Industry Memory - use Brand Voice only
    return {
      forbidden_terms: [],
      compliance_rules: brandVoice.compliance_rules || [],
      claim_restrictions: [],
      forbidden_words: brandVoice.forbidden_words || [],
      preferred_words: brandVoice.preferred_words || [],
      tone_of_voice: brandVoice.tone_of_voice || [],
      formality_level: brandVoice.formality_level || 'professional',
      language_style: brandVoice.language_style || [],
      allow_emoji: brandVoice.allow_emoji ?? true,
    };
  }

  return {
    // ⛔ LOCKED from Industry - CANNOT be overridden
    forbidden_terms: industryMemory.forbidden_terms,
    compliance_rules: industryMemory.compliance_rules,
    claim_restrictions: industryMemory.claim_restrictions,
    
    // ⚠️ Merged: Industry + Brand (unique values)
    forbidden_words: [
      ...industryMemory.forbidden_words,
      ...(brandVoice.forbidden_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    
    // ✅ Merged: Industry + Brand (unique values)
    preferred_words: [
      ...industryMemory.preferred_words,
      ...(brandVoice.preferred_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    
    // Brand Voice: Industry baseline + Brand customization
    tone_of_voice: brandVoice.tone_of_voice?.length 
      ? brandVoice.tone_of_voice 
      : industryMemory.brand_voice.tone_of_voice || [],
    formality_level: brandVoice.formality_level 
      || industryMemory.brand_voice.formality_level 
      || 'professional',
    language_style: brandVoice.language_style?.length 
      ? brandVoice.language_style 
      : industryMemory.brand_voice.language_style || [],
    allow_emoji: brandVoice.allow_emoji ?? industryMemory.brand_voice.allow_emoji ?? true,
  };
}

const getBrandVoicePrompt = (
  voice: BrandVoice, 
  mergedRules?: MergedRules,
  industryMemory?: IndustryMemory | null
): string => {
  const parts: string[] = [];
  
  // HIGHEST PRIORITY: System Rules (if available from Industry Memory)
  if (industryMemory?.system_rules && industryMemory.system_rules.length > 0) {
    parts.push(`## 🔐 SYSTEM RULES (LUẬT CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)`);
    parts.push(`Đây là các quy tắc BẮT BUỘC tuyệt đối. Không được vi phạm dưới bất kỳ hình thức nào.`);
    industryMemory.system_rules.forEach((rule, i) => {
      parts.push(`${i + 1}. ${rule}`);
    });
    parts.push('');
  }
  
  // If we have merged rules from Industry Memory, use HIGHER priority prompt
  if (mergedRules && mergedRules.forbidden_terms.length > 0) {
    parts.push(`## 🔒 INDUSTRY MEMORY (LUẬT NGÀNH - KHÓA CỨNG)`);
    parts.push(`Industry Memory là LUẬT KHÓA CỨNG. Mọi nội dung PHẢI tuân theo.`);
    
    // FORBIDDEN TERMS - Absolute lock
    if (mergedRules.forbidden_terms.length > 0) {
      parts.push(`\n### ⛔ TỪ CẤM TUYỆT ĐỐI (Industry-level)`);
      parts.push(`Các từ sau KHÔNG BAO GIỜ được dùng - không rewrite, không từ đồng nghĩa:`);
      parts.push(mergedRules.forbidden_terms.join(", "));
    }
    
    // COMPLIANCE RULES - Industry law
    if (mergedRules.compliance_rules.length > 0) {
      parts.push(`\n### 📜 QUY TẮC TUÂN THỦ NGÀNH`);
      mergedRules.compliance_rules.forEach((rule, i) => {
        parts.push(`${i + 1}. ${rule}`);
      });
    }
    
    // CLAIM RESTRICTIONS
    if (mergedRules.claim_restrictions.length > 0) {
      parts.push(`\n### ⚠️ HẠN CHẾ TUYÊN BỐ`);
      mergedRules.claim_restrictions.forEach((claim) => {
        parts.push(`- KHÔNG ĐƯỢC: ${claim}`);
      });
    }
    
    // ARGUMENT PATTERNS (if available)
    if (industryMemory?.argument_patterns) {
      const { valid_patterns, forbidden_patterns } = industryMemory.argument_patterns;
      
      if (valid_patterns && valid_patterns.length > 0) {
        parts.push(`\n### ✅ CẤU TRÚC LẬP LUẬN ĐƯỢC PHÉP`);
        parts.push(`AI CHỈ ĐƯỢC lập luận theo các mẫu sau:`);
        valid_patterns.forEach(p => parts.push(`- ${p}`));
      }
      
      if (forbidden_patterns && forbidden_patterns.length > 0) {
        parts.push(`\n### ❌ CẤU TRÚC LẬP LUẬN CẤM`);
        forbidden_patterns.forEach(p => parts.push(`- KHÔNG ĐƯỢC: ${p}`));
      }
    }
    
    parts.push(`\n### NGUYÊN TẮC INDUSTRY MEMORY`);
    parts.push(`1. Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn`);
    parts.push(`2. Không được "sáng tạo" từ nằm trong danh sách cấm`);
    parts.push(`3. Brand Voice có thể thay đổi tone, nhưng KHÔNG được vi phạm compliance`);
    parts.push(`4. Nếu user yêu cầu vi phạm → từ chối mềm + giải thích trung lập`);
  }
  
  parts.push(`\n## BRAND VOICE PROFILE`);
  parts.push(`Brand Voice định hướng giọng văn. Mọi nội dung PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  if (tones.length > 0) {
    const toneLabels = tones.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice: ${toneLabels}`);
  }
  
  const formality = mergedRules?.formality_level || voice.formality_level;
  if (formality) {
    const label = formalityLevelLabels[formality] || formality;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  const styles = mergedRules?.language_style || voice.language_style || [];
  if (styles.length > 0) {
    const styleLabels = styles.map(s => languageStyleLabels[s] || s).join(", ");
    parts.push(`\n### Phong cách ngôn ngữ: ${styleLabels}`);
  }
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE BẮT BUỘC`);
  parts.push(`1. Brand Voice OVERRIDE mọi style khác`);
  parts.push(`2. Không được "sáng tạo giọng mới"`);
  parts.push(`3. Không thay đổi giọng giữa các kênh`);
  parts.push(`4. Nếu yêu cầu MÂU THUẪN với Brand Voice → ƯU TIÊN Brand Voice`);
  parts.push(`5. KHÔNG thông báo hay giải thích về Brand Voice trong output`);
  
  const preferredWords = mergedRules?.preferred_words || voice.preferred_words || [];
  if (preferredWords.length > 0) {
    parts.push(`\n### TỪ PHẢI DÙNG (ưu tiên sử dụng)`);
    parts.push(preferredWords.join(", "));
  }
  
  const forbiddenWords = mergedRules?.forbidden_words || voice.forbidden_words || [];
  if (forbiddenWords.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG)`);
    parts.push(forbiddenWords.join(", "));
  }
  
  const allowEmoji = mergedRules?.allow_emoji ?? voice.allow_emoji ?? true;
  parts.push(`\n### EMOJI`);
  if (allowEmoji) {
    parts.push(`Có thể dùng emoji TIẾT CHẾ theo từng kênh (Website/Google Maps/Zalo OA/Telegram: KHÔNG emoji)`);
  } else {
    parts.push(`TUYỆT ĐỐI KHÔNG dùng emoji trong bất kỳ kênh nào`);
  }
  
  // Brand-level compliance rules (if no Industry Memory)
  if (!mergedRules && voice.compliance_rules && voice.compliance_rules.length > 0) {
    parts.push(`\n### QUY TẮC TUÂN THỦ`);
    voice.compliance_rules.forEach(rule => {
      parts.push(`- ${rule}`);
    });
  }
  
  return parts.join("\n");
};

// ============================================
// CHANNEL SETTINGS ENGINE - Chi tiết rules cho từng kênh
// Brand Voice là LUẬT NỀN, Channel Settings là LUẬT TRIỂN KHAI
// ============================================

interface ChannelSettings {
  min_length?: number;
  max_length: number;
  length_unit: 'words' | 'chars';
  hook_required: boolean;
  hook_style?: string;
  bullet_allowed: boolean;
  cta_policy: 'required' | 'optional' | 'soft' | 'none';
  has_subject_line?: boolean;
  emoji_allowed: boolean;
  emoji_limit?: number;
  hashtag_limit: number;
  hashtag_position?: 'none' | 'end' | 'inline';
  line_break_style: 'many' | 'short' | 'normal' | 'minimal';
  link_position: 'body' | 'end' | 'allowed' | 'none';
  format_description?: string;
  // SEO-specific settings (for website)
  seo_optimized?: boolean;
  heading_structure_required?: boolean;
  featured_snippet_format?: boolean;
}

// Partial override type
type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position'
>>;

type ChannelOverrides = Record<string, ChannelOverride> | null;

const DEFAULT_CHANNEL_SETTINGS: Record<string, ChannelSettings> = {
  website: {
    min_length: 800,
    max_length: 2000,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: '⚠️ BÀI DÀI 800-2000 TỪ: H1 title, Intro 50-100 words, 4-6 H2 sections (mỗi section 150-300 words), Conclusion với CTA. PHẢI viết ĐẦY ĐỦ tất cả sections.',
    // SEO-specific settings
    seo_optimized: true,
    heading_structure_required: true,
    featured_snippet_format: true,
  },
  facebook: {
    min_length: 120,
    max_length: 300,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'BẮT BUỘC 2 dòng đầu là hook mạnh (câu sốc, số liệu, câu hỏi) + emoji thu hút (🎯⚡💡🔥)',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'short',
    link_position: 'body',
    format_description: `BẮT BUỘC RICH TEXT FORMAT:
• Hook: Emoji + **text đậm** (VD: 🎯 **5 sai lầm phổ biến...**)
• Body: Dùng emoji làm bullet (✅ 💡 ⚡ 📌 ➡️), **in đậm** keywords
• Chia đoạn ngắn 2-3 dòng, xuống dòng nhiều
• CTA cuối: emoji + **text đậm** (VD: ➡️ **Liên hệ ngay**)
• KHÔNG viết plain text không format`,
  },
  instagram: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'Hook ngắn gọn + emoji thu hút (🔥✨💫)',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'many',
    link_position: 'none',
    format_description: `BẮT BUỘC RICH TEXT FORMAT:
• Hook: Emoji thu hút + text mạnh (🔥✨💫)
• Body: Nhiều xuống dòng, mỗi dòng 1 ý ngắn
• Dùng emoji làm điểm nhấn (không quá 5)
• KHÔNG hashtag trong body - tách riêng cuối bài
• Kết thúc bằng CTA nhẹ + emoji (💬 Comment...)
• KHÔNG viết dạng đoạn văn dài liền mạch`,
  },
  twitter: {
    min_length: 0,
    max_length: 280,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'Quan điểm sắc nét ngay câu đầu, gây tò mò',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 1,
    hashtag_position: 'end',
    line_break_style: 'minimal',
    link_position: 'allowed',
    format_description: `THREAD FORMAT BẮT BUỘC:
• Tweet 1/: Hook sắc nét, gây tò mò mạnh
• Mỗi tweet đánh số (1/, 2/, 3/...)
• Tối đa 280 ký tự/tweet - câu ngắn, ý rõ
• KHÔNG emoji (giữ tone nghiêm túc)
• Tweet cuối: CTA follow hoặc retweet
• Tổng 5-7 tweets cho thread hoàn chỉnh`,
  },
  google_maps: {
    min_length: 80,
    max_length: 150,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'none',
    format_description: 'Thực tế, xác thực, khách quan, như đánh giá chuyên nghiệp',
  },
  linkedin: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'Insight/số liệu thú vị (không giật tít rẻ tiền)',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: true,
    emoji_limit: 2,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: `BẮT BUỘC PROFESSIONAL FORMAT:
• Hook: Insight/số liệu thú vị (không giật tít)
• Body: Chia đoạn rõ ràng, mỗi đoạn 2-3 dòng
• Bullets: Dùng → hoặc • cho điểm chính
• Keywords: **In đậm** các insight quan trọng
• Emoji: Tiết chế (1-2 cho professional 🎯💡)
• CTA mềm cuối bài + 3 hashtag chuyên ngành`,
  },
  email: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: false,
    bullet_allowed: true,
    cta_policy: 'required',
    has_subject_line: true,
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: `EMAIL MARKETING FORMAT BẮT BUỘC:
• Subject: Hấp dẫn, KHÔNG spam trigger (free, !!!, CAPS)
• Opening: Personalized greeting
• Body: Đoạn ngắn 2-3 câu, scannable
• Bullets cho benefits: ✓ hoặc •
• CTA: **Button-style text** rõ ràng
• P.S. line optional cho urgency`,
  },
  youtube: {
    min_length: 500,
    max_length: 800,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'Hook 5 giây đầu gây shock/tò mò (câu hỏi/số liệu)',
    bullet_allowed: true,
    cta_policy: 'required',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: `SCRIPT FORMAT CHI TIẾT BẮT BUỘC:
• HOOK (0-5s): Câu hỏi/số liệu gây shock
• INTRO (5-15s): Giới thiệu vấn đề + promise
• CONTENT: Chia thành 3-5 segments, mỗi segment có heading
• Dùng emoji 🎯💡⚡ làm bullet cho từng point
• **In đậm** các keywords quan trọng
• CTA: Subscribe + Like + Comment reminder
• OUTRO: Tóm tắt + teaser video tiếp`,
  },
  zalo_oa: {
    min_length: 60,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'Trực diện, không giật tít',
    bullet_allowed: false,
    cta_policy: 'required',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'short',
    link_position: 'allowed',
    format_description: `MOBILE-FIRST FORMAT BẮT BUỘC:
• Hook: Trực diện, không giật tít
• Body: Đoạn ngắn 2-3 dòng, dễ đọc trên mobile
• KHÔNG emoji (phong cách formal)
• CTA rõ ràng với link action
• Tone: Thân thiện, local, chuyên nghiệp`,
  },
  telegram: {
    min_length: 100,
    max_length: 500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'Thông tin giá trị ngay từ đầu',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: `COMMUNITY FORMAT BẮT BUỘC:
• Hook: Thông tin giá trị ngay từ đầu
• Body: Bullets rõ ràng (• hoặc -)
• Chia sections với heading nếu dài
• KHÔNG emoji (technical/serious tone)
• Link cho phép trong body
• CTA: Join channel/Share nếu phù hợp`,
  },
};

// ============================================
// ADAPTIVE FORMAT DESCRIPTION - Thích ứng theo brandAllowEmoji
// Khi brand cấm emoji → dùng ký hiệu (✓ → • ★) + bold
// Khi brand cho emoji → dùng emoji như thường
// ============================================
function getAdaptiveFormatDescription(channel: string, brandAllowEmoji: boolean): string {
  // Format mặc định cho các kênh không có emoji mode
  const noEmojiChannels = ['website', 'google_maps', 'email', 'zalo_oa', 'telegram', 'twitter'];
  
  if (noEmojiChannels.includes(channel)) {
    // Các kênh này vốn không dùng emoji, giữ nguyên format gốc
    return DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
  }
  
  // Adaptive format cho các kênh social có emoji
  if (!brandAllowEmoji) {
    // NO-EMOJI MODE: Dùng ký hiệu thay emoji
    switch (channel) {
      case 'facebook':
        return `BẮT BUỘC RICH TEXT FORMAT (KHÔNG EMOJI):
• Hook: ★ **[Câu hook mạnh]** - dùng ký hiệu ★ hoặc → thay emoji
• Body: Dùng bullets ✓ hoặc → cho điểm chính, **in đậm** keywords
• Chia đoạn ngắn 2-3 dòng, xuống dòng nhiều
• CTA cuối: → **Liên hệ ngay** (dùng ký hiệu, không emoji)
• TUYỆT ĐỐI KHÔNG dùng emoji (🎯❌💡⚡ đều cấm)
• VẪN PHẢI có bullets và bold formatting`;
      
      case 'instagram':
        return `BẮT BUỘC RICH TEXT FORMAT (KHÔNG EMOJI):
• Hook: ★ **[Text mạnh]** - dùng ký hiệu thay emoji
• Body: Nhiều xuống dòng, mỗi dòng 1 ý ngắn
• Dùng → hoặc • làm điểm nhấn thay emoji
• KHÔNG hashtag trong body - tách riêng cuối bài
• CTA nhẹ: → Comment ý kiến của bạn
• TUYỆT ĐỐI KHÔNG emoji - VẪN PHẢI có bullets`;
      
      case 'linkedin':
        return `BẮT BUỘC PROFESSIONAL FORMAT (KHÔNG EMOJI):
• Hook: Insight/số liệu thú vị (không giật tít)
• Body: Chia đoạn rõ ràng, mỗi đoạn 2-3 dòng
• Bullets: Dùng → hoặc • cho điểm chính
• Keywords: **In đậm** các insight quan trọng
• KHÔNG emoji (giữ professional tone)
• CTA mềm cuối bài + 3 hashtag chuyên ngành`;
      
      case 'youtube':
        return `SCRIPT FORMAT CHI TIẾT (KHÔNG EMOJI):
• HOOK (0-5s): Câu hỏi/số liệu gây shock
• INTRO (5-15s): Giới thiệu vấn đề + promise
• CONTENT: Chia thành 3-5 segments, mỗi segment có heading
• Dùng → hoặc • làm bullet cho từng point
• **In đậm** các keywords quan trọng
• CTA: Subscribe + Like + Comment reminder
• OUTRO: Tóm tắt + teaser video tiếp`;
      
      case 'tiktok':
        return `SHORT-FORM SCRIPT FORMAT (KHÔNG EMOJI):
• Hook 3s đầu: Gây tò mò NGAY - dùng ★ hoặc → thay emoji
• Body: 3-5 điểm chính, mỗi điểm 1 dòng
• Dùng → hoặc • làm bullet
• **In đậm** từ khóa action
• CTA cuối: → Follow + Share
• Tone: Nhanh, trẻ, năng lượng cao`;
      
      case 'threads':
        return `CONVERSATIONAL FORMAT (KHÔNG EMOJI):
• Hook: Quan điểm cá nhân rõ ràng
• Body: 2-3 đoạn ngắn, giọng trò chuyện
• Dùng → cho emphasis thay emoji
• Kết: Câu hỏi mở để tạo discussion
• KHÔNG hashtag, KHÔNG link trong body`;
      
      default:
        return DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
    }
  } else {
    // EMOJI MODE: Giữ nguyên format có emoji
    switch (channel) {
      case 'facebook':
        return `BẮT BUỘC RICH TEXT FORMAT:
• Hook: Emoji + **text đậm** (VD: 🎯 **5 sai lầm phổ biến...**)
• Body: Dùng emoji làm bullet (✅ 💡 ⚡ 📌 ➡️), **in đậm** keywords
• Chia đoạn ngắn 2-3 dòng, xuống dòng nhiều
• CTA cuối: emoji + **text đậm** (VD: ➡️ **Liên hệ ngay**)
• KHÔNG viết plain text không format`;
      
      case 'instagram':
        return `BẮT BUỘC RICH TEXT FORMAT:
• Hook: Emoji thu hút + text mạnh (🔥✨💫)
• Body: Nhiều xuống dòng, mỗi dòng 1 ý ngắn
• Dùng emoji làm điểm nhấn (không quá 5)
• KHÔNG hashtag trong body - tách riêng cuối bài
• Kết thúc bằng CTA nhẹ + emoji (💬 Comment...)
• KHÔNG viết dạng đoạn văn dài liền mạch`;
      
      case 'linkedin':
        return `BẮT BUỘC PROFESSIONAL FORMAT:
• Hook: Insight/số liệu thú vị (không giật tít)
• Body: Chia đoạn rõ ràng, mỗi đoạn 2-3 dòng
• Bullets: Dùng → hoặc • cho điểm chính
• Keywords: **In đậm** các insight quan trọng
• Emoji: Tiết chế (1-2 cho professional 🎯💡)
• CTA mềm cuối bài + 3 hashtag chuyên ngành`;
      
      case 'youtube':
        return `SCRIPT FORMAT CHI TIẾT BẮT BUỘC:
• HOOK (0-5s): Câu hỏi/số liệu gây shock
• INTRO (5-15s): Giới thiệu vấn đề + promise
• CONTENT: Chia thành 3-5 segments, mỗi segment có heading
• Dùng emoji 🎯💡⚡ làm bullet cho từng point
• **In đậm** các keywords quan trọng
• CTA: Subscribe + Like + Comment reminder
• OUTRO: Tóm tắt + teaser video tiếp`;
      
      case 'tiktok':
        return `SHORT-FORM SCRIPT FORMAT:
• Hook 3s đầu: Gây tò mò NGAY (❓🔥💥)
• Body: 3-5 điểm chính, mỗi điểm 1 dòng
• Dùng emoji làm bullet (✅ ❌ 💡 ⚡)
• **In đậm** từ khóa action
• CTA cuối: Follow + Share (📲)
• Tone: Nhanh, trẻ, năng lượng cao`;
      
      case 'threads':
        return `CONVERSATIONAL FORMAT:
• Hook: Quan điểm cá nhân rõ ràng
• Body: 2-3 đoạn ngắn, giọng trò chuyện
• Emoji: Tiết chế (1-2 phù hợp ngữ cảnh)
• Kết: Câu hỏi mở để tạo discussion
• KHÔNG hashtag, KHÔNG link trong body`;
      
      default:
        return DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
    }
  }
}

// Build chi tiết rules prompt cho AI từ settings
function buildChannelRulesPrompt(
  channel: string,
  settings: ChannelSettings,
  brandAllowEmoji: boolean
): string {
  const parts: string[] = [];
  
  // Channel name
  parts.push(`### ${channel.toUpperCase()}`);
  
  // Length
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  if (settings.min_length) {
    parts.push(`- Độ dài: ${settings.min_length}–${settings.max_length} ${lengthLabel}`);
  } else {
    parts.push(`- Độ dài: Tối đa ${settings.max_length} ${lengthLabel}`);
  }
  
  // Hook - adaptive based on emoji mode
  if (settings.hook_required) {
    if (!brandAllowEmoji && ['facebook', 'instagram', 'tiktok', 'youtube'].includes(channel)) {
      parts.push(`- Hook: BẮT BUỘC dùng ký hiệu (★ →) + **bold** thay emoji`);
    } else {
      parts.push(`- Hook: ${settings.hook_style || 'BẮT BUỘC'}`);
    }
  } else {
    parts.push(`- Hook: ${settings.hook_style || 'Không bắt buộc'}`);
  }
  
  // CTA
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc, rõ ràng',
    soft: 'Có nhưng mềm, không bán',
    optional: 'Tuỳ chọn',
    none: 'Không có CTA bán hàng',
  };
  parts.push(`- CTA: ${ctaLabels[settings.cta_policy] || settings.cta_policy}`);
  
  // Emoji - Brand Voice overrides
  if (!brandAllowEmoji) {
    parts.push(`- Emoji: TUYỆT ĐỐI KHÔNG (Brand Voice) - dùng ký hiệu ✓ → • ★ thay thế`);
  } else if (settings.emoji_allowed) {
    parts.push(`- Emoji: Cho phép, tối đa ${settings.emoji_limit || 3}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
  }
  
  // Bullets requirement - always require for social channels
  if (['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'].includes(channel)) {
    parts.push(`- Bullets: BẮT BUỘC có bullets/điểm nhấn (${brandAllowEmoji ? 'emoji hoặc ký hiệu' : 'ký hiệu ✓ → •'})`);
    parts.push(`- Bold: BẮT BUỘC **in đậm** hook + keywords + CTA`);
  }
  
  // Hashtag
  if (settings.hashtag_limit > 0) {
    const posLabel = settings.hashtag_position === 'end' ? 'cuối bài' : 'trong bài';
    parts.push(`- Hashtag: Tối đa ${settings.hashtag_limit}, đặt ${posLabel}`);
  } else {
    parts.push(`- Hashtag: KHÔNG`);
  }
  
  // Link
  const linkLabels: Record<string, string> = {
    body: 'Cho phép trong bài',
    end: 'Cuối bài',
    allowed: 'Có thể',
    none: 'KHÔNG link',
  };
  parts.push(`- Link: ${linkLabels[settings.link_position] || settings.link_position}`);
  
  // Adaptive format description based on emoji mode
  const adaptiveFormat = getAdaptiveFormatDescription(channel, brandAllowEmoji);
  if (adaptiveFormat) {
    parts.push(`- Format: ${adaptiveFormat}`);
  }
  
  // Subject line for email
  if (settings.has_subject_line) {
    parts.push(`- Bao gồm Subject line hấp dẫn (không spam trigger)`);
  }
  
  return parts.join('\n');
}

// Helper: Merge default settings with brand overrides
function mergeChannelSettings(channel: string, overrides: ChannelOverrides): ChannelSettings {
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  if (!defaults) return DEFAULT_CHANNEL_SETTINGS.facebook; // Fallback
  if (!overrides || !overrides[channel]) return defaults;
  
  const override = overrides[channel];
  return {
    ...defaults,
    max_length: override.max_length ?? defaults.max_length,
    min_length: override.min_length ?? defaults.min_length,
    hook_required: override.hook_required ?? defaults.hook_required,
    cta_policy: override.cta_policy ?? defaults.cta_policy,
    emoji_allowed: override.emoji_allowed ?? defaults.emoji_allowed,
    emoji_limit: override.emoji_limit ?? defaults.emoji_limit,
    hashtag_limit: override.hashtag_limit ?? defaults.hashtag_limit,
    link_position: override.link_position ?? defaults.link_position,
  };
}

// Cache for industry target mapping (per-request caching)
let cachedIndustryTargetMap: Map<string, 'B2B' | 'B2C' | 'both'> | null = null;

// Fetch industry target mapping from database with caching
async function fetchIndustryTargetMap(supabase: any): Promise<Map<string, 'B2B' | 'B2C' | 'both'>> {
  // Return cached map if available
  if (cachedIndustryTargetMap) {
    console.log(`Using cached industry target map (${cachedIndustryTargetMap.size} entries)`);
    return cachedIndustryTargetMap;
  }

  const targetMap = new Map<string, 'B2B' | 'B2C' | 'both'>();
  
  try {
    // Fetch all industry templates with their translations
    const { data: templates, error } = await supabase
      .from('industry_templates')
      .select(`
        code,
        target_audience,
        industry_template_translations(name, language_code)
      `)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching industry templates:', error);
      return targetMap;
    }
    
    if (templates) {
      for (const template of templates) {
        const target = template.target_audience as 'B2B' | 'B2C' | 'both';
        
        // Map by code
        targetMap.set(template.code, target);
        
        // Map by translated names
        const translations = template.industry_template_translations as { name: string; language_code: string }[] | null;
        if (translations) {
          for (const trans of translations) {
            targetMap.set(trans.name, target);
          }
        }
      }
    }
    
    console.log(`Loaded ${targetMap.size} industry target mappings from database`);
    
    // Cache the result
    cachedIndustryTargetMap = targetMap;
  } catch (err) {
    console.error('Failed to fetch industry target map:', err);
  }
  
  return targetMap;
}

// Clear cache (call at start of each request)
function clearIndustryTargetCache() {
  cachedIndustryTargetMap = null;
}

// Detect target audience from industry names using database mapping
async function detectTargetAudience(
  industries: string[],
  supabase: any
): Promise<'B2B' | 'B2C' | 'both'> {
  if (!industries || industries.length === 0) return 'B2B';
  
  const industryTargetMap = await fetchIndustryTargetMap(supabase);
  
  let b2bCount = 0;
  let b2cCount = 0;
  let bothCount = 0;
  
  for (const industry of industries) {
    const target = industryTargetMap.get(industry);
    if (target === 'B2B') b2bCount++;
    else if (target === 'B2C') b2cCount++;
    else if (target === 'both') bothCount++;
    else b2bCount++; // Default to B2B for unknown industries
  }
  
  if (b2bCount > b2cCount && b2bCount > bothCount) return 'B2B';
  if (b2cCount > b2bCount && b2cCount > bothCount) return 'B2C';
  return 'both';
}

const getSystemPrompt = (
  brandName: string, 
  brandGuideline: string | null,
  primaryColor: string | null,
  contentGoal: string,
  contentAngle: string | undefined,
  channels: string[],
  targetAudience: 'B2B' | 'B2C' | 'both',
  brandVoice?: BrandVoice,
  channelOverrides?: ChannelOverrides,
  mergedRules?: MergedRules,
  industryMemory?: IndustryMemory | null,
  extendedBrandContext?: ExtendedBrandContext | null
): string => {
  const goalDescriptions: Record<string, string> = {
    education: "Giáo dục - Chia sẻ kiến thức chuyên sâu, hướng dẫn thực hành. Tone: Chuyên gia, rõ ràng, có giá trị.",
    awareness: "Nhận diện - Tăng nhận biết thương hiệu. Tone: Ấn tượng, đáng nhớ, consistent brand voice.",
    engagement: "Tương tác - Khuyến khích bình luận, chia sẻ. Tone: Gần gũi, đặt câu hỏi, tạo tranh luận.",
    expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu. Tone: Chuyên nghiệp, có insight, data-driven.",
    conversion: "Chuyển đổi - Thúc đẩy hành động. Tone: Thuyết phục, urgency nhẹ, clear CTA.",
  };

  // Content Angle descriptions - how to approach the content
  const angleDescriptions: Record<string, string> = {
    educational: "Kiến thức - Focus chia sẻ tips, hướng dẫn, thông tin hữu ích. Tone giáo dục, có giá trị thực.",
    storytelling: "Kể chuyện - Narrative flow, cảm xúc, câu chuyện thực. Tạo kết nối cảm xúc với người đọc.",
    promotional: "Quảng cáo - CTA mạnh, urgency, ưu đãi rõ ràng. Thúc đẩy hành động ngay.",
    social_proof: "Social Proof - Đánh giá, testimonial, case study. Tăng độ tin cậy qua bằng chứng thực.",
    behind_the_scenes: "Hậu trường - Quy trình, đội ngũ, behind-the-scenes. Tạo kết nối gần gũi, authentic.",
    qa_faq: "Q&A - Giải đáp thắc mắc, FAQ phổ biến. Giúp người đọc hiểu rõ, giải quyết objections.",
  };

  const brandAllowEmoji = brandVoice?.allow_emoji ?? true;
  
  // Build channel rules using the new settings engine with overrides
  const selectedChannelRules = channels
    .map(ch => {
      const settings = mergeChannelSettings(ch, channelOverrides || null);
      return buildChannelRulesPrompt(ch, settings, brandAllowEmoji);
    })
    .filter(Boolean)
    .join("\n\n");

  // Build Brand Voice section if available (now with industryMemory for system_rules & argument_patterns)
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules, industryMemory) : "";
  
  // Target audience description
  const audienceDescription = targetAudience === 'B2B' 
    ? 'doanh nghiệp (B2B)' 
    : targetAudience === 'B2C' 
      ? 'người tiêu dùng (B2C)' 
      : 'cả doanh nghiệp và người tiêu dùng (B2B & B2C)';

  // Build Extended Brand Context section
  const extendedBrandSection = extendedBrandContext ? buildExtendedBrandPrompt(extendedBrandContext) : "";
  const productTargetingSection = extendedBrandContext && (extendedBrandContext as any).productPersonaTargeting 
    ? (extendedBrandContext as any).productPersonaTargeting 
    : "";

  // Build Content Angle section
  const contentAngleSection = contentAngle 
    ? `## GÓC TIẾP CẬN NỘI DUNG (Content Angle)
${angleDescriptions[contentAngle] || contentAngle}

ÁP DỤNG GÓC TIẾP CẬN:
- Mọi nội dung PHẢI thể hiện góc tiếp cận "${contentAngle}" xuyên suốt
- Cách mở đầu, triển khai, kết thúc phải phù hợp với góc tiếp cận
- Tone và cách diễn đạt phải nhất quán với góc tiếp cận đã chọn`
    : "";

  return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - hệ thống AI tạo NỘI DUNG ĐA KÊNH cho ${audienceDescription}.

${brandVoiceSection}

${extendedBrandSection}

${productTargetingSection}

## NGUYÊN TẮC LÕI
ONE TOPIC → ONE CORE MESSAGE → MULTI-CHANNEL CONTENT
- Từ MỘT chủ đề, tạo nội dung PHÙ HỢP RIÊNG cho từng kênh
- Nội dung dùng được NGAY để đăng thật
- KHÔNG sao chép máy móc giữa các kênh
- Giữ thông điệp lõi NHẤT QUÁN

## 📝 ĐỊNH DẠNG RICH TEXT (BẮT BUỘC)
Mọi nội dung PHẢI sử dụng rich text formatting để tăng tính trực quan và dễ đọc:

### 1. ICONS/EMOJI (trừ các kênh cấm):
- Dùng emoji làm bullet points thay vì gạch đầu dòng: ✅ 🎯 💡 ⚡ 🔥 📌 ➡️ 📊 💼 🚀
- Mỗi section có icon đại diện phù hợp với nội dung
- Emoji phải liên quan đến context, không ngẫu nhiên
- Hook mở đầu nên có emoji thu hút: 🎯 ⚡ 💡

### 2. MARKDOWN FORMATTING:
- **In đậm** cho: keywords quan trọng, brand name, số liệu, CTA
- *In nghiêng* cho emphasis nhẹ, quote, highlight
- Bullet points có cấu trúc rõ ràng với emoji prefix
- Chia section bằng line breaks để dễ đọc

### 3. CẤU TRÚC VISUAL:
- Hook mở đầu: emoji + **text đậm** gây chú ý
- Nội dung chính: bullet points với emoji khác nhau
- CTA cuối: emoji hành động (➡️ 🔗 📞 💬) + **in đậm**

### VÍ DỤ FORMAT CHUẨN:
"""
🎯 **5 sai lầm phổ biến khi quản lý kế toán DN**

Bạn đang gặp khó khăn với sổ sách? Đây là những lỗi thường gặp:

✅ **Không phân loại chi phí** - Khó kiểm soát dòng tiền
💡 **Thiếu backup dữ liệu** - Rủi ro mất mát cao
⚡ **Chậm cập nhật hóa đơn** - Ảnh hưởng thuế GTGT
📊 **Không đối soát định kỳ** - Sai lệch số liệu tích lũy

➡️ **Liên hệ ngay** để được tư vấn miễn phí!
"""

### KÊNH KHÔNG DÙNG RICH TEXT:
- Google Maps: Plain text, không emoji, không markdown
- Zalo OA: Plain text thân thiện, không emoji
- Email: Minimal markdown, không emoji
- Telegram: Có thể dùng markdown, không emoji

## BRAND CONTEXT
Brand name: ${brandName}
Đối tượng mục tiêu: ${audienceDescription}
${brandGuideline ? `Brand guideline: ${brandGuideline}` : ""}
${primaryColor ? `Màu chủ đạo: ${primaryColor}` : ""}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[contentGoal] || contentGoal}

${contentAngleSection}

## MARKETING FRAMEWORK (nếu có)
Nếu user chọn framework, cấu trúc nội dung PHẢI theo framework đó:
- PAS: Problem → Agitate → Solution
- AIDA: Attention → Interest → Desire → Action
- FAB: Features → Advantages → Benefits
- 4U: Useful → Urgent → Unique → Ultra-specific
- STAR: Situation → Task → Action → Result
- BAB: Before → After → Bridge

## QUY ƯỚC THEO TỪNG KÊNH (SOCIAL CHANNEL SETTINGS)
Brand Voice là LUẬT NỀN. Channel Settings là LUẬT TRIỂN KHAI.
Không được để Channel Settings phá Brand Voice.

${selectedChannelRules}

## 🔍 SEO OPTIMIZATION RULES (CHỈ ÁP DỤNG CHO WEBSITE)
Khi tạo nội dung cho WEBSITE, BẮT BUỘC tuân thủ các quy tắc SEO sau:

### Cấu trúc bài viết chuẩn SEO:
1. **SEO Title**: 50-60 ký tự, chứa focus keyword ở đầu, hấp dẫn click
2. **Meta Description**: 150-160 ký tự, chứa keyword, có CTA nhẹ
3. **Intro paragraph** (50-100 words): Hook reader, chứa focus keyword trong câu đầu
4. **Body sections**: Mỗi H2 có 150-300 words, H3 nếu cần chia nhỏ
5. **Featured Snippet Box**: Đoạn tóm tắt 40-60 words trả lời câu hỏi chính
6. **Conclusion**: Tóm tắt + CTA mềm

### Heading Optimization:
- **H1**: Chứa focus keyword, 50-70 ký tự, hấp dẫn (khác SEO title)
- **H2**: Mỗi bài 4-6 H2, chứa secondary keywords, format: ## Heading
- **H3**: Dùng để chia nhỏ H2 phức tạp, format: ### Heading

### On-Page SEO:
- Focus keyword: Xuất hiện trong H1, intro, 1-2 H2, conclusion (TỰ NHIÊN, không spam)
- Keyword density: 1-2% (tính trên tổng words)
- LSI keywords: Sử dụng từ liên quan ngữ nghĩa
- Internal link anchors: Gợi ý 2-3 anchor text để link nội bộ
- Slug: Ngắn gọn, chứa keyword, không dấu, lowercase

### Featured Snippet Optimization:
- Paragraph snippet: Câu trả lời trực tiếp 40-60 words
- List snippet: Bullet points 5-8 items (nếu phù hợp)
- Trả lời câu hỏi "Làm sao", "Là gì", "Tại sao" ngay đầu section

### Open Graph Tags (ADVANCED):
- OG Title: 60-90 ký tự, hấp dẫn hơn SEO title, có thể dùng emoji nếu phù hợp
- OG Description: 150-200 ký tự, tạo curiosity, có CTA mềm

### SEO Score Calculation (PHẢI tự tính và trả về seo_score_estimate):
Tính điểm SEO dựa trên các tiêu chí sau (tổng 100 điểm):
- Title length (50-60 chars): 15 điểm
- Meta description (150-160 chars): 15 điểm
- Focus keyword có trong title: 15 điểm
- Focus keyword có trong H1: 10 điểm
- Focus keyword trong 100 từ đầu: 10 điểm
- Số H2 (4-6): 10 điểm
- Word count (1000-2000): 10 điểm
- Featured snippet provided: 10 điểm
- Internal link anchors (2-3): 5 điểm
→ Trả về seo_score_estimate dựa trên tính toán này

### FAQ Extraction (nếu content có dạng Q&A hoặc liệt kê câu hỏi):
- Extract 2-4 câu FAQ tự nhiên từ nội dung
- Mỗi FAQ: question (câu hỏi tự nhiên) + answer (50-100 words trả lời súc tích)
- Dùng để tạo FAQ Schema Markup

### Readability:
- Sentence length: Trung bình 15-20 words
- Paragraph length: 2-4 câu
- Transition words: "Ngoài ra", "Bên cạnh đó", "Cụ thể", "Quan trọng hơn"
- Active voice > 80%

## ⚠️ QUAN TRỌNG: WEBSITE CONTENT FORMAT
Khi tạo nội dung cho channel WEBSITE:
- Content PHẢI là pure Markdown syntax
- TUYỆT ĐỐI KHÔNG dùng HTML tags (<h1>, <h2>, <p>, <strong>, <ul>, <li>, etc.)
- Chỉ dùng: # ## ### **bold** *italic* - list > quote [link](url)
- Nếu output HTML, content sẽ KHÔNG RENDER được trên website mockup

## KIỂM TRA CUỐI (BẮT BUỘC)
Trước khi xuất nội dung, tự kiểm tra:
- Có vượt max length không? → TỰ RÚT GỌN, giữ ý chính
- Có vi phạm emoji / hashtag không? → TỰ ĐIỀU CHỈNH
- Có CTA sai quy định không? → TỰ SỬA
- Có format sai nền tảng không? → TỰ ĐIỀU CHỈNH
- Có sử dụng rich text (emoji, bold) đúng cách không? → TỰ ĐIỀU CHỈNH
- WEBSITE content có phải pure Markdown không? → TỰ CHUYỂN ĐỔI nếu có HTML

## NGUYÊN TẮC BẮT BUỘC
1. KHÔNG dùng chung một bài cho mọi kênh
2. KHÔNG copy nguyên văn giữa các kênh
3. Mỗi kênh phải đúng hành vi người đọc, đúng giới hạn kỹ thuật
4. Giữ thông điệp lõi NHẤT QUÁN xuyên suốt
5. Giọng văn: Chuyên nghiệp, rõ ràng, không quảng cáo lộ liễu, phù hợp ${audienceDescription}
6. SỬ DỤNG RICH TEXT: emoji bullets, **bold** keywords, visual structure

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung
- Không thêm kênh không được yêu cầu
- Không dùng emoji cho Website, Google Maps, Zalo OA, Email, Telegram${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji ở BẤT KỲ kênh nào (Brand Voice yêu cầu)" : ""}
- Không lặp lại câu chữ giữa các kênh
- Không hiển thị cài đặt
- Không giải thích logic xử lý`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: FormData = await req.json();
    console.log("Generating multi-channel content for:", formData.topic);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    
    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        // Use getUser with token directly instead of relying on session
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) {
          console.error("Auth error:", authError.message);
        }
        userId = user?.id || null;
        console.log("User ID from token:", userId);
      } catch (authErr) {
        console.error("Failed to parse auth:", authErr);
      }
    }

    if (!userId) {
      console.error("No valid user found from authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Please login" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization_id: prefer from request body, fallback to query
    let organizationId = formData.organization_id || null;
    
    if (!organizationId) {
      // Fallback: get first org where user is a member
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      organizationId = orgMember?.organization_id || null;
    }
    console.log("Using organization_id:", organizationId, "(from request:", !!formData.organization_id, ")");

    // ============================================
    // PREVIEW MODE HANDLER
    // Ultra-fast path - no DB save, no Self-Critique
    // ============================================
    if (formData.action === 'preview') {
      const previewChannel = formData.previewChannel || formData.channel;
      console.log(`[preview-mode] Generating preview for ${previewChannel}`);
      
      if (!previewChannel || !formData.topic || !formData.contentGoal) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for preview (topic, contentGoal, previewChannel)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch minimal brand template context
      let brandName = "Thương hiệu";
      let brandVoicePrompt = "";
      
      if (formData.brandTemplateId) {
        const { data: template } = await supabase
          .from("brand_templates")
          .select("brand_name, brand_positioning, tone_of_voice, formality_level, preferred_words, forbidden_words")
          .eq("id", formData.brandTemplateId)
          .single();

        if (template) {
          brandName = template.brand_name || "Thương hiệu";
          
          const parts: string[] = [];
          if (template.brand_positioning) {
            parts.push(`Định vị: ${template.brand_positioning}`);
          }
          if (template.tone_of_voice?.length) {
            parts.push(`Tone: ${template.tone_of_voice.join(", ")}`);
          }
          if (template.formality_level) {
            parts.push(`Phong cách: ${template.formality_level}`);
          }
          if (template.preferred_words?.length) {
            parts.push(`Từ ưu tiên: ${template.preferred_words.join(", ")}`);
          }
          if (template.forbidden_words?.length) {
            parts.push(`Từ cấm: ${template.forbidden_words.join(", ")}`);
          }
          brandVoicePrompt = parts.join("\n");
        }
      }

      // Preview-specific constants
      const PREVIEW_GOAL_LABELS: Record<string, string> = {
        education: "Giáo dục - Chia sẻ kiến thức",
        awareness: "Nhận diện - Tăng nhận biết thương hiệu",
        engagement: "Tương tác - Khuyến khích bình luận, chia sẻ",
        expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu",
        conversion: "Chuyển đổi - Thúc đẩy hành động mua hàng",
      };

      const PREVIEW_CHANNEL_LIMITS: Record<string, { min: number; max: number; unit: string }> = {
        website: { min: 300, max: 500, unit: "từ" },
        facebook: { min: 80, max: 150, unit: "từ" },
        instagram: { min: 30, max: 80, unit: "từ" },
        twitter: { min: 0, max: 280, unit: "ký tự" },
        google_maps: { min: 50, max: 100, unit: "từ" },
        linkedin: { min: 100, max: 200, unit: "từ" },
        email: { min: 100, max: 200, unit: "từ" },
        youtube: { min: 100, max: 200, unit: "từ" },
        zalo_oa: { min: 30, max: 80, unit: "từ" },
        telegram: { min: 50, max: 120, unit: "từ" },
        tiktok: { min: 20, max: 60, unit: "từ" },
        threads: { min: 30, max: 100, unit: "từ" },
      };

      const PREVIEW_CHANNEL_LABELS: Record<string, string> = {
        website: "Website/Blog",
        facebook: "Facebook",
        instagram: "Instagram",
        twitter: "X (Twitter)",
        google_maps: "Google Maps",
        linkedin: "LinkedIn",
        email: "Email",
        youtube: "YouTube",
        zalo_oa: "Zalo OA",
        telegram: "Telegram",
        tiktok: "TikTok",
        threads: "Threads",
      };

      const channelLabel = PREVIEW_CHANNEL_LABELS[previewChannel] || previewChannel;
      const channelLimit = PREVIEW_CHANNEL_LIMITS[previewChannel] || { min: 50, max: 150, unit: "từ" };
      const goalLabel = PREVIEW_GOAL_LABELS[formData.contentGoal] || formData.contentGoal;

      const systemPrompt = `Bạn là chuyên gia content marketing tại Việt Nam. 
Viết nội dung PREVIEW ngắn gọn cho kênh ${channelLabel}.

${brandVoicePrompt ? `BRAND VOICE:\n${brandVoicePrompt}\n` : ""}

QUY TẮC:
- Viết ${channelLimit.min}-${channelLimit.max} ${channelLimit.unit}
- Mục tiêu: ${goalLabel}
- Ngôn ngữ: Tiếng Việt tự nhiên
- Phong cách phù hợp với kênh ${channelLabel}
- KHÔNG giải thích, chỉ viết nội dung
- Format phù hợp với kênh (có thể dùng emoji nếu phù hợp)`;

      const userPrompt = `Viết nội dung ${channelLabel} về chủ đề: "${formData.topic}"${formData.industry ? ` trong ngành ${formData.industry}` : ""}.

Tên thương hiệu: ${brandName}
Mục tiêu nội dung: ${goalLabel}`;

      // Single AI call - direct, fast (use fastest model)
      const aiResponse = await callAI({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 1000,
        temperature: 0.7,
      });

      const previewContent = aiResponse.content || "";

      // Return immediately - NO DB save, NO caching
      return new Response(
        JSON.stringify({
          preview: previewContent,
          channel: previewChannel,
          channelLabel,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // EXPAND MODE HANDLER
    // Adds new channels to existing content
    // ============================================
    if (formData.action === 'expand') {
      console.log(`[expand-mode] Expanding content ${formData.contentId} with channels: ${formData.newChannels?.join(', ')}`);
      
      if (!formData.contentId || !formData.newChannels || formData.newChannels.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing contentId or newChannels for expand action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch existing content
      const { data: existingContent, error: fetchError } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .eq('id', formData.contentId)
        .single();

      if (fetchError || !existingContent) {
        console.error('[expand-mode] Content not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate: channels should not already exist
      const existingChannels = existingContent.selected_channels || [];
      const invalidChannels = formData.newChannels.filter(ch => existingChannels.includes(ch));
      if (invalidChannels.length > 0) {
        return new Response(
          JSON.stringify({ error: `Channels already exist: ${invalidChannels.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Override formData with existing content context for consistent generation
      formData.topic = existingContent.topic;
      formData.channels = formData.newChannels;
      formData.brandTemplateId = existingContent.brand_template_id;
      formData.contentGoal = existingContent.content_goal;
      organizationId = existingContent.organization_id;

      // Continue with normal generation flow but with expand context
      // After generation, we'll UPDATE instead of INSERT
      console.log(`[expand-mode] Using context from existing content: topic="${formData.topic}", channels=${formData.channels.join(',')}`);
    }

    // ============================================
    // REGENERATE MODE HANDLER
    // Regenerates content for a single channel (lightweight path)
    // ============================================
    if (formData.action === 'regenerate') {
      console.log(`[regenerate-mode] Regenerating ${formData.channel} for content ${formData.contentId}`);
      
      if (!formData.contentId || !formData.channel) {
        return new Response(
          JSON.stringify({ error: 'Missing contentId or channel for regenerate action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate channel
      if (!CHANNEL_COLUMN_MAP[formData.channel]) {
        return new Response(
          JSON.stringify({ error: `Invalid channel: ${formData.channel}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch existing content
      const { data: existingContent, error: fetchError } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .eq('id', formData.contentId)
        .single();

      if (fetchError || !existingContent) {
        console.error('[regenerate-mode] Content not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Override formData with existing content context
      formData.topic = existingContent.topic;
      formData.channels = [formData.channel]; // Single channel only
      formData.brandTemplateId = existingContent.brand_template_id;
      formData.contentGoal = existingContent.content_goal;
      organizationId = existingContent.organization_id;

      console.log(`[regenerate-mode] Using context: topic="${formData.topic}", channel=${formData.channel}`);
      // Continue to brand loading, then branch to lightweight regenerate path
    }

    // Load brand template if provided
    let brandName = "Thương hiệu";
    let brandGuideline: string | null = null;
    let primaryColor: string | null = null;
    let industry: string | null = formData.industry || null;
    let brandVoice: BrandVoice | undefined;
    let channelOverrides: ChannelOverrides = null;
    let industryArray: string[] = [];
    let industryTemplateId: string | null = null;
    let industryMemory: IndustryMemory | null = null;
    let mergedRules: MergedRules | undefined;
    let extendedBrandContext: ExtendedBrandContext | null = null;

    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        brandName = template.brand_name;
        brandGuideline = template.brand_guideline;
        primaryColor = template.primary_color;
        industryTemplateId = (template as any).industry_template_id || null;
        
        // Use industry from template if not provided in form
        if (!industry && template.industry && Array.isArray(template.industry) && template.industry.length > 0) {
          industry = template.industry.join(', ');
          industryArray = template.industry;
        }
        // Extract Brand Voice
        brandVoice = {
          brand_positioning: template.brand_positioning,
          tone_of_voice: template.tone_of_voice,
          formality_level: template.formality_level,
          language_style: template.language_style,
          preferred_words: template.preferred_words,
          forbidden_words: template.forbidden_words,
          allow_emoji: template.allow_emoji ?? true,
          compliance_rules: template.compliance_rules,
        };
        // Extract Channel Overrides
        channelOverrides = template.channel_overrides || null;
        console.log("Brand Voice loaded:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
        
        // Build Extended Brand Context for enhanced prompts
        extendedBrandContext = {
          brandName: template.brand_name,
          brandPositioning: template.brand_positioning,
          toneOfVoice: template.tone_of_voice,
          preferredWords: template.preferred_words,
          forbiddenWords: template.forbidden_words,
          industry: template.industry,
          formality: template.formality_level,
          languageStyle: template.language_style,
          allowEmoji: template.allow_emoji ?? true,
          contentPillars: template.content_pillars || [],
          // Extended brand identity
          mission: template.mission,
          vision: template.vision,
          uniqueValueProposition: template.unique_value_proposition,
          tagline: template.tagline,
          // Market & Competition
          mainCompetitors: template.main_competitors || [],
          competitiveAdvantages: template.competitive_advantages || [],
          marketSegment: template.market_segment,
          targetAgeRange: template.target_age_range,
          targetGender: template.target_gender,
          targetLocations: template.target_locations || [],
          // Content Guidelines
          brandHashtags: template.brand_hashtags || [],
          signaturePhrases: template.signature_phrases || [],
          ctaTemplates: template.cta_templates || [],
          evergreenThemes: template.evergreen_themes || [],
          // Footer Info for contact details in CTA
          footerInfo: template.footer_info as any || undefined,
        };
        
        // Fetch customer personas for this brand
        const [personasResult, mappingsResult] = await Promise.all([
          supabase
            .from('customer_personas')
            .select('*')
            .eq('brand_template_id', formData.brandTemplateId)
            .order('is_primary', { ascending: false }),
          supabase
            .from('product_persona_mappings')
            .select(`
              product_id, persona_id, relevance_score, is_primary_product,
              custom_pitch, key_benefits, objection_handlers, preferred_content_angles, avoid_topics,
              product:brand_products(id, name, category, unique_selling_points),
              persona:customer_personas(id, name, occupation)
            `)
            .eq('brand_template_id', formData.brandTemplateId)
            .order('relevance_score', { ascending: false })
            .limit(15)
        ]);
        
        if (personasResult.data && personasResult.data.length > 0) {
          const mapPersona = (p: any): CustomerPersona => ({
            name: p.name,
            avatarEmoji: p.avatar_emoji,
            occupation: p.occupation,
            ageRange: p.age_range,
            gender: p.gender,
            painPoints: p.pain_points || [],
            desires: p.desires || [],
            objections: p.objections || [],
            buyingTriggers: p.buying_triggers || [],
            preferredChannels: p.preferred_channels || [],
            typicalFunnelStage: p.typical_funnel_stage,
            isPrimary: p.is_primary,
            // Enhanced fields
            deviceUsage: p.device_usage,
            techSavviness: p.tech_savviness,
            buyingMotivation: p.buying_motivation || [],
            communicationStyle: p.communication_style,
            priorityScore: p.priority_score,
            journeyMap: p.journey_map || [],
          });
          
          extendedBrandContext.primaryPersona = mapPersona(personasResult.data.find((p: any) => p.is_primary) || personasResult.data[0]);
          extendedBrandContext.allPersonas = personasResult.data.map(mapPersona);
          console.log("Customer personas loaded:", personasResult.data.length, "Primary:", extendedBrandContext.primaryPersona?.name);
        }

        // Build Product-Persona mapping context for multichannel content
        if (mappingsResult.data?.length) {
          // Fetch journey stage messaging for all mappings
          const mappingIds = mappingsResult.data.map((m: any) => m.id).filter(Boolean);
          let journeyMessagingData: JourneyStageMessagingData[] = [];
          
          if (mappingIds.length > 0) {
            const { data: journeyData } = await supabase
              .from('journey_stage_messaging')
              .select('*')
              .in('mapping_id', mappingIds);
            
            if (journeyData?.length) {
              journeyMessagingData = journeyData as JourneyStageMessagingData[];
              console.log("Journey stage messaging loaded:", journeyData.length, "entries");
            }
          }

          // Group by persona for better content targeting
          const mappingsByPersona: Record<string, any[]> = {};
          mappingsResult.data.forEach((m: any) => {
            const personaName = m.persona?.name || 'Unknown';
            if (!mappingsByPersona[personaName]) mappingsByPersona[personaName] = [];
            mappingsByPersona[personaName].push(m);
          });

          let productTargetingContext = `\n## 🎯 PRODUCT-PERSONA TARGETING FOR MULTICHANNEL\n`;
          productTargetingContext += `Khi tạo content cho từng kênh, SỬ DỤNG product messaging phù hợp với persona:\n\n`;

          Object.entries(mappingsByPersona).forEach(([personaName, mappings]) => {
            productTargetingContext += `### ${personaName}\n`;
            mappings.slice(0, 3).forEach((m: any) => {
              productTargetingContext += `- **${m.product?.name}** (Fit: ${m.relevance_score}%)`;
              if (m.custom_pitch) productTargetingContext += `\n  Pitch: "${m.custom_pitch}"`;
              if (m.key_benefits?.length) productTargetingContext += `\n  Benefits: ${m.key_benefits.join(', ')}`;
              if (m.preferred_content_angles?.length) productTargetingContext += `\n  Góc content: ${m.preferred_content_angles.join(', ')}`;
              productTargetingContext += '\n';
            });
          });

          productTargetingContext += `\n→ Điều chỉnh product messaging theo từng kênh (FB: storytelling, IG: visual-first, LinkedIn: professional)`;

          // Inject into extended brand context prompt
          if (extendedBrandContext) {
            (extendedBrandContext as any).productPersonaTargeting = productTargetingContext;
          }
          console.log("Product-persona mappings loaded:", mappingsResult.data.length);

          // Build and inject Journey Stage Messaging context
          if (journeyMessagingData.length > 0) {
            const journeyContext = buildJourneyStageMessagingSection(
              journeyMessagingData,
              formData.targetJourneyStage
            );
            if (journeyContext && extendedBrandContext) {
              (extendedBrandContext as any).journeyStageMessaging = journeyContext;
              console.log("Journey stage messaging context built for", 
                formData.targetJourneyStage ? `target stage: ${formData.targetJourneyStage}` : "all stages");
            }
          }
        }
        
        // CRITICAL: Fetch Industry Memory from database (Single Source of Truth)
        if (industryTemplateId) {
          industryMemory = await fetchIndustryMemory(supabase, industryTemplateId);
          if (industryMemory) {
            console.log("Industry Memory loaded:", industryMemory.name, "v" + industryMemory.version);
            // Build merged rules with correct priority cascade
            mergedRules = buildMergedRules(industryMemory, brandVoice);
            console.log("Merged rules - forbidden_terms:", mergedRules.forbidden_terms.length, 
                        "compliance_rules:", mergedRules.compliance_rules.length);
          }
        }
      }
    }

    // ============================================
    // REGENERATE MODE - Lightweight single channel path
    // ============================================
    if (formData.action === 'regenerate') {
      console.log("[regenerate-mode] Starting lightweight regeneration path...");
      
      const channel = formData.channel!;
      const contentId = formData.contentId!;
      
      // Get AI config
      const aiConfig = await getAIConfig('generate-multichannel', organizationId || undefined);
      
      // Detect target audience
      const targetAudience = await detectTargetAudience(industryArray, supabase);
      
      // Build channel settings
      const brandAllowEmoji = brandVoice?.allow_emoji ?? true;
      const channelSettings = mergeChannelSettings(channel, channelOverrides);
      const channelRulesPrompt = buildChannelRulesPrompt(channel, channelSettings, brandAllowEmoji);
      
      // Build Brand Voice section
      const brandVoiceSection = brandVoice 
        ? getBrandVoicePrompt(brandVoice, mergedRules, industryMemory) 
        : "";
      
      // Content goal
      const contentGoal = formData.contentGoal || 'education';
      const goalDescriptions: Record<string, string> = {
        education: "Giáo dục - Chia sẻ kiến thức chuyên sâu",
        awareness: "Nhận diện - Tăng nhận biết thương hiệu",
        engagement: "Tương tác - Khuyến khích bình luận, chia sẻ",
        expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu",
        conversion: "Chuyển đổi - Thúc đẩy hành động",
      };
      
      // Target audience description
      const targetAudienceDesc = targetAudience === 'B2B' 
        ? 'doanh nghiệp (B2B)' 
        : targetAudience === 'B2C' 
          ? 'người tiêu dùng (B2C)' 
          : 'cả doanh nghiệp và người tiêu dùng (B2B + B2C)';
      
      // Build system prompt for regeneration
      const systemPrompt = `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - hệ thống AI tạo NỘI DUNG cho ${targetAudienceDesc}.

${brandVoiceSection}

## BRAND CONTEXT
Brand name: ${brandName}
${brandGuideline ? `Brand guideline: ${brandGuideline}` : ""}
${primaryColor ? `Màu chủ đạo: ${primaryColor}` : ""}
${industry ? `Ngành: ${industry}` : ""}
Target Audience: ${targetAudience}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[contentGoal] || contentGoal}

## QUY ƯỚC CHO KÊNH (SOCIAL CHANNEL SETTINGS)
Brand Voice là LUẬT NỀN. Channel Settings là LUẬT TRIỂN KHAI.

${channelRulesPrompt}

## KIỂM TRA CUỐI (BẮT BUỘC)
- Có vượt max length không? → TỰ RÚT GỌN
- Có vi phạm emoji / hashtag không? → TỰ ĐIỀU CHỈNH

## NGUYÊN TẮC BẮT BUỘC
1. Tạo nội dung MỚI HOÀN TOÀN, khác với phiên bản trước
2. Giữ cùng thông điệp lõi nhưng thay đổi cách diễn đạt
3. Giọng văn: Chuyên nghiệp, rõ ràng, phù hợp ${targetAudience}
4. Tuân thủ chính xác format của kênh

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji (Brand Voice yêu cầu)" : ""}`;

      const userPrompt = `Viết lại nội dung cho kênh ${channel.toUpperCase()} với chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}

Tạo một phiên bản MỚI, KHÁC BIỆT với nội dung cũ, nhưng vẫn giữ thông điệp lõi.
Nội dung sẵn sàng đăng ngay.`;

      // ============================================
      // REGENERATE WITH STREAMING
      // ============================================
      if (formData.stream === true) {
        console.log("[regenerate-mode][streaming] Starting SSE stream for single channel");
        
        const encoder = new TextEncoder();
        let clientDisconnected = false;
        
        const stream = new ReadableStream({
          async start(controller) {
            let heartbeatInterval: any = null;
            
            const emit = (event: any) => {
              if (clientDisconnected) return;
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              } catch {}
            };
            
            try {
              heartbeatInterval = setInterval(() => {
                if (!clientDisconnected) {
                  try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch {}
                }
              }, 10000);
              
              emit({ type: 'progress', step: 'init', progress: 10, message: 'Đang khởi tạo...' });
              
              // Call AI with streaming
              emit({ type: 'progress', step: 'generate', progress: 30, message: `Đang tạo lại nội dung ${channel}...` });
              
              const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: aiConfig.model || "google/gemini-2.5-flash",
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                  ],
                  stream: true,
                }),
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error("[regenerate-mode][streaming] AI API error:", response.status);
                if (response.status === 429) {
                  emit({ type: 'error', message: 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.' });
                  controller.close();
                  return;
                }
                if (response.status === 402) {
                  emit({ type: 'error', message: 'Cần nạp thêm credits để tiếp tục sử dụng.' });
                  controller.close();
                  return;
                }
                throw new Error(`AI API error: ${response.status}`);
              }
              
              // Stream tokens
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();
              let generatedContent = '';
              let buffer = '';
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) {
                        generatedContent += content;
                        emit({ type: 'streaming_text', channel, content });
                      }
                    } catch {}
                  }
                }
              }
              
              emit({ type: 'channel_complete', channel, content: generatedContent });
              emit({ type: 'progress', step: 'finalize', progress: 85, message: 'Đang lưu...' });
              
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              
              // Update database
              const columnName = CHANNEL_COLUMN_MAP[channel];
              const { data: updatedContent, error: updateError } = await supabase
                .from('multi_channel_contents')
                .update({ [columnName]: generatedContent })
                .eq('id', contentId)
                .select()
                .single();
              
              if (updateError) {
                emit({ type: 'error', message: 'Không thể lưu nội dung' });
                controller.close();
                return;
              }
              
              emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
              emit({ type: 'result', data: updatedContent });
              
              try { controller.enqueue(encoder.encode('data: [DONE]\n\n')); } catch {}
              controller.close();
            } catch (error) {
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              console.error('[regenerate-mode][streaming] Error:', error);
              emit({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
              try { controller.close(); } catch {}
            }
          }
        });
        
        return createSSEResponse(stream, corsHeaders);
      }
      
      // ============================================
      // REGENERATE WITHOUT STREAMING (Fast path)
      // ============================================
      console.log("[regenerate-mode][non-streaming] Generating content...");
      
      const tools = [
        {
          type: "function",
          function: {
            name: "generate_channel_content",
            description: `Generate new content for ${channel}`,
            parameters: {
              type: "object",
              properties: {
                content: { type: "string", description: `Nội dung mới cho ${channel}` },
              },
              required: ["content"],
            },
          },
        },
      ];
      
      // Use cache wrapper
      const cacheInput = {
        contentId,
        channel,
        topic: formData.topic,
        industry,
        brandVoice: brandVoice ? {
          positioning: brandVoice.brand_positioning,
          tone: brandVoice.tone_of_voice,
          formality: brandVoice.formality_level,
        } : null,
      };
      
      const generateAIContent = async (): Promise<string> => {
        console.log("[regenerate-mode] Calling AI...");
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiConfig.model || "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools,
            tool_choice: { type: "function", function: { name: "generate_channel_content" } },
          }),
        });
        
        if (!response.ok) {
          if (response.status === 429) throw { status: 429, message: "Đã vượt giới hạn yêu cầu." };
          if (response.status === 402) throw { status: 402, message: "Cần nạp thêm credits." };
          throw new Error(`AI API error: ${response.status}`);
        }
        
        const aiResponse = await response.json();
        const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || toolCall.function.name !== "generate_channel_content") {
          throw new Error("Invalid AI response format");
        }
        
        const generatedData = JSON.parse(toolCall.function.arguments);
        return generatedData.content;
      };
      
      let newContent: string;
      let fromCache = false;
      
      try {
        const cacheResult = await withCache({
          functionName: 'generate-multichannel',
          scope: 'org',
          organizationId: organizationId || undefined,
          brandTemplateId: formData.brandTemplateId || undefined,
          input: { ...cacheInput, action: 'regenerate' },
          versions: { brandVoice: brandVoice?.formality_level || undefined },
          ttlDays: 1, // Short TTL for regeneration
          generateFn: generateAIContent,
        });
        
        newContent = cacheResult.data;
        fromCache = cacheResult.fromCache;
        console.log(`[regenerate-mode] ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}`);
      } catch (err: any) {
        if (err.status === 429 || err.status === 402) {
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw err;
      }
      
      // Update database
      const columnName = CHANNEL_COLUMN_MAP[channel];
      const { data: updatedContent, error: updateError } = await supabase
        .from('multi_channel_contents')
        .update({ [columnName]: newContent })
        .eq('id', contentId)
        .select()
        .single();
      
      if (updateError) {
        console.error("[regenerate-mode] Update error:", updateError);
        throw new Error("Không thể cập nhật nội dung");
      }
      
      console.log(`[regenerate-mode] Successfully regenerated ${channel}, fromCache: ${fromCache}`);
      
      return new Response(
        JSON.stringify({ ...updatedContent, fromCache }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (formData.stream === true) {
      console.log("[streaming-mode] Streaming mode enabled, starting SSE response...");
      
      // Get AI config for models
      const aiConfig = await getAIConfig('generate-multichannel', organizationId || undefined);
      const channelModelConfigs = await getChannelModelConfigs(organizationId || undefined);
      
      // Detect target audience for prompts
      const targetAudience = await detectTargetAudience(industryArray, supabase);
      
      // Derive contentGoal
      let contentGoal = formData.contentGoal || 'education';
      if (!formData.contentGoal && formData.targetJourneyStage) {
        contentGoal = JOURNEY_TO_GOAL_MAP[formData.targetJourneyStage] || 'education';
      }
      
      // Build system prompt with all context
      const systemPrompt = getSystemPrompt(
        brandName,
        brandGuideline,
        primaryColor,
        contentGoal,
        formData.contentAngle,
        formData.channels,
        targetAudience,
        brandVoice,
        channelOverrides,
        mergedRules,
        industryMemory,
        extendedBrandContext
      );
      
      // ============================================
      // TARGETED PRODUCT/PERSONA CONTEXT (Streaming mode)
      // ============================================
      let targetedProductContext = '';
      let targetedPersonaContext = '';
      
      if (formData.targetProductId && formData.brandTemplateId) {
        const { data: targetProduct } = await supabase
          .from('brand_products')
          .select('*')
          .eq('id', formData.targetProductId)
          .eq('brand_template_id', formData.brandTemplateId)
          .single();
        
        if (targetProduct) {
          targetedProductContext = `
## 🎯 SẢN PHẨM/DỊCH VỤ MỤC TIÊU
**Tên**: ${targetProduct.name}
${targetProduct.category ? `**Danh mục**: ${targetProduct.category}` : ''}
${targetProduct.description ? `**Mô tả**: ${targetProduct.description}` : ''}
${targetProduct.unique_selling_points?.length ? `**USP**: ${targetProduct.unique_selling_points.join(', ')}` : ''}
${targetProduct.benefits?.length ? `**Lợi ích**: ${targetProduct.benefits.join(', ')}` : ''}
${targetProduct.pain_points_solved?.length ? `**Pain points giải quyết**: ${targetProduct.pain_points_solved.join(', ')}` : ''}

⚡ NỘI DUNG PHẢI TẬP TRUNG vào sản phẩm này, nhấn mạnh USP và cách giải quyết pain points.
`;
          console.log("[streaming-mode] Targeted product loaded:", targetProduct.name);
        }
      }
      
      if (formData.targetPersonaId && formData.brandTemplateId) {
        const { data: targetPersona } = await supabase
          .from('customer_personas')
          .select('*')
          .eq('id', formData.targetPersonaId)
          .eq('brand_template_id', formData.brandTemplateId)
          .single();
        
        if (targetPersona) {
          targetedPersonaContext = `
## 👤 PERSONA MỤC TIÊU
**Tên**: ${targetPersona.name} ${targetPersona.avatar_emoji || ''}
${targetPersona.occupation ? `**Nghề nghiệp**: ${targetPersona.occupation}` : ''}
${targetPersona.age_range ? `**Độ tuổi**: ${targetPersona.age_range}` : ''}
${targetPersona.pain_points?.length ? `**Pain points**: ${targetPersona.pain_points.join(', ')}` : ''}
${targetPersona.desires?.length ? `**Mong muốn**: ${targetPersona.desires.join(', ')}` : ''}
${targetPersona.buying_triggers?.length ? `**Trigger mua hàng**: ${targetPersona.buying_triggers.join(', ')}` : ''}
${targetPersona.objections?.length ? `**Objections thường gặp**: ${targetPersona.objections.join(', ')}` : ''}
${targetPersona.communication_style ? `**Phong cách giao tiếp**: ${targetPersona.communication_style}` : ''}

⚡ NỘI DUNG PHẢI VIẾT CHO PERSONA NÀY:
- Tone phù hợp với phong cách giao tiếp của họ
- Giải quyết đúng pain points của họ
- Trigger buying motivation
- Phản bác objections nếu phù hợp
`;
          console.log("[streaming-mode] Targeted persona loaded:", targetPersona.name);
        }
      }
      
      // Build base user prompt
      let userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}
${targetedProductContext}
${targetedPersonaContext}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.`;

      // ============================================
      // EDITED PREVIEWS LEARNING (Streaming mode)
      // ============================================
      if (formData.editedPreviews && Object.keys(formData.editedPreviews).length > 0) {
        const editedChannels = Object.entries(formData.editedPreviews)
          .filter(([_, preview]) => preview.original !== preview.edited)
          .map(([channel, preview]) => ({ channel, ...preview }));

        if (editedChannels.length > 0) {
          userPrompt += `\n\n## VÍ DỤ ĐƯỢC NGƯỜI DÙNG CHỈNH SỬA (HỌC THEO PHONG CÁCH NÀY)
Người dùng đã chỉnh sửa một số preview. Hãy HỌC THEO phong cách, cách diễn đạt, và tone của nội dung đã chỉnh sửa.
Áp dụng học hỏi này cho TẤT CẢ các kênh, không chỉ những kênh được chỉnh sửa.

`;
          editedChannels.forEach(({ channel, original, edited }) => {
            userPrompt += `### Kênh ${channel.toUpperCase()}:
**Nội dung gốc từ AI:**
${original.substring(0, 500)}${original.length > 500 ? '...' : ''}

**Nội dung sau khi người dùng chỉnh sửa (HỌC THEO):**
${edited.substring(0, 500)}${edited.length > 500 ? '...' : ''}

`;
          });

          userPrompt += `**QUAN TRỌNG**: Phân tích sự khác biệt và áp dụng phong cách chỉnh sửa của người dùng cho tất cả các kênh.
Ưu tiên: cách dùng từ, độ dài câu, tone of voice, và cách trình bày mà người dùng thích hơn.`;
          
          console.log(`[streaming-mode] User provided ${editedChannels.length} edited preview(s) as examples`);
        }
      }
      
      // Prepare streaming context
      const footerInfo = extendedBrandContext?.footerInfo as FooterInfo | null;
      const brandAllowEmoji = brandVoice?.allow_emoji !== false;
      const companyName = extendedBrandContext?.brandName || footerInfo?.company_name || null;
      const tagline = (extendedBrandContext as any)?.tagline || null;
      
      const streamingContext: StreamingContext = {
        organizationId,
        userId,
        channels: formData.channels,
        topic: formData.topic,
        contentGoal,
        brandTemplateId: formData.brandTemplateId,
        brandName,
        footerInfo,
        channelOverrides: channelOverrides as Record<string, any> | null,
        brandAllowEmoji,
        companyName,
        tagline,
        channelModelConfigs: new Map(
          formData.channels.map(ch => {
            const cfg = channelModelConfigs.get(ch);
            return [ch, {
              model: cfg?.model || aiConfig.model,
              temperature: cfg?.temperature ?? aiConfig.temperature,
              maxTokens: cfg?.maxTokens ?? null,
            }];
          })
        ),
        defaultModel: aiConfig.model,
        defaultTemperature: aiConfig.temperature,
        // Critique context
        brandVoice,
        mergedRules,
      };
      
      // Track client disconnect
      let clientDisconnected = false;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      
      req.signal.addEventListener('abort', () => {
        console.log('[streaming-mode] Client disconnected');
        clientDisconnected = true;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });
      
      // Create SSE stream
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          
          // Anti-buffering padding (2KB)
          try {
            controller.enqueue(encoder.encode(':' + ' '.repeat(2048) + '\n\n'));
          } catch {}
          
          const emit = (event: StreamingProgressEvent): boolean => {
            if (clientDisconnected) return false;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              return true;
            } catch {
              clientDisconnected = true;
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              return false;
            }
          };
          
          try {
            const channels = formData.channels;
            
            emit({ type: 'progress', step: 'init', progress: 0, message: 'Đang khởi tạo...' });
            await streamDelay(100);
            emit({ type: 'progress', step: 'context', progress: 15, message: 'Đã tải context ✓' });
            
            // Start heartbeat
            heartbeatInterval = setInterval(() => {
              if (clientDisconnected) return;
              try {
                controller.enqueue(encoder.encode(': keep-alive\n\n'));
              } catch {}
            }, 5000);
            
            emit({
              type: 'progress',
              step: 'ai',
              progress: 20,
              message: 'Bắt đầu tạo nội dung real-time...',
              totalChannels: channels,
              completedChannels: [],
              currentChannel: channels[0],
            });
            
            // Store results for each channel
            const channelResults: Record<string, string> = {};
            const completedChannels: string[] = [];
            
            // Generate content for each channel SEQUENTIALLY
            for (let i = 0; i < channels.length; i++) {
              const channel = channels[i];
              if (clientDisconnected) break;
              
              const displayName = getChannelDisplayName(channel);
              const channelProgress = 20 + ((i / channels.length) * 55);
              
              emit({
                type: 'progress',
                step: 'ai',
                progress: channelProgress,
                message: `Đang tạo ${displayName}...`,
                currentChannel: channel,
                completedChannels: [...completedChannels],
                totalChannels: channels,
              });
              
              // Build channel-specific user prompt
              const channelUserPrompt = `${userPrompt}

Bây giờ viết nội dung cho kênh: ${channel.toUpperCase()}
Viết TRỰC TIẾP nội dung, KHÔNG giải thích hay bình luận.`;
              
              const result = await generateChannelStreaming({
                channel,
                systemPrompt,
                userPrompt: channelUserPrompt,
                context: streamingContext,
                emit,
              });
              
              completedChannels.push(channel);
              channelResults[channel] = result.content;
              
              const completionProgress = 20 + (((i + 1) / channels.length) * 55);
              emit({
                type: 'progress',
                step: 'ai',
                progress: completionProgress,
                message: `✓ ${displayName} hoàn thành`,
                currentChannel: channels[i + 1],
                completedChannels: [...completedChannels],
                totalChannels: channels,
              });
            }
            
            // Stop heartbeat
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            
            if (clientDisconnected) {
              controller.close();
              return;
            }
            
            // ============================================
            // SELF-CRITIQUE LOOP (Post-streaming)
            // ============================================
            emit({ type: 'progress', step: 'critique', progress: 78, message: 'Đang đánh giá chất lượng...' });
            
            let critiqueResult: CritiqueResult | null = null;
            let wasRefined = false;
            let refinementCount = 0;
            let needsManualReview = false;
            
            try {
              // Prepare content object for critique (match normal mode structure)
              const contentForCritique: Record<string, any> = {
                title: formData.topic.slice(0, 100),
              };
              for (const [ch, content] of Object.entries(channelResults)) {
                contentForCritique[`${ch}_content`] = content;
              }
              
              const critiqueLoop = await runSelfCritiqueLoop({
                content: contentForCritique,
                contentType: 'multichannel',
                brandVoice: streamingContext.brandVoice,
                mergedRules: streamingContext.mergedRules,
                additionalContext: `Channels: ${channels.join(', ')}`,
                apiKey: LOVABLE_API_KEY,
              });

              // Update channelResults with refined content
              if (critiqueLoop.wasRefined) {
                for (const channel of channels) {
                  const key = `${channel}_content`;
                  if (critiqueLoop.finalContent[key]) {
                    channelResults[channel] = critiqueLoop.finalContent[key];
                  }
                }
              }

              critiqueResult = critiqueLoop.critiqueResult;
              wasRefined = critiqueLoop.wasRefined;
              refinementCount = critiqueLoop.refinementCount;
              needsManualReview = critiqueLoop.needsManualReview;

              emit({ 
                type: 'progress', 
                step: 'critique', 
                progress: 82, 
                message: `Đánh giá: ${critiqueResult.overall_score}/100 ${wasRefined ? '(đã tinh chỉnh)' : ''}` 
              });
              console.log(`[streaming-mode] Self-Critique: score=${critiqueResult.overall_score}, refined=${wasRefined}, needsReview=${needsManualReview}`);
            } catch (critiqueError) {
              console.error('[streaming-mode] Self-critique failed:', critiqueError);
              needsManualReview = true;
              emit({ type: 'progress', step: 'critique', progress: 82, message: 'Đánh giá: (đã bỏ qua)' });
            }
            
            emit({ type: 'progress', step: 'finalize', progress: 88, message: 'Đang lưu kết quả...' });
            
            // Check organization's approval settings
            let initialStatus = 'draft';
            if (organizationId) {
              const { data: orgSettings } = await supabase
                .from('organizations')
                .select('skip_approval, auto_submit_review')
                .eq('id', organizationId)
                .single();
              
              if (orgSettings?.skip_approval) {
                initialStatus = 'approved';
              } else if (orgSettings?.auto_submit_review) {
                initialStatus = 'review';
              }
            }
            
            // Save to database with critique metadata
            // EXPAND MODE: Update existing content | CREATE MODE: Insert new
            let savedContent: any;
            let dbError: any;
            
            if (formData.action === 'expand' && formData.contentId) {
              // EXPAND MODE: Update existing content, merge channels
              const { data: existingContent } = await supabase
                .from('multi_channel_contents')
                .select('selected_channels, channel_statuses')
                .eq('id', formData.contentId)
                .single();
              
              const existingChannels = existingContent?.selected_channels || [];
              const existingStatuses = existingContent?.channel_statuses || {};
              
              // Build update payload with new channel contents
              const updatePayload: Record<string, any> = {
                selected_channels: [...existingChannels, ...channels],
                critique_score: critiqueResult?.overall_score || null,
                critique_details: critiqueResult || null,
                was_refined: wasRefined,
                refinement_count: refinementCount,
                needs_manual_review: needsManualReview,
              };
              
              // Add new channel contents
              for (const channel of channels) {
                const columnName = CHANNEL_COLUMN_MAP[channel];
                if (columnName && channelResults[channel]) {
                  updatePayload[columnName] = channelResults[channel];
                }
              }
              
              // Update channel_statuses for new channels
              const updatedStatuses = { ...existingStatuses };
              for (const channel of channels) {
                updatedStatuses[channel] = 'draft';
              }
              updatePayload.channel_statuses = updatedStatuses;
              
              const result = await supabase
                .from('multi_channel_contents')
                .update(updatePayload)
                .eq('id', formData.contentId)
                .select()
                .single();
              
              savedContent = result.data;
              dbError = result.error;
              console.log(`[streaming-mode][expand] Updated content ${formData.contentId} with ${channels.length} new channels`);
            } else {
              // CREATE MODE: Insert new content
              const result = await supabase
                .from('multi_channel_contents')
                .insert({
                  user_id: userId,
                  organization_id: organizationId || null,
                  title: formData.topic.slice(0, 100),
                  topic: formData.topic,
                  content_goal: contentGoal,
                  selected_channels: channels,
                  brand_template_id: formData.brandTemplateId || null,
                  brand_voice_variant_id: formData.brandVoiceVariantId || null,
                  brand_name: brandName,
                  status: initialStatus,
                  industry_template_version: industryMemory?.version || null,
                  // Self-critique metadata
                  critique_score: critiqueResult?.overall_score || null,
                  critique_details: critiqueResult || null,
                  was_refined: wasRefined,
                  refinement_count: refinementCount,
                  needs_manual_review: needsManualReview,
                  // Channel contents
                  website_content: channelResults.website || null,
                  facebook_content: channelResults.facebook || null,
                  instagram_content: channelResults.instagram || null,
                  twitter_content: channelResults.twitter || null,
                  google_maps_content: channelResults.google_maps || null,
                  linkedin_content: channelResults.linkedin || null,
                  email_content: channelResults.email || null,
                  youtube_content: channelResults.youtube || null,
                  zalo_oa_content: channelResults.zalo_oa || null,
                  telegram_content: channelResults.telegram || null,
                  tiktok_content: channelResults.tiktok || null,
                  threads_content: channelResults.threads || null,
                })
                .select()
                .single();
              
              savedContent = result.data;
              dbError = result.error;
            }
            
            if (dbError) {
              console.error('[streaming-mode] DB error:', dbError);
              emit({ type: 'error', message: 'Không thể lưu nội dung: ' + dbError.message });
              controller.close();
              return;
            }
            
            console.log('[streaming-mode] Saved content with ID:', savedContent.id);
            
            emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
            await streamDelay(100);
            
            // Return saved content
            emit({ type: 'result', data: savedContent });
            
            // Send done signal
            if (!clientDisconnected) {
              try {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } catch {}
            }
            
            controller.close();
          } catch (error) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            
            if (clientDisconnected) {
              try { controller.close(); } catch {}
              return;
            }
            
            console.error('[streaming-mode] Error:', error);
            try {
              emit({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
            } catch {}
            try { controller.close(); } catch {}
          }
        },
      });
      
      return createSSEResponse(stream, corsHeaders);
    }
    
    // ============================================
    // NORMAL MODE (non-streaming) - Original logic continues below
    // ============================================

    // Detect target audience from database
    const targetAudience = await detectTargetAudience(industryArray, supabase);
    console.log("Target audience detected:", targetAudience);

    // Derive contentGoal from journeyStage if not provided
    let contentGoal = formData.contentGoal || 'education'; // Default fallback
    if (!formData.contentGoal && formData.targetJourneyStage) {
      contentGoal = JOURNEY_TO_GOAL_MAP[formData.targetJourneyStage] || 'education';
      console.log("Content goal auto-derived from journey stage:", formData.targetJourneyStage, "→", contentGoal);
    }

    const systemPrompt = getSystemPrompt(
      brandName,
      brandGuideline,
      primaryColor,
      contentGoal,
      formData.contentAngle,
      formData.channels,
      targetAudience,
      brandVoice,
      channelOverrides,
      mergedRules,
      industryMemory,
      extendedBrandContext
    );

    // Fetch targeted product/persona if specified
    let targetedProductContext = '';
    let targetedPersonaContext = '';
    
    if (formData.targetProductId && formData.brandTemplateId) {
      const { data: targetProduct } = await supabase
        .from('brand_products')
        .select('*')
        .eq('id', formData.targetProductId)
        .eq('brand_template_id', formData.brandTemplateId)
        .single();
      
      if (targetProduct) {
        targetedProductContext = `
## 🎯 SẢN PHẨM/DỊCH VỤ MỤC TIÊU
**Tên**: ${targetProduct.name}
${targetProduct.category ? `**Danh mục**: ${targetProduct.category}` : ''}
${targetProduct.description ? `**Mô tả**: ${targetProduct.description}` : ''}
${targetProduct.unique_selling_points?.length ? `**USP**: ${targetProduct.unique_selling_points.join(', ')}` : ''}
${targetProduct.benefits?.length ? `**Lợi ích**: ${targetProduct.benefits.join(', ')}` : ''}
${targetProduct.pain_points_solved?.length ? `**Pain points giải quyết**: ${targetProduct.pain_points_solved.join(', ')}` : ''}

⚡ NỘI DUNG PHẢI TẬP TRUNG vào sản phẩm này, nhấn mạnh USP và cách giải quyết pain points.
`;
        console.log("Targeted product loaded:", targetProduct.name);
      }
    }
    
    if (formData.targetPersonaId && formData.brandTemplateId) {
      const { data: targetPersona } = await supabase
        .from('customer_personas')
        .select('*')
        .eq('id', formData.targetPersonaId)
        .eq('brand_template_id', formData.brandTemplateId)
        .single();
      
      if (targetPersona) {
        targetedPersonaContext = `
## 👤 PERSONA MỤC TIÊU
**Tên**: ${targetPersona.name} ${targetPersona.avatar_emoji || ''}
${targetPersona.occupation ? `**Nghề nghiệp**: ${targetPersona.occupation}` : ''}
${targetPersona.age_range ? `**Độ tuổi**: ${targetPersona.age_range}` : ''}
${targetPersona.pain_points?.length ? `**Pain points**: ${targetPersona.pain_points.join(', ')}` : ''}
${targetPersona.desires?.length ? `**Mong muốn**: ${targetPersona.desires.join(', ')}` : ''}
${targetPersona.buying_triggers?.length ? `**Trigger mua hàng**: ${targetPersona.buying_triggers.join(', ')}` : ''}
${targetPersona.objections?.length ? `**Objections thường gặp**: ${targetPersona.objections.join(', ')}` : ''}
${targetPersona.communication_style ? `**Phong cách giao tiếp**: ${targetPersona.communication_style}` : ''}

⚡ NỘI DUNG PHẢI VIẾT CHO PERSONA NÀY:
- Tone phù hợp với phong cách giao tiếp của họ
- Giải quyết đúng pain points của họ
- Trigger buying motivation
- Phản bác objections nếu phù hợp
`;
        console.log("Targeted persona loaded:", targetPersona.name);
      }
    }

    // Build user prompt with optional edited previews as examples
    let userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}
${targetedProductContext}
${targetedPersonaContext}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.
Đảm bảo thông điệp lõi nhất quán nhưng format và tone khác nhau theo từng nền tảng.
Nội dung sẵn sàng đăng ngay.`;

    // If user has edited any previews, use them as examples for the AI to learn from
    if (formData.editedPreviews && Object.keys(formData.editedPreviews).length > 0) {
      const editedChannels = Object.entries(formData.editedPreviews)
        .filter(([_, preview]) => preview.original !== preview.edited)
        .map(([channel, preview]) => ({ channel, ...preview }));

      if (editedChannels.length > 0) {
        userPrompt += `\n\n## VÍ DỤ ĐƯỢC NGƯỜI DÙNG CHỈNH SỬA (HỌC THEO PHONG CÁCH NÀY)
Người dùng đã chỉnh sửa một số preview. Hãy HỌC THEO phong cách, cách diễn đạt, và tone của nội dung đã chỉnh sửa.
Áp dụng học hỏi này cho TẤT CẢ các kênh, không chỉ những kênh được chỉnh sửa.

`;
        editedChannels.forEach(({ channel, original, edited }) => {
          userPrompt += `### Kênh ${channel.toUpperCase()}:
**Nội dung gốc từ AI:**
${original.substring(0, 500)}${original.length > 500 ? '...' : ''}

**Nội dung sau khi người dùng chỉnh sửa (HỌC THEO):**
${edited.substring(0, 500)}${edited.length > 500 ? '...' : ''}

`;
        });

        userPrompt += `**QUAN TRỌNG**: Phân tích sự khác biệt và áp dụng phong cách chỉnh sửa của người dùng cho tất cả các kênh.
Ưu tiên: cách dùng từ, độ dài câu, tone of voice, và cách trình bày mà người dùng thích hơn.`;
        
        console.log(`User provided ${editedChannels.length} edited preview(s) as examples`);
      }
    }

    // Build tool parameters based on selected channels
    const channelProperties: Record<string, object> = {};
const channelDescriptions: Record<string, string> = {
      website: "Bài viết chuẩn SEO (1000-2000 chữ): H1 title, H2/H3 subheadings, intro 50-100 words, body sections, conclusion với CTA mềm. Markdown format.",
      facebook: "Nội dung cho Facebook (120-300 chữ, hook mạnh, chia đoạn ngắn)",
      instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
      twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
      google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
      linkedin: "Nội dung cho LinkedIn (150-400 chữ, B2B authority, insight)",
      email: "Nội dung Email (150-400 chữ, subject line + body + CTA)",
      youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
      zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
      telegram: "Nội dung Telegram (100-500 chữ, bullet, dễ đọc)",
      tiktok: "Short-form script TikTok (60-150 chữ, hook 3s đầu, nhanh - trẻ - năng lượng cao, có CTA cuối)",
      threads: "Nội dung Threads (50-200 chữ, conversational, quan điểm cá nhân, dễ tương tác)",
    };

    formData.channels.forEach(channel => {
      // Special handling for website with SEO metadata
      if (channel === 'website') {
        channelProperties['website_content'] = {
          type: "object",
          description: "Bài viết website chuẩn SEO hoàn chỉnh",
          properties: {
            seo_title: { 
              type: "string", 
              description: "SEO Title (50-60 ký tự), chứa focus keyword, hấp dẫn click" 
            },
            meta_description: { 
              type: "string", 
              description: "Meta description (150-160 ký tự), chứa keyword, có CTA nhẹ" 
            },
            focus_keyword: { 
              type: "string", 
              description: "Keyword chính tối ưu cho bài viết" 
            },
            secondary_keywords: {
              type: "array",
              items: { type: "string" },
              description: "3-5 keywords phụ liên quan"
            },
            slug_suggestion: {
              type: "string",
              description: "URL slug gợi ý (lowercase, dấu gạch ngang, không dấu)"
            },
            heading_structure: {
              type: "object",
              properties: {
                h1: { type: "string", description: "Tiêu đề H1 chính" },
                h2s: { type: "array", items: { type: "string" }, description: "Các H2 subheadings" },
              },
              required: ["h1", "h2s"]
            },
            content: { 
              type: "string", 
              description: `Nội dung bài viết đầy đủ (1000-2000 words).
⚠️ FORMAT BẮT BUỘC: Pure Markdown - TUYỆT ĐỐI KHÔNG dùng HTML tags.
- Dùng # cho H1 (chỉ 1 H1 đầu bài)
- Dùng ## cho H2 sections
- Dùng ### cho H3 sub-sections
- Dùng **text** cho bold, *text* cho italic
- Dùng - hoặc * cho bullet lists
- Dùng > cho blockquotes
- Dùng [text](url) cho links
KHÔNG ĐƯỢC dùng <h1>, <h2>, <p>, <strong>, <em>, <ul>, <li> hoặc bất kỳ HTML tag nào.` 
            },
            featured_snippet: {
              type: "string",
              description: "Đoạn tối ưu cho Featured Snippet (40-60 words), trả lời trực tiếp câu hỏi chính"
            },
            internal_link_anchors: {
              type: "array",
              items: { type: "string" },
              description: "2-3 gợi ý anchor text cho internal linking"
            },
            schema_type: {
              type: "string",
              enum: ["Article", "HowTo", "FAQ", "Product", "BlogPosting"],
              description: "Loại schema markup phù hợp"
            },
            word_count: { type: "number", description: "Số từ trong content" },
            reading_time_minutes: { type: "number", description: "Thời gian đọc ước tính (phút)" },
            // Advanced SEO fields
            og_title: {
              type: "string",
              description: "Open Graph title cho Facebook/LinkedIn share (60-90 ký tự, hấp dẫn hơn SEO title)"
            },
            og_description: {
              type: "string",
              description: "Open Graph description cho social share (150-200 ký tự, tạo curiosity)"
            },
            keyword_density_percent: {
              type: "number",
              description: "Mật độ focus keyword trong content (1-2% là tối ưu)"
            },
            seo_score_estimate: {
              type: "number",
              description: "Ước tính SEO score (0-100) dựa trên: title length, meta length, keyword placement, heading structure"
            },
            faq_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string", description: "Câu hỏi FAQ" },
                  answer: { type: "string", description: "Câu trả lời (50-100 words)" }
                },
                required: ["question", "answer"]
              },
              description: "2-4 câu FAQ rút trích từ content (nếu phù hợp) để tạo FAQ Schema"
            },
            canonical_url_suggestion: {
              type: "string",
              description: "Gợi ý URL canonical đầy đủ (https://domain.com/slug)"
            }
          },
          required: ["seo_title", "meta_description", "focus_keyword", "content", "heading_structure"]
        };
      } else if (channelDescriptions[channel]) {
        channelProperties[`${channel}_content`] = {
          type: "string",
          description: channelDescriptions[channel],
        };
      }
    });

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_multichannel_content",
          description: "Generate content for multiple marketing channels",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Tiêu đề ngắn gọn cho bộ nội dung (dựa trên chủ đề)",
              },
              ...channelProperties,
            },
            required: ["title", ...Object.keys(channelProperties)],
          },
        },
      },
    ];

    // Website content validation constants
    const MIN_WEBSITE_WORDS = 800;
    const MAX_RETRIES = 2;
    const hasWebsiteChannel = formData.channels.includes('website');

    // Fetch AI config from database for runtime configuration
    const aiConfig = await getAIConfig('generate-multichannel', organizationId || undefined);
    console.log(`[ai-config] Using model: ${aiConfig.model}, temp: ${aiConfig.temperature}, max_tokens: ${aiConfig.max_tokens}`);

    // Fetch channel-specific model configs
    const channelModelConfigs = await getChannelModelConfigs(organizationId || undefined);
    if (channelModelConfigs.size > 0) {
      console.log(`[ai-config] Channel model overrides: ${Array.from(channelModelConfigs.entries()).map(([ch, cfg]) => `${ch}=${cfg.model}`).join(', ')}`);
    }

    // Group channels by model (for per-model generation)
    const groupChannelsByModel = (channels: string[]): Map<string, { channels: string[]; config: { model: string; temperature: number; maxTokens: number | null } }> => {
      const groups = new Map<string, { channels: string[]; config: { model: string; temperature: number; maxTokens: number | null } }>();
      
      for (const channel of channels) {
        const channelConfig = channelModelConfigs.get(channel);
        // Use channel-specific config if available, otherwise use default function config
        const model = channelConfig?.model || aiConfig.model;
        const temperature = channelConfig?.temperature ?? aiConfig.temperature;
        const maxTokens = channelConfig?.maxTokens ?? null;
        
        const key = `${model}|${temperature}|${maxTokens ?? 'default'}`;
        
        if (!groups.has(key)) {
          groups.set(key, { channels: [], config: { model, temperature, maxTokens } });
        }
        groups.get(key)!.channels.push(channel);
      }
      
      return groups;
    };

    // Build tools dynamically for a subset of channels
    const buildToolsForChannels = (channels: string[]) => {
      const channelProps: Record<string, object> = {};
      const channelDescs: Record<string, string> = {
        website: "Bài viết chuẩn SEO (1000-2000 chữ): H1 title, H2/H3 subheadings, intro 50-100 words, body sections, conclusion với CTA mềm. Markdown format.",
        facebook: "Nội dung cho Facebook (120-300 chữ, hook mạnh, chia đoạn ngắn)",
        instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
        twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
        google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
        linkedin: "Nội dung cho LinkedIn (150-400 chữ, B2B authority, insight)",
        email: "Nội dung Email (150-400 chữ, subject line + body + CTA)",
        youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
        zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
        telegram: "Nội dung Telegram (100-500 chữ, bullet, dễ đọc)",
        tiktok: "Short-form script TikTok (60-150 chữ, hook 3s đầu, nhanh - trẻ - năng lượng cao, có CTA cuối)",
        threads: "Nội dung Threads (50-200 chữ, conversational, quan điểm cá nhân, dễ tương tác)",
      };
      
      for (const channel of channels) {
        if (channel === 'website') {
          channelProps['website_content'] = channelProperties['website_content'];
        } else if (channelDescs[channel]) {
          channelProps[`${channel}_content`] = {
            type: "string",
            description: channelDescs[channel],
          };
        }
      }
      
      return [{
        type: "function",
        function: {
          name: "generate_multichannel_content",
          description: "Generate content for multiple marketing channels",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Tiêu đề ngắn gọn cho bộ nội dung (dựa trên chủ đề)",
              },
              ...channelProps,
            },
            required: ["title", ...Object.keys(channelProps)],
          },
        },
      }];
    };

    // Define the AI generation function with dynamic prompt using callAI (multi-provider support)
    // This now supports per-channel model configuration
    const generateAIContentForChannels = async (
      currentPrompt: string, 
      channelsToGenerate: string[],
      modelConfig: { model: string; temperature: number; maxTokens: number | null }
    ) => {
      const channelTools = buildToolsForChannels(channelsToGenerate);
      const includesWebsite = channelsToGenerate.includes('website');
      const effectiveMaxTokens = modelConfig.maxTokens ?? (includesWebsite ? Math.max(aiConfig.max_tokens, 12288) : aiConfig.max_tokens);
      
      console.log(`Calling AI (${modelConfig.model}) for channels: ${channelsToGenerate.join(', ')}`);
      
      const result = await callAI({
        functionName: 'generate-multichannel',
        organizationId: organizationId || undefined,
        modelOverride: modelConfig.model,
        temperatureOverride: modelConfig.temperature,
        messages: [
          { role: "system", content: aiConfig.custom_system_prompt || systemPrompt },
          { role: "user", content: currentPrompt + `\n\n[CHỈ TẠO NỘI DUNG CHO CÁC KÊNH: ${channelsToGenerate.join(', ').toUpperCase()}]` },
        ],
        tools: channelTools,
        toolChoice: { type: "function", function: { name: "generate_multichannel_content" } },
        maxTokensOverride: effectiveMaxTokens,
      });

      if (!result.success) {
        console.error("AI call failed:", result.error);
        
        if (result.error?.includes("Rate limit") || result.error?.includes("429")) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (result.error?.includes("Payment required") || result.error?.includes("402")) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }
        throw new Error(`AI error: ${result.error}`);
      }

      console.log(`AI response from ${result.provider}${result.fromFallback ? ' (fallback)' : ''} for ${channelsToGenerate.length} channels`);

      const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== "generate_multichannel_content") {
        throw new Error("Invalid AI response format");
      }

      return JSON.parse(toolCall.function.arguments);
    };

    // ============================================
    // PARALLEL CHANNEL GENERATION
    // Generate each channel independently for maximum speed
    // ============================================
    const PARALLEL_GENERATION = true; // Feature flag
    const MAX_CONCURRENT_CHANNELS = 6; // Limit concurrent requests to avoid rate limits

    // Helper to chunk array for batched parallel execution
    const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Generate content for a single channel
    // Optional callback for streaming mode - called when channel completes
    const generateSingleChannel = async (
      currentPrompt: string, 
      channel: string, 
      config: { model: string; temperature: number; maxTokens: number | null },
      onChannelComplete?: (result: { channel: string; content: string; wordCount: number }) => void
    ): Promise<{ channel: string; data: any; success: boolean; error?: any; durationMs: number }> => {
      const startTime = Date.now();
      console.log(`[parallel] Starting ${channel} with model ${config.model}`);
      
      try {
        const data = await generateAIContentForChannels(currentPrompt, [channel], config);
        const durationMs = Date.now() - startTime;
        console.log(`[parallel] ✅ ${channel} completed in ${(durationMs / 1000).toFixed(1)}s`);
        
        // Call streaming callback if provided
        if (onChannelComplete) {
          const contentKey = `${channel}_content`;
          let textContent = '';
          const channelData = data[contentKey];
          
          if (channelData) {
            if (typeof channelData === 'string') {
              textContent = channelData;
            } else if (channelData.content) {
              textContent = channelData.content;
            } else if (channelData.body) {
              textContent = channelData.body;
            }
          }
          
          const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;
          onChannelComplete({ channel, content: textContent, wordCount });
        }
        
        return { channel, data, success: true, durationMs };
      } catch (error: any) {
        const durationMs = Date.now() - startTime;
        console.error(`[parallel] ❌ ${channel} failed after ${(durationMs / 1000).toFixed(1)}s:`, error?.message || error);
        return { channel, data: null, success: false, error, durationMs };
      }
    };

    // Generate all channels in parallel (chunked to avoid rate limits)
    // Optional streaming callback for real-time progress
    const generateChannelsInParallel = async (
      currentPrompt: string,
      onChannelComplete?: (result: { channel: string; content: string; wordCount: number }) => void
    ): Promise<any> => {
      const channels = formData.channels;
      const totalStart = Date.now();
      
      console.log(`[parallel] 🚀 Starting parallel generation for ${channels.length} channels`);
      
      // Build channel -> model config map
      const channelModelMap = new Map<string, { model: string; temperature: number; maxTokens: number | null }>();
      for (const channel of channels) {
        const channelConfig = channelModelConfigs.get(channel);
        // Use channel-specific config if available, otherwise use default function config
        const model = channelConfig?.model || aiConfig.model;
        const temperature = channelConfig?.temperature ?? aiConfig.temperature;
        const maxTokens = channelConfig?.maxTokens ?? null;
        channelModelMap.set(channel, { model, temperature, maxTokens });
      }
      
      // Log model distribution
      const modelCounts = new Map<string, number>();
      channelModelMap.forEach((config, channel) => {
        modelCounts.set(config.model, (modelCounts.get(config.model) || 0) + 1);
      });
      console.log(`[parallel] Model distribution:`, Object.fromEntries(modelCounts));
      
      // Chunk channels to avoid rate limiting
      const chunks = chunkArray(channels, MAX_CONCURRENT_CHANNELS);
      const allResults: { channel: string; data: any; success: boolean; error?: any; durationMs: number }[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[parallel] Processing chunk ${i + 1}/${chunks.length}: ${chunk.join(', ')}`);
        
        // Execute chunk in parallel
        const chunkResults = await Promise.all(
          chunk.map(channel => {
            const config = channelModelMap.get(channel)!;
            return generateSingleChannel(currentPrompt, channel, config, onChannelComplete);
          })
        );
        
        allResults.push(...chunkResults);
        
        // Small delay between chunks to be safe with rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Calculate statistics
      const successCount = allResults.filter(r => r.success).length;
      const failedChannels = allResults.filter(r => !r.success).map(r => r.channel);
      const durations = allResults.filter(r => r.success).map(r => r.durationMs);
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
      const totalDuration = Date.now() - totalStart;
      
      console.log(`[parallel] 📊 Stats: ${successCount}/${channels.length} success, total=${(totalDuration / 1000).toFixed(1)}s, max=${(maxDuration / 1000).toFixed(1)}s, avg=${(avgDuration / 1000).toFixed(1)}s`);
      
      if (failedChannels.length > 0) {
        console.warn(`[parallel] ⚠️ Failed channels: ${failedChannels.join(', ')}`);
      }
      
      // Merge results - get title from first successful result
      const firstSuccess = allResults.find(r => r.success && r.data?.title);
      const mergedData: any = { title: firstSuccess?.data?.title || formData.topic };
      
      for (const result of allResults) {
        if (result.success && result.data) {
          const contentKey = `${result.channel}_content`;
          if (result.data[contentKey]) {
            mergedData[contentKey] = result.data[contentKey];
          }
        }
      }
      
      console.log(`[parallel] ✅ Merged ${Object.keys(mergedData).length - 1} channel contents`);
      return mergedData;
    };

    // Legacy function for backward compatibility (single model for all channels)
    const generateAIContent = async (currentPrompt: string) => {
      return generateAIContentForChannels(currentPrompt, formData.channels, {
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: null,
      });
    };

    // Multi-model generation: uses parallel by default for speed
    // Optional streaming callback for real-time progress
    const generateWithMultipleModels = async (
      currentPrompt: string,
      onChannelComplete?: (result: { channel: string; content: string; wordCount: number }) => void
    ): Promise<any> => {
      // Use parallel generation for multiple channels
      if (PARALLEL_GENERATION && formData.channels.length > 1) {
        return generateChannelsInParallel(currentPrompt, onChannelComplete);
      }
      
      // Fallback: single channel or parallel disabled
      if (formData.channels.length === 1) {
        const channel = formData.channels[0];
        const channelConfig = channelModelConfigs.get(channel);
        const config = {
          model: channelConfig?.model || aiConfig.model,
          temperature: channelConfig?.temperature ?? aiConfig.temperature,
          maxTokens: channelConfig?.maxTokens ?? null,
        };
        console.log(`[single] Generating single channel ${channel} with model ${config.model}`);
        return generateAIContentForChannels(currentPrompt, [channel], config);
      }
      
      // Legacy: group by model (kept for reference but not used)
      const modelGroups = groupChannelsByModel(formData.channels);
      console.log(`[multi-model] Generating with ${modelGroups.size} different model configs`);
      
      const groupResults = await Promise.all(
        Array.from(modelGroups.entries()).map(async ([key, group]) => {
          console.log(`[multi-model] Group "${key}": channels=${group.channels.join(',')}, model=${group.config.model}`);
          return {
            channels: group.channels,
            data: await generateAIContentForChannels(currentPrompt, group.channels, group.config),
          };
        })
      );
      
      const mergedData: any = { title: groupResults[0].data.title };
      for (const result of groupResults) {
        for (const channel of result.channels) {
          const contentKey = `${channel}_content`;
          if (result.data[contentKey]) {
            mergedData[contentKey] = result.data[contentKey];
          }
        }
      }
      
      console.log(`[multi-model] Merged ${Object.keys(mergedData).length - 1} channel contents`);
      return mergedData;
    };

    // Helper to calculate actual word count
    const getActualWordCount = (data: any): number => {
      if (!data?.website_content?.content) return 0;
      return data.website_content.content.split(/\s+/).filter((w: string) => w.length > 0).length;
    };

    // Use cache wrapper for AI content generation
    const functionName = 'generate-multichannel';
    const scope = CACHE_SCOPE[functionName] || 'org';
    const ttlDays = CACHE_TTL[functionName] || 7;

    // Build cache input (only content-affecting fields)
    // If user has edited previews, include them in cache key to bypass old cache
    const hasEditedPreviews = formData.editedPreviews && 
      Object.values(formData.editedPreviews).some(p => p.original !== p.edited);
    
    const cacheInput = {
      topic: formData.topic,
      industry,
      contentGoal: formData.contentGoal,
      channels: formData.channels,
      brandName,
      brandVoice: brandVoice ? {
        positioning: brandVoice.brand_positioning,
        tone: brandVoice.tone_of_voice,
        formality: brandVoice.formality_level,
      } : null,
      // Add edited previews hash to bypass cache when user provides examples
      hasEditedPreviews: hasEditedPreviews || false,
    };

    let generatedData: any;
    let fromCache = false;
    let retryCount = 0;
    let currentUserPrompt = userPrompt;

    try {
      // Generate with retry logic for website content
      // Uses multi-model generation when Admin has configured per-channel models
      const generateWithRetry = async () => {
        let data = await generateWithMultipleModels(currentUserPrompt);
        
        // Validate and retry if website content is too short
        if (hasWebsiteChannel) {
          let actualWordCount = getActualWordCount(data);
          console.log(`Website content word count: ${actualWordCount} (min: ${MIN_WEBSITE_WORDS})`);
          
          while (actualWordCount < MIN_WEBSITE_WORDS && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`⚠️ Website content too short (${actualWordCount} words), retry ${retryCount}/${MAX_RETRIES}`);
            
            // Add stronger instruction for retry
            currentUserPrompt = userPrompt + `\n\n⚠️ LẦN THỬ LẠI ${retryCount}/${MAX_RETRIES}: Bài website PHẢI có TỐI THIỂU ${MIN_WEBSITE_WORDS} TỪ. Lần trước chỉ có ${actualWordCount} từ - QUÁ NGẮN!

BẮT BUỘC viết ĐẦY ĐỦ:
- Intro: 80-120 words
- Mỗi H2 section: 200-350 words (tối thiểu 4 sections)  
- Conclusion: 80-120 words

KHÔNG ĐƯỢC dừng giữa chừng. KHÔNG viết tắt. Viết ĐẦY ĐỦ mọi section.`;
            
            data = await generateWithMultipleModels(currentUserPrompt);
            actualWordCount = getActualWordCount(data);
            console.log(`Retry ${retryCount} word count: ${actualWordCount}`);
          }
          
          // Update actual word count in data
          if (data?.website_content?.content) {
            data.website_content.word_count = actualWordCount;
          }
          
          if (actualWordCount < MIN_WEBSITE_WORDS) {
            console.warn(`❌ Final website content still short (${actualWordCount} words) after ${retryCount} retries - flagging for review`);
          }
        }
        
        return data;
      };

      // Validate cached data: if website content is too short, invalidate and regenerate
      const validateCachedData = (data: any): boolean => {
        if (!hasWebsiteChannel) return true;
        const wordCount = getActualWordCount(data);
        if (wordCount < MIN_WEBSITE_WORDS) {
          console.log(`Cache validation FAILED: website content only ${wordCount} words (min: ${MIN_WEBSITE_WORDS})`);
          return false;
        }
        return true;
      };

      const cacheResult = await withCache({
        functionName,
        scope,
        organizationId: organizationId || undefined,
        brandTemplateId: formData.brandTemplateId,
        input: cacheInput,
        versions: {
          industryMemory: industryMemory?.version,
          brandVoice: brandVoice?.formality_level || undefined,
        },
        ttlDays,
        generateFn: generateWithRetry,
        validateFn: validateCachedData,
      });

      generatedData = cacheResult.data;
      fromCache = cacheResult.fromCache;
      console.log(`Content generation: ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}${retryCount > 0 ? `, retries: ${retryCount}` : ''}`);
    } catch (err: any) {
      // Handle rate limit / credit errors specially
      if (err.status === 429) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err.status === 402) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

    console.log("Generated content:", generatedData.title);

    // ============================================
    // POST-PROCESS: Auto-fix missing SEO fields for website + word count validation
    // ============================================
    let websiteWordCountShort = false;
    if (generatedData.website_content && typeof generatedData.website_content === 'object') {
      const seo = generatedData.website_content;
      
      // Calculate actual word count and update
      const actualWordCount = seo.content?.split(/\s+/).filter((w: string) => w.length > 0).length || 0;
      seo.word_count = actualWordCount;
      
      // Flag if content is too short
      if (actualWordCount < MIN_WEBSITE_WORDS) {
        websiteWordCountShort = true;
        console.warn(`⚠️ Website content validation: ${actualWordCount} words (required: ${MIN_WEBSITE_WORDS}+)`);
      } else {
        console.log(`✅ Website content validation passed: ${actualWordCount} words`);
      }
      
      // Auto-calculate keyword density if not provided
      if (!seo.keyword_density_percent && seo.content && seo.focus_keyword) {
        const contentLower = seo.content.toLowerCase();
        const keywordLower = seo.focus_keyword.toLowerCase();
        const words = contentLower.split(/\s+/);
        const keywordCount = words.filter((w: string) => w.includes(keywordLower)).length;
        seo.keyword_density_percent = Math.round((keywordCount / words.length) * 100 * 100) / 100;
      }
      
      // Auto-calculate SEO score if not provided
      if (!seo.seo_score_estimate) {
        let score = 0;
        const titleLen = seo.seo_title?.length || 0;
        const metaLen = seo.meta_description?.length || 0;
        const keyword = seo.focus_keyword?.toLowerCase() || '';
        const h2Count = seo.heading_structure?.h2s?.length || 0;
        const wordCount = seo.word_count || seo.content?.split(/\s+/).length || 0;
        
        // Title length (50-60): 15 pts
        if (titleLen >= 50 && titleLen <= 60) score += 15;
        else if (titleLen >= 40 && titleLen <= 70) score += 10;
        else if (titleLen > 0) score += 5;
        
        // Meta length (150-160): 15 pts
        if (metaLen >= 150 && metaLen <= 160) score += 15;
        else if (metaLen >= 120 && metaLen <= 180) score += 10;
        else if (metaLen > 0) score += 5;
        
        // Keyword in title: 15 pts
        if (keyword && seo.seo_title?.toLowerCase().includes(keyword)) score += 15;
        
        // Keyword in H1: 10 pts
        if (keyword && seo.heading_structure?.h1?.toLowerCase().includes(keyword)) score += 10;
        
        // Keyword in first 100 words: 10 pts
        if (keyword && seo.content) {
          const first100 = seo.content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
          if (first100.includes(keyword)) score += 10;
        }
        
        // H2 count (4-6): 10 pts
        if (h2Count >= 4 && h2Count <= 6) score += 10;
        else if (h2Count >= 3) score += 7;
        else if (h2Count >= 2) score += 4;
        
        // Word count (1000-2000): 10 pts
        if (wordCount >= 1000 && wordCount <= 2000) score += 10;
        else if (wordCount >= 800) score += 7;
        else if (wordCount >= 500) score += 4;
        
        // Featured snippet: 10 pts
        if (seo.featured_snippet) score += 10;
        
        // Internal link anchors: 5 pts
        if (seo.internal_link_anchors?.length >= 2) score += 5;
        else if (seo.internal_link_anchors?.length >= 1) score += 3;
        
        seo.seo_score_estimate = score;
      }
      
      // Auto-generate OG title/description if not provided
      if (!seo.og_title && seo.seo_title) {
        seo.og_title = seo.seo_title;
      }
      if (!seo.og_description && seo.meta_description) {
        seo.og_description = seo.meta_description;
      }
      
      generatedData.website_content = seo;
      console.log(`SEO auto-fix applied: density=${seo.keyword_density_percent}%, score=${seo.seo_score_estimate}`);
    }

    // ============================================
    // SELF-CRITIQUE LOOP - Evaluate and refine content
    // ============================================
    let critiqueResult: CritiqueResult | null = null;
    let wasRefined = false;
    let refinementCount = 0;
    let needsManualReview = false;

    // Only run critique if not from cache
    if (!fromCache) {
      try {
        const critiqueLoop = await runSelfCritiqueLoop({
          content: generatedData,
          contentType: 'multichannel',
          brandVoice,
          mergedRules,
          additionalContext: `Channels: ${formData.channels.join(', ')}`,
          apiKey: LOVABLE_API_KEY,
        });

        generatedData = critiqueLoop.finalContent;
        critiqueResult = critiqueLoop.critiqueResult;
        wasRefined = critiqueLoop.wasRefined;
        refinementCount = critiqueLoop.refinementCount;
        needsManualReview = critiqueLoop.needsManualReview || websiteWordCountShort;

        console.log(`Self-Critique complete: score=${critiqueResult.overall_score}, refined=${wasRefined}, needsReview=${needsManualReview}, shortContent=${websiteWordCountShort}`);
      } catch (critiqueError) {
        console.error("Self-critique failed, flagging for manual review:", critiqueError);
        // Flag for manual review when critique system fails
        needsManualReview = true;
      }
    }

    // ============================================
    // AUTO-APPEND FOOTER INFO (Post AI-generation)
    // ============================================
    const footerInfo = extendedBrandContext?.footerInfo;
    const hasFooterInfo = footerInfo && (footerInfo.phone || footerInfo.email || footerInfo.website || footerInfo.address);
    const brandAllowEmoji = brandVoice?.allow_emoji !== false;

    // Get extra brand context for footer
    const companyName = extendedBrandContext?.brandName || footerInfo?.company_name;
    const tagline = (extendedBrandContext as any)?.tagline || (brandVoice as any)?.tagline;

    if (hasFooterInfo) {
      // Use existing channelOverrides variable (extracted from brand template earlier)
      const footerOverrides = channelOverrides as Record<string, { 
        footer_enabled?: boolean; 
        footer_template?: string 
      }> | null;

      // Helper to replace template variables with actual footer values
      const replaceFooterVariables = (
        template: string, 
        footer: typeof footerInfo,
        compName?: string
      ): string => {
        return template
          .replace(/\{phone\}/g, footer?.phone || '')
          .replace(/\{email\}/g, footer?.email || '')
          .replace(/\{website\}/g, footer?.website || '')
          .replace(/\{address\}/g, footer?.address || '')
          .replace(/\{company\}/g, compName || footer?.company_name || '');
      };

      const formatFooterInfo = (
        footer: typeof footerInfo,
        channel: string,
        useEmoji: boolean
      ): string => {
        if (!footer) return '';
        
        // Check if this channel has custom footer settings
        const channelOverride = footerOverrides?.[channel] as { 
          footer_enabled?: boolean; 
          footer_template?: string 
        } | undefined;
        
        // Check if this channel has footer disabled
        if (channelOverride?.footer_enabled === false) {
          return '';
        }
        
        // Check if this channel has a custom footer template
        if (channelOverride?.footer_template && channelOverride.footer_template.trim()) {
          return '\n\n' + replaceFooterVariables(channelOverride.footer_template, footer, companyName);
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
          
          if (companyName) lines.push(`\n**${companyName}**`);
          lines.push(divider);
          lines.push('');
          
          const contactLine: string[] = [];
          if (useEmoji) {
            if (footer.phone) contactLine.push(`📞 ${footer.phone}`);
            if (footer.email) contactLine.push(`📧 ${footer.email}`);
          } else {
            if (footer.phone) contactLine.push(`Tel: ${footer.phone}`);
            if (footer.email) contactLine.push(`Email: ${footer.email}`);
          }
          if (contactLine.length) lines.push(contactLine.join('  |  '));
          
          if (footer.website) {
            lines.push(useEmoji ? `🌐 ${footer.website}` : footer.website);
          }
          
          if (footer.address) lines.push(`\n*${footer.address}*`);
          
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
        
        // ======= TWITTER / TIKTOK / YOUTUBE - Compact CTA =======
        if (channel === 'twitter' || channel === 'tiktok' || channel === 'youtube') {
          if (!footer.website) return '';
          return useEmoji 
            ? `\n\n👉 Theo dõi: ${footer.website}` 
            : `\n\n→ Xem thêm: ${footer.website}`;
        }
        
        // ======= ZALO OA / TELEGRAM - Clean Professional =======
        if (channel === 'zalo_oa' || channel === 'telegram') {
          const lines: string[] = ['\n\n' + divider];
          lines.push('**THÔNG TIN LIÊN HỆ:**');
          lines.push('');
          
          if (footer.phone) lines.push(`→ Hotline: ${footer.phone}`);
          if (footer.email) lines.push(`→ Email: ${footer.email}`);
          if (footer.website) lines.push(`→ Website: ${footer.website}`);
          
          return lines.join('  \n');
        }
        
        return '';
      };
      
      // Append footer to each channel content
      if (generatedData.facebook_content) {
        generatedData.facebook_content += formatFooterInfo(footerInfo, 'facebook', brandAllowEmoji);
      }
      if (generatedData.instagram_content) {
        generatedData.instagram_content += formatFooterInfo(footerInfo, 'instagram', brandAllowEmoji);
      }
      if (generatedData.linkedin_content) {
        generatedData.linkedin_content += formatFooterInfo(footerInfo, 'linkedin', brandAllowEmoji);
      }
      if (generatedData.email_content) {
        generatedData.email_content += formatFooterInfo(footerInfo, 'email', brandAllowEmoji);
      }
      if (generatedData.twitter_content) {
        generatedData.twitter_content += formatFooterInfo(footerInfo, 'twitter', brandAllowEmoji);
      }
      if (generatedData.youtube_content) {
        generatedData.youtube_content += formatFooterInfo(footerInfo, 'youtube', brandAllowEmoji);
      }
      if (generatedData.zalo_oa_content) {
        generatedData.zalo_oa_content += formatFooterInfo(footerInfo, 'zalo_oa', brandAllowEmoji);
      }
      if (generatedData.telegram_content) {
        generatedData.telegram_content += formatFooterInfo(footerInfo, 'telegram', brandAllowEmoji);
      }
      if (generatedData.tiktok_content) {
        generatedData.tiktok_content += formatFooterInfo(footerInfo, 'tiktok', brandAllowEmoji);
      }
      if (generatedData.threads_content) {
        generatedData.threads_content += formatFooterInfo(footerInfo, 'threads', brandAllowEmoji);
      }
      // Website: append to content field inside SEO object
      if (typeof generatedData.website_content === 'object' && generatedData.website_content?.content) {
        generatedData.website_content.content += formatFooterInfo(footerInfo, 'website', brandAllowEmoji);
      } else if (typeof generatedData.website_content === 'string') {
        generatedData.website_content += formatFooterInfo(footerInfo, 'website', brandAllowEmoji);
      }
      
      console.log("Footer info appended to channel contents");
    }

    // Check organization's approval settings
    let initialStatus = 'draft';
    if (organizationId) {
      const { data: orgSettings } = await supabase
        .from('organizations')
        .select('skip_approval, auto_submit_review')
        .eq('id', organizationId)
        .single();
      
      if (orgSettings?.skip_approval) {
        initialStatus = 'approved';
        console.log('Skip approval enabled, setting status to approved');
      } else if (orgSettings?.auto_submit_review) {
        initialStatus = 'review';
        console.log('Auto submit review enabled, setting status to review');
      }
    }

    // Save to database with Industry Memory version tracking + critique metadata
    // EXPAND MODE: Update existing content | CREATE MODE: Insert new
    let content: any;
    let dbError: any;
    
    if (formData.action === 'expand' && formData.contentId) {
      // EXPAND MODE: Update existing content, merge channels
      const { data: existingContent } = await supabase
        .from('multi_channel_contents')
        .select('selected_channels, channel_statuses')
        .eq('id', formData.contentId)
        .single();
      
      const existingChannels = existingContent?.selected_channels || [];
      const existingStatuses = existingContent?.channel_statuses || {};
      
      // Build update payload with new channel contents
      const updatePayload: Record<string, any> = {
        selected_channels: [...existingChannels, ...formData.channels],
        critique_score: critiqueResult?.overall_score || null,
        critique_details: critiqueResult || null,
        was_refined: wasRefined,
        refinement_count: refinementCount,
        needs_manual_review: needsManualReview,
      };
      
      // Add new channel contents
      for (const channel of formData.channels) {
        const columnName = CHANNEL_COLUMN_MAP[channel];
        if (columnName) {
          if (channel === 'website') {
            updatePayload[columnName] = typeof generatedData.website_content === 'object' 
              ? generatedData.website_content?.content || null 
              : generatedData.website_content || null;
            if (typeof generatedData.website_content === 'object') {
              updatePayload.website_seo_data = generatedData.website_content;
            }
          } else {
            updatePayload[columnName] = generatedData[`${channel}_content`] || null;
          }
        }
      }
      
      // Update channel_statuses for new channels
      const updatedStatuses = { ...existingStatuses };
      for (const channel of formData.channels) {
        updatedStatuses[channel] = 'draft';
      }
      updatePayload.channel_statuses = updatedStatuses;
      
      const result = await supabase
        .from('multi_channel_contents')
        .update(updatePayload)
        .eq('id', formData.contentId)
        .select()
        .single();
      
      content = result.data;
      dbError = result.error;
      console.log(`[expand-mode] Updated content ${formData.contentId} with ${formData.channels.length} new channels`);
    } else {
      // CREATE MODE: Insert new content
      const result = await supabase
        .from("multi_channel_contents")
        .insert({
          user_id: userId,
          organization_id: organizationId,
          title: generatedData.title,
          topic: formData.topic,
          industry: industry,
          content_goal: formData.contentGoal || 'engagement',
          selected_channels: formData.channels,
          brand_template_id: formData.brandTemplateId || null,
          brand_voice_variant_id: formData.brandVoiceVariantId || null,
          brand_name: brandName,
          brand_guideline: brandGuideline,
          primary_color: primaryColor,
          status: initialStatus,
          industry_template_version: industryMemory?.version || null,
          critique_score: critiqueResult?.overall_score || null,
          critique_details: critiqueResult || null,
          was_refined: wasRefined,
          refinement_count: refinementCount,
          needs_manual_review: needsManualReview,
          website_content: typeof generatedData.website_content === 'object' 
            ? generatedData.website_content?.content || null 
            : generatedData.website_content || null,
          website_seo_data: typeof generatedData.website_content === 'object' 
            ? generatedData.website_content 
            : null,
          facebook_content: generatedData.facebook_content || null,
          instagram_content: generatedData.instagram_content || null,
          twitter_content: generatedData.twitter_content || null,
          google_maps_content: generatedData.google_maps_content || null,
          linkedin_content: generatedData.linkedin_content || null,
          email_content: generatedData.email_content || null,
          youtube_content: generatedData.youtube_content || null,
          zalo_oa_content: generatedData.zalo_oa_content || null,
          telegram_content: generatedData.telegram_content || null,
        })
        .select()
        .single();
      
      content = result.data;
      dbError = result.error;
    }
    
    if (industryMemory) {
      console.log("Content saved with Industry Memory version:", industryMemory.version);
    }
    if (critiqueResult) {
      console.log(`Content saved: score=${critiqueResult.overall_score}, needsReview=${needsManualReview}`);
    }

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save content");
    }

    console.log("Content saved with ID:", content.id, "fromCache:", fromCache, "critiqueScore:", critiqueResult?.overall_score || 'N/A');

    return new Response(JSON.stringify({ ...content, fromCache }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-multichannel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});