// ============================================
// Channel Transformation Matrix v1.0
// Defines extraction rules when transforming Core Content → Channel Posts
// ============================================

/**
 * Content extraction percentage - how much of Core Content to use
 * Lower = more condensed, Higher = more comprehensive
 */
export type ExtractionLevel = 'minimal' | 'condensed' | 'balanced' | 'comprehensive' | 'full';

/**
 * Focus area - which parts of Core Content to prioritize
 */
export type FocusArea = 
  | 'hook_cta'        // Extract hook + CTA only
  | 'key_points'      // Main arguments/benefits
  | 'insights'        // Data, statistics, analysis
  | 'storytelling'    // Narrative elements, examples
  | 'seo_structure'   // Full structure for SEO
  | 'script_format'   // Convert to spoken format
  | 'summary'         // Executive summary
  | 'social_proof';   // Testimonials, reviews, proof points

/**
 * Preservation priority - what elements must be kept
 */
export type PreservePriority = 'hook' | 'cta' | 'key_insight' | 'social_proof' | 'statistic' | 'quote';

/**
 * Channel transformation configuration
 */
export interface ChannelTransformConfig {
  /** Extraction percentage range (e.g., [10, 20] = 10-20% of content) */
  extractionRange: [number, number];
  
  /** Extraction level label */
  extractionLevel: ExtractionLevel;
  
  /** Primary focus areas (ordered by priority) */
  focusAreas: FocusArea[];
  
  /** Elements that MUST be preserved */
  preserveElements: PreservePriority[];
  
  /** Channel-specific transformation notes */
  transformNotes: string[];
  
  /** Output format guidance */
  formatGuidance: string;
  
  /** Word count target from Core Content ratio */
  wordCountMultiplier: [number, number]; // [min, max] multiplier from Core Content word count
}

/**
 * Complete transformation matrix for all channels
 * Based on Core Content Flow philosophy
 */
export const CHANNEL_TRANSFORM_MATRIX: Record<string, ChannelTransformConfig> = {
  // ============================================
  // SEO-FOCUSED CHANNELS (High extraction)
  // ============================================
  website: {
    extractionRange: [80, 100],
    extractionLevel: 'full',
    focusAreas: ['seo_structure', 'key_points', 'insights', 'storytelling'],
    preserveElements: ['hook', 'key_insight', 'cta', 'statistic'],
    transformNotes: [
      'Giữ nguyên cấu trúc H1/H2/H3 từ Core Content',
      'Mở rộng các sections với chi tiết bổ sung nếu cần',
      'Tối ưu hóa SEO với keywords tự nhiên',
      'Thêm internal links nếu có context',
      'Đảm bảo Featured Snippet friendly format',
    ],
    formatGuidance: 'Full article với H1, Intro hook, 4-6 H2 sections có depth, Conclusion + CTA. Pure Markdown.',
    wordCountMultiplier: [1.0, 1.5], // Can expand beyond Core Content
  },

  blog: {
    extractionRange: [80, 100],
    extractionLevel: 'full',
    focusAreas: ['seo_structure', 'storytelling', 'insights', 'key_points'],
    preserveElements: ['hook', 'key_insight', 'quote', 'statistic', 'cta'],
    transformNotes: [
      'Mở rộng với storytelling và ví dụ thực tế',
      'Thêm personal voice nếu phù hợp brand',
      'Include blockquotes và callouts',
      'SEO-optimized nhưng readable first',
    ],
    formatGuidance: 'Long-form blog với engaging intro, structured body, memorable conclusion. Include visuals placeholders.',
    wordCountMultiplier: [1.0, 1.8],
  },

  // ============================================
  // PROFESSIONAL CHANNELS (Medium-high extraction)
  // ============================================
  linkedin: {
    extractionRange: [40, 60],
    extractionLevel: 'balanced',
    focusAreas: ['insights', 'key_points', 'hook_cta', 'storytelling'],
    preserveElements: ['hook', 'key_insight', 'statistic', 'cta'],
    transformNotes: [
      'Mở đầu bằng insight/số liệu gây chú ý (không giật tít)',
      'Đoạn ngắn 2-3 dòng, scannable',
      'Focus vào professional value và learnings',
      'Include data points và industry insights',
      'CTA professional: "Share your thoughts", "What\'s your experience?"',
      'Cần đủ depth: phân tích, case study, lời khuyên chuyên gia',
    ],
    formatGuidance: 'Hook insight → Phân tích vấn đề → 3-4 key points + Case study → Expert advice → CTA discussion.',
    wordCountMultiplier: [0.25, 0.45],
  },

  email: {
    extractionRange: [30, 50],
    extractionLevel: 'balanced',
    focusAreas: ['key_points', 'hook_cta', 'summary', 'storytelling'],
    preserveElements: ['hook', 'key_insight', 'cta'],
    transformNotes: [
      'Subject line phải compelling (không spam words)',
      'Greeting personalized nếu có data',
      'Body scannable với bullets',
      'Single clear CTA - không multiple CTAs',
      'PS line nếu phù hợp urgency/bonus',
      'Cần đủ depth: giới thiệu, key points, giải pháp, CTA',
    ],
    formatGuidance: 'Subject: [compelling] → Greeting → Hook → Giới thiệu vấn đề → 3-5 bullets + Case study → CTA button → Signature',
    wordCountMultiplier: [0.20, 0.40],
  },

  youtube: {
    extractionRange: [50, 80],
    extractionLevel: 'comprehensive',
    focusAreas: ['script_format', 'hook_cta', 'key_points', 'storytelling'],
    preserveElements: ['hook', 'key_insight', 'cta', 'quote'],
    transformNotes: [
      'Hook 0-5s: shock/curiosity phải immediate',
      'Intro 5-15s: promise what viewer will learn',
      'Chia thành 3-5 segments có transitions',
      'Include retention hooks giữa segments',
      'CTA: Like + Subscribe + specific action',
      'OUTRO: teaser cho related content',
    ],
    formatGuidance: 'HOOK(5s) → INTRO(15s) → SEGMENT 1-5 → CTA → OUTRO teaser',
    wordCountMultiplier: [0.40, 0.70],
  },

  // ============================================
  // SOCIAL CHANNELS (Medium extraction)
  // ============================================
  facebook: {
    extractionRange: [20, 40],
    extractionLevel: 'balanced',
    focusAreas: ['hook_cta', 'key_points', 'storytelling', 'social_proof'],
    preserveElements: ['hook', 'key_insight', 'cta', 'social_proof'],
    transformNotes: [
      'Hook emoji + **bold** mở đầu',
      'Đoạn ngắn 2-3 dòng, dễ scan trên mobile',
      'Emoji bullets cho key points',
      'Storytelling mini nếu có từ Core Content',
      'CTA engagement: comment/share/tag',
      '3 hashtags cuối bài',
      'Cần đủ depth: giới thiệu, vấn đề, giải pháp, case study, CTA',
    ],
    formatGuidance: 'Hook emoji → Giới thiệu vấn đề → Key points + Case study → Giải pháp → CTA → Hashtags',
    wordCountMultiplier: [0.20, 0.40],
  },

  instagram: {
    extractionRange: [10, 20],
    extractionLevel: 'minimal',
    focusAreas: ['hook_cta', 'key_points'],
    preserveElements: ['hook', 'cta'],
    transformNotes: [
      'Hook ngắn + emoji mở đầu',
      'Nhiều xuống dòng - mobile-first',
      'Emoji làm bullet points',
      'Caption ngắn, visual-focused',
      'CTA soft: "Save this", "Tag someone"',
      '20-30 hashtags cuối (block riêng)',
    ],
    formatGuidance: 'Hook emoji → 2-3 short lines → Emoji bullets → Soft CTA → Hashtag block',
    wordCountMultiplier: [0.05, 0.12],
  },

  threads: {
    extractionRange: [15, 25],
    extractionLevel: 'condensed',
    focusAreas: ['hook_cta', 'insights'],
    preserveElements: ['hook', 'key_insight'],
    transformNotes: [
      'Quan điểm rõ ràng, opinionated',
      '2-3 đoạn ngắn, punchy',
      'Emoji tiết chế',
      'Kết bằng câu hỏi tạo discussion',
      'Hashtags minimal (0-3)',
    ],
    formatGuidance: 'Strong opinion hook → 2-3 supporting points → Question to engage',
    wordCountMultiplier: [0.08, 0.15],
  },

  // ============================================
  // SHORT-FORM CHANNELS (Low extraction)
  // ============================================
  twitter: {
    extractionRange: [5, 10],
    extractionLevel: 'minimal',
    focusAreas: ['hook_cta', 'insights'],
    preserveElements: ['hook', 'key_insight'],
    transformNotes: [
      'Thread format: 1/, 2/, 3/...',
      'Mỗi tweet 280 ký tự max',
      'KHÔNG emoji',
      '5-7 tweets cho thread',
      'Tweet 1: Hook mạnh nhất',
      'Tweet cuối: CTA + recap',
      '1 hashtag cuối thread',
    ],
    formatGuidance: '1/ Hook → 2-5/ Key points → Final/ CTA + hashtag',
    wordCountMultiplier: [0.03, 0.08],
  },

  tiktok: {
    extractionRange: [10, 15],
    extractionLevel: 'minimal',
    focusAreas: ['script_format', 'hook_cta'],
    preserveElements: ['hook', 'cta'],
    transformNotes: [
      'Hook 3s: câu hỏi hoặc statement gây shock',
      'Format cho voiceover/caption',
      '3-5 key points ngắn gọn',
      'Text overlay suggestions',
      'CTA: follow + comment',
      'Trending hashtags + brand hashtags',
    ],
    formatGuidance: 'HOOK(3s) → 3-5 quick points → CTA follow',
    wordCountMultiplier: [0.05, 0.10],
  },

  // ============================================
  // MESSAGING CHANNELS (Condensed)
  // ============================================
  zalo_oa: {
    extractionRange: [15, 25],
    extractionLevel: 'condensed',
    focusAreas: ['hook_cta', 'key_points'],
    preserveElements: ['hook', 'cta', 'key_insight'],
    transformNotes: [
      'Mobile-first, đoạn ngắn',
      'KHÔNG emoji',
      'Tone thân thiện, local',
      'CTA rõ ràng + link',
      'Có thể include promo/offer nếu phù hợp',
    ],
    formatGuidance: 'Hook → 2-3 điểm chính → CTA + link',
    wordCountMultiplier: [0.08, 0.15],
  },

  telegram: {
    extractionRange: [20, 40],
    extractionLevel: 'balanced',
    focusAreas: ['key_points', 'insights', 'summary'],
    preserveElements: ['key_insight', 'statistic', 'cta'],
    transformNotes: [
      'Bullets rõ ràng, structured',
      'Sections với heading nếu dài',
      'KHÔNG emoji',
      'Links allowed và encouraged',
      'More detailed than other messaging',
    ],
    formatGuidance: 'Heading (if long) → Key points bullets → Details → Links → CTA',
    wordCountMultiplier: [0.15, 0.30],
  },

  // ============================================
  // REVIEW CHANNELS (Objective style)
  // ============================================
  google_maps: {
    extractionRange: [10, 20],
    extractionLevel: 'minimal',
    focusAreas: ['key_points', 'social_proof'],
    preserveElements: ['key_insight', 'social_proof', 'statistic'],
    transformNotes: [
      'Tone khách quan, thực tế',
      'Như review chuyên nghiệp',
      'KHÔNG emoji, KHÔNG hashtag',
      'Không selling language',
      'Mention specific features/experiences',
    ],
    formatGuidance: 'Objective opening → 2-3 specific points → Balanced conclusion',
    wordCountMultiplier: [0.08, 0.12],
  },
};

// ============================================
// TRANSFORMATION HELPER FUNCTIONS
// ============================================

/**
 * Get transformation config for a channel
 */
export function getChannelTransformConfig(channel: string): ChannelTransformConfig {
  return CHANNEL_TRANSFORM_MATRIX[channel] || CHANNEL_TRANSFORM_MATRIX.facebook;
}

/**
 * Build transformation instruction for AI prompt
 */
export function buildTransformationInstruction(
  channel: string,
  coreContentWordCount: number,
  contentRole?: 'seed' | 'sprout' | 'harvest'
): string {
  const config = getChannelTransformConfig(channel);
  
  const parts: string[] = [];
  parts.push(`\n## 🔄 CORE CONTENT TRANSFORMATION (${channel.toUpperCase()})`);
  parts.push(`Bạn đang transform từ Core Content (${coreContentWordCount} từ) sang ${channel}.`);
  
  // Extraction guidance
  parts.push(`\n### Extraction Rules:`);
  parts.push(`- Tỷ lệ trích xuất: ${config.extractionRange[0]}-${config.extractionRange[1]}% nội dung gốc`);
  parts.push(`- Level: ${config.extractionLevel.toUpperCase()}`);
  
  // Word count target
  const minWords = Math.round(coreContentWordCount * config.wordCountMultiplier[0]);
  const maxWords = Math.round(coreContentWordCount * config.wordCountMultiplier[1]);
  parts.push(`- Target word count: ${minWords}-${maxWords} từ`);
  
  // Focus areas
  parts.push(`\n### Focus Areas (ưu tiên theo thứ tự):`);
  config.focusAreas.forEach((area, i) => {
    const areaLabels: Record<FocusArea, string> = {
      hook_cta: 'Hook + CTA (giữ nguyên hoặc adapt)',
      key_points: 'Điểm chính/Benefits',
      insights: 'Data, số liệu, phân tích',
      storytelling: 'Narrative, ví dụ thực tế',
      seo_structure: 'Cấu trúc SEO đầy đủ',
      script_format: 'Chuyển sang format nói/video',
      summary: 'Tóm tắt executive',
      social_proof: 'Social proof/Testimonials',
    };
    parts.push(`${i + 1}. ${areaLabels[area]}`);
  });
  
  // Preserve elements
  parts.push(`\n### PHẢI GIỮ LẠI:`);
  config.preserveElements.forEach(element => {
    const elementLabels: Record<PreservePriority, string> = {
      hook: '🎯 Hook chính (adapt cho channel)',
      cta: '📢 CTA (adjust strength theo role)',
      key_insight: '💡 Insight cốt lõi',
      social_proof: '⭐ Social proof/testimonial',
      statistic: '📊 Số liệu quan trọng',
      quote: '💬 Quote đáng nhớ',
    };
    parts.push(`- ${elementLabels[element]}`);
  });
  
  // Role-specific adjustments
  if (contentRole) {
    parts.push(`\n### Content Role Adjustment (${contentRole.toUpperCase()}):`);
    if (contentRole === 'seed') {
      parts.push(`- Giảm CTA strength, focus awareness`);
      parts.push(`- Giữ hook + insight, bỏ promotional elements`);
    } else if (contentRole === 'sprout') {
      parts.push(`- Balance giữa value và soft CTA`);
      parts.push(`- Giữ insights + social proof`);
    } else if (contentRole === 'harvest') {
      parts.push(`- CTA mạnh, giữ social proof + offer`);
      parts.push(`- Include urgency nếu phù hợp`);
    }
  }
  
  // Transform notes
  parts.push(`\n### Channel-specific Notes:`);
  config.transformNotes.forEach(note => {
    parts.push(`• ${note}`);
  });
  
  // Format guidance
  parts.push(`\n### Output Format:`);
  parts.push(config.formatGuidance);
  
  parts.push(`\n⚠️ QUAN TRỌNG: Transform THÔNG MINH, không copy-paste. Adapt tone, length, format cho ${channel}.`);
  
  return parts.join('\n');
}

/**
 * Calculate target word count for a channel from Core Content
 */
export function calculateChannelWordCount(
  channel: string,
  coreContentWordCount: number
): { min: number; max: number; target: number } {
  const config = getChannelTransformConfig(channel);
  const min = Math.round(coreContentWordCount * config.wordCountMultiplier[0]);
  const max = Math.round(coreContentWordCount * config.wordCountMultiplier[1]);
  const target = Math.round((min + max) / 2);
  
  return { min, max, target };
}

/**
 * Get all channels grouped by extraction level
 */
export function getChannelsByExtractionLevel(): Record<ExtractionLevel, string[]> {
  const groups: Record<ExtractionLevel, string[]> = {
    minimal: [],
    condensed: [],
    balanced: [],
    comprehensive: [],
    full: [],
  };
  
  for (const [channel, config] of Object.entries(CHANNEL_TRANSFORM_MATRIX)) {
    groups[config.extractionLevel].push(channel);
  }
  
  return groups;
}

/**
 * Validate if Core Content is suitable for transformation
 * Returns warnings if content is too short for certain channels
 */
export function validateCoreContentForTransform(
  coreContentWordCount: number,
  targetChannels: string[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  for (const channel of targetChannels) {
    const config = getChannelTransformConfig(channel);
    const minNeeded = Math.round(config.extractionRange[0] / 100 * 200); // Assume min 200 words needed
    
    if (coreContentWordCount < minNeeded && config.extractionLevel === 'full') {
      warnings.push(`Core Content có thể quá ngắn cho ${channel} (cần expand thêm)`);
    }
    
    if (coreContentWordCount < 300 && ['youtube', 'blog'].includes(channel)) {
      warnings.push(`${channel} cần Core Content dài hơn để transform hiệu quả`);
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}
