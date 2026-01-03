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
    model: 'google/gemini-2.5-flash',
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
  'agentic-loop': {
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
  'recommend-topics': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 4096,
    cache_ttl_seconds: 3600,
    is_enabled: true,
    priority_level: 'low',
  },
  'discover-trending-topics': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    max_tokens: 4096,
    cache_ttl_seconds: 3600,
    is_enabled: true,
    priority_level: 'low',
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
  'generate-social-image': {
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
};

// In-memory cache with short TTL to reduce DB calls
const configCache: Map<string, { config: AIFunctionConfig; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get AI configuration for a specific function
 * Supports organization-specific overrides
 */
export async function getAIConfig(
  functionName: string,
  organizationId?: string
): Promise<AIFunctionConfig> {
  // Check in-memory cache first
  const cacheKey = `${functionName}:${organizationId || 'global'}`;
  const cached = configCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[ai-config] Cache hit for ${functionName}`);
    return cached.config;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[ai-config] Missing Supabase credentials, using defaults');
    return getDefaultConfig(functionName);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Query: prioritize org-specific config, fallback to global
    let query = supabase
      .from('ai_function_configs')
      .select('function_name, model_override, temperature, max_tokens, cache_ttl_hours, custom_system_prompt, is_enabled, priority_level')
      .eq('function_name', functionName)
      .eq('is_enabled', true);

    if (organizationId) {
      // Get both org-specific and global configs
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      // Only global configs
      query = query.is('organization_id', null);
    }

    const { data, error } = await query
      .order('organization_id', { nullsFirst: false }) // org-specific first
      .limit(1);

    if (error) {
      console.warn(`[ai-config] Query error for ${functionName}:`, error.message);
      return getDefaultConfig(functionName);
    }

    // Use DB config if found, otherwise defaults
    const dbConfig = data?.[0];
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
    configCache.set(cacheKey, { config, fetchedAt: Date.now() });
    console.log(`[ai-config] Loaded config for ${functionName}:`, {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      source: dbConfig ? 'database' : 'defaults',
    });

    return config;
  } catch (err) {
    console.error(`[ai-config] Failed to fetch config for ${functionName}:`, err);
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
