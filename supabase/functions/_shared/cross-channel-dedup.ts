// ============================================
// Cross-Channel Deduplication (P3)
// Prevents repetitive content across channels within the same generation batch
// ============================================

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

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

export interface ChannelEmbedding {
  channel: string;
  content: string;
  embedding: number[];
}

/**
 * Generate embedding for text using Lovable AI Gateway
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not configured - skipping cross-channel dedup');
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const truncatedText = text.length > 4000 ? text.substring(0, 4000) : text;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [truncatedText],
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Embedding API error:', response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch request
 */
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const truncatedTexts = texts.map(t => 
    t.length > 4000 ? t.substring(0, 4000) : t
  );

  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Batch embedding API error:', response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Get diversification suggestions for a channel based on similar channels
 */
function getDiversificationSuggestion(
  channel: string, 
  similarChannels: string[]
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

  // Pick a random suggestion to avoid repetition
  return channelSuggestions[Math.floor(Math.random() * channelSuggestions.length)];
}

/**
 * Check cross-channel content similarity within a generation batch
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

    // Generate embeddings for all channels in batch
    const contents = validChannels.map(ch => channelContents[ch]);
    const embeddings = await generateBatchEmbeddings(contents);

    const channelEmbeddings: ChannelEmbedding[] = validChannels.map((ch, i) => ({
      channel: ch,
      content: contents[i],
      embedding: embeddings[i],
    }));

    // Compare all pairs
    const pairs: ChannelSimilarityPair[] = [];
    const channelsNeedingDiversification = new Set<string>();
    const similarChannelsMap = new Map<string, string[]>();

    for (let i = 0; i < channelEmbeddings.length; i++) {
      for (let j = i + 1; j < channelEmbeddings.length; j++) {
        const similarity = cosineSimilarity(
          channelEmbeddings[i].embedding,
          channelEmbeddings[j].embedding
        );

        const needsDiversification = similarity >= CROSS_CHANNEL_CONFIG.SIMILARITY_THRESHOLD;
        const isWarning = !needsDiversification && similarity >= CROSS_CHANNEL_CONFIG.WARNING_THRESHOLD;

        pairs.push({
          channel1: channelEmbeddings[i].channel,
          channel2: channelEmbeddings[j].channel,
          similarity,
          needsDiversification,
          isWarning,
        });

        if (needsDiversification) {
          channelsNeedingDiversification.add(channelEmbeddings[i].channel);
          channelsNeedingDiversification.add(channelEmbeddings[j].channel);
          
          // Track similar channels for suggestion building
          if (!similarChannelsMap.has(channelEmbeddings[i].channel)) {
            similarChannelsMap.set(channelEmbeddings[i].channel, []);
          }
          similarChannelsMap.get(channelEmbeddings[i].channel)!.push(channelEmbeddings[j].channel);
          
          if (!similarChannelsMap.has(channelEmbeddings[j].channel)) {
            similarChannelsMap.set(channelEmbeddings[j].channel, []);
          }
          similarChannelsMap.get(channelEmbeddings[j].channel)!.push(channelEmbeddings[i].channel);
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

    console.log(`[cross-channel-dedup] Checked ${pairs.length} pairs, diversity score: ${overallScore}%, duplicates: ${hasDuplicates}`);

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
    .slice(0, 3) // Limit to 3 to save tokens
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
  
  // If priority channels are specified, only regenerate non-priority ones
  if (priorityChannels.length > 0) {
    const nonPriority = needsRegen.filter(ch => !priorityChannels.includes(ch));
    return nonPriority.length > 0 ? nonPriority : needsRegen.slice(0, 1);
  }

  // Otherwise, regenerate all except the first one (keep as reference)
  return needsRegen.slice(1);
}

/**
 * Calculate diversity bonus for quality scoring
 */
export function calculateDiversityBonus(overallScore: number): number {
  if (overallScore >= 90) return 10; // Excellent diversity
  if (overallScore >= 80) return 5;  // Good diversity
  if (overallScore >= 70) return 0;  // Acceptable
  if (overallScore >= 60) return -5; // Needs improvement
  return -10; // Poor diversity
}
