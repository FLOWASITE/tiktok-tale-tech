/**
 * Dynamic Token Calculation for AI Content Generation
 * 
 * Calculates optimal max_tokens based on channel settings and content type,
 * reducing costs while ensuring quality output.
 */

// ============================================
// TYPES
// ============================================

export interface ChannelTokenConfig {
  minTokens: number;
  maxTokens: number;
  bufferMultiplier: number; // Multiplier for buffer (e.g., 1.5 = 50% extra)
}

// ============================================
// CHANNEL TOKEN CONFIGURATIONS
// ============================================

// Based on channel content length requirements
// Formula: max_length (words/chars) * token_per_unit * buffer
const CHANNEL_TOKEN_CONFIGS: Record<string, ChannelTokenConfig> = {
  // Long-form content
  website: {
    minTokens: 2000,
    maxTokens: 8000,
    bufferMultiplier: 1.3, // 30% buffer for SEO structure
  },
  blogger: {
    minTokens: 1500,
    maxTokens: 5000,
    bufferMultiplier: 1.3, // 500-900 từ casual blog
  },
  wordpress: {
    minTokens: 2500,
    maxTokens: 9000,
    bufferMultiplier: 1.3, // 1200-2200 từ in-depth + headings/FAQ
  },
  medium: {
    minTokens: 6500,
    maxTokens: 9000,
    bufferMultiplier: 1.3, // 1000-1800 từ Markdown story
  },
  shopify: {
    minTokens: 5000,
    maxTokens: 7500,
    bufferMultiplier: 1.3, // 800-1500 từ HTML blog
  },
  wix: {
    minTokens: 5000,
    maxTokens: 7500,
    bufferMultiplier: 1.3, // 800-1500 từ HTML blog
  },
  
  // Medium-form content
  linkedin: {
    minTokens: 800,
    maxTokens: 2500,
    bufferMultiplier: 1.4,
  },
  youtube: {
    minTokens: 1000,
    maxTokens: 4000,
    bufferMultiplier: 1.3,
  },
  email: {
    minTokens: 600,
    maxTokens: 2000,
    bufferMultiplier: 1.4,
  },
  telegram: {
    minTokens: 500,
    maxTokens: 1500,
    bufferMultiplier: 1.3,
  },
  
  // Medium-form content (Facebook, LinkedIn, Email need more tokens for 250-600 word requirement)
  facebook: {
    minTokens: 600,
    maxTokens: 2000,
    bufferMultiplier: 1.5, // Emoji + formatting
  },
  instagram: {
    minTokens: 200,
    maxTokens: 500,
    bufferMultiplier: 1.5,
  },
  tiktok: {
    minTokens: 150,
    maxTokens: 400,
    bufferMultiplier: 1.5,
  },
  threads: {
    minTokens: 100,
    maxTokens: 300,
    bufferMultiplier: 1.4,
  },
  twitter: {
    minTokens: 400,
    maxTokens: 1200,
    bufferMultiplier: 1.3, // Thread format 5-7 tweets
  },
  
  // Special channels
  google_maps: {
    minTokens: 200,
    maxTokens: 500,
    bufferMultiplier: 1.2, // Plain text
  },
  zalo_oa: {
    minTokens: 300,
    maxTokens: 800,
    bufferMultiplier: 1.3,
  },
};

// Default for unknown channels
const DEFAULT_TOKEN_CONFIG: ChannelTokenConfig = {
  minTokens: 400,
  maxTokens: 1500,
  bufferMultiplier: 1.4,
};

// ============================================
// CONTENT GOAL MULTIPLIERS
// ============================================

// Some content goals require more tokens
const GOAL_MULTIPLIERS: Record<string, number> = {
  education: 1.3,      // Detailed explanations
  expertise: 1.25,     // Data and analysis
  awareness: 1.0,      // Standard
  engagement: 1.1,     // Questions and variety
  conversion: 0.95,    // Concise CTAs
};

// ============================================
// QUALITY MODE MULTIPLIERS
// ============================================

const QUALITY_MULTIPLIERS: Record<string, number> = {
  fast: 0.9,      // Slightly less output
  balanced: 1.0,  // Standard
  quality: 1.1,   // More room for refinement
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Calculate optimal max_tokens for a channel
 */
export function calculateChannelMaxTokens(
  channel: string,
  options: {
    contentGoal?: string;
    qualityMode?: 'fast' | 'balanced' | 'quality';
    channelMaxLength?: number; // Override from channel settings
    lengthUnit?: 'words' | 'chars';
  } = {}
): number {
  const config = CHANNEL_TOKEN_CONFIGS[channel] || DEFAULT_TOKEN_CONFIG;
  const goalMultiplier = GOAL_MULTIPLIERS[options.contentGoal || 'awareness'] || 1.0;
  const qualityMultiplier = QUALITY_MULTIPLIERS[options.qualityMode || 'balanced'] || 1.0;
  
  // If channel max length is provided, calculate from that
  if (options.channelMaxLength) {
    let baseTokens: number;
    
    if (options.lengthUnit === 'chars') {
      // ~3 chars per token (average across scripts: Vietnamese ~2, Thai ~1.5, English ~4)
      baseTokens = Math.ceil(options.channelMaxLength / 3);
    } else {
      // ~1.5 tokens per word (average: Vietnamese/Thai diacritics need more tokens)
      baseTokens = Math.ceil(options.channelMaxLength * 1.5);
    }
    
    // Apply buffer and multipliers
    const calculated = Math.ceil(
      baseTokens * config.bufferMultiplier * goalMultiplier * qualityMultiplier
    );
    
    // Clamp to min/max bounds
    return Math.max(config.minTokens, Math.min(calculated, config.maxTokens));
  }
  
  // Use default max for channel with multipliers
  const calculated = Math.ceil(
    config.maxTokens * goalMultiplier * qualityMultiplier
  );
  
  return Math.max(config.minTokens, Math.min(calculated, config.maxTokens));
}

/**
 * Calculate total max_tokens for multiple channels
 * Used when generating all channels in one call
 */
export function calculateTotalMaxTokens(
  channels: string[],
  options: {
    contentGoal?: string;
    qualityMode?: 'fast' | 'balanced' | 'quality';
  } = {}
): number {
  // Sum up individual channel tokens
  const total = channels.reduce((sum, channel) => {
    return sum + calculateChannelMaxTokens(channel, options);
  }, 0);
  
  // Add overhead for JSON structure (~200 tokens per channel)
  const overhead = channels.length * 200;
  
  // Cap at reasonable maximum
  return Math.min(total + overhead, 16384);
}

/**
 * Get channel token config for reference
 */
export function getChannelTokenConfig(channel: string): ChannelTokenConfig {
  return CHANNEL_TOKEN_CONFIGS[channel] || DEFAULT_TOKEN_CONFIG;
}

/**
 * Estimate token savings compared to fixed max_tokens
 */
export function estimateTokenSavings(
  channels: string[],
  fixedMaxTokens: number = 12288,
  options: {
    contentGoal?: string;
    qualityMode?: 'fast' | 'balanced' | 'quality';
  } = {}
): { dynamicTokens: number; savings: number; savingsPercent: number } {
  const dynamicTokens = calculateTotalMaxTokens(channels, options);
  const savings = fixedMaxTokens - dynamicTokens;
  const savingsPercent = Math.round((savings / fixedMaxTokens) * 100);
  
  return {
    dynamicTokens,
    savings: Math.max(0, savings),
    savingsPercent: Math.max(0, savingsPercent),
  };
}
