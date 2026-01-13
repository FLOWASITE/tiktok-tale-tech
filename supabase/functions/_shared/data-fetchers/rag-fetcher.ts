// ============================================
// RAG (Retrieval Augmented Generation) Fetcher
// Uses Supabase.ai.Session with gte-small model (384 dimensions)
// ============================================

import { RAGResult } from "../types/chat-types.ts";

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

// Initialize gte-small embedding model (384 dimensions)
const model = new Supabase.ai.Session('gte-small');

/**
 * Generate embedding vector for a query string
 */
export async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    console.log('[RAG] Generating embedding for:', query.substring(0, 50) + '...');
    
    const output = await model.run(query, {
      mean_pool: true,
      normalize: true,
    });
    
    return Array.from(output as Float32Array);
  } catch (error) {
    console.error('[RAG] Error generating embedding:', error);
    return null;
  }
}

/**
 * Search for relevant past content using RAG
 */
// deno-lint-ignore no-explicit-any
export async function searchRelevantContent(
  supabase: any,
  query: string,
  organizationId: string,
  brandTemplateId?: string,
  limit: number = 5
): Promise<RAGResult[]> {
  try {
    const embedding = await generateQueryEmbedding(query);
    if (!embedding) return [];

    const embeddingStr = `[${embedding.join(',')}]`;

    const { data, error } = await supabase.rpc('search_embeddings', {
      query_embedding: embeddingStr,
      match_organization_id: organizationId,
      match_brand_template_id: brandTemplateId || null,
      match_content_types: ['topic', 'script'],
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('[RAG] Search error:', error);
      return [];
    }

    // Deduplicate by content_id
    const deduped = new Map<string, RAGResult>();
    for (const r of (data || [])) {
      const key = `${r.content_type}:${r.content_id}`;
      if (!deduped.has(key) || deduped.get(key)!.similarity < r.similarity) {
        deduped.set(key, r);
      }
    }

    return Array.from(deduped.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('[RAG] Error in search:', error);
    return [];
  }
}
