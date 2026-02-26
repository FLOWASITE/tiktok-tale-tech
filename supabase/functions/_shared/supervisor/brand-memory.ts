// ============================================
// Brand Memory Stub (Legacy)
// Provides searchBrandMemory and buildBrandMemoryContext
// for backward compatibility with graph nodes and agents.
// ============================================

export interface BrandMemoryEntry {
  id: string;
  memory_type: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Search brand memory entries by brand template and query
 */
export async function searchBrandMemory(
  supabase: any,
  brandTemplateId: string,
  query?: string,
  memoryType?: string,
  limit: number = 5
): Promise<BrandMemoryEntry[]> {
  try {
    let q = supabase
      .from('brand_memories')
      .select('id, memory_type, content, metadata')
      .eq('brand_template_id', brandTemplateId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (memoryType) {
      q = q.eq('memory_type', memoryType);
    }

    const { data, error } = await q;
    if (error) {
      console.warn('[BrandMemory] Search error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[BrandMemory] Search failed:', err);
    return [];
  }
}

/**
 * Build a text context string from brand memory entries
 */
export function buildBrandMemoryContext(memories: BrandMemoryEntry[]): string {
  if (!memories || memories.length === 0) return '';
  return memories
    .map(m => `[${m.memory_type}] ${m.content}`)
    .join('\n');
}

/**
 * Save a brand memory entry
 */
export async function saveBrandMemory(
  supabase: any,
  brandTemplateId: string,
  memoryType: string,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('brand_memories')
      .insert({
        brand_template_id: brandTemplateId,
        memory_type: memoryType,
        content,
        metadata,
      });
    if (error) {
      console.warn('[BrandMemory] Save error:', error.message);
    }
  } catch (err) {
    console.warn('[BrandMemory] Save failed:', err);
  }
}
