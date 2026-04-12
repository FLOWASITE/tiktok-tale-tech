// ============================================
// Length Compliance Types (Frontend)
// Mirrors backend length-validator.ts for type safety
// ============================================

/**
 * Compliance level for content length
 */
export type ComplianceLevel = 'optimal' | 'acceptable' | 'warning' | 'error';

/**
 * Length validation result for a single channel
 */
export interface LengthValidationResult {
  isValid: boolean;
  actualLength: number;
  minRequired: number;
  maxAllowed: number;
  shortfall: number;
  overflow: number;
  percentOfTarget: number;
  complianceLevel: ComplianceLevel;
  suggestion?: string;
}

/**
 * Multi-channel length validation summary
 */
export interface MultiChannelLengthValidation {
  results: Record<string, LengthValidationResult>;
  channelsNeedingExpansion: string[];
  channelsNeedingTruncation: string[];
  overallCompliance: 'pass' | 'warning' | 'fail';
  complianceScore: number; // 0-100
}

/**
 * Channel length configuration
 */
export interface ChannelLengthConfig {
  min_length: number;
  max_length: number;
  length_unit: 'words' | 'chars';
  word_budget: number;
  tolerance_percent: number;
}

/**
 * High-priority channels that must meet length requirements
 */
export const HIGH_PRIORITY_CHANNELS = ['website', 'facebook', 'linkedin', 'youtube', 'email'];

/**
 * Channel length configurations (mirrors backend)
 */
export const CHANNEL_LENGTH_CONFIGS: Record<string, ChannelLengthConfig> = {
  website: { min_length: 800, max_length: 2000, length_unit: 'words', word_budget: 920, tolerance_percent: 5 },
  facebook: { min_length: 250, max_length: 500, length_unit: 'words', word_budget: 350, tolerance_percent: 10 },
  instagram: { min_length: 50, max_length: 150, length_unit: 'words', word_budget: 70, tolerance_percent: 15 },
  twitter: { min_length: 150, max_length: 350, length_unit: 'words', word_budget: 250, tolerance_percent: 10 },
  google_maps: { min_length: 80, max_length: 150, length_unit: 'words', word_budget: 100, tolerance_percent: 10 },
  linkedin: { min_length: 300, max_length: 600, length_unit: 'words', word_budget: 400, tolerance_percent: 10 },
  email: { min_length: 250, max_length: 500, length_unit: 'words', word_budget: 350, tolerance_percent: 10 },
  youtube: { min_length: 500, max_length: 800, length_unit: 'words', word_budget: 600, tolerance_percent: 8 },
  zalo_oa: { min_length: 60, max_length: 150, length_unit: 'words', word_budget: 80, tolerance_percent: 15 },
  telegram: { min_length: 200, max_length: 500, length_unit: 'words', word_budget: 300, tolerance_percent: 10 },
  tiktok: { min_length: 50, max_length: 150, length_unit: 'words', word_budget: 70, tolerance_percent: 15 },
  threads: { min_length: 0, max_length: 500, length_unit: 'chars', word_budget: 400, tolerance_percent: 0 },
};

/**
 * UI labels for compliance levels (Vietnamese)
 */
export const COMPLIANCE_LEVEL_LABELS: Record<ComplianceLevel, { label: string; color: string; bgColor: string }> = {
  optimal: { label: 'Tối ưu', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  acceptable: { label: 'Chấp nhận', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  warning: { label: 'Cần cải thiện', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  error: { label: 'Không đạt', color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

/**
 * Count words in text (matches backend logic)
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/[-*]\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#@]\S+/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .trim();
  
  return cleanText.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Count characters in text
 */
export function countChars(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().length;
}

/**
 * Validate content length for a channel (frontend version)
 */
export function validateLength(
  content: string, 
  channel: string
): LengthValidationResult {
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  if (!config) {
    return { 
      isValid: true, 
      actualLength: 0, 
      minRequired: 0, 
      maxAllowed: 0, 
      shortfall: 0,
      overflow: 0,
      percentOfTarget: 100,
      complianceLevel: 'optimal',
    };
  }
  
  const { min_length: minRequired, max_length: maxAllowed, length_unit, tolerance_percent } = config;
  
  const actualLength = length_unit === 'chars' 
    ? countChars(content)
    : countWords(content);
  
  const shortfall = Math.max(0, minRequired - actualLength);
  const overflow = Math.max(0, actualLength - maxAllowed);
  const target = (minRequired + maxAllowed) / 2;
  const percentOfTarget = target > 0 ? Math.round((actualLength / target) * 100) : 100;
  
  const toleranceThreshold = minRequired * (1 - tolerance_percent / 100);
  
  let complianceLevel: ComplianceLevel;
  let isValid: boolean;
  
  if (actualLength >= minRequired && actualLength <= maxAllowed) {
    complianceLevel = 'optimal';
    isValid = true;
  } else if (actualLength >= toleranceThreshold && actualLength <= maxAllowed * 1.1) {
    complianceLevel = 'acceptable';
    isValid = true;
  } else if (actualLength >= toleranceThreshold * 0.8 || overflow <= maxAllowed * 0.2) {
    complianceLevel = 'warning';
    isValid = false;
  } else {
    complianceLevel = 'error';
    isValid = false;
  }
  
  const unit = length_unit === 'chars' ? 'ký tự' : 'từ';
  let suggestion: string | undefined;
  if (shortfall > 0) {
    suggestion = `Cần thêm ~${Math.ceil(shortfall * 1.2)} ${unit}`;
  } else if (overflow > 0) {
    suggestion = `Vượt ${overflow} ${unit}, cần rút gọn`;
  }
  
  return {
    isValid,
    actualLength,
    minRequired,
    maxAllowed,
    shortfall,
    overflow,
    percentOfTarget,
    complianceLevel,
    suggestion,
  };
}

/**
 * Validate all channels and get summary
 */
export function validateAllChannels(
  channelContents: Record<string, string>
): MultiChannelLengthValidation {
  const results: Record<string, LengthValidationResult> = {};
  const channelsNeedingExpansion: string[] = [];
  const channelsNeedingTruncation: string[] = [];
  let totalScore = 0;
  let channelCount = 0;
  
  for (const [channel, content] of Object.entries(channelContents)) {
    if (!content) continue;
    
    const result = validateLength(content, channel);
    results[channel] = result;
    
    if (result.shortfall > 0) channelsNeedingExpansion.push(channel);
    if (result.overflow > 0) channelsNeedingTruncation.push(channel);
    
    const scoreContribution = result.complianceLevel === 'optimal' ? 100
      : result.complianceLevel === 'acceptable' ? 80
      : result.complianceLevel === 'warning' ? 50
      : 20;
    
    const weight = HIGH_PRIORITY_CHANNELS.includes(channel) ? 2 : 1;
    totalScore += scoreContribution * weight;
    channelCount += weight;
  }
  
  const complianceScore = channelCount > 0 ? Math.round(totalScore / channelCount) : 100;
  
  const hasErrorPriorityChannel = channelsNeedingExpansion.some(ch => HIGH_PRIORITY_CHANNELS.includes(ch));
  const overallCompliance: MultiChannelLengthValidation['overallCompliance'] = 
    hasErrorPriorityChannel ? 'fail'
    : channelsNeedingExpansion.length > 0 ? 'warning'
    : 'pass';
  
  return {
    results,
    channelsNeedingExpansion,
    channelsNeedingTruncation,
    overallCompliance,
    complianceScore,
  };
}
