// ============================================
// RAG (Retrieval Augmented Generation) Fetcher
// ============================================

import { RAGResult } from "../types/chat-types.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

/**
 * Generate embedding vector for a query string
 */
export async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  if (!LOVABLE_API_KEY) return null;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [query],
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    return null;
  }
}

/**
 * Search for relevant past content using RAG
 */
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
      console.error('RAG search error:', error);
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
    console.error('Error in RAG search:', error);
    return [];
  }
}
