import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
// Multi-country support
import { getOutputLanguage, getLanguageConfig, buildLocalizedDateContext, getLocalizedGoalDescriptions, getLocalizedAngleDescriptions, getLocalizedPromptLabels } from "../_shared/country-language-map.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { getAIConfig, getChannelModelConfigs } from "../_shared/ai-config.ts";
import { callAI, iterateStreamDeltas } from "../_shared/ai-provider.ts";
import {
  generateChannelStreaming,
  generateChannelsParallel,
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
import { calculateChannelMaxTokens, calculateTotalMaxTokens } from "../_shared/dynamic-tokens.ts";
// Phase 1: Analytics & Intelligence imports
import { 
  generateTraceId, 
  saveMetrics, 
  getContextSources,
  type AIMetrics 
} from "../_shared/logger.ts";
// Per-Channel Optimization imports
import {
  getMultiChannelOptimizations,
  buildOptimizedPromptSection,
  applyTokenOptimization,
  getEffectiveQualityMode,
  type ChannelOptimization,
  type QualityMode as ChannelQualityMode,
  type PromptStyle,
  type HookIntensity,
} from "../_shared/channel-optimization.ts";
import { estimateTotalCost } from "../_shared/cost-estimator.ts";
// Phase 2: Compliance Pre-check import
import { 
  preCheckCompliance, 
  type IndustryMemoryRules, 
  type BrandRules,
  type PreCheckResult,
} from "../_shared/compliance-precheck.ts";
// Phase 1: Semantic Deduplication import
import {
  checkSemanticDuplicate,
  extractMultichannelText,
  buildDifferentiationInstruction,
  type DuplicateCheckResult,
} from "../_shared/semantic-dedup.ts";
// NEW: Smart Context for enhanced AI content generation
import {
  buildSmartContext,
  buildSmartPromptInjection,
  buildHookPatternsSection,
  buildCTAPatternsSection,
  buildPersonaAdaptationSection,
  buildDifferentiationSection,
  type SmartContextOptions,
  type SmartContextResult,
} from "../_shared/smart-context.ts";
// NEW: Length Validator for intelligent length enforcement
import {
  buildWordBudgetInstruction,
  validateAllChannels,
  getChannelsNeedingExpansion,
  getPriorityChannelsNeedingExpansion,
  buildExpansionPrompt,
  buildValidationSummary,
  HIGH_PRIORITY_CHANNELS,
  type LengthValidationResult,
  type MultiChannelLengthValidation,
} from "../_shared/length-validator.ts";
// Learning Context for RAG-enhanced generation
import { fetchLearningContext } from "../_shared/learning-context.ts";
// NEW: Task tracking for background generation
import { 
  updateTaskProgress, 
  completeTask, 
  failTask 
} from '../_shared/task-tracking.ts';
// NEW: Prompt Registry Integration - Phase 4
import { createPromptManager } from "../_shared/prompt-integration.ts";
// NEW: Knowledge Graph Integration - Phase 6
import {
  fetchKnowledgeGraphContext,
  buildKnowledgeGraphPromptSection,
  type KnowledgeGraphContext,
} from "../_shared/data-fetchers/knowledge-graph-fetcher.ts";
// NEW: Strategy Validation Layer - P0 Consistency Check
import {
  validateStrategy,
  type StrategyValidationResult,
} from "../_shared/strategy-validator.ts";
// NEW: Channel Transformation Matrix - P0 Core Content Transform Rules
import {
  buildTransformationInstruction,
  calculateChannelWordCount,
  validateCoreContentForTransform,
} from "../_shared/channel-transform-rules.ts";
// NEW: Persona Fit Scoring - P1 Alignment Evaluation
import {
  calculateMultiChannelPersonaFit,
  buildPersonaFitBoostPrompt,
  type PersonaData,
  type MultiChannelPersonaFitResult,
} from "../_shared/persona-fit-scorer.ts";
// NEW P2: Hook Consistency Engine - Ensures cross-channel hook consistency
import {
  buildHookConsistencyInstruction,
  validateHookConsistency,
} from "../_shared/hook-consistency.ts";
// NEW P2: Role-Channel Adaptation - Adapts behavior based on content role
import {
  getRoleChannelConfig,
  buildRoleChannelInstruction,
  validateRoleCompliance,
  type RoleChannelConfig,
} from "../_shared/role-channel-adapter.ts";
// NEW P2: Quality-Context Auto-Balancer - Adjusts quality mode based on context
import {
  buildContextIndicators,
  calculateContextRichness,
  getAutoBalancedQualityMode,
  getContextCostMultiplier,
  buildContextRichnessSummary,
  type ContextIndicators,
  type ContextRichnessScore,
} from "../_shared/quality-context-balancer.ts";
// NEW P3: Cross-Channel Deduplication - Prevents repetitive content across channels
import {
  checkCrossChannelDuplicate,
  buildCrossChannelDiversifyInstruction,
  getChannelsToRegenerate,
  calculateDiversityBonus,
  type CrossChannelDedupResult,
} from "../_shared/cross-channel-dedup.ts";
// NEW: GEO Prompt Guidelines - Inject into content generation
import {
  getChannelGEOGuidelines,
  getCompactGEOGuidelines,
} from "../_shared/geo-prompt-guidelines.ts";

// ============================================
// EDGE OPTIMIZATIONS
// ============================================

// Pre-initialized Supabase client for the request lifecycle
let _supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!_supabaseClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    _supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return _supabaseClient;
};

// Pre-computed static values
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EditedPreview {
  original: string;
  edited: string;
}

type QualityMode = 'fast' | 'balanced' | 'quality';

// Quality Mode configurations - controls speed vs quality tradeoff
const QUALITY_MODE_CONFIG: Record<QualityMode, { skipCritique: boolean; maxRefinements: number }> = {
  fast: { skipCritique: true, maxRefinements: 0 },
  balanced: { skipCritique: false, maxRefinements: 1 },
  quality: { skipCritique: false, maxRefinements: 2 },
};

function normalizeQualityMode(mode?: string | null): QualityMode {
  if (mode === 'fast' || mode === 'balanced' || mode === 'quality') {
    return mode;
  }

  if (mode) {
    console.warn(`[quality-mode] Invalid value '${mode}', fallback to 'fast'`);
    return 'fast';
  }

  return 'balanced';
}

// Selected hook structure for multichannel
interface SelectedHook {
  channel: string;
  opening_line: string;
  visual_direction?: string;
  hook_type?: string;
  psychology?: string;
  text_overlay?: string;
}

// Global hook applied to all channels
interface GlobalHook {
  opening_line: string;
  visual_direction?: string;
  hook_type?: string;
  psychology?: string;
  text_overlay?: string;
}

// Content Role for Content Orchestration Flow
type ContentRole = 'seed' | 'sprout' | 'harvest';

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
  qualityMode?: QualityMode; // NEW: Speed vs quality tradeoff
  // Action mode parameters
  action?: 'create' | 'expand' | 'regenerate' | 'preview'; // 'create' = default, 'preview' = ultra-fast no-save
  contentId?: string; // Required when action='expand' or 'regenerate'
  newChannels?: string[]; // Required when action='expand' - channels to add
  channel?: string; // Required when action='regenerate' - single channel to regenerate
  previewChannel?: string; // Required when action='preview' - single channel to preview
  enableCritique?: boolean; // Optional for regenerate: run Self-Critique (default: false)
  // Footer Info control - whether to append contact info after generation
  includeFooterInfo?: boolean; // Default: true
  // Hook integration - hooks cho từng kênh hoặc hook chung
  selectedHooks?: SelectedHook[];
  globalHook?: GlobalHook;
  // Core Content Layer - derive content from approved Core Content
  coreContentId?: string; // Optional: transform from Core Content instead of topic-only generation
  // Content Role for Content Orchestration Flow (used with Core Content)
  contentRole?: ContentRole; // seed = awareness, sprout = trust, harvest = conversion
  // NEW: Background task tracking
  taskId?: string;
  agentMode?: boolean; // Agent pipeline mode: use plain text generation (no tool calling)
}

// ============================================
// CONTENT ROLE TEMPLATES - Inject role-specific instructions
// ============================================
function getContentRoleTemplate(role: ContentRole | undefined): string {
  if (!role) return '';
  
  const templates: Record<ContentRole, string> = {
    seed: `
## VAI TRÒ NỘI DUNG: SEED (Gieo hạt - Awareness)
- Mục đích: Mở rộng nhận thức, thu hút attention, khơi gợi vấn đề
- Người đọc sẽ: HIỂU VẤN ĐỀ MỚI
- Phong cách: Insight mạnh, câu hỏi kích thích tư duy, KHÔNG bán hàng
- CTA: Nhẹ nhàng - "Bạn nghĩ sao?", "Tag người cần biết", "Đã gặp trường hợp này chưa?"
- KPI theo dõi: Reach, Hook rate, Impressions
- ⚠️ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG đề cập sản phẩm/dịch vụ cụ thể
- ⚠️ QUAN TRỌNG: Không push conversion, chỉ tạo awareness

PHONG CÁCH SEED:
• Mở đầu bằng insight hoặc statistic gây shock
• Đặt câu hỏi tạo suy ngẫm
• Share góc nhìn mới về vấn đề quen thuộc
• Kết thúc mở, để người đọc tự suy nghĩ
`,
    sprout: `
## VAI TRÒ NỘI DUNG: SPROUT (Nuôi dưỡng - Trust Building)
- Mục đích: Xây dựng niềm tin, thể hiện expertise
- Người đọc sẽ: TIN TƯỞNG chuyên gia/thương hiệu
- Phong cách: Phân tích sâu, case study, giải thích chi tiết, data-driven
- CTA: Vừa phải - "Lưu lại để tham khảo", "Share cho người cần", "Bình luận chia sẻ kinh nghiệm"
- KPI theo dõi: Time spent, Save, Comment, Share
- ⚠️ QUAN TRỌNG: Có thể nhắc đến expertise nhưng chưa push conversion
- ⚠️ QUAN TRỌNG: Focus vào giá trị, không vội vàng bán hàng

PHONG CÁCH SPROUT:
• Phân tích vấn đề có chiều sâu
• Đưa ra framework/methodology rõ ràng
• Chia sẻ case study thực tế (anonymized nếu cần)
• Cung cấp actionable insights người đọc có thể áp dụng ngay
• Thể hiện chuyên môn qua cách phân tích, không qua việc tự khen
`,
    harvest: `
## VAI TRÒ NỘI DUNG: HARVEST (Thu hoạch - Conversion)
- Mục đích: Thúc đẩy hành động cụ thể, chuyển đổi
- Người đọc sẽ: HÀNH ĐỘNG (mua/inbox/đăng ký)
- Phong cách: Giải pháp rõ ràng, social proof mạnh, urgency, offer cụ thể
- CTA: Mạnh mẽ - "Inbox ngay", "Đăng ký hôm nay", "Liên hệ tư vấn", "Nhận ưu đãi"
- KPI theo dõi: Lead, Inbox, Click CTA, Conversion
- ⚠️ QUAN TRỌNG: Bao gồm offer cụ thể, proof rõ ràng, và urgency hợp lý
- ⚠️ QUAN TRỌNG: Đây là lúc push conversion mạnh

PHONG CÁCH HARVEST:
• Bắt đầu bằng pain point hoặc kết quả đạt được
• Social proof: testimonial, con số, case study thành công
• Giải pháp/sản phẩm được present như answer cho problem
• Urgency: limited time, limited slot, seasonal offer
• CTA rõ ràng, multiple touchpoints (inbox, hotline, website)
• Giảm friction: "Tư vấn miễn phí", "Không cam kết"
`,
  };
  
  return templates[role] || '';
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
  
  // SYSTEM RULES (highest priority)
  if (industryMemory?.system_rules?.length) {
    parts.push(`## SYSTEM RULES (KHÔNG VI PHẠM)`);
    parts.push(industryMemory.system_rules.map((r, i) => `${i + 1}. ${r}`).join('\n'));
  }
  
  // INDUSTRY MEMORY
  if (mergedRules?.forbidden_terms?.length) {
    parts.push(`\n## INDUSTRY MEMORY`);
    parts.push(`TỪ CẤM: ${mergedRules.forbidden_terms.join(", ")}`);
    if (mergedRules.compliance_rules?.length) {
      parts.push(`COMPLIANCE: ${mergedRules.compliance_rules.slice(0, 5).join("; ")}`);
    }
    if (mergedRules.claim_restrictions?.length) {
      parts.push(`KHÔNG ĐƯỢC: ${mergedRules.claim_restrictions.slice(0, 3).join("; ")}`);
    }
    if (industryMemory?.argument_patterns?.valid_patterns?.length) {
      parts.push(`LẬP LUẬN HỢP LỆ: ${industryMemory.argument_patterns.valid_patterns.slice(0, 3).join("; ")}`);
    }
    if (industryMemory?.argument_patterns?.forbidden_patterns?.length) {
      parts.push(`LẬP LUẬN CẤM: ${industryMemory.argument_patterns.forbidden_patterns.slice(0, 3).join("; ")}`);
    }
  }
  
  // BRAND VOICE
  parts.push(`\n## BRAND VOICE`);
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  const formality = mergedRules?.formality_level || voice.formality_level;
  const styles = mergedRules?.language_style || voice.language_style || [];
  
  if (voice.brand_positioning) parts.push(`Định vị: ${brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning}`);
  if (tones.length) parts.push(`Tone: ${tones.map(t => toneOfVoiceLabels[t] || t).join(", ")}`);
  if (formality) parts.push(`Formality: ${formalityLevelLabels[formality] || formality}`);
  if (styles.length) parts.push(`Style: ${styles.map(s => languageStyleLabels[s] || s).join(", ")}`);
  
  const preferred = mergedRules?.preferred_words || voice.preferred_words || [];
  const forbidden = mergedRules?.forbidden_words || voice.forbidden_words || [];
  if (preferred.length) parts.push(`TỪ ƯU TIÊN: ${preferred.slice(0, 15).join(", ")}`);
  if (forbidden.length) parts.push(`TỪ CẤM: ${forbidden.join(", ")}`);
  
  const allowEmoji = mergedRules?.allow_emoji ?? voice.allow_emoji ?? true;
  parts.push(`EMOJI: ${allowEmoji ? 'Cho phép theo kênh (Website/GMaps/Zalo/Telegram: KHÔNG). ⚠️ QUAN TRỌNG: Chọn emoji ĐA DẠNG, PHÙ HỢP với chủ đề cụ thể của bài viết. TUYỆT ĐỐI KHÔNG lặp lại bộ emoji mặc định (🎯⚡💡🔥✅). Mỗi bài phải có emoji riêng biệt liên quan trực tiếp đến nội dung.' : 'TUYỆT ĐỐI KHÔNG'}`);
  
  if (!mergedRules && voice.compliance_rules?.length) {
    parts.push(`COMPLIANCE: ${voice.compliance_rules.slice(0, 3).join("; ")}`);
  }
  
  return parts.join("\n");
};

// ============================================
// HOOK SECTION BUILDER
// Builds hook instruction for AI prompt based on selected hooks
// Priority: Channel-specific hook > Global hook > AI generates
// ============================================

/**
 * Build hook section for a specific channel
 * @param channel - Target channel (e.g., 'facebook', 'instagram')
 * @param selectedHooks - Array of channel-specific hooks
 * @param globalHook - Global hook to apply if no channel-specific hook exists
 * @returns Hook instruction string to include in prompt
 */
function buildHookSection(
  channel: string,
  selectedHooks?: SelectedHook[],
  globalHook?: GlobalHook
): string {
  // Find channel-specific hook first
  const channelHook = selectedHooks?.find(h => h.channel === channel);
  const hook = channelHook || globalHook;
  
  if (!hook?.opening_line) {
    return ''; // No hook provided - AI will generate based on channel settings
  }
  
  const parts: string[] = [];
  parts.push(`\n## 🎯 HOOK ĐÃ CHỌN (BẮT BUỘC SỬ DỤNG)`);
  parts.push(`### Câu mở đầu (sử dụng nguyên văn hoặc biến thể nhẹ phù hợp kênh):`);
  parts.push(`"${hook.opening_line}"`);
  
  if (hook.visual_direction) {
    parts.push(`\n### Hướng dẫn visual: ${hook.visual_direction}`);
  }
  if (hook.hook_type) {
    parts.push(`### Loại hook: ${hook.hook_type}`);
  }
  if (hook.psychology) {
    parts.push(`### Tâm lý đánh trúng: ${hook.psychology}`);
  }
  if (hook.text_overlay) {
    parts.push(`### Text overlay (nếu dùng hình/video): ${hook.text_overlay}`);
  }
  
  parts.push(`\n**LƯU Ý QUAN TRỌNG:**`);
  parts.push(`- BẮT BUỘC mở đầu bài bằng hook này`);
  parts.push(`- Có thể điều chỉnh nhẹ cho phù hợp tone/độ dài của kênh ${channel.toUpperCase()}`);
  parts.push(`- KHÔNG thay đổi ý nghĩa cốt lõi của hook`);
  
  return parts.join('\n');
}

/**
 * Build hook context for all channels (overview in user prompt)
 * @param selectedHooks - Array of channel-specific hooks
 * @param globalHook - Global hook to apply to all channels
 * @returns Overview string for user prompt
 */
function buildHookOverview(
  selectedHooks?: SelectedHook[],
  globalHook?: GlobalHook
): string {
  if ((!selectedHooks || selectedHooks.length === 0) && !globalHook) {
    return '';
  }
  
  const parts: string[] = [];
  parts.push(`\n## 🎣 HOOK HƯỚNG DẪN`);
  
  if (globalHook?.opening_line) {
    parts.push(`### Hook chung cho tất cả kênh:`);
    parts.push(`"${globalHook.opening_line}"`);
    if (globalHook.hook_type) {
      parts.push(`Loại: ${globalHook.hook_type}`);
    }
  }
  
  if (selectedHooks && selectedHooks.length > 0) {
    parts.push(`\n### Hook riêng theo kênh:`);
    for (const hook of selectedHooks) {
      parts.push(`- **${hook.channel.toUpperCase()}**: "${hook.opening_line.substring(0, 80)}${hook.opening_line.length > 80 ? '...' : ''}"`);
    }
  }
  
  parts.push(`\n⚡ MỖI KÊNH: Sử dụng hook được chỉ định (nếu có) làm câu mở đầu. Điều chỉnh nhẹ cho phù hợp kênh.`);
  
  return parts.join('\n');
}

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
  tone_adjustment?: 'keep' | 'shorten' | 'concise';
  // SEO-specific settings (for website)
  seo_optimized?: boolean;
  heading_structure_required?: boolean;
  featured_snippet_format?: boolean;
}

// Partial override type - includes ALL overrideable settings
type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position' |
  'hashtag_position' | 'line_break_style' | 'hook_style' | 'length_unit' |
  'tone_adjustment' | 'format_description' | 'bullet_allowed' | 'has_subject_line'
>>;

type ChannelOverrides = Record<string, ChannelOverride> | null;

const DEFAULT_CHANNEL_SETTINGS: Record<string, ChannelSettings> = {
  website: {
    min_length: 800, max_length: 2000, length_unit: 'words',
    hook_required: false, hook_style: 'không cần giật tít',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'BÀI DÀI 800-2000 TỪ: H1, Intro, 4-6 H2 sections, Conclusion+CTA. Pure Markdown.',
    seo_optimized: true, heading_structure_required: true, featured_snippet_format: true,
  },
  facebook: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: true, hook_style: 'Hook mạnh + 1 emoji PHÙ HỢP chủ đề (không lặp lại emoji giữa các bài)',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 5, hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'short', link_position: 'body',
    format_description: 'Hook emoji+**bold**, body emoji bullets (chọn emoji đa dạng theo ngữ cảnh nội dung), đoạn ngắn, CTA cuối',
  },
  instagram: {
    min_length: 50, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'Hook ngắn + 1 emoji sáng tạo phù hợp chủ đề',
    bullet_allowed: false, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 5, hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'many', link_position: 'none',
    format_description: 'Hook emoji sáng tạo, nhiều xuống dòng, emoji điểm nhấn đa dạng theo nội dung, hashtag cuối bài, CTA nhẹ',
  },
  twitter: {
    min_length: 0, max_length: 280, length_unit: 'chars',
    hook_required: true, hook_style: 'Quan điểm sắc nét',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 1, hashtag_position: 'end',
    line_break_style: 'minimal', link_position: 'allowed',
    format_description: 'Thread (1/, 2/...), 280 ký tự/tweet, KHÔNG emoji, 5-7 tweets, CTA cuối',
  },
  google_maps: {
    min_length: 80, max_length: 150, length_unit: 'words',
    hook_required: false, hook_style: 'không',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'none',
    format_description: 'Thực tế, xác thực, khách quan, như đánh giá chuyên nghiệp',
  },
  linkedin: {
    min_length: 300, max_length: 600, length_unit: 'words',
    hook_required: true, hook_style: 'Insight/số liệu (không giật tít)',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: true, emoji_limit: 2, hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'allowed',
    format_description: 'Hook insight, đoạn 2-3 dòng, bullets →/•, **bold** keywords, emoji tiết chế, 3 hashtag',
  },
  email: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: false, bullet_allowed: true, cta_policy: 'required', has_subject_line: true,
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'Subject hấp dẫn (không spam), greeting, body scannable, bullets, CTA rõ ràng',
  },
  youtube: {
    min_length: 500, max_length: 800, length_unit: 'words',
    hook_required: true, hook_style: 'Hook 5s shock/tò mò',
    bullet_allowed: true, cta_policy: 'required',
    emoji_allowed: true, emoji_limit: 5, hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'HOOK(0-5s), INTRO(5-15s), 3-5 segments, emoji bullets đa dạng theo nội dung, CTA Sub+Like, OUTRO teaser',
  },
  zalo_oa: {
    min_length: 60, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'Trực diện',
    bullet_allowed: false, cta_policy: 'required',
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'short', link_position: 'allowed',
    format_description: 'Mobile-first, đoạn ngắn, KHÔNG emoji, CTA+link, tone thân thiện local',
  },
  telegram: {
    min_length: 200, max_length: 500, length_unit: 'words',
    hook_required: false, hook_style: 'Thông tin giá trị',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: false, emoji_limit: 0, hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'allowed',
    format_description: 'Bullets rõ ràng, sections+heading nếu dài, KHÔNG emoji, link allowed',
  },
};

// ============================================
// ADAPTIVE FORMAT DESCRIPTION - Thích ứng theo brandAllowEmoji
// Khi brand cấm emoji → dùng ký hiệu (✓ → • ★) + bold
// Khi brand cho emoji → dùng emoji như thường
// Compact adaptive format based on emoji mode
function getAdaptiveFormatDescription(channel: string, brandAllowEmoji: boolean): string {
  const noEmojiChannels = ['website', 'google_maps', 'email', 'zalo_oa', 'telegram', 'twitter'];
  if (noEmojiChannels.includes(channel)) {
    return DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
  }
  
  // NO-EMOJI MODE: Use symbols instead
  if (!brandAllowEmoji) {
    const noEmojiFormats: Record<string, string> = {
      facebook: 'Hook ★/**bold**, bullets ✓/→, đoạn ngắn, KHÔNG emoji',
      instagram: 'Hook ★/**bold**, xuống dòng nhiều, bullets →/•, hashtag cuối, KHÔNG emoji',
      linkedin: 'Hook insight, đoạn 2-3 dòng, bullets →/•, **bold** keywords, KHÔNG emoji',
      youtube: 'HOOK-INTRO-CONTENT(3-5 segments)-CTA-OUTRO, bullets →/•, KHÔNG emoji',
      tiktok: 'Hook 3s, 3-5 điểm, bullets →/•, **bold** action, KHÔNG emoji',
      threads: 'Quan điểm rõ, 2-3 đoạn, → emphasis, câu hỏi kết, KHÔNG emoji',
    };
    return noEmojiFormats[channel] || DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
  }
  
  // EMOJI MODE: Standard format
  const emojiFormats: Record<string, string> = {
    facebook: 'Hook emoji+**bold**, emoji bullets ĐA DẠNG theo chủ đề (KHÔNG lặp 🎯⚡💡🔥 - chọn emoji liên quan nội dung), đoạn ngắn, CTA cuối',
    instagram: 'Hook emoji sáng tạo theo chủ đề, xuống dòng, emoji điểm nhấn đa dạng (≤5, KHÔNG lặp lại), hashtag cuối, CTA nhẹ',
    linkedin: 'Hook insight, đoạn 2-3 dòng, bullets →/•, **bold**, emoji tiết chế (1-2, phù hợp ngữ cảnh), 3 hashtag',
    youtube: 'HOOK(0-5s)-INTRO(5-15s)-CONTENT(3-5 segments)-CTA(Sub+Like)-OUTRO, emoji bullets đa dạng theo nội dung',
    tiktok: 'Hook 3s + emoji phù hợp chủ đề, 3-5 điểm, emoji bullets sáng tạo, **bold** action, CTA',
    threads: 'Quan điểm rõ, 2-3 đoạn, emoji tiết chế phù hợp ngữ cảnh, câu hỏi kết',
  };
  return emojiFormats[channel] || DEFAULT_CHANNEL_SETTINGS[channel]?.format_description || '';
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
  
  // Length - with STRONGER enforcement for high min_length
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  if (settings.min_length && settings.min_length >= 200) {
    // Strong enforcement for high min_length (e.g., Facebook 250+ words)
    parts.push(`- Độ dài: 🚨 **BẮT BUỘC TỐI THIỂU ${settings.min_length} ${lengthLabel}** (max: ${settings.max_length})`);
    parts.push(`  ⚠️ NẾU DƯỚI ${settings.min_length} ${lengthLabel} → TỰ ĐỘNG VIẾT THÊM: chi tiết, ví dụ, giải thích, mở rộng từng điểm`);
    parts.push(`  ❌ NỘI DUNG DƯỚI ${settings.min_length} ${lengthLabel} SẼ BỊ REJECT`);
  } else if (settings.min_length) {
    parts.push(`- Độ dài: **BẮT BUỘC** ${settings.min_length}–${settings.max_length} ${lengthLabel}`);
    parts.push(`  ⚠️ NẾU DƯỚI ${settings.min_length} ${lengthLabel} → TỰ ĐỘNG VIẾT THÊM NỘI DUNG CHI TIẾT`);
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

// Helper: Merge default settings with brand overrides (ALL settings)
function mergeChannelSettings(channel: string, overrides: ChannelOverrides): ChannelSettings {
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  if (!defaults) return DEFAULT_CHANNEL_SETTINGS.facebook; // Fallback
  if (!overrides || !overrides[channel]) return defaults;
  
  const override = overrides[channel];
  return {
    ...defaults,
    // Core content settings
    max_length: override.max_length ?? defaults.max_length,
    min_length: override.min_length ?? defaults.min_length,
    length_unit: override.length_unit ?? defaults.length_unit,
    // Hook settings
    hook_required: override.hook_required ?? defaults.hook_required,
    hook_style: override.hook_style ?? defaults.hook_style,
    // CTA & formatting
    cta_policy: override.cta_policy ?? defaults.cta_policy,
    bullet_allowed: override.bullet_allowed ?? defaults.bullet_allowed,
    line_break_style: override.line_break_style ?? defaults.line_break_style,
    format_description: override.format_description ?? defaults.format_description,
    // Emoji & hashtag
    emoji_allowed: override.emoji_allowed ?? defaults.emoji_allowed,
    emoji_limit: override.emoji_limit ?? defaults.emoji_limit,
    hashtag_limit: override.hashtag_limit ?? defaults.hashtag_limit,
    hashtag_position: override.hashtag_position ?? defaults.hashtag_position,
    // Link & tone
    link_position: override.link_position ?? defaults.link_position,
    tone_adjustment: override.tone_adjustment ?? defaults.tone_adjustment,
    // Special
    has_subject_line: override.has_subject_line ?? defaults.has_subject_line,
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
/**
 * Build current date context section for system prompt
 * Ensures AI knows the current date/year (Vietnam timezone)
 */
function buildDateContextSection(): string {
function buildDateContextSection(lang?: string): string {
  return buildLocalizedDateContext(lang || 'vi');
}
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
  extendedBrandContext?: ExtendedBrandContext | null,
  channelOptimizations?: Record<string, ChannelOptimization>, // Per-channel optimization configs
  smartContext?: SmartContextResult | null, // NEW: Smart context for enhanced generation
  qualityMode?: QualityMode, // NEW: Quality mode for prompt complexity
  contentRole?: ContentRole // NEW: Content role for orchestration flow
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

  // NEW: Build per-channel optimization sections
  let channelOptimizationSection = "";
  if (channelOptimizations && Object.keys(channelOptimizations).length > 0) {
    const optimizationParts: string[] = [];
    optimizationParts.push("## PER-CHANNEL AI OPTIMIZATION");
    
    for (const channel of channels) {
      const opt = channelOptimizations[channel];
      if (opt) {
        const optSection = buildOptimizedPromptSection(channel, opt);
        if (optSection) {
          optimizationParts.push(`### ${channel.toUpperCase()} OPTIMIZATION`);
          optimizationParts.push(optSection);
        }
      }
    }
    
    if (optimizationParts.length > 1) {
      channelOptimizationSection = optimizationParts.join("\n");
    }
  }

  // NEW: Build Smart Context sections (hook patterns, CTA patterns, learning)
  const smartContextSection = smartContext ? buildSmartPromptInjection(smartContext) : '';
  
  // NEW: Build Word Budget instruction based on quality mode
  const wordBudgetSection = qualityMode !== 'fast' 
    ? buildWordBudgetInstruction(channels, channelOverrides as Record<string, { min_length?: number }> | undefined)
    : '';

  // NEW: Build Content Role section for orchestration flow
  const contentRoleSection = getContentRoleTemplate(contentRole);

  // Build date context section to ensure AI uses current year
  const dateContextSection = buildDateContextSection();

  return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - tạo NỘI DUNG ĐA KÊNH cho ${audienceDescription}.

${dateContextSection}
${brandVoiceSection}
${extendedBrandSection}
${productTargetingSection}
${smartContextSection}
${contentRoleSection}

## NGUYÊN TẮC LÕI
ONE TOPIC → MULTI-CHANNEL CONTENT
- Nội dung PHÙ HỢP RIÊNG từng kênh, KHÔNG sao chép máy móc
- Giữ thông điệp lõi NHẤT QUÁN

## FORMAT (BẮT BUỘC)
**Social channels:** Emoji bullets (✅💡⚡📌➡️), **in đậm** keywords, đoạn ngắn 2-3 dòng
**Không emoji:** Website, Google Maps, Email, Zalo OA, Telegram${brandVoice && !brandVoice.allow_emoji ? ", TẤT CẢ (Brand Voice)" : ""}
**Ví dụ:**
🎯 **5 sai lầm phổ biến khi...**
✅ **Điểm 1** - Mô tả ngắn
💡 **Điểm 2** - Mô tả ngắn
➡️ **Liên hệ ngay** để được tư vấn!

## BRAND CONTEXT
Brand: ${brandName} | Đối tượng: ${audienceDescription}
${brandGuideline ? `Guideline: ${brandGuideline}` : ""}${primaryColor ? ` | Màu: ${primaryColor}` : ""}

## MỤC TIÊU: ${goalDescriptions[contentGoal] || contentGoal}
${contentAngleSection}

## CHANNEL SETTINGS
${selectedChannelRules}
${channelOptimizationSection}
${wordBudgetSection}

${channels.map(ch => getChannelGEOGuidelines(ch)).filter(Boolean).join('\n')}

## WEBSITE SEO (CHỈ áp dụng cho website)
- SEO Title: 50-60 ký tự, keyword đầu | Meta: 150-160 ký tự
- H1 có keyword, 4-6 H2 với secondary keywords, H3 nếu cần
- Focus keyword: H1, intro, 1-2 H2, conclusion (tự nhiên, 1-2% density)
- Featured Snippet: 40-60 từ trả lời câu hỏi chính
- Word count: 800-2000 từ | Pure Markdown (KHÔNG HTML)
- seo_score_estimate: Title(15) + Meta(15) + Keyword trong title(15) + H1(10) + 100 từ đầu(10) + H2(10) + Words(10) + Snippet(10) + Links(5)

## CẤU TRÚC NỘI DUNG CHUẨN (Áp dụng cho kênh long-form: Facebook, LinkedIn, Email, Website, YouTube)
BÀI VIẾT PHẢI CÓ ĐỦ CÁC THÀNH PHẦN SAU (điều chỉnh theo ngành/brand):
1. TIÊU ĐỀ: Nổi bật, thu hút, gây tò mò hoặc cấp bách
2. MỞ ĐẦU: Giới thiệu vấn đề/thay đổi quan trọng, giải thích tại sao cần quan tâm
3. TÍNH CẤP BÁCH: Nhấn mạnh thời gian, deadline, sự cần thiết hành động ngay
4. CÂU CHUYỆN THỰC TẾ: Ví dụ thực, case study, tình huống đã xảy ra (lấy từ Industry Memory nếu có)
5. GIẢI PHÁP/DỊCH VỤ: Chi tiết cách brand giúp giải quyết vấn đề
6. LỜI KHUYÊN CHUYÊN GIA: Tips, chiến lược, mẹo thực hành
7. CTA MẠNH MẼ: Rõ ràng, multiple touchpoints (inbox, hotline, đăng ký)
8. HASHTAGS & TỪ KHÓA: Tối ưu theo channel settings
9. THÔNG TIN LIÊN HỆ: Đặt vị trí dễ thấy (nếu brand có footer info)
⚠️ Mỗi phần PHẢI có nội dung thực chất, KHÔNG viết qua loa.
⚠️ Kênh ngắn (Instagram, TikTok, Twitter, Threads, Zalo OA, Google Maps): Chỉ giữ Hook + Key points + CTA.

## KIỂM TRA CUỐI (BẮT BUỘC - CHẠY TRƯỚC KHI OUTPUT)
1. 📊 **ĐẾM TỪ TỪNG KÊNH** - so với min_length trong CHANNEL SETTINGS ở trên
2. 🚨 **DƯỚI min_length?** → VIẾT THÊM ngay: chi tiết, ví dụ minh họa, giải thích sâu, case study, mở rộng từng điểm
3. ❌ **KHÔNG OUTPUT** nếu chưa đạt min_length - TIẾP TỤC VIẾT THÊM
4. 📝 **VƯỢT max_length?** → RÚT GỌN nhưng giữ giá trị
5. ✅ Emoji/hashtag/format đúng theo channel settings
6. Website có pure Markdown? TỰ CHUYỂN ĐỔI nếu HTML

## CẤM
- Giải thích/bình luận | Thêm kênh không yêu cầu | Copy giữa kênh | Hiển thị cài đặt`;
};

Deno.serve(withPerf({ functionName: 'generate-multichannel', slowThresholdMs: 60000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestStartTime = Date.now();
    const formData: FormData = await req.json();
    console.log("Generating multi-channel content for:", formData.topic);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header (supports both user JWT and internal trusted calls)
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);

    let userId: string | null = null;
    let isServiceRoleCall = false;

    const bodyUserId = (formData as any).userId || (formData as any).user_id || null;
    const requestedOrganizationId = (formData as any).organizationId || (formData as any).organization_id || null;

    const parseJwtPayload = (token: string): Record<string, any> | null => {
      try {
        const [, payloadPart] = token.split('.');
        if (!payloadPart) return null;
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return JSON.parse(atob(padded));
      } catch {
        return null;
      }
    };

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";

      const tokenPayload = parseJwtPayload(token);
      const jwtRole = tokenPayload?.role;
      const hasSub = Boolean(tokenPayload?.sub);

      const isInternalToken =
        token === serviceRoleKey ||
        token === anonKey ||
        jwtRole === "service_role" ||
        (jwtRole === "anon" && !hasSub);

      if (isInternalToken) {
        isServiceRoleCall = true;
        userId = bodyUserId;
        console.log("Internal token detected, userId from body:", userId);
      } else {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser(token);
          if (authError || !user?.id) {
            if (authError) {
              console.error("Auth error:", authError.message);
            } else {
              console.warn("Token validated but missing user/sub claim");
            }

            // Fallback for internal chain where body carries resolved user
            userId = bodyUserId;
            if (userId) {
              isServiceRoleCall = true;
              console.log("Fallback to body userId after JWT validation failure:", userId);
            }
          } else {
            userId = user.id;
            console.log("User ID from token:", userId);
          }
        } catch (authErr) {
          console.error("Failed to parse auth:", authErr);
          userId = bodyUserId;
          if (userId) {
            isServiceRoleCall = true;
            console.log("Auth exception, fallback to body userId:", userId);
          }
        }
      }
    } else if (bodyUserId) {
      // Allow trusted internal call that may omit bearer user JWT
      isServiceRoleCall = true;
      userId = bodyUserId;
      console.log("No bearer JWT, using body userId fallback:", userId);
    }

    if (!userId) {
      console.error("No valid user found from authorization header or body");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Please login" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If service role/internal call, verify user is member of the requested org for safety
    if (isServiceRoleCall && requestedOrganizationId) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", requestedOrganizationId)
        .limit(1)
        .single();

      if (!membership) {
        console.error("User is not a member of the specified organization");
        return new Response(
          JSON.stringify({ error: "Forbidden - User not in organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get organization_id: prefer from request body (support both camelCase and snake_case), fallback to query
    let organizationId = requestedOrganizationId;
    
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
    console.log("Using organization_id:", organizationId, "(from request:", !!requestedOrganizationId, ")");

    // ============================================
    // CORE CONTENT MODE
    // Fetch source material if coreContentId provided
    // Transform from approved Core Content instead of topic-only generation
    // ============================================
    interface CoreContentData {
      id: string;
      content: string;
      key_messages: string[];
      title: string;
      topic: string;
      content_goal: string;
      word_count: number;
    }
    
    let coreContent: CoreContentData | null = null;

    if (formData.coreContentId) {
      // Allow draft + approved Core Content (chat pipeline creates as 'draft')
      const { data, error } = await supabase
        .from('core_contents')
        .select('id, content, key_messages, title, topic, content_goal, word_count')
        .eq('id', formData.coreContentId)
        .in('status', ['draft', 'approved', 'reviewed']) // Accept draft for pipeline flow
        .single();
      
      if (error || !data) {
        console.warn(`Core Content ${formData.coreContentId} not found or invalid status, falling back to topic-based generation`);
      } else {
        coreContent = data as CoreContentData;
        console.log(`[core-content-mode] Using Core Content: "${coreContent.title}" (${coreContent.word_count || 0} words, ${coreContent.content?.length || 0} chars)`);
        
        // Use Core Content's topic if form topic is empty
        if (!formData.topic && coreContent.topic) {
          formData.topic = coreContent.topic;
        }
        // Use Core Content's goal if not specified
        if (!formData.contentGoal && coreContent.content_goal) {
          formData.contentGoal = coreContent.content_goal;
        }
      }
    }
    
    // ============================================
    // CORE CONTENT TRANSFORM VALIDATION (P0)
    // Check if Core Content is suitable for target channels
    // ============================================
    let transformValidation: { valid: boolean; warnings: string[] } = { valid: true, warnings: [] };
    if (coreContent && formData.channels.length > 0) {
      const coreWordCount = coreContent.word_count || coreContent.content?.split(/\s+/).length || 0;
      transformValidation = validateCoreContentForTransform(coreWordCount, formData.channels);
      
      if (transformValidation.warnings.length > 0) {
        console.log(`[core-content-transform] Warnings: ${transformValidation.warnings.join('; ')}`);
      }
    }

    // ============================================
    // STRATEGY VALIDATION LAYER (P0)
    // Detect Goal-Angle-Role conflicts and prepare prompt adjustments
    // ============================================
    const strategyValidation = validateStrategy(
      formData.contentGoal,
      formData.contentAngle,
      formData.contentRole
    );
    
    if (strategyValidation.conflicts.length > 0) {
      console.log(`[strategy-validation] Detected ${strategyValidation.conflicts.length} conflicts:`,
        strategyValidation.conflicts.map(c => `${c.type}: ${c.field1}-${c.field2} (${c.severity})`).join(', '));
      console.log(`[strategy-validation] Score penalty: ${strategyValidation.scorePenalty}, Suggested role: ${strategyValidation.suggestedRole}`);
    }

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
        functionName: "preview-multichannel",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        maxTokensOverride: 1000,
        temperatureOverride: 0.7,
        modelOverride: "google/gemini-2.5-flash-lite",
      });

      const previewContent = aiResponse.data?.choices?.[0]?.message?.content || "";

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
    let coreContentText = '';
    let coreKeyMessages: string[] = [];
    
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

      // Fetch Core Content if linked - provides full article context for better regeneration
      let coreKeyMessages: string[] = [];
      if (existingContent.core_content_id) {
        try {
          const { data: coreContent } = await supabase
            .from('core_contents')
            .select('content, key_messages, content_role, content_angle')
            .eq('id', existingContent.core_content_id)
            .single();
          if (coreContent) {
            coreContentText = coreContent.content?.substring(0, 3000) || '';
            coreKeyMessages = Array.isArray(coreContent.key_messages) ? coreContent.key_messages : [];
            if (coreContent.content_role) {
              formData.contentRole = coreContent.content_role;
            }
            console.log(`[regenerate-mode] Core Content loaded: ${coreContentText.length} chars, ${coreKeyMessages.length} key messages`);
          }
        } catch (err) {
          console.warn('[regenerate-mode] Failed to fetch core content, falling back to topic-only:', err);
        }
      }

      console.log(`[regenerate-mode] Using context: topic="${formData.topic}", channel=${formData.channel}, hasCoreContent=${!!coreContentText}`);
      // Continue to brand loading, then branch to lightweight regenerate path
    }

    // ============================================
    // PHASE 2 OPTIMIZATION: Parallel DB Queries
    // Fetch brand template, AI configs, and related data concurrently
    // Saves ~300-400ms by avoiding sequential await chains
    // ============================================
    
    // Initialize default values
    let brandName = "Brand";
    let outputLanguage = 'vi'; // Default, will be overridden by brand's country_code
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
    
    // Pre-fetch AI configs in parallel with brand template (needed later for all modes)
    // This runs concurrently while we load brand data
    const aiConfigPromise = getAIConfig('generate-multichannel', organizationId || undefined);
    const channelModelConfigsPromise = getChannelModelConfigs(organizationId || undefined);
    // NEW: Fetch per-channel optimization configs in parallel
    const channelOptimizationsPromise = getMultiChannelOptimizations(
      supabase,
      formData.channels,
      organizationId || undefined,
      formData.brandTemplateId || undefined
    );

    if (formData.brandTemplateId) {
      // STEP 1: Fetch brand template first (needed for industry_template_id)
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
        // Extract output language from brand's country_code
        outputLanguage = getOutputLanguage((template as any).country_code);
        
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
        
        // DEBUG: Log channel overrides to verify they're being applied
        console.log("[channel-overrides] Raw from DB:", JSON.stringify(channelOverrides));
        if (channelOverrides) {
          for (const channel of Object.keys(channelOverrides)) {
            const merged = mergeChannelSettings(channel, channelOverrides);
            console.log(`[channel-overrides] ${channel}: min=${merged.min_length}, max=${merged.max_length}, unit=${merged.length_unit}`);
          }
        }
        
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
        
        // STEP 2: PARALLEL FETCH - Personas, Mappings, AND Industry Memory concurrently
        // This is the key optimization: fetch all dependent data in parallel
        console.log("[parallel-db] Starting parallel fetch: personas, mappings, industry memory...");
        const parallelStartTime = Date.now();
        
        const [personasResult, mappingsResult, productsResult, fetchedIndustryMemory] = await Promise.all([
          // Fetch customer personas
          supabase
            .from('customer_personas')
            .select('*')
            .eq('brand_template_id', formData.brandTemplateId)
            .order('is_primary', { ascending: false }),
          // Fetch product-persona mappings  
          supabase
            .from('product_persona_mappings')
            .select(`
              id, product_id, persona_id, relevance_score, is_primary_product,
              custom_pitch, key_benefits, objection_handlers, preferred_content_angles, avoid_topics,
              product:brand_products(id, name, category, unique_selling_points),
              persona:customer_personas(id, name, occupation)
            `)
            .eq('brand_template_id', formData.brandTemplateId)
            .order('relevance_score', { ascending: false })
            .limit(15),
          // Fetch brand products directly for products section in prompt
          supabase
            .from('brand_products')
            .select('id, name, category, description, unique_selling_points, target_audience, pain_points_solved, benefits, suggested_content_angles, is_featured')
            .eq('brand_template_id', formData.brandTemplateId)
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .limit(10),
          // Fetch Industry Memory (if available) - now in parallel!
          industryTemplateId 
            ? fetchIndustryMemory(supabase, industryTemplateId)
            : Promise.resolve(null)
        ]);
        
        console.log(`[parallel-db] Parallel fetch completed in ${Date.now() - parallelStartTime}ms`);
        
        // Process Industry Memory result
        if (fetchedIndustryMemory) {
          industryMemory = fetchedIndustryMemory;
          console.log("Industry Memory loaded:", industryMemory.name, "v" + industryMemory.version);
          // Build merged rules with correct priority cascade
          mergedRules = buildMergedRules(industryMemory, brandVoice);
          console.log("Merged rules - forbidden_terms:", mergedRules.forbidden_terms.length, 
                      "compliance_rules:", mergedRules.compliance_rules.length);
        }
        
        // Process personas result
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

        // Process products result - populate extendedBrandContext.products for buildProductsContextSection
        if (productsResult.data && productsResult.data.length > 0) {
          extendedBrandContext.products = productsResult.data.map((p: any) => ({
            name: p.name,
            category: p.category,
            description: p.description,
            unique_selling_points: p.unique_selling_points || [],
            target_audience: p.target_audience,
            pain_points_solved: p.pain_points_solved || [],
            benefits: p.benefits || [],
            suggested_content_angles: p.suggested_content_angles || [],
            is_featured: p.is_featured,
          }));
          console.log("Brand products loaded:", productsResult.data.length, 
                      "Featured:", productsResult.data.filter((p: any) => p.is_featured).length);
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
      }
    }
    
    // Await AI configs that were fetched in parallel
    const [aiConfig, channelModelConfigs, channelOptimizations] = await Promise.all([
      aiConfigPromise,
      channelModelConfigsPromise,
      channelOptimizationsPromise
    ]);
    console.log("[parallel-db] AI configs loaded:", aiConfig ? "custom" : "default");
    console.log("[parallel-db] Channel optimizations loaded:", Object.keys(channelOptimizations).length, "channels");

    // ============================================
    // COMPLIANCE PRE-CHECK (for 'create' action only)
    // Validates topic BEFORE generation to catch forbidden terms early
    // ============================================
    if (!formData.action || formData.action === 'create') {
      // Build rules for compliance check
      const industryRulesForCheck: IndustryMemoryRules | null = industryMemory ? {
        forbidden_terms: industryMemory.forbidden_terms || [],
        compliance_rules: industryMemory.compliance_rules || [],
        claim_restrictions: industryMemory.claim_restrictions || [],
        forbidden_words: industryMemory.forbidden_words || [],
        argument_patterns: industryMemory.argument_patterns,
      } : null;
      
      const brandRulesForCheck: BrandRules | null = brandVoice ? {
        forbidden_words: brandVoice.forbidden_words || [],
        compliance_rules: brandVoice.compliance_rules || [],
      } : null;
      
      const complianceResult: PreCheckResult = preCheckCompliance(
        formData.topic,
        industryRulesForCheck,
        brandRulesForCheck
      );
      
      console.log(`[compliance-precheck] Risk level: ${complianceResult.riskLevel}, issues: ${complianceResult.issues.length}`);
      
      // If topic is blocked (contains industry forbidden terms), reject immediately
      if (complianceResult.riskLevel === 'blocked') {
        console.error('[compliance-precheck] Topic BLOCKED due to forbidden terms');
        return new Response(
          JSON.stringify({
            error: 'Topic chứa từ cấm trong ngành',
            complianceBlocked: true,
            issues: complianceResult.issues,
            suggestion: 'Vui lòng điều chỉnh topic để tránh các từ bị cấm',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For high-risk topics, log warning but continue (will rely on Self-Critique)
      if (complianceResult.riskLevel === 'high') {
        console.warn('[compliance-precheck] High-risk topic detected, will rely on Self-Critique');
      }
    }

    // ============================================
    // REGENERATE MODE - Lightweight single channel path
    // ============================================
    if (formData.action === 'regenerate') {
      console.log("[regenerate-mode] Starting lightweight regeneration path...");
      
      const channel = formData.channel!;
      const contentId = formData.contentId!;
      
      // AI configs already fetched in parallel above - use them directly
      
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
${coreContentText ? `
## NỘI DUNG GỐC (CORE CONTENT)
Đây là bài viết gốc đầy đủ. Hãy dựa vào đây để viết lại, KHÔNG bịa thêm thông tin ngoài nội dung gốc.

${coreContentText}
${coreKeyMessages.length > 0 ? `
## THÔNG ĐIỆP CHÍNH (bắt buộc giữ lại)
${coreKeyMessages.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}` : ''}
` : ''}
## QUY ƯỚC CHO KÊNH (SOCIAL CHANNEL SETTINGS)
Brand Voice là LUẬT NỀN. Channel Settings là LUẬT TRIỂN KHAI.

${channelRulesPrompt}

## KIỂM TRA CUỐI (BẮT BUỘC)
1. **DƯỚI min length?** → VIẾT THÊM nội dung chi tiết, ví dụ, giải thích
2. **VƯỢT max length?** → RÚT GỌN
3. Emoji/hashtag sai? → TỰ ĐIỀU CHỈNH

## NGUYÊN TẮC BẮT BUỘC
1. ${coreContentText ? 'Dựa trên NỘI DUNG GỐC, viết lại với cách diễn đạt và cấu trúc MỚI' : 'Tạo nội dung MỚI HOÀN TOÀN, khác với phiên bản trước'}
2. Giữ cùng thông điệp lõi nhưng thay đổi cách diễn đạt
3. Giọng văn: Chuyên nghiệp, rõ ràng, phù hợp ${targetAudience}
4. Tuân thủ chính xác format của kênh
${coreContentText ? '5. KHÔNG bịa thêm thông tin ngoài nội dung gốc' : ''}

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji (Brand Voice yêu cầu)" : ""}`;

      const userPrompt = coreContentText 
        ? `Dựa trên NỘI DUNG GỐC ở trên, viết lại cho kênh ${channel.toUpperCase()}.
Chủ đề: "${formData.topic}"
${industry ? `Ngành/Bối cảnh: ${industry}` : ""}

Giữ nguyên thông điệp chính, thay đổi cách diễn đạt và cấu trúc. Nội dung sẵn sàng đăng ngay.`
        : `Viết lại nội dung cho kênh ${channel.toUpperCase()} với chủ đề:
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
              
              // Call AI with streaming via callAI utility
              emit({ type: 'progress', step: 'generate', progress: 30, message: `Đang tạo lại nội dung ${channel}...` });
              
              // Get channel-specific model if available
              const channelConfig = channelModelConfigs.get(channel);
              const effectiveModel = channelConfig?.model || aiConfig.model;
              const effectiveTemp = channelConfig?.temperature ?? aiConfig.temperature;
              
              console.log(`[regenerate-mode][streaming] Using model: ${effectiveModel}`);
              
              const streamResult = await callAI({
                functionName: 'generate-multichannel',
                organizationId: organizationId || undefined,
                modelOverride: effectiveModel,
                temperatureOverride: effectiveTemp,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                stream: true,
                maxTokensOverride: channelConfig?.maxTokens ?? aiConfig.max_tokens ?? 4096,
              });
              
              if (!streamResult.success || !streamResult.data) {
                console.error("[regenerate-mode][streaming] AI API error:", streamResult.error);
                if (streamResult.error?.includes('Rate limit') || streamResult.error?.includes('429')) {
                  emit({ type: 'error', message: 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.' });
                  controller.close();
                  return;
                }
                if (streamResult.error?.includes('Payment required') || streamResult.error?.includes('402')) {
                  emit({ type: 'error', message: 'Cần nạp thêm credits để tiếp tục sử dụng.' });
                  controller.close();
                  return;
                }
                throw new Error(`AI API error: ${streamResult.error}`);
              }
              
              console.log(`[regenerate-mode][streaming] Streaming from ${streamResult.provider}${streamResult.fromFallback ? ' (fallback)' : ''}`);
              
              // Stream tokens using shared iterator
              let generatedContent = '';
              for await (const delta of iterateStreamDeltas(streamResult.data)) {
                if (delta.done) break;
                if (delta.content) {
                  generatedContent += delta.content;
                  emit({ type: 'streaming_text', channel, content: delta.content });
                }
              }
              
              // Append footer if user opted in (default: true)
              if (formData.includeFooterInfo !== false) {
                const footerText = formatFooterInfo(
                  extendedBrandContext?.footerInfo as FooterInfo | null,
                  channel,
                  brandVoice?.allow_emoji !== false,
                  channelOverrides as Record<string, any> | null,
                  extendedBrandContext?.brandName || null,
                  (extendedBrandContext as any)?.tagline || null
                );
                if (footerText) {
                  generatedContent += footerText;
                  emit({ type: 'streaming_text', channel, content: footerText });
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
        // Get channel-specific model if available
        const channelConfig = channelModelConfigs.get(channel);
        const effectiveModel = channelConfig?.model || aiConfig.model;
        const effectiveTemp = channelConfig?.temperature ?? aiConfig.temperature;
        
        console.log(`[regenerate-mode] Calling AI via callAI, model: ${effectiveModel}`);
        
        const result = await callAI({
          functionName: 'generate-multichannel',
          organizationId: organizationId || undefined,
          modelOverride: effectiveModel,
          temperatureOverride: effectiveTemp,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          toolChoice: { type: "function", function: { name: "generate_channel_content" } },
          maxTokensOverride: channelConfig?.maxTokens ?? aiConfig.max_tokens ?? 4096,
        });

        if (!result.success) {
          console.error(`[regenerate-mode] AI error from ${result.provider}:`, result.error);
          if (result.error?.includes('Rate limit') || result.error?.includes('429')) {
            throw { status: 429, message: "Đã vượt giới hạn yêu cầu." };
          }
          if (result.error?.includes('Payment required') || result.error?.includes('402')) {
            throw { status: 402, message: "Cần nạp thêm credits." };
          }
          throw new Error(`AI error: ${result.error}`);
        }

        console.log(`[regenerate-mode] AI response from ${result.provider}${result.fromFallback ? ' (fallback)' : ''}`);
        
        const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
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
      
      // Append footer if user opted in (default: true)
      if (formData.includeFooterInfo !== false) {
        const footerText = formatFooterInfo(
          extendedBrandContext?.footerInfo as FooterInfo | null,
          channel,
          brandVoice?.allow_emoji !== false,
          channelOverrides as Record<string, any> | null,
          extendedBrandContext?.brandName || null,
          (extendedBrandContext as any)?.tagline || null
        );
        if (footerText) {
          newContent += footerText;
        }
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
      
      // NEW: Task tracking - mark as generating at start
      const taskId = formData.taskId;
      if (taskId) {
        await updateTaskProgress(supabase, taskId, 5, 'Khởi tạo...', 'init', 'generating');
      }
      
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
      
      // NEW: Build Smart Context for enhanced generation
      const qualityMode = normalizeQualityMode(formData.qualityMode);
      let smartContext: SmartContextResult | null = null;

      if (qualityMode !== 'fast') {
        try {
          smartContext = await buildSmartContext(supabase, {
            qualityMode,
            brandTemplateId: formData.brandTemplateId,
            organizationId: organizationId || undefined,
            targetPersonaId: formData.targetPersonaId,
            includeHookPatterns: true,
            includeCTAPatterns: true,
            includeLearning: true,
          });
          console.log(`[streaming-mode] Smart context built, richness: ${smartContext.contextRichnessScore}/100`);
        } catch (err) {
          console.warn('[streaming-mode] Failed to build smart context:', err);
        }
      }
      
      // NEW: Knowledge Graph Context - Phase 6
      let knowledgeGraphContext: KnowledgeGraphContext | null = null;
      let knowledgeGraphPromptSection = '';
      
      if (qualityMode !== 'fast' && industryTemplateId) {
        try {
          knowledgeGraphContext = await fetchKnowledgeGraphContext(supabase, {
            topic: formData.topic,
            industryTemplateId,
            organizationId: organizationId || undefined,
            limit: 10,
          });
          
          if (knowledgeGraphContext.regulations.length > 0 || knowledgeGraphContext.relevantTerms.length > 0) {
            knowledgeGraphPromptSection = buildKnowledgeGraphPromptSection(knowledgeGraphContext);
            console.log(`[streaming-mode] Knowledge Graph loaded: ${knowledgeGraphContext.regulations.length} regulations, ${knowledgeGraphContext.relevantTerms.length} terms`);
          }
        } catch (err) {
          console.warn('[streaming-mode] Failed to fetch Knowledge Graph context:', err);
        }
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
        extendedBrandContext,
        channelOptimizations,
        smartContext,
        qualityMode,
        formData.contentRole // NEW: Content role for orchestration flow
      );
      
      // Inject strategy conflict adjustments if any
      const fullSystemPrompt = strategyValidation.promptAdjustments 
        ? systemPrompt + strategyValidation.promptAdjustments 
        : systemPrompt;
      
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
      
      // Store persona data for Persona Fit Scoring
      let targetPersonaData: PersonaData | null = null;
      
      if (formData.targetPersonaId && formData.brandTemplateId) {
        const { data: targetPersona } = await supabase
          .from('customer_personas')
          .select('*')
          .eq('id', formData.targetPersonaId)
          .eq('brand_template_id', formData.brandTemplateId)
          .single();
        
        if (targetPersona) {
          // Store for Persona Fit Scoring
          targetPersonaData = {
            id: targetPersona.id,
            name: targetPersona.name,
            occupation: targetPersona.occupation,
            ageRange: targetPersona.age_range,
            gender: targetPersona.gender,
            painPoints: targetPersona.pain_points || [],
            desires: targetPersona.desires || [],
            objections: targetPersona.objections || [],
            buyingTriggers: targetPersona.buying_triggers || [],
            communicationStyle: targetPersona.communication_style,
            preferredChannels: targetPersona.preferred_channels || [],
            techSavviness: targetPersona.tech_savviness,
            buyingMotivation: targetPersona.buying_motivation || [],
          };
          
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

${buildPersonaFitBoostPrompt(targetPersonaData)}

⚡ NỘI DUNG PHẢI VIẾT CHO PERSONA NÀY:
- Tone phù hợp với phong cách giao tiếp của họ
- Giải quyết đúng pain points của họ
- Trigger buying motivation
- Phản bác objections nếu phù hợp
`;
          console.log("[streaming-mode] Targeted persona loaded:", targetPersona.name);
        }
      }
      
      // Build hook overview for all channels
      const hookOverview = buildHookOverview(formData.selectedHooks, formData.globalHook);
      
      // Build base user prompt
      let userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}
${targetedProductContext}
${targetedPersonaContext}
${hookOverview}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.`;

      // ============================================
      // CORE CONTENT MODE - SOURCE MATERIAL INJECTION
      // When coreContentId is provided, inject as source material for transformation
      // ============================================
      if (coreContent) {
        const wordCount = coreContent.word_count || coreContent.content?.split(/\s+/).length || 0;
        const keyMessages = coreContent.key_messages || [];
        
        let keyMessagesSection = '';
        if (keyMessages.length > 0) {
          const formattedMessages = keyMessages.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n');
          keyMessagesSection = `### Key Messages cần giữ nguyên:
${formattedMessages}`;
        }
        
        userPrompt += `

## 📄 SOURCE MATERIAL (Core Content - Single Source of Truth)

Đây là nội dung gốc đã được approve. Nhiệm vụ của bạn là **TRANSFORM** nội dung này sang format phù hợp với từng platform, **KHÔNG viết lại từ đầu**.

### Nội dung gốc (${wordCount} từ):
${coreContent.content}

${keyMessagesSection}

### Yêu cầu Transform:
- **GIỮ NGUYÊN** thông điệp chính từ Core Content
- **ADAPT** format phù hợp platform (độ dài, tone, hashtag, emoji...)
- **KHÔNG thêm** thông tin mới không có trong Core Content
- **CÓ THỂ lược bỏ** chi tiết để phù hợp giới hạn platform
- Với social media: trích xuất key points, tạo hook hấp dẫn từ nội dung gốc
- Với email/website: có thể giữ nhiều chi tiết hơn`;
        
        console.log(`[streaming-mode][core-content] Injected source material: "${coreContent.title}" (${wordCount} words, ${keyMessages.length} key messages)`);
      }

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
        qualityMode: formData.qualityMode || 'balanced', // NEW: Pass quality mode for dynamic tokens
        brandTemplateId: formData.brandTemplateId,
        brandName,
        footerInfo,
        channelOverrides: channelOverrides as Record<string, any> | null,
        brandAllowEmoji,
        companyName,
        tagline,
        includeFooterInfo: formData.includeFooterInfo !== false, // Default: true
        channelModelConfigs: new Map(
          formData.channels.map(ch => {
            const cfg = channelModelConfigs.get(ch);
            const channelOpt = channelOptimizations[ch];
            // Apply cost priority to maxTokens
            const baseMaxTokens = cfg?.maxTokens ?? null;
            const optimizedMaxTokens = baseMaxTokens && channelOpt
              ? applyTokenOptimization(baseMaxTokens, channelOpt)
              : baseMaxTokens;
            return [ch, {
              model: cfg?.model || aiConfig.model,
              temperature: cfg?.temperature ?? aiConfig.temperature,
              maxTokens: optimizedMaxTokens,
            }];
          })
        ),
        defaultModel: aiConfig.model,
        defaultTemperature: aiConfig.temperature,
        // Critique context
        brandVoice,
        mergedRules,
        // NEW: Per-channel optimizations for quality mode
        channelOptimizations,
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
            // Task 13: Multichannel Prioritization — sort primary channels first
            let primaryChannels: string[] = [];
            if (formData.brandTemplateId) {
              try {
                const { data: btData } = await getSupabaseClient()
                  .from('brand_templates')
                  .select('primary_channels')
                  .eq('id', formData.brandTemplateId)
                  .single();
                primaryChannels = (btData as any)?.primary_channels || [];
              } catch {}
            }
            
            const rawChannels = formData.channels;
            const channels = primaryChannels.length > 0
              ? [
                  ...rawChannels.filter(ch => primaryChannels.includes(ch)),
                  ...rawChannels.filter(ch => !primaryChannels.includes(ch)),
                ]
              : rawChannels;
            const secondaryChannels = primaryChannels.length > 0
              ? channels.filter(ch => !primaryChannels.includes(ch))
              : [];
            
            if (primaryChannels.length > 0) {
              console.log(`[streaming-mode] Primary channels: ${primaryChannels.join(',')}, secondary: ${secondaryChannels.join(',')}`);
            }
            
            const streamStartTime = Date.now();
            
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
            const completedChannelsSet = new Set<string>();
            const skippedSecondaryChannels: string[] = [];
            
            // Build user prompt for each channel (with channel-specific hook and transformation rules)
            const coreContentWordCount = coreContent?.word_count || coreContent?.content?.split(/\s+/).length || 0;
            
            const buildChannelUserPrompt = (channel: string) => {
              const channelHookSection = buildHookSection(channel, formData.selectedHooks, formData.globalHook);
              
              // NEW: Channel-specific transformation rules when using Core Content
              let transformSection = '';
              if (coreContent && coreContentWordCount > 0) {
                transformSection = buildTransformationInstruction(
                  channel,
                  coreContentWordCount,
                  formData.contentRole
                );
                const targetWords = calculateChannelWordCount(channel, coreContentWordCount);
                console.log(`[streaming-mode][transform] ${channel}: ${targetWords.min}-${targetWords.max} words target (from ${coreContentWordCount} core)`);
              }
              
              return `${userPrompt}
${channelHookSection}
${transformSection}

Bây giờ viết nội dung cho kênh: ${channel.toUpperCase()}
Viết TRỰC TIẾP nội dung, KHÔNG giải thích hay bình luận.`;
            };
            
            // Log hook usage
            if (formData.selectedHooks?.length || formData.globalHook) {
              console.log(`[streaming-mode] Using hooks: ${formData.selectedHooks?.length || 0} channel-specific, globalHook: ${!!formData.globalHook}`);
            }
            
            // Task 13: Skip secondary channels if near timeout (>40s elapsed)
            const elapsedMs = Date.now() - streamStartTime;
            let channelsToGenerate = channels;
            if (primaryChannels.length > 0 && elapsedMs > 40000 && secondaryChannels.length > 0) {
              channelsToGenerate = channels.filter(ch => primaryChannels.includes(ch));
              skippedSecondaryChannels.push(...secondaryChannels);
              console.log(`[streaming-mode] Timeout approaching (${elapsedMs}ms), skipping secondary: ${secondaryChannels.join(',')}`);
            }
            
            // Generate content for channels in PARALLEL
            console.log(`[streaming-mode] Starting PARALLEL generation for ${channelsToGenerate.length} channels`);
            
            const { generateChannelsParallel } = await import("../_shared/streaming-handler.ts");
            
            const parallelResult = await generateChannelsParallel({
              channels: channelsToGenerate,
              systemPrompt: fullSystemPrompt, // Use adjusted prompt with strategy conflict compensation
              buildUserPrompt: buildChannelUserPrompt,
              context: streamingContext,
              emit,
              onChannelComplete: (channel, content) => {
                completedChannelsSet.add(channel);
                channelResults[channel] = content;
                
                const displayName = getChannelDisplayName(channel);
                const completionProgress = 20 + ((completedChannelsSet.size / channels.length) * 55);
                
                emit({
                  type: 'progress',
                  step: 'ai',
                  progress: completionProgress,
                  message: `✓ ${displayName} hoàn thành`,
                  completedChannels: Array.from(completedChannelsSet),
                  totalChannels: channels,
                });
              },
            });
            
            // Merge results
            Object.assign(channelResults, parallelResult.channelResults);
            const completedChannels = Array.from(completedChannelsSet);
            
            console.log(`[streaming-mode] Parallel generation complete: ${completedChannels.length}/${channels.length} channels`);
            if (Object.keys(parallelResult.errors).length > 0) {
              console.warn(`[streaming-mode] Errors:`, parallelResult.errors);
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
            // SEMANTIC DEDUPLICATION CHECK (Streaming mode)
            // ============================================
            let dedupResult: DuplicateCheckResult | null = null;
            if (organizationId && formData.action !== 'expand') {
              try {
                const textToCheck = extractMultichannelText(channelResults);
                if (textToCheck.length > 50) {
                  dedupResult = await checkSemanticDuplicate(
                    supabase,
                    textToCheck,
                    organizationId,
                    formData.brandTemplateId,
                    formData.contentId,
                    'multichannel'
                  );
                  
                  if (dedupResult.isDuplicate || dedupResult.isWarning) {
                    emit({
                      type: 'progress',
                      step: 'ai',
                      progress: 77,
                      message: dedupResult.isDuplicate 
                        ? `⚠️ Phát hiện nội dung tương tự (${(dedupResult.similarity! * 100).toFixed(0)}%)`
                        : `📝 Có nội dung liên quan (${(dedupResult.similarity! * 100).toFixed(0)}%)`,
                    });
                  }
                  console.log(`[streaming-mode][dedup] Check: unique=${!dedupResult.isDuplicate && !dedupResult.isWarning}, similarity=${dedupResult.similarity?.toFixed(3) || 'N/A'}`);
                }
              } catch (dedupError) {
                console.warn('[streaming-mode][dedup] Check failed:', dedupError);
              }
            }
            
            // ============================================
            // SELF-CRITIQUE LOOP (Post-streaming)
            // Based on qualityMode: fast skips, balanced/quality runs
            // ============================================
            const qualityMode = normalizeQualityMode(formData.qualityMode);
            const qualityConfig = QUALITY_MODE_CONFIG[qualityMode];
            console.log(`[streaming-mode][quality-mode] Using '${qualityMode}': skipCritique=${qualityConfig.skipCritique}`);
            
            let critiqueResult: CritiqueResult | null = null;
            let wasRefined = false;
            let refinementCount = 0;
            let needsManualReview = false;
            
            if (!qualityConfig.skipCritique) {
              emit({ type: 'progress', step: 'critique', progress: 78, message: 'Đang đánh giá chất lượng...' });
              
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
                  maxRefinements: qualityConfig.maxRefinements,
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
                
                // Apply strategy validation penalty if conflicts detected
                if (critiqueResult && strategyValidation.scorePenalty > 0) {
                  const originalScore = critiqueResult.overall_score;
                  critiqueResult.overall_score = Math.max(0, critiqueResult.overall_score - strategyValidation.scorePenalty);
                  critiqueResult.issues = critiqueResult.issues || [];
                  critiqueResult.issues.push({
                    category: 'structure', // Use 'structure' for strategy alignment issues
                    severity: strategyValidation.conflictLevel === 'severe' ? 'error' : 'warning',
                    description: `Strategy conflict: ${strategyValidation.conflicts.map(c => c.message).join('; ')}`,
                  });
                  console.log(`[streaming-mode][strategy-penalty] Score adjusted: ${originalScore} → ${critiqueResult.overall_score} (penalty: ${strategyValidation.scorePenalty})`);
                }

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
            } else {
              console.log(`[streaming-mode][quality-mode] Skipping self-critique (fast mode)`);
              emit({ type: 'progress', step: 'critique', progress: 82, message: 'Bỏ qua đánh giá (chế độ nhanh)' });
            }
            
            // ============================================
            // CROSS-CHANNEL DEDUPLICATION - P3
            // Ensures content diversity across channels
            // ============================================
            let crossChannelDedupResult: CrossChannelDedupResult | null = null;
            
            if (channels.length >= 2 && formData.action !== 'expand') {
              try {
                emit({ type: 'progress', step: 'cross-dedup', progress: 83, message: 'Kiểm tra đa dạng nội dung...' });
                crossChannelDedupResult = await checkCrossChannelDuplicate(channelResults);
                
                if (crossChannelDedupResult.hasDuplicates) {
                  emit({
                    type: 'progress',
                    step: 'cross-dedup',
                    progress: 84,
                    message: `⚠️ ${crossChannelDedupResult.channelsNeedingDiversification.length} kênh cần đa dạng hóa`,
                  });
                  console.log(`[streaming-mode][cross-dedup] Duplicates found: ${crossChannelDedupResult.channelsNeedingDiversification.join(', ')}`);
                } else {
                  console.log(`[streaming-mode][cross-dedup] Diversity score: ${crossChannelDedupResult.overallScore}%`);
                }
              } catch (crossDedupError) {
                console.warn('[streaming-mode][cross-dedup] Check failed:', crossDedupError);
              }
            }
            
            // ============================================
            // PERSONA FIT SCORING - P1 Alignment Evaluation
            // ============================================
            let personaFitResult: MultiChannelPersonaFitResult | null = null;
            
            if (targetPersonaData) {
              try {
                emit({ type: 'progress', step: 'persona-fit', progress: 85, message: 'Đánh giá Persona Fit...' });
                personaFitResult = calculateMultiChannelPersonaFit(channelResults, targetPersonaData);
                console.log(`[streaming-mode][persona-fit] Score: ${personaFitResult.averageScore}/100 (${personaFitResult.averageGrade})`);
              } catch (personaFitError) {
                console.warn('[streaming-mode][persona-fit] Scoring failed:', personaFitError);
              }
            }
            
            // ============================================
            // LENGTH VALIDATION - P1 (Streaming Mode)
            // Ensures content meets channel-specific word count requirements
            // ============================================
            let lengthValidation: MultiChannelLengthValidation | null = null;
            let expansionCount = 0;
            
            try {
              const channelContentsForValidation: Record<string, string> = {};
              for (const [ch, content] of Object.entries(channelResults)) {
                if (content && typeof content === 'string') {
                  channelContentsForValidation[ch] = content;
                }
              }
              
              if (Object.keys(channelContentsForValidation).length > 0) {
                lengthValidation = validateAllChannels(channelContentsForValidation, undefined);
                console.log(`[streaming-mode][length-validation] compliance=${lengthValidation.overallCompliance}, score=${lengthValidation.complianceScore}/100`);
              }
            } catch (lengthErr) {
              console.warn('[streaming-mode][length-validation] Failed:', lengthErr);
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
              // CREATE MODE: Dedup check before insert
              const dedupWindow = new Date(Date.now() - 2 * 60 * 1000).toISOString();
              const { data: existingContent } = await supabase
                .from('multi_channel_contents')
                .select('id, title, topic, selected_channels, website_content, facebook_content, instagram_content, twitter_content, linkedin_content, email_content, youtube_content, tiktok_content, threads_content, google_maps_content, zalo_oa_content, telegram_content, status, critique_score, critique_details, was_refined, refinement_count, needs_manual_review, created_at, updated_at, brand_template_id, brand_name, content_goal, organization_id, user_id, channel_statuses, selected_hooks, global_hook')
                .eq('user_id', userId)
                .eq('topic', formData.topic)
                .gte('created_at', dedupWindow)
                .limit(1)
                .maybeSingle();

              if (existingContent) {
                console.log(`[streaming-mode] Dedup: returning existing content ${existingContent.id}`);
                savedContent = existingContent;
                dbError = null;
              } else {
              // Insert new content
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
                  // Hook integration - save selected hooks with content
                  selected_hooks: formData.selectedHooks || [],
                  global_hook: formData.globalHook || null,
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
            }
            
            if (dbError) {
              console.error('[streaming-mode] DB error:', dbError);
              // NEW: Mark task as failed
              if (taskId) {
                await failTask(supabase, taskId, 'Không thể lưu nội dung: ' + dbError.message);
              }
              emit({ type: 'error', message: 'Không thể lưu nội dung: ' + dbError.message });
              controller.close();
              return;
            }
            
            console.log('[streaming-mode] Saved content with ID:', savedContent.id);
            
            // NEW: Mark task as completed with result reference
            if (taskId) {
              await completeTask(supabase, taskId, savedContent.id, 'multi_channel_contents');
            }
            
            // ============================================
            // PHASE 1: METRICS LOGGING (Streaming mode)
            // ============================================
            try {
              const metricsTraceId = generateTraceId();
              const streamingEndTime = Date.now();
              
              // Calculate estimated cost
              const estimatedCost = estimateTotalCost(
                parallelResult.stats.modelsUsed,
                parallelResult.stats.tokenUsage
              );
              
              // Get context sources
              const contextSources = getContextSources({
                industryMemory,
                brandContext: extendedBrandContext,
                personas: formData.targetPersonaId ? [{ id: formData.targetPersonaId }] : undefined,
                products: formData.targetProductId ? [{ id: formData.targetProductId }] : undefined,
              });
              
              await saveMetrics(supabase, {
                traceId: metricsTraceId,
                functionName: 'generate-multichannel',
                organizationId: organizationId || undefined,
                userId: userId || undefined,
                brandTemplateId: formData.brandTemplateId,
                totalDurationMs: parallelResult.stats.totalDurationMs,
                inputTokensEstimated: parallelResult.stats.totalInputTokens,
                outputTokensEstimated: parallelResult.stats.totalOutputTokens,
                contextSources,
                hadError: false,
                // Generation-specific fields
                channels: channels,
                qualityMode: qualityMode,
                modelsUsed: parallelResult.stats.modelsUsed,
                channelDurations: parallelResult.stats.channelDurations,
                cacheHit: false,
                estimatedCostUsd: estimatedCost,
                usedFallback: parallelResult.stats.usedFallback,
                fallbackModel: parallelResult.stats.fallbackModels[0] || undefined,
                retryCount: 0,
                contentId: savedContent.id,
                actionType: formData.action || 'create',
              });
              
              console.log(`[streaming-mode][metrics] Saved: cost=$${estimatedCost.toFixed(6)}, tokens=${parallelResult.stats.totalInputTokens}+${parallelResult.stats.totalOutputTokens}`);
            } catch (metricsError) {
              console.warn('[streaming-mode][metrics] Failed to save metrics:', metricsError);
            }
            
            emit({ type: 'progress', step: 'complete', progress: 100, message: 'Hoàn thành!' });
            await streamDelay(100);
            
            // Return saved content with dedup warning and persona fit if applicable
            emit({ 
              type: 'result', 
              data: {
                ...savedContent,
                dedupWarning: dedupResult?.isWarning || dedupResult?.isDuplicate ? {
                  isDuplicate: dedupResult.isDuplicate,
                  similarity: dedupResult.similarity,
                  matchedContentPreview: dedupResult.matchedContentPreview,
                  matchedContentId: dedupResult.matchedContentId,
                } : null,
                personaFit: personaFitResult ? {
                  averageScore: personaFitResult.averageScore,
                  averageGrade: personaFitResult.averageGrade,
                  channelScores: personaFitResult.channelScores,
                  topSuggestions: personaFitResult.topSuggestions,
                  matchedElements: personaFitResult.overallMatchedElements,
                } : null,
                strategyValidation: strategyValidation.conflicts.length > 0 ? {
                  conflicts: strategyValidation.conflicts.map(c => ({
                    type: c.type,
                    severity: c.severity,
                    message: c.message,
                  })),
                  scorePenalty: strategyValidation.scorePenalty,
                  wasAdjusted: strategyValidation.promptAdjustments.length > 0,
                } : null,
                lengthCompliance: lengthValidation ? {
                  overallCompliance: lengthValidation.overallCompliance,
                  complianceScore: lengthValidation.complianceScore,
                  channelsNeedingExpansion: lengthValidation.channelsNeedingExpansion,
                  expansionCount,
                  results: Object.fromEntries(
                    Object.entries(lengthValidation.results).map(([ch, res]) => [
                      ch,
                      { actualLength: res.actualLength, minRequired: res.minRequired, maxAllowed: res.maxAllowed, complianceLevel: res.complianceLevel }
                    ])
                  ),
                } : null,
                // P3: Cross-Channel Deduplication result
                crossChannelDedup: crossChannelDedupResult ? {
                  hasDuplicates: crossChannelDedupResult.hasDuplicates,
                  hasWarnings: crossChannelDedupResult.hasWarnings,
                  overallScore: crossChannelDedupResult.overallScore,
                  channelsNeedingDiversification: crossChannelDedupResult.channelsNeedingDiversification,
                  diversificationSuggestions: crossChannelDedupResult.diversificationSuggestions,
                  pairs: crossChannelDedupResult.pairs.slice(0, 10),
                } : null,
                // Task 13: Multichannel Prioritization metadata
                channelPrioritization: primaryChannels.length > 0 ? {
                  primaryCompleted: true,
                  secondarySkipped: skippedSecondaryChannels,
                  primaryChannels,
                } : null,
              }
            });
            
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
            
            // NEW: Mark task as failed
            if (taskId) {
              await failTask(supabase, taskId, error instanceof Error ? error.message : 'Lỗi không xác định');
            }
            
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

    // NEW: Build Smart Context for enhanced generation
    const qualityMode = normalizeQualityMode(formData.qualityMode);
    let smartContext: SmartContextResult | null = null;

    if (qualityMode !== 'fast') {
      try {
        smartContext = await buildSmartContext(supabase, {
          qualityMode,
          brandTemplateId: formData.brandTemplateId,
          organizationId: organizationId || undefined,
          targetPersonaId: formData.targetPersonaId,
          includeHookPatterns: true,
          includeCTAPatterns: true,
          includeLearning: true,
        });
        console.log(`[normal-mode] Smart context built, richness: ${smartContext.contextRichnessScore}/100`);
      } catch (err) {
        console.warn('[normal-mode] Failed to build smart context:', err);
      }
    }

    // NEW: Knowledge Graph Context - Phase 6
    let knowledgeGraphContext: KnowledgeGraphContext | null = null;
    let knowledgeGraphPromptSection = '';
    
    if (qualityMode !== 'fast' && industryTemplateId) {
      try {
        knowledgeGraphContext = await fetchKnowledgeGraphContext(supabase, {
          topic: formData.topic,
          industryTemplateId,
          organizationId: organizationId || undefined,
          limit: 10,
        });
        
        if (knowledgeGraphContext.regulations.length > 0 || knowledgeGraphContext.relevantTerms.length > 0) {
          knowledgeGraphPromptSection = buildKnowledgeGraphPromptSection(knowledgeGraphContext);
          console.log(`[normal-mode] Knowledge Graph loaded: ${knowledgeGraphContext.regulations.length} regulations, ${knowledgeGraphContext.relevantTerms.length} terms`);
        }
      } catch (err) {
        console.warn('[normal-mode] Failed to fetch Knowledge Graph context:', err);
      }
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
      extendedBrandContext,
      channelOptimizations,
      smartContext,
      qualityMode,
      formData.contentRole // NEW: Content role for orchestration flow
    );
    
    // Inject strategy conflict adjustments if any (normal mode)
    const fullSystemPrompt = strategyValidation.promptAdjustments 
      ? systemPrompt + strategyValidation.promptAdjustments 
      : systemPrompt;
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

    // Build hook overview for all channels (non-streaming)
    const hookOverviewNonStreaming = buildHookOverview(formData.selectedHooks, formData.globalHook);
    
    // Build channel-specific hook sections for each channel
    const channelHookSections = formData.channels.reduce((acc, channel) => {
      acc[channel] = buildHookSection(channel, formData.selectedHooks, formData.globalHook);
      return acc;
    }, {} as Record<string, string>);
    
    // Log hook usage for non-streaming
    if (formData.selectedHooks?.length || formData.globalHook) {
      console.log(`Using hooks: ${formData.selectedHooks?.length || 0} channel-specific, globalHook: ${!!formData.globalHook}`);
    }

    // Build user prompt with optional edited previews as examples
    let userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}
${targetedProductContext}
${targetedPersonaContext}
${hookOverviewNonStreaming}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.
Đảm bảo thông điệp lõi nhất quán nhưng format và tone khác nhau theo từng nền tảng.
Nội dung sẵn sàng đăng ngay.`;

    // Add channel-specific hook instructions
    const channelsWithHooks = Object.entries(channelHookSections).filter(([_, section]) => section.length > 0);
    if (channelsWithHooks.length > 0) {
      userPrompt += `\n\n## HOOK INSTRUCTIONS PER CHANNEL`;
      for (const [channel, hookSection] of channelsWithHooks) {
        userPrompt += `\n\n### ${channel.toUpperCase()}${hookSection}`;
      }
    }

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
      facebook: "Nội dung cho Facebook (250-500 chữ, hook mạnh, cấu trúc đầy đủ: tiêu đề, giới thiệu, case study, giải pháp, CTA)",
      instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
      twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
      google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
      linkedin: "Nội dung cho LinkedIn (300-600 chữ, B2B authority, insight sâu, case study, expert advice)",
      email: "Nội dung Email (250-500 chữ, subject line + body có depth + CTA rõ ràng)",
      youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
      zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
      telegram: "Nội dung Telegram (200-500 chữ, bullet, dễ đọc, có chiều sâu)",
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

    // AI configs already fetched in parallel above
    console.log(`[ai-config] Using model: ${aiConfig.model}, temp: ${aiConfig.temperature}, max_tokens: ${aiConfig.max_tokens}`);
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
        facebook: "Nội dung cho Facebook (250-500 chữ, hook mạnh, cấu trúc đầy đủ: tiêu đề, giới thiệu, case study, giải pháp, CTA)",
        instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
        twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
        google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
        linkedin: "Nội dung cho LinkedIn (300-600 chữ, B2B authority, insight sâu, case study, expert advice)",
        email: "Nội dung Email (250-500 chữ, subject line + body có depth + CTA rõ ràng)",
        youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
        zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
        telegram: "Nội dung Telegram (200-500 chữ, bullet, dễ đọc, có chiều sâu)",
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
    ): Promise<{ parsed: any; usage: { prompt_tokens: number; completion_tokens: number } | null; modelUsed: string }> => {
      const channelTools = buildToolsForChannels(channelsToGenerate);
      const includesWebsite = channelsToGenerate.includes('website');
      const effectiveMaxTokens = modelConfig.maxTokens ?? (includesWebsite ? Math.max(aiConfig.max_tokens, 12288) : aiConfig.max_tokens);
      
      console.log(`Calling AI (${modelConfig.model}) for channels: ${channelsToGenerate.join(', ')}`);
      
      const MAX_INVALID_FORMAT_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_INVALID_FORMAT_RETRIES; attempt++) {
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
          if (attempt < MAX_INVALID_FORMAT_RETRIES) {
            console.warn(`[ai-format] Invalid response format, retry ${attempt + 1}/${MAX_INVALID_FORMAT_RETRIES}`);
            continue;
          }
          throw new Error("Invalid AI response format");
        }

        // Extract actual token usage from API response
        const usage = result.data?.usage ? {
          prompt_tokens: result.data.usage.prompt_tokens || 0,
          completion_tokens: result.data.usage.completion_tokens || 0,
        } : null;

        // Extract actual cost from provider (Lovable Gateway returns upstream_inference_cost)
        const upstreamCost = result.data?.usage?.cost_details?.upstream_inference_cost;
        if (usage && upstreamCost) {
          (usage as any).upstream_cost = upstreamCost;
        }

        return {
          parsed: JSON.parse(toolCall.function.arguments),
          usage,
          modelUsed: result.model || modelConfig.model,
        };
      }

      throw new Error("Invalid AI response format");
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
    ): Promise<{ channel: string; data: any; success: boolean; error?: any; durationMs: number; usage?: { prompt_tokens: number; completion_tokens: number; upstream_cost?: number } | null; modelUsed?: string }> => {
      const startTime = Date.now();
      console.log(`[parallel] Starting ${channel} with model ${config.model}`);
      
      try {
        const { parsed: data, usage, modelUsed } = await generateAIContentForChannels(currentPrompt, [channel], config);
        const durationMs = Date.now() - startTime;
        console.log(`[parallel] ✅ ${channel} completed in ${(durationMs / 1000).toFixed(1)}s${usage ? ` (${usage.prompt_tokens}+${usage.completion_tokens} tokens)` : ''}`);
        
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
        
        return { channel, data, success: true, durationMs, usage, modelUsed };
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
      const allResults: { channel: string; data: any; success: boolean; error?: any; durationMs: number; usage?: { prompt_tokens: number; completion_tokens: number; upstream_cost?: number } | null; modelUsed?: string }[] = [];
      
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
      
      // Accumulate actual usage data per channel
      const _actualUsage: Record<string, { input: number; output: number }> = {};
      const _actualModels: Record<string, string> = {};
      let _totalUpstreamCost = 0;
      
      for (const result of allResults) {
        if (result.success && result.data) {
          const contentKey = `${result.channel}_content`;
          if (result.data[contentKey]) {
            mergedData[contentKey] = result.data[contentKey];
          }
          // Track actual usage per channel
          if (result.usage) {
            _actualUsage[result.channel] = { 
              input: result.usage.prompt_tokens, 
              output: result.usage.completion_tokens 
            };
            if ((result.usage as any).upstream_cost) {
              _totalUpstreamCost += (result.usage as any).upstream_cost;
            }
          }
          if (result.modelUsed) {
            _actualModels[result.channel] = result.modelUsed;
          }
        }
      }
      
      // Attach usage metadata to mergedData for metrics
      mergedData._usageMetadata = {
        tokenUsage: _actualUsage,
        modelsUsed: _actualModels,
        totalUpstreamCost: _totalUpstreamCost,
        totalDurationMs: totalDuration,
        channelDurations: Object.fromEntries(allResults.filter(r => r.success).map(r => [r.channel, r.durationMs])),
      };
      
      console.log(`[parallel] ✅ Merged ${Object.keys(mergedData).length - 2} channel contents, tracked usage for ${Object.keys(_actualUsage).length} channels`);
      return mergedData;
    };

    // Legacy function for backward compatibility (single model for all channels)
    const generateAIContent = async (currentPrompt: string) => {
      const { parsed, usage, modelUsed } = await generateAIContentForChannels(currentPrompt, formData.channels, {
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: null,
      });
      // Attach usage metadata
      if (usage) {
        const _usage: Record<string, { input: number; output: number }> = {};
        const _models: Record<string, string> = {};
        for (const ch of formData.channels) {
          _usage[ch] = { input: Math.round((usage.prompt_tokens || 0) / formData.channels.length), output: Math.round((usage.completion_tokens || 0) / formData.channels.length) };
          _models[ch] = modelUsed;
        }
        parsed._usageMetadata = { tokenUsage: _usage, modelsUsed: _models, totalUpstreamCost: (usage as any).upstream_cost || 0, totalDurationMs: 0, channelDurations: {} };
      }
      return parsed;
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
        const { parsed, usage, modelUsed } = await generateAIContentForChannels(currentPrompt, [channel], config);
        // Attach usage metadata for single channel
        if (usage) {
          parsed._usageMetadata = {
            tokenUsage: { [channel]: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 } },
            modelsUsed: { [channel]: modelUsed },
            totalUpstreamCost: (usage as any).upstream_cost || 0,
            totalDurationMs: 0,
            channelDurations: {},
          };
        }
        return parsed;
      }
      
      // Legacy: group by model (kept for reference but not used)
      const modelGroups = groupChannelsByModel(formData.channels);
      console.log(`[multi-model] Generating with ${modelGroups.size} different model configs`);
      
      const groupResults = await Promise.all(
        Array.from(modelGroups.entries()).map(async ([key, group]) => {
          console.log(`[multi-model] Group "${key}": channels=${group.channels.join(',')}, model=${group.config.model}`);
          const { parsed, usage, modelUsed } = await generateAIContentForChannels(currentPrompt, group.channels, group.config);
          return { channels: group.channels, data: parsed, usage, modelUsed };
        })
      );
      
      const mergedData: any = { title: groupResults[0].data.title };
      const _usage: Record<string, { input: number; output: number }> = {};
      const _models: Record<string, string> = {};
      let _totalUpstreamCost = 0;
      
      for (const result of groupResults) {
        for (const channel of result.channels) {
          const contentKey = `${channel}_content`;
          if (result.data[contentKey]) {
            mergedData[contentKey] = result.data[contentKey];
          }
          if (result.usage) {
            _usage[channel] = { 
              input: Math.round((result.usage.prompt_tokens || 0) / result.channels.length), 
              output: Math.round((result.usage.completion_tokens || 0) / result.channels.length) 
            };
          }
          _models[channel] = result.modelUsed;
        }
        if (result.usage && (result.usage as any).upstream_cost) {
          _totalUpstreamCost += (result.usage as any).upstream_cost;
        }
      }
      
      mergedData._usageMetadata = { tokenUsage: _usage, modelsUsed: _models, totalUpstreamCost: _totalUpstreamCost, totalDurationMs: 0, channelDurations: {} };
      
      console.log(`[multi-model] Merged ${Object.keys(mergedData).length - 2} channel contents`);
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
      // ============================================
      // AGENT MODE: Plain text generation per channel (no tool calling)
      // Compatible with ALL models — Qwen, Claude, Gemini, GPT, etc.
      // ============================================
      if (formData.agentMode) {
        console.log(`[agent-mode] 🤖 Agent mode enabled — plain text generation for ${formData.channels.length} channels`);
        const agentData: any = { title: formData.topic };
        
        for (const channel of formData.channels) {
          const channelConfig = channelModelConfigs.get(channel);
          const model = channelConfig?.model || aiConfig.model;
          const temp = channelConfig?.temperature ?? aiConfig.temperature;
          const maxTokens = channelConfig?.maxTokens ?? aiConfig.max_tokens;
          
          const channelDesc = {
            website: "Bài viết chuẩn SEO (1000-2000 chữ), Markdown format, có H1/H2/H3.",
            facebook: "Nội dung Facebook (250-500 chữ, hook mạnh, CTA cuối)",
            instagram: "Nội dung Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
            twitter: "Thread X/Twitter (5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
            google_maps: "Nội dung Google Maps (80-150 chữ, trung tính, không emoji)",
            linkedin: "Nội dung LinkedIn (300-600 chữ, B2B authority, insight sâu)",
            email: "Email marketing (250-500 chữ, subject line + body + CTA)",
            youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
            zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
            telegram: "Nội dung Telegram (200-500 chữ, bullet, dễ đọc)",
            tiktok: "Short-form TikTok (60-150 chữ, hook 3s đầu, năng lượng cao)",
            threads: "Nội dung Threads (50-200 chữ, conversational, dễ tương tác)",
          } as Record<string, string>;
          
          const channelPrompt = `${userPrompt}\n\nViết nội dung cho kênh: ${channel.toUpperCase()}\nYêu cầu: ${channelDesc[channel] || 'Nội dung phù hợp kênh'}\nViết TRỰC TIẾP nội dung, KHÔNG giải thích, KHÔNG markdown wrapper.`;
          
          console.log(`[agent-mode] Generating ${channel} with ${model}`);
          const result = await callAI({
            functionName: 'generate-multichannel',
            organizationId: organizationId || undefined,
            modelOverride: model,
            temperatureOverride: temp,
            messages: [
              { role: 'system', content: fullSystemPrompt },
              { role: 'user', content: channelPrompt },
            ],
            maxTokensOverride: maxTokens,
          });
          
          if (result.success) {
            const content = result.data?.choices?.[0]?.message?.content || '';
            agentData[`${channel}_content`] = content;
            console.log(`[agent-mode] ✅ ${channel} done (${content.length} chars)`);
          } else {
            console.warn(`[agent-mode] ❌ ${channel} failed: ${result.error}`);
            agentData[`${channel}_content`] = '';
          }
        }
        
        generatedData = agentData;
        fromCache = false;
        console.log(`[agent-mode] All channels complete`);
      } else {
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
      } // end else (non-agent mode)
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
    // SEMANTIC DEDUPLICATION CHECK - Detect similar existing content
    // ============================================
    let dedupResult: DuplicateCheckResult | null = null;
    if (organizationId && !fromCache) {
      try {
        // Extract text from generated channel contents for dedup check
        const channelContents: Record<string, string> = {};
        for (const channel of formData.channels) {
          const contentKey = `${channel}_content`;
          if (generatedData[contentKey]) {
            if (typeof generatedData[contentKey] === 'object' && generatedData[contentKey].content) {
              channelContents[channel] = generatedData[contentKey].content;
            } else if (typeof generatedData[contentKey] === 'string') {
              channelContents[channel] = generatedData[contentKey];
            }
          }
        }
        
        const textToCheck = extractMultichannelText(channelContents);
        if (textToCheck.length > 50) {
          dedupResult = await checkSemanticDuplicate(
            supabase,
            textToCheck,
            organizationId,
            formData.brandTemplateId,
            formData.contentId, // Exclude current content when regenerating
            'multichannel'
          );
          
          if (dedupResult.isDuplicate) {
            console.log(`[dedup] ⚠️ Duplicate detected (${(dedupResult.similarity! * 100).toFixed(1)}%): ${dedupResult.matchedContentPreview?.slice(0, 100)}...`);
          } else if (dedupResult.isWarning) {
            console.log(`[dedup] 📝 Similar content found (${(dedupResult.similarity! * 100).toFixed(1)}%)`);
          } else {
            console.log(`[dedup] ✅ Content is unique`);
          }
        }
      } catch (dedupError) {
        console.warn('[dedup] Check failed, continuing:', dedupError);
        // Fail open - don't block content creation if dedup fails
      }
    }

    // ============================================
    // CROSS-CHANNEL DEDUPLICATION - P3 (Normal mode)
    // Ensures content diversity across channels
    // ============================================
    let crossChannelDedupResult: CrossChannelDedupResult | null = null;
    if (formData.channels.length >= 2 && formData.action !== 'expand' && !fromCache) {
      try {
        // Extract channel contents for cross-channel check
        const channelContents: Record<string, string> = {};
        for (const channel of formData.channels) {
          const contentKey = `${channel}_content`;
          if (generatedData[contentKey]) {
            if (typeof generatedData[contentKey] === 'object' && generatedData[contentKey].content) {
              channelContents[channel] = generatedData[contentKey].content;
            } else if (typeof generatedData[contentKey] === 'string') {
              channelContents[channel] = generatedData[contentKey];
            }
          }
        }
        
        crossChannelDedupResult = await checkCrossChannelDuplicate(channelContents);
        
        if (crossChannelDedupResult.hasDuplicates) {
          console.log(`[cross-dedup] ⚠️ ${crossChannelDedupResult.channelsNeedingDiversification.length} channels need diversification`);
        } else {
          console.log(`[cross-dedup] ✅ Diversity score: ${crossChannelDedupResult.overallScore}%`);
        }
      } catch (crossDedupError) {
        console.warn('[cross-dedup] Check failed:', crossDedupError);
      }
    }

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
    // Based on qualityMode: fast skips, balanced/quality runs
    // ============================================
    let critiqueResult: CritiqueResult | null = null;
    let wasRefined = false;
    let refinementCount = 0;
    let needsManualReview = false;

    // Get quality mode config (reuse qualityMode from earlier)
    const qualityConfig = QUALITY_MODE_CONFIG[qualityMode];
    console.log(`[quality-mode] Using '${qualityMode}': skipCritique=${qualityConfig.skipCritique}, maxRefinements=${qualityConfig.maxRefinements}`);

    // Only run critique if not from cache AND quality mode allows it
    if (!fromCache && !qualityConfig.skipCritique) {
      try {
        const critiqueLoop = await runSelfCritiqueLoop({
          content: generatedData,
          contentType: 'multichannel',
          brandVoice,
          mergedRules,
          additionalContext: `Channels: ${formData.channels.join(', ')}`,
          apiKey: LOVABLE_API_KEY,
          maxRefinements: qualityConfig.maxRefinements,
        });

        generatedData = critiqueLoop.finalContent;
        critiqueResult = critiqueLoop.critiqueResult;
        wasRefined = critiqueLoop.wasRefined;
        refinementCount = critiqueLoop.refinementCount;
        needsManualReview = critiqueLoop.needsManualReview || websiteWordCountShort;
        
        // Apply strategy validation penalty if conflicts detected (normal mode)
        if (critiqueResult && strategyValidation.scorePenalty > 0) {
          const originalScore = critiqueResult.overall_score;
          critiqueResult.overall_score = Math.max(0, critiqueResult.overall_score - strategyValidation.scorePenalty);
          critiqueResult.issues = critiqueResult.issues || [];
          critiqueResult.issues.push({
            category: 'structure',
            severity: strategyValidation.conflictLevel === 'severe' ? 'error' : 'warning',
            description: `Strategy conflict: ${strategyValidation.conflicts.map(c => c.message).join('; ')}`,
          });
          console.log(`[strategy-penalty] Score adjusted: ${originalScore} → ${critiqueResult.overall_score} (penalty: ${strategyValidation.scorePenalty})`);
        }

        console.log(`Self-Critique complete: score=${critiqueResult.overall_score}, refined=${wasRefined}, needsReview=${needsManualReview}, shortContent=${websiteWordCountShort}`);
      } catch (critiqueError) {
        console.error("Self-critique failed, flagging for manual review:", critiqueError);
        // Flag for manual review when critique system fails
        needsManualReview = true;
      }
    } else if (qualityConfig.skipCritique) {
      console.log(`[quality-mode] Skipping self-critique (fast mode)`);
    }

    // ============================================
    // LENGTH VALIDATION & AUTO-EXPANSION - P1 Dynamic Length Enforcement
    // Validate all channels and auto-expand priority channels if too short
    // ============================================
    let lengthValidation: MultiChannelLengthValidation | null = null;
    let expansionCount = 0;
    const MAX_EXPANSIONS = 2;
    
    if (!fromCache && qualityMode !== 'fast') {
      try {
        const channelContentsForValidation: Record<string, string> = {};
        for (const channel of formData.channels) {
          const contentKey = `${channel}_content`;
          if (generatedData[contentKey]) {
            if (typeof generatedData[contentKey] === 'object' && generatedData[contentKey].content) {
              channelContentsForValidation[channel] = generatedData[contentKey].content;
            } else if (typeof generatedData[contentKey] === 'string') {
              channelContentsForValidation[channel] = generatedData[contentKey];
            }
          }
        }
        
        lengthValidation = validateAllChannels(channelContentsForValidation, channelOverrides as Record<string, { min_length?: number; max_length?: number }> | undefined);
        console.log(`[length-validation] Initial: compliance=${lengthValidation.overallCompliance}, score=${lengthValidation.complianceScore}/100`);
        
        for (const [ch, res] of Object.entries(lengthValidation.results)) {
          const icon = res.complianceLevel === 'optimal' ? '✅' : res.complianceLevel === 'acceptable' ? '✓' : res.complianceLevel === 'warning' ? '⚠️' : '❌';
          console.log(`  ${icon} ${ch}: ${res.actualLength}/${res.minRequired}-${res.maxAllowed}`);
        }
        
        const priorityNeedingExpansion = getPriorityChannelsNeedingExpansion(lengthValidation.results);
        
        if (priorityNeedingExpansion.length > 0 && qualityMode === 'quality') {
          console.log(`[length-auto-fix] ${priorityNeedingExpansion.length} priority channels need expansion`);
          
          for (const channel of priorityNeedingExpansion) {
            if (expansionCount >= MAX_EXPANSIONS * priorityNeedingExpansion.length) break;
            
            const result = lengthValidation.results[channel];
            const currentContent = channelContentsForValidation[channel];
            if (!currentContent || !result) continue;
            
            const expansionPrompt = buildExpansionPrompt(channel, currentContent, result, {
              topic: formData.topic,
              contentGoal: formData.contentGoal,
            });
            
            try {
              console.log(`[length-auto-fix] Expanding ${channel} (${result.actualLength}/${result.minRequired})...`);
              
              const channelConfig = channelModelConfigs.get(channel);
              const effectiveModel = channelConfig?.model || aiConfig.model;
              
              const expandResult = await callAI({
                functionName: 'generate-multichannel-expand',
                organizationId: organizationId || undefined,
                modelOverride: effectiveModel,
                temperatureOverride: 0.7,
                messages: [
                  { role: "system", content: "Bạn là chuyên gia mở rộng nội dung. Chỉ trả về nội dung đã mở rộng, không giải thích." },
                  { role: "user", content: expansionPrompt },
                ],
                maxTokensOverride: 2048,
              });
              
              if (expandResult.success && expandResult.data?.choices?.[0]?.message?.content) {
                const expandedContent = expandResult.data.choices[0].message.content.trim();
                const contentKey = `${channel}_content`;
                if (typeof generatedData[contentKey] === 'object') {
                  generatedData[contentKey].content = expandedContent;
                } else {
                  generatedData[contentKey] = expandedContent;
                }
                channelContentsForValidation[channel] = expandedContent;
                expansionCount++;
                console.log(`[length-auto-fix] ✅ ${channel} expanded`);
              }
            } catch (expandError) {
              console.warn(`[length-auto-fix] Failed to expand ${channel}:`, expandError);
            }
          }
          
          if (expansionCount > 0) {
            lengthValidation = validateAllChannels(channelContentsForValidation, channelOverrides as Record<string, { min_length?: number; max_length?: number }> | undefined);
            console.log(`[length-validation] After auto-fix: compliance=${lengthValidation.overallCompliance}, score=${lengthValidation.complianceScore}/100`);
          }
        }
        
        if (lengthValidation.overallCompliance === 'fail') {
          needsManualReview = true;
          console.warn(`[length-validation] ⚠️ Content still below requirements, flagging for review`);
        }
      } catch (lengthError) {
        console.warn('[length-validation] Validation failed:', lengthError);
      }
    }

    // ============================================
    // AUTO-APPEND FOOTER INFO (Post AI-generation)
    // Only append if user opts in (default: true)
    // ============================================
    const shouldAppendFooter = formData.includeFooterInfo !== false;
    const footerInfo = extendedBrandContext?.footerInfo;
    const hasFooterInfo = footerInfo && (footerInfo.phone || footerInfo.email || footerInfo.website || footerInfo.address);
    const brandAllowEmoji = brandVoice?.allow_emoji !== false;

    // Get extra brand context for footer
    const companyName = extendedBrandContext?.brandName || footerInfo?.company_name;
    const tagline = (extendedBrandContext as any)?.tagline || (brandVoice as any)?.tagline;

    if (shouldAppendFooter && hasFooterInfo) {
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
      // CREATE MODE: Dedup check before insert
      const dedupWindow = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: existingContent } = await supabase
        .from('multi_channel_contents')
        .select('*')
        .eq('user_id', userId)
        .eq('topic', formData.topic)
        .gte('created_at', dedupWindow)
        .limit(1)
        .maybeSingle();

      if (existingContent) {
        console.log(`[non-streaming] Dedup: returning existing content ${existingContent.id}`);
        content = existingContent;
        dbError = null;
      } else {
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
          // Hook integration - save selected hooks with content
          selected_hooks: formData.selectedHooks || [],
          global_hook: formData.globalHook || null,
          // Core Content Layer - link to parent Core Content
          core_content_id: formData.coreContentId || null,
          // Content Role for orchestration flow (seed/sprout/harvest)
          content_role: formData.contentRole || null,
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
    }
    
    if (industryMemory) {
      console.log("Content saved with Industry Memory version:", industryMemory.version);
    }
    if (critiqueResult) {
      console.log(`Content saved: score=${critiqueResult.overall_score}, needsReview=${needsManualReview}`);
    }

    if (dbError) {
      console.error("Database error:", dbError);
      // Mark task as failed if taskId provided
      if (formData.taskId) {
        await failTask(supabase, formData.taskId, "Failed to save content");
      }
      throw new Error("Failed to save content");
    }

    console.log("Content saved with ID:", content.id, "fromCache:", fromCache, "critiqueScore:", critiqueResult?.overall_score || 'N/A');

    // Mark background task as completed if taskId provided
    if (formData.taskId && content?.id) {
      await completeTask(supabase, formData.taskId, content.id, 'multi_channel_contents');
    }

    // ============================================
    // PHASE 1: METRICS LOGGING (Non-streaming mode)
    // ============================================
    try {
      const metricsTraceId = generateTraceId();
      const contextSources = getContextSources({
        industryMemory,
        brandContext: extendedBrandContext,
        personas: formData.targetPersonaId ? [{ id: formData.targetPersonaId }] : undefined,
        products: formData.targetProductId ? [{ id: formData.targetProductId }] : undefined,
      });
      
      // Use actual token usage from AI responses (attached by generateChannelsInParallel / generateWithMultipleModels)
      const usageMetadata = generatedData?._usageMetadata;
      
      let inputTokensEstimated: number;
      let outputTokensEstimated: number;
      let modelsUsed: Record<string, string>;
      let estimatedCostUsd: number;
      const requestDurationMs = Date.now() - requestStartTime;
      
      if (usageMetadata && Object.keys(usageMetadata.tokenUsage).length > 0) {
        // ACTUAL USAGE from API responses
        inputTokensEstimated = Object.values(usageMetadata.tokenUsage as Record<string, { input: number; output: number }>).reduce((sum, u) => sum + u.input, 0);
        outputTokensEstimated = Object.values(usageMetadata.tokenUsage as Record<string, { input: number; output: number }>).reduce((sum, u) => sum + u.output, 0);
        modelsUsed = usageMetadata.modelsUsed;
        
        // Prefer upstream cost from provider if available, otherwise estimate
        if (usageMetadata.totalUpstreamCost > 0) {
          estimatedCostUsd = usageMetadata.totalUpstreamCost;
          console.log(`[metrics] Using actual upstream cost: $${estimatedCostUsd.toFixed(6)}`);
        } else {
          estimatedCostUsd = estimateTotalCost(modelsUsed, usageMetadata.tokenUsage);
        }
        
        console.log(`[metrics] Actual usage: ${inputTokensEstimated} input + ${outputTokensEstimated} output tokens, ${Object.keys(modelsUsed).length} models`);
      } else {
        // FALLBACK: estimate if no usage data (e.g., cache hit)
        const channelCount = formData.channels.length;
        inputTokensEstimated = 2000 + (channelCount * 500);
        outputTokensEstimated = channelCount * 800;
        modelsUsed = {};
        formData.channels.forEach(ch => {
          const channelConfig = channelModelConfigs.get(ch);
          modelsUsed[ch] = channelConfig?.model || aiConfig.model;
        });
        estimatedCostUsd = estimateTotalCost(modelsUsed, 
          Object.fromEntries(formData.channels.map(ch => [ch, { input: inputTokensEstimated / channelCount, output: outputTokensEstimated / channelCount }]))
        );
        console.log(`[metrics] Using estimated usage (cache hit or no usage data)`);
      }
      
      await saveMetrics(supabase, {
        traceId: metricsTraceId,
        functionName: 'generate-multichannel',
        organizationId: organizationId || undefined,
        userId: userId || undefined,
        brandTemplateId: formData.brandTemplateId,
        totalDurationMs: usageMetadata?.totalDurationMs || requestDurationMs,
        contextSources,
        hadError: false,
        channels: formData.channels,
        qualityMode: formData.qualityMode || 'balanced',
        cacheHit: fromCache,
        contentId: content.id,
        actionType: formData.action || 'create',
        // NEW: Cost tracking fields
        inputTokensEstimated,
        outputTokensEstimated,
        modelsUsed,
        estimatedCostUsd,
      });
      
      console.log(`[metrics] Saved for content ${content.id}`);
    } catch (metricsError) {
      console.warn('[metrics] Failed to save:', metricsError);
    }

    // Include dedup result, strategy validation, and length compliance in response
    const responseData = { 
      ...content, 
      fromCache,
      // Semantic deduplication warning (if similar content found)
      dedupWarning: dedupResult?.isWarning || dedupResult?.isDuplicate ? {
        isDuplicate: dedupResult.isDuplicate,
        similarity: dedupResult.similarity,
        matchedContentPreview: dedupResult.matchedContentPreview,
        matchedContentId: dedupResult.matchedContentId,
      } : null,
      // Strategy validation warnings (P0)
      strategyValidation: strategyValidation.conflicts.length > 0 ? {
        conflicts: strategyValidation.conflicts.map(c => ({
          type: c.type,
          severity: c.severity,
          message: c.message,
        })),
        scorePenalty: strategyValidation.scorePenalty,
        wasAdjusted: strategyValidation.promptAdjustments.length > 0,
      } : null,
      // Length compliance info (P1)
      lengthCompliance: lengthValidation ? {
        overallCompliance: lengthValidation.overallCompliance,
        complianceScore: lengthValidation.complianceScore,
        channelsNeedingExpansion: lengthValidation.channelsNeedingExpansion,
        expansionCount,
        results: Object.fromEntries(
          Object.entries(lengthValidation.results).map(([ch, res]) => [
            ch,
            { actualLength: res.actualLength, minRequired: res.minRequired, maxAllowed: res.maxAllowed, complianceLevel: res.complianceLevel }
          ])
        ),
      } : null,
      // P3: Cross-Channel Deduplication result
      crossChannelDedup: crossChannelDedupResult ? {
        hasDuplicates: crossChannelDedupResult.hasDuplicates,
        hasWarnings: crossChannelDedupResult.hasWarnings,
        overallScore: crossChannelDedupResult.overallScore,
        channelsNeedingDiversification: crossChannelDedupResult.channelsNeedingDiversification,
        diversificationSuggestions: crossChannelDedupResult.diversificationSuggestions,
        pairs: crossChannelDedupResult.pairs.slice(0, 10),
      } : null,
    };
    
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-multichannel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));