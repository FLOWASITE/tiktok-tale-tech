// ============================================
// Centralized AI Configuration Fetcher
// Enables runtime model switching from Admin Panel
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface AIFunctionConfig {
  function_name: string;
  model: string;
  temperature: number;
  max_tokens: number;
  cache_ttl_seconds: number;
  custom_system_prompt?: string;
  is_enabled: boolean;
  priority_level: string;
  force_provider?: string | null;
}

// Default configs when DB is empty or query fails
const DEFAULT_CONFIGS: Record<string, Omit<AIFunctionConfig, 'function_name'>> = {
  // Main content generation - high quality model
  'generate-multichannel': {
    model: 'google/gemini-3-pro-preview',
    temperature: 0.7,
    max_tokens: 12288,
    cache_ttl_seconds: 3600,
    is_enabled: true,
    priority_level: 'high',
  },
  'generate-script': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 8192,
    cache_ttl_seconds: 1800,
    is_enabled: true,
    priority_level: 'normal',
  },
  'generate-carousel': {
    model: 'google/gemini-2.5-pro',
    temperature: 0.7,
    max_tokens: 4096,
    cache_ttl_seconds: 1800,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Chat functions
  'chat-topics': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 4096,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Analysis functions - faster/cheaper model
  'critique-content': {
    model: 'google/gemini-2.5-flash-lite',
    temperature: 0.3,
    max_tokens: 2048,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'low',
  },
  'refine-content': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.5,
    max_tokens: 8192,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  'analyze-script': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.5,
    max_tokens: 4096,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'low',
  },
  // Ideation functions
  'generate-hooks': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.8,
    max_tokens: 4096,
    cache_ttl_seconds: 1800,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Unified topic AI function (replaces recommend-topics, discover-trending-topics, analyze-topic-gaps, generate-topic-suggestions)
  'topic-ai': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 4096,
    cache_ttl_seconds: 3600,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Brand functions
  'generate-brand-voice': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.6,
    max_tokens: 4096,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  'generate-brand-guideline': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.6,
    max_tokens: 4096,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Image functions
  'generate-brand-image': {
    model: 'google/gemini-3-pro-image-preview',
    temperature: 0.7,
    max_tokens: 1024,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Expand channels function
  'expand-multichannel-channels': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 8192,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Ad copy generation
  'generate-ad-copy': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.8,
    max_tokens: 4000,
    cache_ttl_seconds: 1800,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Carousel image generation
  'generate-carousel-image': {
    model: 'google/gemini-3-pro-image-preview',
    temperature: 0.7,
    max_tokens: 1024,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // Background image editing
  'edit-image-background': {
    model: 'google/gemini-2.5-flash-image',
    temperature: 0.7,
    max_tokens: 1024,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // KIE.ai image generation via unified jobs API
  'generate-kie-image': {
    model: 'flux-2/pro-text-to-image',
    temperature: 0.7,
    max_tokens: 1024,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  // ============ Multi-Agent Supervisor Configs ============
  'intent-classifier': {
    model: 'google/gemini-2.5-flash-lite',
    temperature: 0.1,
    max_tokens: 256,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'high',
  },
  'research-agent': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.5,
    max_tokens: 2000,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  'strategy-agent': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.6,
    max_tokens: 2000,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'normal',
  },
  'content-agent': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 8000,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'high',
  },
  'reviewer-agent': {
    model: 'google/gemini-2.5-flash-lite',
    temperature: 0.3,
    max_tokens: 1500,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'low',
  },
  'learning-agent': {
    model: 'google/gemini-2.5-flash-lite',
    temperature: 0.2,
    max_tokens: 1024,
    cache_ttl_seconds: 0,
    is_enabled: true,
    priority_level: 'low',
  },
};

// In-memory cache with TTL to reduce DB calls
const configCache: Map<string, { config: AIFunctionConfig; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache for faster config updates from Admin Panel

// Pre-initialized Supabase client for config fetches
let _configSupabase: ReturnType<typeof createClient> | null = null;

const getConfigSupabase = () => {
  if (!_configSupabase) {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      _configSupabase = createClient(url, key);
    }
  }
  return _configSupabase;
};

/**
 * Get AI configuration for a specific function
 * OPTIMIZED: Reuses Supabase client, extended cache TTL, reduced logging
 */
export async function getAIConfig(
  functionName: string,
  organizationId?: string
): Promise<AIFunctionConfig> {
  // Fast path: check cache first
  const cacheKey = `${functionName}:${organizationId || 'global'}`;
  const cached = configCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  const supabase = getConfigSupabase();
  if (!supabase) {
    return getDefaultConfig(functionName);
  }

  try {
    // Optimized query with minimal select
    let query = supabase
      .from('ai_function_configs')
      .select('model_override, temperature, max_tokens, cache_ttl_hours, custom_system_prompt, is_enabled, priority_level, force_provider')
      .eq('function_name', functionName)
      .eq('is_enabled', true);

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      query = query.is('organization_id', null);
    }

    const { data, error } = await query
      .order('organization_id', { nullsFirst: false })
      .limit(1);

    if (error) {
      return getDefaultConfig(functionName);
    }

    const dbConfig = data?.[0] as any;
    const defaultConfig = DEFAULT_CONFIGS[functionName] || DEFAULT_CONFIGS['chat-topics'];

    const config: AIFunctionConfig = {
      function_name: functionName,
      model: dbConfig?.model_override || defaultConfig.model,
      temperature: dbConfig?.temperature ?? defaultConfig.temperature,
      max_tokens: dbConfig?.max_tokens ?? defaultConfig.max_tokens,
      cache_ttl_seconds: (dbConfig?.cache_ttl_hours ?? Math.floor(defaultConfig.cache_ttl_seconds / 3600)) * 3600,
      custom_system_prompt: dbConfig?.custom_system_prompt || undefined,
      is_enabled: dbConfig?.is_enabled ?? defaultConfig.is_enabled,
      priority_level: dbConfig?.priority_level || defaultConfig.priority_level,
    };

    // Update cache
    configCache.set(cacheKey, { config, fetchedAt: now });
    return config;
  } catch {
    return getDefaultConfig(functionName);
  }
}

/**
 * Get default config for a function
 */
function getDefaultConfig(functionName: string): AIFunctionConfig {
  const defaultConfig = DEFAULT_CONFIGS[functionName] || DEFAULT_CONFIGS['chat-topics'];
  return {
    function_name: functionName,
    ...defaultConfig,
  };
}

/**
 * Clear the config cache (useful for testing or manual refresh)
 */
export function clearConfigCache(): void {
  configCache.clear();
  console.log('[ai-config] Cache cleared');
}

/**
 * Get all default configs (for seeding or reference)
 */
export function getDefaultConfigs(): Record<string, Omit<AIFunctionConfig, 'function_name'>> {
  return { ...DEFAULT_CONFIGS };
}

/**
 * Channel-specific AI model configuration
 */
export interface ChannelModelConfig {
  channel: string;
  model: string;
  temperature: number;
  maxTokens: number | null;
  isEnabled: boolean;
}

// In-memory cache for channel configs
const channelConfigCache: Map<string, { configs: Map<string, ChannelModelConfig>; fetchedAt: number }> = new Map();

/**
 * Get channel-specific model configurations
 * OPTIMIZED: Pre-built Map, reuses Supabase client, reduced logging
 */
export async function getChannelModelConfigs(
  organizationId?: string
): Promise<Map<string, ChannelModelConfig>> {
  const cacheKey = organizationId || 'global';
  const cached = channelConfigCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.configs;
  }

  const supabase = getConfigSupabase();
  if (!supabase) {
    return new Map();
  }

  try {
    let query = supabase
      .from('ai_channel_model_configs')
      .select('channel, model_override, temperature, max_tokens, is_enabled')
      .eq('is_enabled', true);

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      query = query.is('organization_id', null);
    }

    const { data, error } = await query.order('organization_id', { nullsFirst: false });

    if (error) {
      return new Map();
    }

    // Build map directly - avoid intermediate array
    const configMap = new Map<string, ChannelModelConfig>();

    for (const rawRow of data || []) {
      const row = rawRow as any;
      if (!configMap.has(row.channel) && row.model_override) {
        configMap.set(row.channel, {
          channel: row.channel,
          model: row.model_override,
          temperature: row.temperature ?? 0.7,
          maxTokens: row.max_tokens,
          isEnabled: row.is_enabled ?? true,
        });
      }
    }

    // Cache the Map directly (no conversion needed on hit)
    channelConfigCache.set(cacheKey, { configs: configMap, fetchedAt: now });
    return configMap;
  } catch {
    return new Map();
  }
}
