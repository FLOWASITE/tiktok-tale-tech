// ============================================
// Dynamic Length Enforcement v3
// Pre-generation budgeting + Post-generation validation + Auto-expansion
// ============================================

export interface ChannelLengthConfig {
  min_length: number;
  max_length: number;
  length_unit: 'words' | 'chars';
  word_budget: number;  // Recommended words to generate (10-15% over min)
  tolerance_percent: number; // Acceptable variance below min (e.g., 10 = 10%)
}

export interface LengthValidationResult {
  isValid: boolean;
  actualLength: number;
  minRequired: number;
  maxAllowed: number;
  shortfall: number;
  overflow: number;
  percentOfTarget: number;
  complianceLevel: 'optimal' | 'acceptable' | 'warning' | 'error';
  suggestion?: string;
}

export interface ChannelLengthValidation {
  channel: string;
  result: LengthValidationResult;
  needsExpansion: boolean;
  needsTruncation: boolean;
}

export interface MultiChannelLengthValidation {
  results: Record<string, LengthValidationResult>;
  channelsNeedingExpansion: string[];
  channelsNeedingTruncation: string[];
  overallCompliance: 'pass' | 'warning' | 'fail';
  complianceScore: number; // 0-100
}

// Channel length configurations with word budgets and tolerance
// Updated from DEFAULT_CHANNEL_SETTINGS for consistency
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

// High-priority channels that MUST meet length requirements
export const HIGH_PRIORITY_CHANNELS = ['website', 'facebook', 'linkedin', 'youtube', 'email'];

/**
 * Count words in text (Vietnamese-aware)
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  // Remove markdown formatting for accurate count
  const cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
    .replace(/\*([^*]+)\*/g, '$1')      // *italic*
    .replace(/#+\s/g, '')               // Headings
    .replace(/[-*]\s/g, '')             // Bullets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[#@]\S+/g, '')            // Hashtags/mentions
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .trim();
  
  // Split by whitespace and filter empty strings
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Count characters in text
 */
export function countChars(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().length;
}

/**
 * Get word budget for a channel (recommended words to generate)
 */
export function getWordBudget(channel: string, customMinLength?: number): number {
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  if (!config) return 150; // Default fallback
  
  const minLength = customMinLength ?? config.min_length;
  // Add 15% buffer to min_length for the word budget
  return Math.ceil(minLength * 1.15);
}

/**
 * Get dynamic word budget based on channel and content goal
 */
export function getDynamicWordBudget(
  channel: string,
  options: {
    customMinLength?: number;
    contentGoal?: string;
    contentRole?: string;
  } = {}
): number {
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  if (!config) return 150;
  
  const minLength = options.customMinLength ?? config.min_length;
  let baseBuffer = 1.15; // 15% buffer
  
  // Adjust buffer based on content goal
  if (options.contentGoal === 'education' || options.contentGoal === 'expertise') {
    baseBuffer = 1.25; // Need more words for detailed content
  } else if (options.contentGoal === 'conversion') {
    baseBuffer = 1.10; // Tighter, more focused content
  }
  
  // Adjust for content role
  if (options.contentRole === 'sprout') {
    baseBuffer += 0.10; // Trust-building needs more depth
  } else if (options.contentRole === 'seed') {
    baseBuffer -= 0.05; // Awareness can be punchier
  }
  
  return Math.ceil(minLength * baseBuffer);
}

/**
 * Build word budget instruction for AI prompt - Enhanced version
 */
export function buildWordBudgetInstruction(
  channels: string[], 
  channelOverrides?: Record<string, { min_length?: number; max_length?: number }>,
  options: {
    contentGoal?: string;
    contentRole?: string;
  } = {}
): string {
  const budgets: string[] = [];
  const priorityBudgets: string[] = [];
  
  for (const channel of channels) {
    const config = CHANNEL_LENGTH_CONFIGS[channel];
    if (!config) continue;
    
    const customMin = channelOverrides?.[channel]?.min_length;
    const customMax = channelOverrides?.[channel]?.max_length;
    const effectiveMin = customMin ?? config.min_length;
    const effectiveMax = customMax ?? config.max_length;
    const budget = getDynamicWordBudget(channel, {
      customMinLength: customMin,
      contentGoal: options.contentGoal,
      contentRole: options.contentRole,
    });
    const unit = config.length_unit === 'chars' ? 'ký tự' : 'từ';
    const isPriority = HIGH_PRIORITY_CHANNELS.includes(channel);
    
    const line = `- **${channel.toUpperCase()}**${isPriority ? ' ⭐' : ''}: MỤC TIÊU ~${budget} ${unit} (min ${effectiveMin}, max ${effectiveMax})`;
    
    if (isPriority) {
      priorityBudgets.push(line);
    } else {
      budgets.push(line);
    }
  }
  
  if (priorityBudgets.length === 0 && budgets.length === 0) return '';
  
  return `
## 📊 WORD BUDGET (BẮT BUỘC TUÂN THỦ)

### Kênh ưu tiên cao (⭐ PHẢI đạt min_length):
${priorityBudgets.join('\n') || '(không có)'}

### Kênh khác:
${budgets.join('\n') || '(không có)'}

⚠️ QUY TẮC QUAN TRỌNG:
1. Viết VƯỢT mục tiêu 10-15% để đảm bảo sau khi edit vẫn đủ min_length
2. Kênh có ⭐ DƯỚI min_length → Nội dung SẼ BỊ REJECT và viết lại
3. DƯỚI min_length → TỰ ĐỘNG mở rộng: thêm ví dụ, chi tiết, giải thích
4. Không viết tắt, không dừng giữa chừng với kênh ưu tiên cao`;
}

/**
 * Validate content length for a channel - Enhanced with compliance levels
 */
export function validateLength(
  content: string, 
  channel: string, 
  customMinLength?: number,
  customMaxLength?: number
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
  
  const minRequired = customMinLength ?? config.min_length;
  const maxAllowed = customMaxLength ?? config.max_length;
  const tolerance = config.tolerance_percent;
  
  const actualLength = config.length_unit === 'chars' 
    ? countChars(content)
    : countWords(content);
  
  const shortfall = Math.max(0, minRequired - actualLength);
  const overflow = Math.max(0, actualLength - maxAllowed);
  const target = (minRequired + maxAllowed) / 2;
  const percentOfTarget = target > 0 ? Math.round((actualLength / target) * 100) : 100;
  
  // Calculate tolerance threshold
  const toleranceThreshold = minRequired * (1 - tolerance / 100);
  
  // Determine compliance level
  let complianceLevel: LengthValidationResult['complianceLevel'];
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
  
  // Build suggestion
  let suggestion: string | undefined;
  if (shortfall > 0) {
    const wordsToAdd = Math.ceil(shortfall * 1.2);
    const unit = config.length_unit === 'chars' ? 'ký tự' : 'từ';
    suggestion = `Cần thêm ~${wordsToAdd} ${unit}. Gợi ý: Thêm ví dụ, chi tiết, hoặc mở rộng từng điểm.`;
  } else if (overflow > 0) {
    const unit = config.length_unit === 'chars' ? 'ký tự' : 'từ';
    suggestion = `Vượt ${overflow} ${unit}. Cần rút gọn để tối ưu engagement.`;
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
 * Build auto-expansion prompt for content that's too short
 */
export function buildExpansionPrompt(
  channel: string,
  currentContent: string,
  validationResult: LengthValidationResult,
  context?: {
    topic?: string;
    contentGoal?: string;
    brandVoice?: string;
  }
): string {
  const wordsToAdd = Math.ceil(validationResult.shortfall * 1.3); // 30% buffer
  const unit = CHANNEL_LENGTH_CONFIGS[channel]?.length_unit === 'chars' ? 'ký tự' : 'từ';
  
  const expansionTechniques = channel === 'website' || channel === 'linkedin'
    ? `- Thêm case study ngắn (2-3 câu)
   - Mở rộng mỗi bullet point với ví dụ cụ thể
   - Thêm statistics hoặc data points
   - Giải thích "tại sao" đằng sau mỗi điểm`
    : `- Thêm ví dụ minh họa cụ thể
   - Giải thích chi tiết hơn từng điểm
   - Mở rộng benefits/pain points
   - Thêm câu hỏi engage audience`;
  
  return `## NHIỆM VỤ: MỞ RỘNG NỘI DUNG ${channel.toUpperCase()}

### TÌNH TRẠNG HIỆN TẠI:
- Độ dài hiện tại: ${validationResult.actualLength} ${unit}
- Yêu cầu tối thiểu: ${validationResult.minRequired} ${unit}
- Cần thêm: ~${wordsToAdd} ${unit}

### NỘI DUNG HIỆN TẠI:
${currentContent}

### YÊU CẦU MỞ RỘNG:
1. Thêm ~${wordsToAdd} ${unit} để đạt tối thiểu ${validationResult.minRequired} ${unit}
2. KHÔNG thay đổi ý chính, CHỈ mở rộng chi tiết
3. Giữ nguyên tone, format, và hook đầu bài
4. Giữ nguyên CTA (nếu có)

### KỸ THUẬT MỞ RỘNG GỢI Ý:
${expansionTechniques}

${context?.topic ? `### NGỮ CẢNH:\n- Chủ đề: ${context.topic}` : ''}
${context?.contentGoal ? `- Mục tiêu: ${context.contentGoal}` : ''}

CHỈ TRẢ VỀ NỘI DUNG ĐÃ MỞ RỘNG, KHÔNG CÓ GIẢI THÍCH.`;
}

/**
 * Validate all channel contents and return comprehensive results
 */
export function validateAllChannels(
  channelContents: Record<string, string>,
  channelOverrides?: Record<string, { min_length?: number; max_length?: number }>
): MultiChannelLengthValidation {
  const results: Record<string, LengthValidationResult> = {};
  const channelsNeedingExpansion: string[] = [];
  const channelsNeedingTruncation: string[] = [];
  let totalScore = 0;
  let channelCount = 0;
  
  for (const [channel, content] of Object.entries(channelContents)) {
    if (!content) continue;
    
    const customMin = channelOverrides?.[channel]?.min_length;
    const customMax = channelOverrides?.[channel]?.max_length;
    const result = validateLength(content, channel, customMin, customMax);
    results[channel] = result;
    
    if (result.shortfall > 0) {
      channelsNeedingExpansion.push(channel);
    }
    if (result.overflow > 0) {
      channelsNeedingTruncation.push(channel);
    }
    
    // Calculate score contribution
    const scoreContribution = result.complianceLevel === 'optimal' ? 100
      : result.complianceLevel === 'acceptable' ? 80
      : result.complianceLevel === 'warning' ? 50
      : 20;
    
    // Priority channels contribute more to the score
    const weight = HIGH_PRIORITY_CHANNELS.includes(channel) ? 2 : 1;
    totalScore += scoreContribution * weight;
    channelCount += weight;
  }
  
  const complianceScore = channelCount > 0 ? Math.round(totalScore / channelCount) : 100;
  
  // Determine overall compliance
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

/**
 * Get channels that need expansion (shortfall > 0)
 */
export function getChannelsNeedingExpansion(
  validationResults: Record<string, LengthValidationResult>
): string[] {
  return Object.entries(validationResults)
    .filter(([_, result]) => result.shortfall > 0)
    .map(([channel]) => channel);
}

/**
 * Get priority channels that need expansion (critical)
 */
export function getPriorityChannelsNeedingExpansion(
  validationResults: Record<string, LengthValidationResult>
): string[] {
  return Object.entries(validationResults)
    .filter(([channel, result]) => 
      result.shortfall > 0 && HIGH_PRIORITY_CHANNELS.includes(channel)
    )
    .map(([channel]) => channel);
}

/**
 * Build a summary of length validation for logging/response
 */
export function buildValidationSummary(validation: MultiChannelLengthValidation): string {
  const lines: string[] = [];
  lines.push(`Length Compliance: ${validation.overallCompliance.toUpperCase()} (score: ${validation.complianceScore}/100)`);
  
  if (validation.channelsNeedingExpansion.length > 0) {
    lines.push(`⚠️ Needs expansion: ${validation.channelsNeedingExpansion.join(', ')}`);
  }
  if (validation.channelsNeedingTruncation.length > 0) {
    lines.push(`📏 Needs truncation: ${validation.channelsNeedingTruncation.join(', ')}`);
  }
  
  for (const [channel, result] of Object.entries(validation.results)) {
    const icon = result.complianceLevel === 'optimal' ? '✅'
      : result.complianceLevel === 'acceptable' ? '✓'
      : result.complianceLevel === 'warning' ? '⚠️'
      : '❌';
    lines.push(`  ${icon} ${channel}: ${result.actualLength}/${result.minRequired}-${result.maxAllowed}`);
  }
  
  return lines.join('\n');
}
