import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { 
  buildExtendedBrandPrompt,
  type BrandContext as ExtendedBrandContext,
  type CustomerPersona 
} from "../_shared/prompt-utils.ts";

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
  contentGoal: string;
  channels: string[];
  brandTemplateId?: string;
  organization_id?: string;
  editedPreviews?: Record<string, EditedPreview>;
  contentPurpose?: string;
  marketingFramework?: string;
}

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
    max_length: 1500,
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
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  facebook: {
    min_length: 120,
    max_length: 300,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'BẮT BUỘC 2 dòng đầu là hook mạnh (câu sốc, số liệu, câu hỏi)',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'short',
    link_position: 'body',
    format_description: 'Xuống dòng ngắn, chia đoạn 2-3 dòng',
  },
  instagram: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook ngắn gọn, hấp dẫn',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'many',
    link_position: 'none',
    format_description: 'Nhiều xuống dòng, KHÔNG chèn hashtag trong body, hashtag cuối bài',
  },
  twitter: {
    min_length: 0,
    max_length: 280,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'quan điểm rõ ràng ngay câu đầu',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 1,
    hashtag_position: 'end',
    line_break_style: 'minimal',
    link_position: 'allowed',
    format_description: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số 1/, 2/..., câu ngắn sắc nét',
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
    hook_style: 'nhẹ, không giật tít, insight hoặc số liệu',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: true,
    emoji_limit: 2,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: 'Chuyên nghiệp, rõ đoạn, B2B authority, perspective cá nhân',
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
    format_description: 'Có Subject line hấp dẫn (không spam trigger), đoạn ngắn, dễ đọc, CTA rõ',
  },
  youtube: {
    min_length: 500,
    max_length: 800,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook 5 giây đầu gây tò mò',
    bullet_allowed: true,
    cta_policy: 'required',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: 'Script 3-5 phút với Hook + Intro + Content (chia segments) + CTA subscribe + Outro',
  },
  zalo_oa: {
    min_length: 60,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'trực diện, không giật tít',
    bullet_allowed: false,
    cta_policy: 'required',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'short',
    link_position: 'allowed',
    format_description: 'Thông báo rõ việc, thân thiện local, format phù hợp mobile',
  },
  telegram: {
    min_length: 100,
    max_length: 500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: 'Bullet points, dễ đọc, linh hoạt',
  },
};

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
  
  // Hook
  if (settings.hook_required) {
    parts.push(`- Hook: ${settings.hook_style || 'BẮT BUỘC'}`);
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
    parts.push(`- Emoji: KHÔNG (Brand Voice yêu cầu)`);
  } else if (settings.emoji_allowed) {
    parts.push(`- Emoji: Cho phép, tối đa ${settings.emoji_limit || 3}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
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
  
  // Format description
  if (settings.format_description) {
    parts.push(`- Format: ${settings.format_description}`);
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

  return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - hệ thống AI tạo NỘI DUNG ĐA KÊNH cho ${audienceDescription}.

${brandVoiceSection}

${extendedBrandSection}

## NGUYÊN TẮC LÕI
ONE TOPIC → ONE CORE MESSAGE → MULTI-CHANNEL CONTENT
- Từ MỘT chủ đề, tạo nội dung PHÙ HỢP RIÊNG cho từng kênh
- Nội dung dùng được NGAY để đăng thật
- KHÔNG sao chép máy móc giữa các kênh
- Giữ thông điệp lõi NHẤT QUÁN

## BRAND CONTEXT
Brand name: ${brandName}
Đối tượng mục tiêu: ${audienceDescription}
${brandGuideline ? `Brand guideline: ${brandGuideline}` : ""}
${primaryColor ? `Màu chủ đạo: ${primaryColor}` : ""}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[contentGoal] || contentGoal}

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

## KIỂM TRA CUỐI (BẮT BUỘC)
Trước khi xuất nội dung, tự kiểm tra:
- Có vượt max length không? → TỰ RÚT GỌN, giữ ý chính
- Có vi phạm emoji / hashtag không? → TỰ ĐIỀU CHỈNH
- Có CTA sai quy định không? → TỰ SỬA
- Có format sai nền tảng không? → TỰ ĐIỀU CHỈNH

## NGUYÊN TẮC BẮT BUỘC
1. KHÔNG dùng chung một bài cho mọi kênh
2. KHÔNG copy nguyên văn giữa các kênh
3. Mỗi kênh phải đúng hành vi người đọc, đúng giới hạn kỹ thuật
4. Giữ thông điệp lõi NHẤT QUÁN xuyên suốt
5. Giọng văn: Chuyên nghiệp, rõ ràng, không quảng cáo lộ liễu, phù hợp ${audienceDescription}

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
        };
        
        // Fetch customer personas for this brand
        const { data: personas } = await supabase
          .from('customer_personas')
          .select('*')
          .eq('brand_template_id', formData.brandTemplateId)
          .order('is_primary', { ascending: false });
        
        if (personas && personas.length > 0) {
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
          });
          
          extendedBrandContext.primaryPersona = mapPersona(personas.find((p: any) => p.is_primary) || personas[0]);
          extendedBrandContext.allPersonas = personas.map(mapPersona);
          console.log("Customer personas loaded:", personas.length, "Primary:", extendedBrandContext.primaryPersona?.name);
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

    // Detect target audience from database
    const targetAudience = await detectTargetAudience(industryArray, supabase);
    console.log("Target audience detected:", targetAudience);

    const systemPrompt = getSystemPrompt(
      brandName,
      brandGuideline,
      primaryColor,
      formData.contentGoal,
      formData.channels,
      targetAudience,
      brandVoice,
      channelOverrides,
      mergedRules,
      industryMemory,
      extendedBrandContext
    );

    // Build user prompt with optional edited previews as examples
    let userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}

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
      website: "Nội dung cho Website/Blog (800-1500 chữ, markdown format, không emoji)",
      facebook: "Nội dung cho Facebook (120-300 chữ, hook mạnh, chia đoạn ngắn)",
      instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
      twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
      google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
      linkedin: "Nội dung cho LinkedIn (150-400 chữ, B2B authority, insight)",
      email: "Nội dung Email (150-400 chữ, subject line + body + CTA)",
      youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
      zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
      telegram: "Nội dung Telegram (100-500 chữ, bullet, dễ đọc)",
    };

    formData.channels.forEach(channel => {
      if (channelDescriptions[channel]) {
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

    // Define the AI generation function
    const generateAIContent = async () => {
      console.log("Calling Lovable AI (no cache hit)...");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "generate_multichannel_content" } },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        
        if (response.status === 429) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (response.status === 402) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      console.log("AI response received");

      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== "generate_multichannel_content") {
        throw new Error("Invalid AI response format");
      }

      return JSON.parse(toolCall.function.arguments);
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

    try {
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
        generateFn: generateAIContent,
      });

      generatedData = cacheResult.data;
      fromCache = cacheResult.fromCache;
      console.log(`Content generation: ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}`);
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

    // Save to database with Industry Memory version tracking
    const { data: content, error: dbError } = await supabase
      .from("multi_channel_contents")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        title: generatedData.title,
        topic: formData.topic,
        industry: industry,
        content_goal: formData.contentGoal,
        selected_channels: formData.channels,
        brand_template_id: formData.brandTemplateId || null,
        brand_name: brandName,
        brand_guideline: brandGuideline,
        primary_color: primaryColor,
        status: initialStatus,
        // Track Industry Memory version for audit trail
        industry_template_version: industryMemory?.version || null,
        website_content: generatedData.website_content || null,
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
    
    if (industryMemory) {
      console.log("Content saved with Industry Memory version:", industryMemory.version);
    }

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save content");
    }

    console.log("Content saved with ID:", content.id, "fromCache:", fromCache);

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