// ============================================
// Brand Memory Service
// Long-term vector memory per brand
// ============================================

export interface BrandMemoryEntry {
  id: string;
  memoryType: string;
  content: string;
  confidence: number;
  source: string;
  similarity: number;
  usedCount: number;
}

/**
 * Search brand memory for relevant context
 */
export async function searchBrandMemory(
  supabase: any,
  brandTemplateId: string,
  queryText: string,
  memoryTypes?: string[],
  limit: number = 5
): Promise<BrandMemoryEntry[]> {
  try {
    // Generate embedding for query using Supabase AI
    const embeddingSession = new Supabase.ai.Session('gte-small');
    const embedding = await embeddingSession.run(queryText, { mean_pool: true, normalize: true });

    const { data, error } = await supabase.rpc('search_brand_memory', {
      query_embedding: JSON.stringify(Array.from(embedding)),
      match_brand_template_id: brandTemplateId,
      match_types: memoryTypes || null,
      match_threshold: 0.6,
      match_count: limit,
    });

    if (error) {
      console.warn('[BrandMemory] Search failed:', error);
      return [];
    }

    // Update used_count for retrieved memories
    if (data?.length > 0) {
      const ids = data.map((d: any) => d.id);
      await supabase
        .from('brand_memory')
        .update({ used_count: supabase.raw('used_count + 1'), last_used_at: new Date().toISOString() })
        .in('id', ids)
        .catch(() => {}); // Non-critical
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      memoryType: d.memory_type,
      content: d.content,
      confidence: d.confidence,
      source: d.source,
      similarity: d.similarity,
      usedCount: d.used_count,
    }));
  } catch (err) {
    console.warn('[BrandMemory] Error:', err);
    return [];
  }
}

/**
 * Save a new learning to brand memory
 */
export async function saveBrandMemory(
  supabase: any,
  brandTemplateId: string,
  organizationId: string,
  memoryType: string,
  content: string,
  source: string,
  confidence: number = 0.5
): Promise<boolean> {
  try {
    // Generate embedding
    const embeddingSession = new Supabase.ai.Session('gte-small');
    const embedding = await embeddingSession.run(content, { mean_pool: true, normalize: true });

    const { error } = await supabase.from('brand_memory').insert({
      brand_template_id: brandTemplateId,
      organization_id: organizationId,
      memory_type: memoryType,
      content,
      embedding: JSON.stringify(Array.from(embedding)),
      confidence,
      source,
    });

    if (error) {
      console.warn('[BrandMemory] Save failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[BrandMemory] Save error:', err);
    return false;
  }
}

/**
 * Build context string from brand memories for injection into prompts
 */
export function buildBrandMemoryContext(memories: BrandMemoryEntry[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, BrandMemoryEntry[]> = {};
  for (const m of memories) {
    if (!grouped[m.memoryType]) grouped[m.memoryType] = [];
    grouped[m.memoryType].push(m);
  }

  const sections: string[] = ['\n## 🧠 Brand Memory (Learned Preferences)'];
  
  for (const [type, entries] of Object.entries(grouped)) {
    const typeLabels: Record<string, string> = {
      style_preference: '✍️ Style Preferences',
      audience_insight: '👥 Audience Insights',
      performance_pattern: '📊 Performance Patterns',
      correction: '⚠️ Corrections to Remember',
    };
    
    sections.push(`\n### ${typeLabels[type] || type}`);
    for (const entry of entries.slice(0, 3)) {
      const confidence = Math.round(entry.confidence * 100);
      sections.push(`- ${entry.content} (${confidence}% confidence)`);
    }
  }

  return sections.join('\n');
}
