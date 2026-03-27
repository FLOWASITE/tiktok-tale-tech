// ============================================
// Cross-Channel Deduplication (P3)
// Prevents repetitive content across channels within the same generation batch
// Uses text-based Jaccard n-gram similarity (no embedding API needed)
// ============================================

// Cross-channel dedup configuration
export const CROSS_CHANNEL_CONFIG = {
  // Similarity threshold - channels with similarity >= this need diversification
  SIMILARITY_THRESHOLD: 0.80,
  // Warning threshold - flag but don't force diversify
  WARNING_THRESHOLD: 0.70,
  // Minimum content length to check
  MIN_CONTENT_LENGTH: 50,
  // Maximum retries for diversification
  MAX_DIVERSIFY_RETRIES: 2,
} as const;

export interface ChannelSimilarityPair {
  channel1: string;
  channel2: string;
  similarity: number;
  needsDiversification: boolean;
  isWarning: boolean;
}

export interface CrossChannelDedupResult {
  hasDuplicates: boolean;
  hasWarnings: boolean;
  overallScore: number; // 0-100, higher = more diverse
  pairs: ChannelSimilarityPair[];
  channelsNeedingDiversification: string[];
  diversificationSuggestions: Record<string, string>;
}

// ============================================
// Text-based Jaccard N-gram Similarity
// No API calls needed — runs entirely in-process
// ============================================

/**
 * Tokenize text: lowercase, remove punctuation, split into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Extract n-grams from token array
 */
function extractNgrams(tokens: string[], n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate text similarity using Jaccard on n-grams
 * Combines bigrams and trigrams for balanced accuracy
 */
function textSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  
  // Use both bigrams and trigrams for better accuracy
  const bigramsA = extractNgrams(tokensA, 2);
  const bigramsB = extractNgrams(tokensB, 2);
  const trigramsA = extractNgrams(tokensA, 3);
  const trigramsB = extractNgrams(tokensB, 3);
  
  const bigramSim = jaccardSimilarity(bigramsA, bigramsB);
  const trigramSim = jaccardSimilarity(trigramsA, trigramsB);
  
  // Weighted average: trigrams weighted higher (more specific)
  return bigramSim * 0.4 + trigramSim * 0.6;
}

/**
 * Get diversification suggestions for a channel based on similar channels
 */
function getDiversificationSuggestion(
  channel: string, 
  _similarChannels: string[]
): string {
  const suggestions: Record<string, string[]> = {
    facebook: [
      'Sử dụng góc nhìn cá nhân hơn, storytelling',
      'Thêm câu hỏi tương tác ở cuối',
      'Dùng emoji và ngôn ngữ casual hơn',
    ],
    instagram: [
      'Focus vào visual hook mạnh mẽ',
      'Dùng format bullet points ngắn gọn',
      'Tập trung vào aesthetic và cảm xúc',
    ],
    linkedin: [
      'Thêm insight chuyên môn sâu',
      'Dùng data và case study',
      'Tone chuyên nghiệp, ít emoji',
    ],
    twitter: [
      'Ngắn gọn, punchy, 1-2 câu key insight',
      'Hook gây tranh cãi hoặc surprising',
      'Thread format với numbered points',
    ],
    tiktok: [
      'Script dạng nói chuyện trực tiếp',
      'Hook 3 giây đầu gây sốc',
      'Trend-based approach',
    ],
    youtube: [
      'Script chi tiết với timestamps',
      'Educational structure với clear takeaways',
      'Hook câu hỏi + promise value',
    ],
    email: [
      'Personal tone, như viết cho 1 người',
      'Clear CTA at the end',
      'Subject line hook khác biệt',
    ],
    website: [
      'SEO-focused structure với headings',
      'Comprehensive, long-form',
      'Internal linking suggestions',
    ],
    telegram: [
      'Insider tone, exclusive feel',
      'Quick updates format',
      'Community-focused language',
    ],
    threads: [
      'Conversational, opinion-based',
      'Thread continuation hooks',
      'Hot take approach',
    ],
    zalo_oa: [
      'Formal nhưng thân thiện',
      'Promotional focus với CTA rõ ràng',
      'Local Vietnamese context',
    ],
    google_maps: [
      'Review-style, testimonial focus',
      'Local SEO keywords',
      'Location-specific benefits',
    ],
  };

  const channelSuggestions = suggestions[channel] || [
    'Thay đổi góc tiếp cận',
    'Sử dụng hook khác biệt',
    'Điều chỉnh tone phù hợp platform',
  ];

  return channelSuggestions[Math.floor(Math.random() * channelSuggestions.length)];
}

/**
 * Check cross-channel content similarity within a generation batch
 * Uses text-based Jaccard n-gram similarity (no API calls)
 */
export async function checkCrossChannelDuplicate(
  channelContents: Record<string, string>
): Promise<CrossChannelDedupResult> {
  const channels = Object.keys(channelContents);
  
  // Need at least 2 channels to compare
  if (channels.length < 2) {
    return {
      hasDuplicates: false,
      hasWarnings: false,
      overallScore: 100,
      pairs: [],
      channelsNeedingDiversification: [],
      diversificationSuggestions: {},
    };
  }

  try {
    // Filter out short content
    const validChannels = channels.filter(
      ch => channelContents[ch]?.length >= CROSS_CHANNEL_CONFIG.MIN_CONTENT_LENGTH
    );

    if (validChannels.length < 2) {
      return {
        hasDuplicates: false,
        hasWarnings: false,
        overallScore: 100,
        pairs: [],
        channelsNeedingDiversification: [],
        diversificationSuggestions: {},
      };
    }

    // Compare all pairs using text-based similarity
    const pairs: ChannelSimilarityPair[] = [];
    const channelsNeedingDiversification = new Set<string>();
    const similarChannelsMap = new Map<string, string[]>();

    for (let i = 0; i < validChannels.length; i++) {
      for (let j = i + 1; j < validChannels.length; j++) {
        const similarity = textSimilarity(
          channelContents[validChannels[i]],
          channelContents[validChannels[j]]
        );

        const needsDiversification = similarity >= CROSS_CHANNEL_CONFIG.SIMILARITY_THRESHOLD;
        const isWarning = !needsDiversification && similarity >= CROSS_CHANNEL_CONFIG.WARNING_THRESHOLD;

        pairs.push({
          channel1: validChannels[i],
          channel2: validChannels[j],
          similarity,
          needsDiversification,
          isWarning,
        });

        if (needsDiversification) {
          channelsNeedingDiversification.add(validChannels[i]);
          channelsNeedingDiversification.add(validChannels[j]);
          
          if (!similarChannelsMap.has(validChannels[i])) {
            similarChannelsMap.set(validChannels[i], []);
          }
          similarChannelsMap.get(validChannels[i])!.push(validChannels[j]);
          
          if (!similarChannelsMap.has(validChannels[j])) {
            similarChannelsMap.set(validChannels[j], []);
          }
          similarChannelsMap.get(validChannels[j])!.push(validChannels[i]);
        }
      }
    }

    // Calculate overall diversity score
    const avgSimilarity = pairs.length > 0
      ? pairs.reduce((sum, p) => sum + p.similarity, 0) / pairs.length
      : 0;
    const overallScore = Math.round((1 - avgSimilarity) * 100);

    // Build diversification suggestions
    const diversificationSuggestions: Record<string, string> = {};
    for (const channel of channelsNeedingDiversification) {
      const similarChannels = similarChannelsMap.get(channel) || [];
      diversificationSuggestions[channel] = getDiversificationSuggestion(channel, similarChannels);
    }

    const hasDuplicates = channelsNeedingDiversification.size > 0;
    const hasWarnings = pairs.some(p => p.isWarning);

    console.log(`[cross-channel-dedup] ✅ Text-based check: ${pairs.length} pairs, diversity score: ${overallScore}%, duplicates: ${hasDuplicates}`);

    return {
      hasDuplicates,
      hasWarnings,
      overallScore,
      pairs: pairs.sort((a, b) => b.similarity - a.similarity),
      channelsNeedingDiversification: Array.from(channelsNeedingDiversification),
      diversificationSuggestions,
    };
  } catch (error) {
    console.error('Cross-channel dedup error:', error);
    // Fail open - allow content if check fails
    return {
      hasDuplicates: false,
      hasWarnings: false,
      overallScore: 100,
      pairs: [],
      channelsNeedingDiversification: [],
      diversificationSuggestions: {},
    };
  }
}

/**
 * Build diversification instruction for prompt injection
 */
export function buildCrossChannelDiversifyInstruction(
  channel: string,
  otherChannelPreviews: Record<string, string>,
  suggestions: string
): string {
  const otherChannels = Object.keys(otherChannelPreviews);
  if (otherChannels.length === 0) return '';

  const previews = otherChannels
    .slice(0, 3)
    .map(ch => `- ${ch.toUpperCase()}: \"${otherChannelPreviews[ch].substring(0, 150)}...\"`)
    .join('\n');

  return `
## ⚠️ YÊU CẦU KHÁC BIỆT HÓA CROSS-CHANNEL

Nội dung các kênh khác đã được tạo:
${previews}

### YÊU CẦU CHO ${channel.toUpperCase()}:
1. **KHÔNG lặp lại** cùng hook/opening với các kênh trên
2. **KHÔNG sử dụng** cùng structure/flow
3. **THAY ĐỔI** góc tiếp cận hoặc key message được nhấn mạnh
4. **ÁP DỤNG** gợi ý: ${suggestions}

⚡ TẠO NỘI DUNG ĐỘC ĐÁO, PHÙ HỢP ĐẶC THÙNG ${channel.toUpperCase()}
`;
}

/**
 * Get channels that should be regenerated due to high similarity
 */
export function getChannelsToRegenerate(
  dedupResult: CrossChannelDedupResult,
  priorityChannels: string[] = []
): string[] {
  if (!dedupResult.hasDuplicates) return [];

  const needsRegen = dedupResult.channelsNeedingDiversification;
  
  if (priorityChannels.length > 0) {
    const nonPriority = needsRegen.filter(ch => !priorityChannels.includes(ch));
    return nonPriority.length > 0 ? nonPriority : needsRegen.slice(0, 1);
  }

  return needsRegen.slice(1);
}

/**
 * Calculate diversity bonus for quality scoring
 */
export function calculateDiversityBonus(overallScore: number): number {
  if (overallScore >= 90) return 10;
  if (overallScore >= 80) return 5;
  if (overallScore >= 70) return 0;
  if (overallScore >= 60) return -5;
  return -10;
}
