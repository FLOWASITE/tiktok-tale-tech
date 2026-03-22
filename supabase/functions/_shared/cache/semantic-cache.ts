// ============================================
// Semantic Cache Layer
// Uses embedding similarity to find cached AI responses
// Falls back gracefully if embeddings unavailable
// ============================================

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

let embeddingModel: any = null;

function getEmbeddingModel() {
  if (!embeddingModel) {
    try {
      embeddingModel = new Supabase.ai.Session('gte-small');
    } catch (err) {
      console.warn('[SemanticCache] Failed to init gte-small model:', err);
    }
  }
  return embeddingModel;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const model = getEmbeddingModel();
  if (!model) return null;

  try {
    const output = await model.run(text, { mean_pool: true, normalize: true });
    return Array.from(output as Float32Array);
  } catch (err) {
    console.warn('[SemanticCache] Embedding generation failed:', err);
    return null;
  }
}

interface SemanticCacheOptions {
  functionName: string;
  organizationId?: string;
  brandTemplateId?: string;
  similarityThreshold?: number; // default 0.92
}

interface SemanticCacheResult<T> {
  data: T;
  fromCache: boolean;
  similarity?: number;
}

/**
 * Check semantic cache for similar AI responses.
 * If a cached response with high similarity is found, return it.
 * Otherwise, execute generateFn and cache the result with its embedding.
 */
export async function withSemanticCache<T>(
  supabase: any,
  inputText: string,
  options: SemanticCacheOptions,
  generateFn: () => Promise<T>,
  ttlDays = 7,
): Promise<SemanticCacheResult<T>> {
  const { functionName, organizationId, brandTemplateId, similarityThreshold = 0.92 } = options;

  // Skip for very short inputs
  if (!inputText || inputText.length < 30) {
    const data = await generateFn();
    return { data, fromCache: false };
  }

  // Try to find semantically similar cached result
  const embedding = await generateEmbedding(inputText);

  if (embedding) {
    try {
      const { data: matches, error } = await supabase.rpc('match_cached_ai_results', {
        query_embedding: `[${embedding.join(',')}]`,
        match_function_name: functionName,
        match_organization_id: organizationId || null,
        match_brand_template_id: brandTemplateId || null,
        match_threshold: similarityThreshold,
        match_count: 1,
      });

      if (!error && matches?.length > 0) {
        const match = matches[0];
        console.log(`[SemanticCache] HIT for ${functionName} (similarity: ${match.similarity.toFixed(3)})`);

        // Increment hit count
        await supabase.rpc('increment_cache_hit', { p_cache_key: match.cache_key }).catch(() => {});

        return {
          data: match.response_data as T,
          fromCache: true,
          similarity: match.similarity,
        };
      }
    } catch (err) {
      console.warn('[SemanticCache] Search failed, proceeding without cache:', err);
    }
  }

  // Cache miss — generate fresh result
  const data = await generateFn();

  // Store result with embedding for future semantic matching
  if (embedding && data) {
    try {
      const cacheKey = `semantic:${functionName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('ai_response_cache').insert({
        cache_key: cacheKey,
        input_hash: cacheKey,
        function_name: functionName,
        response_data: data,
        cache_scope: organizationId ? 'org' : 'global',
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        embedding: `[${embedding.join(',')}]`,
        input_text: inputText.substring(0, 500),
        expires_at: expiresAt,
        hit_count: 0,
      });

      console.log(`[SemanticCache] STORED for ${functionName}`);
    } catch (err) {
      console.warn('[SemanticCache] Failed to store:', err);
    }
  }

  return { data, fromCache: false };
}
