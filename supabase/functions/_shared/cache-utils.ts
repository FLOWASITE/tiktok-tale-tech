/**
 * AI Response Cache Utilities
 * 
 * Provides caching layer for AI responses to reduce costs and improve response times.
 * 
 * Key features:
 * - Separate cache_key (full key) and input_hash (input-only for analytics)
 * - Scope-aware caching (org or global)
 * - Response validation before caching
 * - Does NOT expose internal cache keys to clients
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// Types
// ============================================

interface CacheKeyParts {
  cacheKey: string;   // Full key for lookup (hash of function + versions + input)
  inputHash: string;  // Input-only hash for analytics
}

interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  // NO cacheKey exposed - internal only!
}

interface CacheParams<T> {
  functionName: string;
  scope: 'org' | 'global';
  organizationId?: string;  // Required if scope = 'org'
  brandTemplateId?: string;
  input: Record<string, unknown>;
  versions: {
    industryMemory?: string;
    brandVoice?: string;
    /**
     * Defense-in-depth: SHA-256 hash of the *actual* merged compliance rule
     * content (compliance_rules, claim_restrictions, forbidden_terms,
     * argument_patterns, system_rules, etc.). When admin edits rules but
     * forgets to bump industry version, this hash still changes → cache miss.
     * Compute via `_shared/cache/compliance-hash.ts#hashComplianceRules`.
     */
    complianceHash?: string;
  };
  ttlDays: number;
  generateFn: () => Promise<T>;  // Returns validated AI response
  validateFn?: (data: T) => boolean;  // Optional validation - if returns false, invalidate cache and regenerate
}

// ============================================
// Hashing Utilities
// ============================================

/**
 * Generate SHA-256 hash using Web Crypto API
 */
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize input for consistent hashing
 * - Sort object keys
 * - Trim strings
 * - Remove undefined values
 */
function normalizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sortedKeys = Object.keys(input).sort();
  const normalized: Record<string, unknown> = {};
  
  for (const key of sortedKeys) {
    const value = input[key];
    if (value === undefined) continue;
    
    if (typeof value === 'string') {
      normalized[key] = value.trim().toLowerCase();
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(v => 
        typeof v === 'string' ? v.trim().toLowerCase() : v
      ).sort();
    } else if (value !== null && typeof value === 'object') {
      normalized[key] = normalizeInput(value as Record<string, unknown>);
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

/**
 * Generate cache keys
 * 
 * Returns:
 * - cacheKey: hash(function + versions + input) - used for cache lookup
 * - inputHash: hash(input only) - for analytics (compare same input across versions)
 */
async function generateCacheKeys(params: {
  functionName: string;
  input: Record<string, unknown>;
  versions: {
    industryMemory?: string;
    brandVoice?: string;
    complianceHash?: string;
  };
}): Promise<CacheKeyParts> {
  const normalizedInput = normalizeInput(params.input);

  // Input-only hash for analytics
  const inputHash = await sha256(JSON.stringify(normalizedInput));

  // Full cache key includes function name + ALL versioning signals.
  // `ch` (complianceHash) is critical: when admin edits compliance rules
  // without bumping industry version, this changes → cache miss → no
  // stale rule-violating content is ever served. Legal risk mitigation
  // for medical/aesthetic-surgery vertical.
  const cachePayload = {
    fn: params.functionName,
    v: {
      im: params.versions.industryMemory || null,
      bv: params.versions.brandVoice || null,
      ch: params.versions.complianceHash || null,
    },
    input: normalizedInput,
  };
  const cacheKey = await sha256(JSON.stringify(cachePayload));

  return { cacheKey, inputHash };
}

// ============================================
// Cache Operations
// ============================================

/**
 * Create Supabase client for cache operations
 */
function createCacheClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Look up cache entry
 */
async function lookupCache<T>(
  supabase: SupabaseClient,
  cacheKey: string,
  scope: 'org' | 'global',
  organizationId?: string
): Promise<T | null> {
  let query = supabase
    .from('ai_response_cache')
    .select('response_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString());
  
  if (scope === 'global') {
    query = query.eq('cache_scope', 'global');
  } else {
    query = query.eq('cache_scope', 'org').eq('organization_id', organizationId);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.warn('Cache lookup error:', error.message);
    return null;
  }
  
  if (data) {
    // Update hit stats (fire-and-forget)
    supabase.rpc('increment_cache_hit', { p_cache_key: cacheKey }).then(() => {});
    return data.response_data as T;
  }
  
  return null;
}

/**
 * Store entry in cache
 */
async function storeCache<T>(
  supabase: SupabaseClient,
  params: {
    cacheKey: string;
    inputHash: string;
    functionName: string;
    scope: 'org' | 'global';
    organizationId?: string;
    brandTemplateId?: string;
    industryMemoryVersion?: string;
    brandVoiceVersion?: string;
    responseData: T;
    ttlDays: number;
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + params.ttlDays * 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase.from('ai_response_cache').upsert({
    cache_key: params.cacheKey,
    input_hash: params.inputHash,
    function_name: params.functionName,
    cache_scope: params.scope,
    organization_id: params.scope === 'org' ? params.organizationId : null,
    brand_template_id: params.brandTemplateId || null,
    industry_memory_version: params.industryMemoryVersion || null,
    brand_voice_version: params.brandVoiceVersion || null,
    response_data: params.responseData,
    response_schema_version: '1.0',
    expires_at: expiresAt,
  }, {
    onConflict: 'cache_key'
  });
  
  if (error) {
    console.warn('Cache store error:', error.message);
  } else {
    console.log(`Cache stored: ${params.functionName} (${params.scope}) - TTL: ${params.ttlDays} days`);
  }
}

// ============================================
// Main Cache Wrapper
// ============================================

/**
 * Cache wrapper for AI generation functions
 * 
 * Usage:
 * ```ts
 * const result = await withCache({
 *   functionName: 'generate-multichannel',
 *   scope: 'org',
 *   organizationId: 'xxx',
 *   input: { topic, contentGoal, channels },
 *   versions: { industryMemory: '1.2', brandVoice: '2.0' },
 *   ttlDays: 7,
 *   generateFn: async () => {
 *     // Call AI and return validated response
 *     return validatedResponse;
 *   }
 * });
 * 
 * // result = { data: T, fromCache: boolean }
 * // NO cacheKey in result!
 * ```
 */
export async function withCache<T>(params: CacheParams<T>): Promise<CachedResult<T>> {
  // Validate scope requirements
  if (params.scope === 'org' && !params.organizationId) {
    throw new Error('organizationId is required for org-scoped cache');
  }
  
  const supabase = createCacheClient();
  
  // Generate cache keys
  const { cacheKey, inputHash } = await generateCacheKeys({
    functionName: params.functionName,
    input: params.input,
    versions: params.versions,
  });
  
  console.log(`Cache lookup: ${params.functionName} (${params.scope})`);
  
  // 1. Check cache
  const cached = await lookupCache<T>(
    supabase,
    cacheKey,
    params.scope,
    params.organizationId
  );
  
  if (cached !== null) {
    // Validate cached data if validateFn provided
    if (params.validateFn && !params.validateFn(cached)) {
      console.log(`Cache HIT but INVALID: ${params.functionName} - regenerating...`);
      // Invalidate this specific cache entry
      await supabase
        .from('ai_response_cache')
        .delete()
        .eq('cache_key', cacheKey);
      // Fall through to regenerate
    } else {
      console.log(`Cache HIT: ${params.functionName}`);
      return {
        data: cached,
        fromCache: true,
        // NO cacheKey exposed!
      };
    }
  }
  
  console.log(`Cache MISS: ${params.functionName} - calling AI...`);
  
  // 2. Cache miss - call AI
  const generatedData = await params.generateFn();
  
  // 3. Store in cache (validated data only - validation happens in generateFn)
  await storeCache(supabase, {
    cacheKey,
    inputHash,
    functionName: params.functionName,
    scope: params.scope,
    organizationId: params.organizationId,
    brandTemplateId: params.brandTemplateId,
    industryMemoryVersion: params.versions.industryMemory,
    brandVoiceVersion: params.versions.brandVoice,
    responseData: generatedData,
    ttlDays: params.ttlDays,
  });
  
  return {
    data: generatedData,
    fromCache: false,
    // NO cacheKey exposed!
  };
}

// ============================================
// Cache Invalidation
// ============================================

/**
 * Invalidate cache entries by function name
 */
export async function invalidateCacheByFunction(functionName: string): Promise<number> {
  const supabase = createCacheClient();
  
  const { data, error } = await supabase
    .from('ai_response_cache')
    .delete()
    .eq('function_name', functionName)
    .select('id');
  
  if (error) {
    console.error('Cache invalidation error:', error.message);
    return 0;
  }
  
  const count = data?.length || 0;
  console.log(`Invalidated ${count} cache entries for function: ${functionName}`);
  return count;
}

/**
 * Invalidate cache entries by organization
 */
export async function invalidateCacheByOrg(organizationId: string): Promise<number> {
  const supabase = createCacheClient();
  
  const { data, error } = await supabase
    .from('ai_response_cache')
    .delete()
    .eq('organization_id', organizationId)
    .select('id');
  
  if (error) {
    console.error('Cache invalidation error:', error.message);
    return 0;
  }
  
  const count = data?.length || 0;
  console.log(`Invalidated ${count} cache entries for org: ${organizationId}`);
  return count;
}

/**
 * Invalidate cache entries by brand template
 */
export async function invalidateCacheByBrandTemplate(brandTemplateId: string): Promise<number> {
  const supabase = createCacheClient();
  
  const { data, error } = await supabase
    .from('ai_response_cache')
    .delete()
    .eq('brand_template_id', brandTemplateId)
    .select('id');
  
  if (error) {
    console.error('Cache invalidation error:', error.message);
    return 0;
  }
  
  const count = data?.length || 0;
  console.log(`Invalidated ${count} cache entries for brand template: ${brandTemplateId}`);
  return count;
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = createCacheClient();
  
  const { data, error } = await supabase.rpc('cleanup_expired_cache');
  
  if (error) {
    console.error('Cache cleanup error:', error.message);
    return 0;
  }
  
  console.log(`Cleaned up ${data} expired cache entries`);
  return data || 0;
}

// ============================================
// TTL Configuration
// ============================================

/**
 * Recommended TTL (days) by function type
 */
export const CACHE_TTL: Record<string, number> = {
  // High hit rate expected - long TTL
  'generate-brand-voice': 90,
  'generate-brand-guideline': 90,
  'generate-brand-complete': 90,
  'generate-sample-text': 30,
  
  // Medium hit rate - moderate TTL
  'generate-multichannel': 7,
  'generate-script': 7,
  'generate-carousel': 7,
  
  // Low hit rate - short TTL
  // 'regenerate-channel' merged into 'generate-multichannel' with action='regenerate'
  'ai-edit-channel': 1,
};

/**
 * Scope configuration by function type
 */
export const CACHE_SCOPE: Record<string, 'org' | 'global'> = {
  // Global scope - same across organizations
  'generate-brand-voice': 'global',
  'generate-brand-guideline': 'global',
  'generate-brand-complete': 'global',
  
  // Org scope - specific to organization
  'generate-multichannel': 'org',
  'generate-sample-text': 'org',
  'generate-script': 'org',
  'generate-carousel': 'org',
  // 'regenerate-channel' merged into 'generate-multichannel'
  'ai-edit-channel': 'org',
};
