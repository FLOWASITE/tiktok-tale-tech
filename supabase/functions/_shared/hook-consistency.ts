// ============================================
// Hook Consistency Engine v1.0
// Ensures hooks across channels maintain consistent messaging
// while adapting to platform-specific requirements
// ============================================

/**
 * Hook consistency configuration for each channel
 * Defines how the base hook should be adapted
 */
export interface HookAdaptationRules {
  /** Max characters for hook on this channel */
  maxHookLength: number;
  /** Min characters for hook on this channel */
  minHookLength: number;
  /** Tone shift allowed */
  toneShift: 'none' | 'slight' | 'moderate';
  /** Can add urgency elements */
  allowUrgency: boolean;
  /** Can add emoji */
  allowEmoji: boolean;
  /** Emoji limit if allowed */
  emojiLimit: number;
  /** Keep core number/statistic */
  preserveNumbers: boolean;
  /** Keep question format if original is question */
  preserveQuestionFormat: boolean;
  /** Format adjustment */
  formatHint: string;
}

/**
 * Channel-specific hook adaptation rules
 */
export const HOOK_ADAPTATION_RULES: Record<string, HookAdaptationRules> = {
  // Short-form channels - heavily condensed
  twitter: {
    maxHookLength: 80,
    minHookLength: 20,
    toneShift: 'slight',
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Thread opener format (1/)',
  },
  tiktok: {
    maxHookLength: 50,
    minHookLength: 10,
    toneShift: 'moderate',
    allowUrgency: true,
    allowEmoji: true,
    emojiLimit: 2,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Spoken format - như đang nói chuyện',
  },
  threads: {
    maxHookLength: 80,
    minHookLength: 20,
    toneShift: 'slight',
    allowUrgency: false,
    allowEmoji: true,
    emojiLimit: 1,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Opinionated, conversational',
  },

  // Medium-form channels - adapted length
  facebook: {
    maxHookLength: 120,
    minHookLength: 30,
    toneShift: 'slight',
    allowUrgency: true,
    allowEmoji: true,
    emojiLimit: 3,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Emoji mở đầu + bold nếu cần',
  },
  instagram: {
    maxHookLength: 80,
    minHookLength: 15,
    toneShift: 'moderate',
    allowUrgency: false,
    allowEmoji: true,
    emojiLimit: 2,
    preserveNumbers: true,
    preserveQuestionFormat: false, // Instagram prefers statements
    formatHint: 'Visual-first, caption style',
  },
  linkedin: {
    maxHookLength: 150,
    minHookLength: 40,
    toneShift: 'none', // Professional, no shift
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Insight-led, professional tone',
  },

  // Long-form channels - can expand
  website: {
    maxHookLength: 200,
    minHookLength: 50,
    toneShift: 'none',
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'SEO-friendly, clear value proposition',
  },
  youtube: {
    maxHookLength: 120,
    minHookLength: 30,
    toneShift: 'slight',
    allowUrgency: true,
    allowEmoji: true,
    emojiLimit: 2,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'First 5 seconds - gây tò mò ngay',
  },
  email: {
    maxHookLength: 100,
    minHookLength: 30,
    toneShift: 'none',
    allowUrgency: true,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Subject line + opening line phải match',
  },

  // Messaging channels
  zalo_oa: {
    maxHookLength: 80,
    minHookLength: 20,
    toneShift: 'slight',
    allowUrgency: true,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Thân thiện, local Vietnamese',
  },
  telegram: {
    maxHookLength: 120,
    minHookLength: 30,
    toneShift: 'none',
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Informative, structured',
  },
  google_maps: {
    maxHookLength: 80,
    minHookLength: 20,
    toneShift: 'slight',
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: false,
    formatHint: 'Objective, review style',
  },
};

const DEFAULT_RULES: HookAdaptationRules = {
  maxHookLength: 100,
  minHookLength: 20,
  toneShift: 'slight',
  allowUrgency: false,
  allowEmoji: true,
  emojiLimit: 2,
  preserveNumbers: true,
  preserveQuestionFormat: true,
  formatHint: 'Adapt naturally for platform',
};

/**
 * Core elements to extract from base hook
 */
export interface HookCoreElements {
  /** Main number/statistic if present */
  number?: string;
  /** Core message/insight */
  coreMessage: string;
  /** Is it a question? */
  isQuestion: boolean;
  /** Keywords to preserve */
  keywords: string[];
  /** Emotion trigger word if present */
  emotionTrigger?: string;
}

/**
 * Extract core elements from a base hook
 */
export function extractHookCoreElements(hookText: string): HookCoreElements {
  const isQuestion = /\?/.test(hookText);
  
  // Extract numbers/statistics
  const numberMatch = hookText.match(/(\d+[%,.]?\d*|\d+)/);
  const number = numberMatch?.[0];
  
  // Identify emotion triggers
  const emotionPatterns = [
    'sốc', 'không thể tin', 'bất ngờ', 'thực tế', 'sự thật', 'bí mật',
    'ít ai biết', 'đau đầu', 'stress', 'lo lắng', 'hóa ra', 'thật sự',
    'khó khăn', 'vật lộn', 'mệt mỏi', 'chán nản', 'sợ', 'băn khoăn',
  ];
  const emotionTrigger = emotionPatterns.find(e => 
    hookText.toLowerCase().includes(e)
  );
  
  // Extract keywords (important nouns/actions)
  const words = hookText.split(/\s+/);
  const keywords = words.filter(w => 
    w.length > 3 && 
    !/^(này|của|cho|với|trong|ngoài|để|và|hoặc|nhưng|vì|bạn|tôi)$/i.test(w)
  ).slice(0, 5);
  
  // Core message is the hook without common prefixes/suffixes
  let coreMessage = hookText
    .replace(/^(Bạn có biết|Đã bao giờ|Tại sao|Làm sao)/i, '')
    .replace(/(\?|!|\.)+$/, '')
    .trim();
  
  return {
    number,
    coreMessage,
    isQuestion,
    keywords,
    emotionTrigger,
  };
}

/**
 * Build hook consistency instruction for AI prompt
 * Ensures hooks maintain core message while adapting to channels
 */
export function buildHookConsistencyInstruction(
  baseHook: string,
  channels: string[],
  brandAllowEmoji: boolean = true
): string {
  const coreElements = extractHookCoreElements(baseHook);
  
  const parts: string[] = [];
  parts.push(`\n## 🎯 HOOK CONSISTENCY RULES`);
  parts.push(`Base Hook: "${baseHook}"`);
  
  // Core preservation requirements
  parts.push(`\n### Core Elements (PHẢI GIỮ):`);
  if (coreElements.number) {
    parts.push(`- Số liệu: ${coreElements.number}`);
  }
  parts.push(`- Core message: ${coreElements.coreMessage}`);
  if (coreElements.emotionTrigger) {
    parts.push(`- Emotion trigger: ${coreElements.emotionTrigger}`);
  }
  if (coreElements.keywords.length > 0) {
    parts.push(`- Keywords: ${coreElements.keywords.join(', ')}`);
  }
  
  // Channel-specific adaptations
  parts.push(`\n### Channel Adaptations:`);
  for (const channel of channels) {
    const rules = HOOK_ADAPTATION_RULES[channel] || DEFAULT_RULES;
    const emojiAllowed = brandAllowEmoji && rules.allowEmoji;
    
    const adaptations: string[] = [];
    adaptations.push(`${rules.minHookLength}-${rules.maxHookLength} ký tự`);
    
    if (coreElements.isQuestion && !rules.preserveQuestionFormat) {
      adaptations.push('chuyển sang statement');
    }
    if (emojiAllowed && rules.emojiLimit > 0) {
      adaptations.push(`emoji ≤${rules.emojiLimit}`);
    }
    if (!emojiAllowed) {
      adaptations.push('KHÔNG emoji');
    }
    if (rules.toneShift !== 'none') {
      adaptations.push(`tone shift: ${rules.toneShift}`);
    }
    
    parts.push(`- **${channel.toUpperCase()}**: ${adaptations.join(', ')} → ${rules.formatHint}`);
  }
  
  // Consistency enforcement
  parts.push(`\n### ⚠️ CONSISTENCY CHECK:`);
  parts.push(`- Người đọc thấy CÙNG MESSAGE dù đọc ở channel nào`);
  parts.push(`- Core insight/number/emotion KHÔNG ĐƯỢC thay đổi`);
  parts.push(`- Chỉ thay đổi: độ dài, format, emoji, tone nhẹ`);
  parts.push(`- KHÔNG thêm thông tin mới vào hook`);
  parts.push(`- KHÔNG làm mất đi điểm nhấn chính`);
  
  return parts.join('\n');
}

/**
 * Validate hook consistency across generated channels
 * Returns score and issues
 */
export function validateHookConsistency(
  baseHook: string,
  channelHooks: Record<string, string>
): { score: number; issues: string[]; passed: boolean } {
  const baseCoreElements = extractHookCoreElements(baseHook);
  const issues: string[] = [];
  let score = 100;
  
  for (const [channel, hook] of Object.entries(channelHooks)) {
    const channelCore = extractHookCoreElements(hook);
    const rules = HOOK_ADAPTATION_RULES[channel] || DEFAULT_RULES;
    
    // Check number preservation
    if (baseCoreElements.number && rules.preserveNumbers) {
      if (!hook.includes(baseCoreElements.number)) {
        issues.push(`${channel}: Mất số liệu "${baseCoreElements.number}"`);
        score -= 15;
      }
    }
    
    // Check length compliance
    if (hook.length > rules.maxHookLength) {
      issues.push(`${channel}: Hook quá dài (${hook.length}/${rules.maxHookLength})`);
      score -= 5;
    }
    if (hook.length < rules.minHookLength) {
      issues.push(`${channel}: Hook quá ngắn (${hook.length}/${rules.minHookLength})`);
      score -= 5;
    }
    
    // Check keyword preservation (at least 50% keywords should be present)
    const keywordHits = baseCoreElements.keywords.filter(kw => 
      hook.toLowerCase().includes(kw.toLowerCase())
    ).length;
    const keywordRatio = baseCoreElements.keywords.length > 0 
      ? keywordHits / baseCoreElements.keywords.length 
      : 1;
    if (keywordRatio < 0.5) {
      issues.push(`${channel}: Mất keywords quan trọng`);
      score -= 10;
    }
    
    // Check question format if required
    if (baseCoreElements.isQuestion && rules.preserveQuestionFormat) {
      if (!channelCore.isQuestion) {
        // Soft warning, not a hard error
        score -= 3;
      }
    }
  }
  
  return {
    score: Math.max(0, score),
    issues,
    passed: score >= 70,
  };
}

/**
 * Get adaptation rules for a channel
 */
export function getHookAdaptationRules(channel: string): HookAdaptationRules {
  return HOOK_ADAPTATION_RULES[channel] || DEFAULT_RULES;
}
