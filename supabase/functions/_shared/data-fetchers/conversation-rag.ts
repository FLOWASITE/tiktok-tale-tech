// ============================================
// Conversation RAG - Semantic search over conversation history
// ============================================

import { generateEmbedding } from '../conversation-embedder.ts';

export interface ConversationRAGResult {
  id: string;
  conversation_id: string;
  message_id?: string;
  embedding_type: 'summary' | 'message' | 'exchange' | 'key_insight';
  content_text: string;
  similarity: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversationRAGOptions {
  userId: string;
  organizationId?: string;
  brandTemplateId?: string;
  excludeConversationId?: string;
  embeddingTypes?: ('summary' | 'message' | 'exchange' | 'key_insight')[];
  threshold?: number;
  limit?: number;
}

/**
 * Search for relevant past conversations based on query
 */
export async function searchRelevantConversations(
  supabase: any,
  query: string,
  options: ConversationRAGOptions
): Promise<ConversationRAGResult[]> {
  const {
    userId,
    organizationId,
    brandTemplateId,
    excludeConversationId,
    embeddingTypes,
    threshold = 0.7,
    limit = 5,
  } = options;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      console.log('Failed to generate query embedding for conversation RAG');
      return [];
    }

    // Call the database function
    const { data, error } = await supabase.rpc('search_conversation_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_user_id: userId,
      match_organization_id: organizationId || null,
      match_brand_template_id: brandTemplateId || null,
      match_types: embeddingTypes || null,
      exclude_conversation_id: excludeConversationId || null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Conversation RAG search error:', error);
      return [];
    }

    // Deduplicate by conversation_id (keep highest similarity)
    const seenConversations = new Map<string, ConversationRAGResult>();
    for (const result of data || []) {
      const existing = seenConversations.get(result.conversation_id);
      if (!existing || result.similarity > existing.similarity) {
        seenConversations.set(result.conversation_id, result);
      }
    }

    const results = Array.from(seenConversations.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log(`Conversation RAG: found ${results.length} relevant past conversations`);
    return results;

  } catch (error) {
    console.error('searchRelevantConversations error:', error);
    return [];
  }
}

/**
 * Format conversation RAG results for prompt injection
 */
export function buildConversationRAGSection(results: ConversationRAGResult[]): string {
  if (!results.length) return '';

  const sections: string[] = [];
  
  for (const result of results) {
    const date = new Date(result.created_at).toLocaleDateString('vi-VN');
    const similarity = Math.round(result.similarity * 100);
    
    let prefix = '';
    switch (result.embedding_type) {
      case 'summary':
        prefix = '📋';
        break;
      case 'exchange':
        prefix = '💬';
        break;
      case 'key_insight':
        prefix = '💡';
        break;
      default:
        prefix = '•';
    }
    
    // Truncate content for prompt
    const content = result.content_text.slice(0, 300);
    sections.push(`${prefix} [${date}] (${similarity}% relevant): ${content}`);
  }

  return `## Past Relevant Conversations
${sections.join('\n\n')}

**Hướng dẫn:**
- Tham khảo các cuộc hội thoại trước để duy trì tính nhất quán
- Áp dụng insights và preferences đã học được
- Tránh lặp lại cùng một gợi ý nếu user đã từ chối trước đó`;
}

/**
 * Get conversation RAG context for chat pipeline
 */
export async function getConversationRAGContext(
  supabase: any,
  query: string,
  userId: string,
  organizationId?: string,
  brandTemplateId?: string,
  currentConversationId?: string
): Promise<{
  results: ConversationRAGResult[];
  promptSection: string;
}> {
  const results = await searchRelevantConversations(supabase, query, {
    userId,
    organizationId,
    brandTemplateId,
    excludeConversationId: currentConversationId,
    embeddingTypes: ['summary', 'exchange', 'key_insight'],
    threshold: 0.65,
    limit: 3,
  });

  return {
    results,
    promptSection: buildConversationRAGSection(results),
  };
}
