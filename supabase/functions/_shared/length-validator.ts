// ============================================
// Intelligent Length Enforcement v2
// Pre-generation budgeting + Post-generation validation
// ============================================

export interface ChannelLengthConfig {
  min_length: number;
  max_length: number;
  length_unit: 'words' | 'chars';
  word_budget: number;  // Recommended words to generate (10-15% over min)
}

export interface LengthValidationResult {
  isValid: boolean;
  actualLength: number;
  minRequired: number;
  maxAllowed: number;
  shortfall: number;
  suggestion?: string;
}

// Channel length configurations with word budgets (10-15% buffer over min)
export const CHANNEL_LENGTH_CONFIGS: Record<string, ChannelLengthConfig> = {
  website: { min_length: 800, max_length: 2000, length_unit: 'words', word_budget: 900 },
  facebook: { min_length: 120, max_length: 300, length_unit: 'words', word_budget: 150 },
  instagram: { min_length: 50, max_length: 150, length_unit: 'words', word_budget: 70 },
  twitter: { min_length: 0, max_length: 280, length_unit: 'chars', word_budget: 250 },
  google_maps: { min_length: 80, max_length: 150, length_unit: 'words', word_budget: 100 },
  linkedin: { min_length: 150, max_length: 400, length_unit: 'words', word_budget: 180 },
  email: { min_length: 150, max_length: 400, length_unit: 'words', word_budget: 180 },
  youtube: { min_length: 500, max_length: 800, length_unit: 'words', word_budget: 550 },
  zalo_oa: { min_length: 60, max_length: 150, length_unit: 'words', word_budget: 80 },
  telegram: { min_length: 100, max_length: 500, length_unit: 'words', word_budget: 120 },
  tiktok: { min_length: 50, max_length: 150, length_unit: 'words', word_budget: 70 },
  threads: { min_length: 50, max_length: 200, length_unit: 'words', word_budget: 70 },
};

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
 * Build word budget instruction for AI prompt
 */
export function buildWordBudgetInstruction(channels: string[], channelOverrides?: Record<string, { min_length?: number }>): string {
  const budgets: string[] = [];
  
  for (const channel of channels) {
    const config = CHANNEL_LENGTH_CONFIGS[channel];
    if (!config) continue;
    
    const customMin = channelOverrides?.[channel]?.min_length;
    const effectiveMin = customMin ?? config.min_length;
    const budget = getWordBudget(channel, customMin);
    const unit = config.length_unit === 'chars' ? 'ký tự' : 'từ';
    
    if (effectiveMin >= 100) {
      budgets.push(`- **${channel.toUpperCase()}**: MỤC TIÊU ~${budget} ${unit} (min ${effectiveMin}, max ${config.max_length})`);
    }
  }
  
  if (budgets.length === 0) return '';
  
  return `
## 📊 WORD BUDGET (BẮT BUỘC TUÂN THỦ)
${budgets.join('\n')}

⚠️ QUAN TRỌNG:
- Viết VƯỢT mục tiêu 10-15% để đảm bảo sau khi edit vẫn đủ min_length
- DƯỚI min_length → TỰ ĐỘNG viết thêm chi tiết, ví dụ, giải thích
- Content dưới min_length SẼ BỊ REJECT`;
}

/**
 * Validate content length for a channel
 */
export function validateLength(
  content: string, 
  channel: string, 
  customMinLength?: number,
  customMaxLength?: number
): LengthValidationResult {
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  if (!config) {
    return { isValid: true, actualLength: 0, minRequired: 0, maxAllowed: 0, shortfall: 0 };
  }
  
  const minRequired = customMinLength ?? config.min_length;
  const maxAllowed = customMaxLength ?? config.max_length;
  
  const actualLength = config.length_unit === 'chars' 
    ? countChars(content)
    : countWords(content);
  
  const shortfall = Math.max(0, minRequired - actualLength);
  const isValid = actualLength >= minRequired && actualLength <= maxAllowed;
  
  let suggestion: string | undefined;
  if (shortfall > 0) {
    const wordsToAdd = Math.ceil(shortfall * 1.2); // Add 20% buffer
    suggestion = `Cần thêm ~${wordsToAdd} ${config.length_unit === 'chars' ? 'ký tự' : 'từ'}. Gợi ý: Thêm ví dụ minh họa, chi tiết hơn, hoặc mở rộng từng điểm.`;
  } else if (actualLength > maxAllowed) {
    suggestion = `Vượt quá ${actualLength - maxAllowed} ${config.length_unit === 'chars' ? 'ký tự' : 'từ'}. Cần rút gọn.`;
  }
  
  return {
    isValid,
    actualLength,
    minRequired,
    maxAllowed,
    shortfall,
    suggestion,
  };
}

/**
 * Build auto-expansion prompt for content that's too short
 */
export function buildExpansionPrompt(
  channel: string,
  currentContent: string,
  validationResult: LengthValidationResult
): string {
  const wordsToAdd = Math.ceil(validationResult.shortfall * 1.3); // 30% buffer
  
  return `## NHIỆM VỤ: MỞ RỘNG NỘI DUNG ${channel.toUpperCase()}

Nội dung hiện tại CHỈ CÓ ${validationResult.actualLength} từ, CẦN TỐI THIỂU ${validationResult.minRequired} từ.

**NỘI DUNG HIỆN TẠI:**
${currentContent}

**YÊU CẦU:**
1. Thêm ~${wordsToAdd} từ để đạt tối thiểu ${validationResult.minRequired} từ
2. KHÔNG thay đổi ý chính, CHỈ mở rộng chi tiết
3. Các cách mở rộng:
   - Thêm ví dụ minh họa cụ thể
   - Giải thích sâu hơn từng điểm
   - Thêm case study ngắn
   - Mở rộng benefits/pain points
   - Thêm bullet points chi tiết
4. Giữ nguyên tone, format, và hook đầu bài

CHỈ TRẢ VỀ NỘI DUNG ĐÃ MỞ RỘNG, KHÔNG CÓ GIẢI THÍCH.`;
}

/**
 * Validate all channel contents and return issues
 */
export function validateAllChannels(
  channelContents: Record<string, string>,
  channelOverrides?: Record<string, { min_length?: number; max_length?: number }>
): Record<string, LengthValidationResult> {
  const results: Record<string, LengthValidationResult> = {};
  
  for (const [channel, content] of Object.entries(channelContents)) {
    if (!content) continue;
    
    const customMin = channelOverrides?.[channel]?.min_length;
    const customMax = channelOverrides?.[channel]?.max_length;
    results[channel] = validateLength(content, channel, customMin, customMax);
  }
  
  return results;
}

/**
 * Get channels that need expansion
 */
export function getChannelsNeedingExpansion(
  validationResults: Record<string, LengthValidationResult>
): string[] {
  return Object.entries(validationResults)
    .filter(([_, result]) => result.shortfall > 0)
    .map(([channel]) => channel);
}
