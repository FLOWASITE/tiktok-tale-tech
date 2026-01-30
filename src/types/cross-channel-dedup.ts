// ============================================
// Cross-Channel Deduplication Types (Frontend)
// Mirrors backend cross-channel-dedup.ts for type safety
// ============================================

/**
 * Cross-channel dedup configuration (mirrors backend)
 */
export const CROSS_CHANNEL_CONFIG = {
  SIMILARITY_THRESHOLD: 0.80,
  WARNING_THRESHOLD: 0.70,
  MIN_CONTENT_LENGTH: 50,
  MAX_DIVERSIFY_RETRIES: 2,
} as const;

/**
 * Similarity pair between two channels
 */
export interface ChannelSimilarityPair {
  channel1: string;
  channel2: string;
  similarity: number;
  needsDiversification: boolean;
  isWarning: boolean;
}

/**
 * Cross-channel deduplication result
 */
export interface CrossChannelDedupResult {
  hasDuplicates: boolean;
  hasWarnings: boolean;
  overallScore: number; // 0-100, higher = more diverse
  pairs: ChannelSimilarityPair[];
  channelsNeedingDiversification: string[];
  diversificationSuggestions: Record<string, string>;
}

/**
 * Diversity grade mapping
 */
export type DiversityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DiversityGradeInfo {
  grade: DiversityGrade;
  label: string;
  description: string;
  colorClass: string;
  iconClass: string;
}

export const DIVERSITY_GRADES: Record<DiversityGrade, Omit<DiversityGradeInfo, 'grade'>> = {
  A: {
    label: 'Xuất sắc',
    description: 'Nội dung rất đa dạng giữa các kênh',
    colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    iconClass: 'text-emerald-500',
  },
  B: {
    label: 'Tốt',
    description: 'Nội dung đa dạng, có điểm khác biệt rõ ràng',
    colorClass: 'bg-green-500/10 text-green-600 border-green-500/20',
    iconClass: 'text-green-500',
  },
  C: {
    label: 'Chấp nhận được',
    description: 'Một số kênh có nội dung tương tự',
    colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    iconClass: 'text-amber-500',
  },
  D: {
    label: 'Cần cải thiện',
    description: 'Nhiều kênh có nội dung lặp lại',
    colorClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    iconClass: 'text-orange-500',
  },
  F: {
    label: 'Yếu',
    description: 'Nội dung quá giống nhau giữa các kênh',
    colorClass: 'bg-red-500/10 text-red-600 border-red-500/20',
    iconClass: 'text-red-500',
  },
};

/**
 * Get diversity grade from overall score
 */
export function getDiversityGrade(overallScore: number): DiversityGradeInfo {
  let grade: DiversityGrade;
  
  if (overallScore >= 85) grade = 'A';
  else if (overallScore >= 75) grade = 'B';
  else if (overallScore >= 65) grade = 'C';
  else if (overallScore >= 55) grade = 'D';
  else grade = 'F';

  return {
    grade,
    ...DIVERSITY_GRADES[grade],
  };
}

/**
 * Format similarity as percentage
 */
export function formatSimilarity(similarity: number): string {
  return `${Math.round(similarity * 100)}%`;
}

/**
 * Get channel pair status
 */
export function getPairStatus(pair: ChannelSimilarityPair): {
  status: 'duplicate' | 'warning' | 'ok';
  label: string;
  colorClass: string;
} {
  if (pair.needsDiversification) {
    return {
      status: 'duplicate',
      label: 'Cần khác biệt hóa',
      colorClass: 'text-red-600 bg-red-500/10',
    };
  }
  if (pair.isWarning) {
    return {
      status: 'warning',
      label: 'Tương tự',
      colorClass: 'text-amber-600 bg-amber-500/10',
    };
  }
  return {
    status: 'ok',
    label: 'Đa dạng',
    colorClass: 'text-green-600 bg-green-500/10',
  };
}

/**
 * Channel display names (Vietnamese)
 */
export const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  email: 'Email',
  website: 'Website',
  telegram: 'Telegram',
  threads: 'Threads',
  zalo_oa: 'Zalo OA',
  google_maps: 'Google Maps',
  blog: 'Blog',
};

export function getChannelDisplayName(channel: string): string {
  return CHANNEL_DISPLAY_NAMES[channel] || channel.charAt(0).toUpperCase() + channel.slice(1);
}
