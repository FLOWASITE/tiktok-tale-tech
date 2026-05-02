/**
 * Channel Optimization Utilities
 * 
 * Fetches and applies per-channel AI optimization configs including:
 * - Quality Mode (fast/balanced/quality)
 * - Prompt Style (default/concise/detailed/creative)
 * - Hook Intensity (soft/medium/strong/viral)
 * - Cost Priority (economy/balanced/quality)
 * - Preferred Hook Types
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// TYPES
// ============================================

export type QualityMode = 'fast' | 'balanced' | 'quality';
export type PromptStyle = 'default' | 'concise' | 'detailed' | 'creative' | 'analytical';
export type HookIntensity = 'soft' | 'medium' | 'strong' | 'viral';
export type CostPriority = 'economy' | 'balanced' | 'quality';

export interface ChannelOptimization {
  qualityMode: QualityMode;
  promptStyle: PromptStyle;
  hookIntensity: HookIntensity;
  costPriority: CostPriority;
  preferredHookTypes: string[];
  maxTokensOverride?: number;
  allowUserOverride: boolean;
}

// ============================================
// DEFAULT CONFIGS PER CHANNEL
// ============================================

const CHANNEL_DEFAULTS: Record<string, ChannelOptimization> = {
  // Short-form, high-engagement platforms
  twitter: {
    qualityMode: 'fast',
    promptStyle: 'concise',
    hookIntensity: 'strong',
    costPriority: 'economy',
    preferredHookTypes: ['Hot take', 'Breaking news', 'Thread opener'],
    allowUserOverride: true,
  },
  tiktok: {
    qualityMode: 'balanced',
    promptStyle: 'creative',
    hookIntensity: 'viral',
    costPriority: 'balanced',
    preferredHookTypes: ['Stop scrolling', 'POV opener', 'Trend hook'],
    allowUserOverride: true,
  },
  threads: {
    qualityMode: 'fast',
    promptStyle: 'concise',
    hookIntensity: 'medium',
    costPriority: 'economy',
    preferredHookTypes: ['Conversational', 'Hot take'],
    allowUserOverride: true,
  },
  
  // Medium-form platforms
  facebook: {
    qualityMode: 'balanced',
    promptStyle: 'default',
    hookIntensity: 'medium',
    costPriority: 'balanced',
    preferredHookTypes: ['Emotional story', 'Question hook', 'Statistic'],
    allowUserOverride: true,
  },
  instagram: {
    qualityMode: 'balanced',
    promptStyle: 'creative',
    hookIntensity: 'strong',
    costPriority: 'balanced',
    preferredHookTypes: ['Visual hook', 'Before/After', 'Lifestyle'],
    allowUserOverride: true,
  },
  linkedin: {
    qualityMode: 'balanced',
    promptStyle: 'detailed',
    hookIntensity: 'medium',
    costPriority: 'balanced',
    preferredHookTypes: ['Professional insight', 'Data point', 'Career lesson'],
    allowUserOverride: true,
  },
  zalo: {
    qualityMode: 'balanced',
    promptStyle: 'default',
    hookIntensity: 'medium',
    costPriority: 'balanced',
    preferredHookTypes: ['Friendly greeting', 'Community focus'],
    allowUserOverride: true,
  },
  telegram: {
    qualityMode: 'balanced',
    promptStyle: 'default',
    hookIntensity: 'medium',
    costPriority: 'balanced',
    preferredHookTypes: ['Breaking news', 'Exclusive update'],
    allowUserOverride: true,
  },
  
  // Long-form, high-quality platforms
  website: {
    qualityMode: 'quality',
    promptStyle: 'detailed',
    hookIntensity: 'soft',
    costPriority: 'quality',
    preferredHookTypes: ['SEO headline', 'Problem-solution', 'How-to'],
    allowUserOverride: true,
  },
  blogger: {
    qualityMode: 'balanced',
    promptStyle: 'detailed',
    hookIntensity: 'soft',
    costPriority: 'balanced',
    preferredHookTypes: ['Story opener', 'Personal anecdote', 'Question'],
    allowUserOverride: true,
  },
  wordpress: {
    qualityMode: 'quality',
    promptStyle: 'detailed',
    hookIntensity: 'soft',
    costPriority: 'quality',
    preferredHookTypes: ['SEO headline', 'Statistic', 'Problem-solution', 'How-to'],
    allowUserOverride: true,
  },
  youtube: {
    qualityMode: 'quality',
    promptStyle: 'detailed',
    hookIntensity: 'strong',
    costPriority: 'quality',
    preferredHookTypes: ['Thumbnail hook', 'First 5 seconds', 'Promise hook'],
    allowUserOverride: true,
  },
  email: {
    qualityMode: 'quality',
    promptStyle: 'detailed',
    hookIntensity: 'medium',
    costPriority: 'balanced',
    preferredHookTypes: ['Subject line', 'Personalized opener', 'Benefit-first'],
    allowUserOverride: true,
  },
  blog: {
    qualityMode: 'quality',
    promptStyle: 'detailed',
    hookIntensity: 'soft',
    costPriority: 'quality',
    preferredHookTypes: ['SEO headline', 'Story opener', 'Statistic'],
    allowUserOverride: true,
  },
};

// Fallback for unknown channels
const DEFAULT_OPTIMIZATION: ChannelOptimization = {
  qualityMode: 'balanced',
  promptStyle: 'default',
  hookIntensity: 'medium',
  costPriority: 'balanced',
  preferredHookTypes: [],
  allowUserOverride: true,
};

// ============================================
// PROMPT STYLE INSTRUCTIONS
// ============================================

export const PROMPT_STYLE_INSTRUCTIONS: Record<PromptStyle, string> = {
  default: '',
  concise: `
## PROMPT STYLE: CONCISE
- Viết ngắn gọn, đi thẳng vào vấn đề
- Mỗi câu phải mang thông tin quan trọng
- Loại bỏ từ ngữ thừa, lặp lại
- Ưu tiên bullet points nếu phù hợp`,
  detailed: `
## PROMPT STYLE: DETAILED
- Viết đầy đủ, chi tiết, có chiều sâu
- Giải thích rõ ràng các khái niệm
- Cung cấp ví dụ cụ thể khi cần
- Đảm bảo nội dung có giá trị cao`,
  creative: `
## PROMPT STYLE: CREATIVE
- Viết sáng tạo, độc đáo, thu hút
- Sử dụng ngôn ngữ sinh động, hình ảnh
- Có thể dùng metaphor, so sánh bất ngờ
- Tạo điểm nhấn khác biệt`,
  analytical: `
## PROMPT STYLE: ANALYTICAL
- Viết logic, có cấu trúc rõ ràng
- Dùng data, số liệu, so sánh
- Phân tích từng khía cạnh
- Kết luận dựa trên evidence`,
};

// ============================================
// HOOK INTENSITY INSTRUCTIONS
// ============================================

export const HOOK_INTENSITY_INSTRUCTIONS: Record<HookIntensity, string> = {
  soft: `
## HOOK INTENSITY: SOFT
- Tạo hook nhẹ nhàng, chuyên nghiệp
- Không gây sốc hay tạo FOMO quá mức
- Phù hợp B2B, ngành nghề nghiêm túc
- Tập trung vào giá trị thực`,
  medium: `
## HOOK INTENSITY: MEDIUM
- Tạo hook cân bằng, gây tò mò
- Có yếu tố thu hút nhưng không quá giật
- Phù hợp đa dạng đối tượng
- Kết hợp cảm xúc và logic`,
  strong: `
## HOOK INTENSITY: STRONG
- Tạo hook mạnh, gây tò mò cao
- Đảm bảo dừng scroll trong 1-2 giây đầu
- Sử dụng yếu tố bất ngờ, đối lập
- Có thể dùng số liệu gây sốc (đúng sự thật)`,
  viral: `
## HOOK INTENSITY: VIRAL
- Tạo hook viral-potential, gây ấn tượng mạnh
- Sử dụng controversial nhưng có giá trị
- Có thể polarizing nhẹ để tạo engagement
- Tập trung vào emotion và shareability`,
};

// ============================================
// COST PRIORITY MULTIPLIERS
// ============================================

export const COST_PRIORITY_MULTIPLIERS: Record<CostPriority, number> = {
  economy: 0.75,  // 25% token reduction
  balanced: 1.0,  // Standard
  quality: 1.25,  // 25% more tokens for quality
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Get channel optimization config with priority:
 * Brand Override > Admin Config > Channel Default
 */
export async function getChannelOptimization(
  supabase: SupabaseClient,
  channel: string,
  organizationId?: string,
  brandTemplateId?: string
): Promise<ChannelOptimization> {
  const defaultConfig = CHANNEL_DEFAULTS[channel] || DEFAULT_OPTIMIZATION;
  
  try {
    // 1. Try to get brand-level override first
    if (brandTemplateId) {
      const { data: brandOverride } = await supabase
        .from('brand_channel_optimizations')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .eq('channel', channel)
        .single();
      
      if (brandOverride) {
        return {
          qualityMode: (brandOverride.quality_mode as QualityMode) || defaultConfig.qualityMode,
          promptStyle: (brandOverride.prompt_style as PromptStyle) || defaultConfig.promptStyle,
          hookIntensity: (brandOverride.hook_intensity as HookIntensity) || defaultConfig.hookIntensity,
          costPriority: (brandOverride.cost_priority as CostPriority) || defaultConfig.costPriority,
          preferredHookTypes: brandOverride.preferred_hook_types || defaultConfig.preferredHookTypes,
          maxTokensOverride: brandOverride.max_tokens_override,
          allowUserOverride: true, // Brand override means user can use it
        };
      }
    }
    
    // 2. Try to get admin/org-level config
    if (organizationId) {
      const { data: adminConfig } = await supabase
        .from('ai_channel_model_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('channel', channel)
        .single();
      
      if (adminConfig) {
        return {
          qualityMode: (adminConfig.quality_mode_default as QualityMode) || defaultConfig.qualityMode,
          promptStyle: (adminConfig.prompt_style as PromptStyle) || defaultConfig.promptStyle,
          hookIntensity: (adminConfig.hook_intensity as HookIntensity) || defaultConfig.hookIntensity,
          costPriority: (adminConfig.cost_priority as CostPriority) || defaultConfig.costPriority,
          preferredHookTypes: adminConfig.preferred_hook_types || defaultConfig.preferredHookTypes,
          maxTokensOverride: adminConfig.max_tokens,
          allowUserOverride: adminConfig.allow_user_override ?? true,
        };
      }
    }
    
    // 3. Try global admin config (no org)
    const { data: globalConfig } = await supabase
      .from('ai_channel_model_configs')
      .select('*')
      .is('organization_id', null)
      .eq('channel', channel)
      .single();
    
    if (globalConfig) {
      return {
        qualityMode: (globalConfig.quality_mode_default as QualityMode) || defaultConfig.qualityMode,
        promptStyle: (globalConfig.prompt_style as PromptStyle) || defaultConfig.promptStyle,
        hookIntensity: (globalConfig.hook_intensity as HookIntensity) || defaultConfig.hookIntensity,
        costPriority: (globalConfig.cost_priority as CostPriority) || defaultConfig.costPriority,
        preferredHookTypes: globalConfig.preferred_hook_types || defaultConfig.preferredHookTypes,
        maxTokensOverride: globalConfig.max_tokens,
        allowUserOverride: globalConfig.allow_user_override ?? true,
      };
    }
  } catch (error) {
    console.warn(`[channel-optimization] Error fetching config for ${channel}:`, error);
  }
  
  // Return default
  return { ...defaultConfig };
}

/**
 * Get optimizations for multiple channels in parallel
 */
export async function getMultiChannelOptimizations(
  supabase: SupabaseClient,
  channels: string[],
  organizationId?: string,
  brandTemplateId?: string
): Promise<Record<string, ChannelOptimization>> {
  const results = await Promise.all(
    channels.map(async (channel) => ({
      channel,
      optimization: await getChannelOptimization(supabase, channel, organizationId, brandTemplateId),
    }))
  );
  
  return results.reduce((acc, { channel, optimization }) => {
    acc[channel] = optimization;
    return acc;
  }, {} as Record<string, ChannelOptimization>);
}

/**
 * Apply cost priority to base token count
 */
export function applyTokenOptimization(
  baseTokens: number,
  optimization: ChannelOptimization
): number {
  // Apply cost priority multiplier
  const multiplier = COST_PRIORITY_MULTIPLIERS[optimization.costPriority] || 1.0;
  let adjusted = Math.ceil(baseTokens * multiplier);
  
  // Apply override if specified
  if (optimization.maxTokensOverride) {
    adjusted = Math.min(adjusted, optimization.maxTokensOverride);
  }
  
  return adjusted;
}

/**
 * Build optimized prompt section based on channel optimization config
 */
export function buildOptimizedPromptSection(
  channel: string,
  optimization: ChannelOptimization
): string {
  const sections: string[] = [];
  
  // Add prompt style instructions
  const styleInstructions = PROMPT_STYLE_INSTRUCTIONS[optimization.promptStyle];
  if (styleInstructions) {
    sections.push(styleInstructions);
  }
  
  // Add hook intensity instructions
  const hookInstructions = HOOK_INTENSITY_INSTRUCTIONS[optimization.hookIntensity];
  if (hookInstructions) {
    sections.push(hookInstructions);
  }
  
  // Add preferred hook types
  if (optimization.preferredHookTypes.length > 0) {
    sections.push(`
## PREFERRED HOOK FRAMEWORKS
Ưu tiên sử dụng các kiểu hook: ${optimization.preferredHookTypes.join(', ')}`);
  }
  
  return sections.join('\n');
}

/**
 * Get effective quality mode considering user override
 */
export function getEffectiveQualityMode(
  userQualityMode: QualityMode | undefined,
  optimization: ChannelOptimization
): QualityMode {
  // If user specified and override is allowed, use user's choice
  if (userQualityMode && optimization.allowUserOverride) {
    return userQualityMode;
  }
  
  // Otherwise use channel optimization config
  return optimization.qualityMode;
}

/**
 * Get channel default config (static, no DB)
 */
export function getChannelDefaultOptimization(channel: string): ChannelOptimization {
  return CHANNEL_DEFAULTS[channel] || DEFAULT_OPTIMIZATION;
}
