// ============================================
// Hook Consistency Types
// Frontend types for hook consistency engine
// ============================================

/**
 * Hook adaptation rules for each channel
 */
export interface HookAdaptationRules {
  maxHookLength: number;
  minHookLength: number;
  toneShift: 'none' | 'slight' | 'moderate';
  allowUrgency: boolean;
  allowEmoji: boolean;
  emojiLimit: number;
  preserveNumbers: boolean;
  preserveQuestionFormat: boolean;
  formatHint: string;
}

/**
 * Core elements extracted from base hook
 */
export interface HookCoreElements {
  number?: string;
  coreMessage: string;
  isQuestion: boolean;
  keywords: string[];
  emotionTrigger?: string;
}

/**
 * Hook consistency validation result
 */
export interface HookConsistencyResult {
  score: number;
  issues: string[];
  passed: boolean;
}

/**
 * Channel-specific hook adaptation rules (matching backend)
 */
export const HOOK_ADAPTATION_RULES: Record<string, HookAdaptationRules> = {
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
    preserveQuestionFormat: false,
    formatHint: 'Visual-first, caption style',
  },
  linkedin: {
    maxHookLength: 150,
    minHookLength: 40,
    toneShift: 'none',
    allowUrgency: false,
    allowEmoji: false,
    emojiLimit: 0,
    preserveNumbers: true,
    preserveQuestionFormat: true,
    formatHint: 'Insight-led, professional tone',
  },
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

/**
 * Get hook adaptation rules for a channel
 */
export function getHookAdaptationRules(channel: string): HookAdaptationRules {
  return HOOK_ADAPTATION_RULES[channel] || {
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
}

/**
 * Extract core elements from a hook (client-side)
 */
export function extractHookCoreElements(hookText: string): HookCoreElements {
  const isQuestion = /\?/.test(hookText);
  const numberMatch = hookText.match(/(\d+[%,.]?\d*|\d+)/);
  const number = numberMatch?.[0];
  
  const emotionPatterns = [
    'sốc', 'không thể tin', 'bất ngờ', 'thực tế', 'sự thật', 'bí mật',
    'ít ai biết', 'đau đầu', 'stress', 'lo lắng', 'hóa ra', 'thật sự',
  ];
  const emotionTrigger = emotionPatterns.find(e => 
    hookText.toLowerCase().includes(e)
  );
  
  const words = hookText.split(/\s+/);
  const keywords = words.filter(w => 
    w.length > 3 && 
    !/^(này|của|cho|với|trong|ngoài|để|và|hoặc|nhưng|vì|bạn|tôi)$/i.test(w)
  ).slice(0, 5);
  
  const coreMessage = hookText
    .replace(/^(Bạn có biết|Đã bao giờ|Tại sao|Làm sao)/i, '')
    .replace(/(\?|!|\.)+$/, '')
    .trim();
  
  return { number, coreMessage, isQuestion, keywords, emotionTrigger };
}
