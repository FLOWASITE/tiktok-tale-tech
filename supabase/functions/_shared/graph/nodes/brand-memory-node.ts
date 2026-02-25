// ============================================
// Brand Memory Node
// Lightweight — direct DB call, no LLM needed
// ============================================

import { GraphState } from "../graph-state.ts";
import { searchBrandMemory, buildBrandMemoryContext } from "../../supervisor/brand-memory.ts";

interface BrandMemoryNodeContext {
  supabase: any;
  brandTemplateId?: string;
}

export function createBrandMemoryNode(ctx: BrandMemoryNodeContext) {
  return async function brandMemoryNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[BrandMemoryNode] Starting');

    if (!ctx.brandTemplateId) {
      console.warn('[BrandMemoryNode] No brandTemplateId, skipping');
      return { brandMemoryContext: '' };
    }

    try {
      const memories = await searchBrandMemory(
        ctx.supabase,
        ctx.brandTemplateId,
        state.userMessage,
        undefined,
        5
      );

      const brandMemoryContext = buildBrandMemoryContext(memories);
      console.log(`[BrandMemoryNode] Found ${memories.length} memories`);
      return { brandMemoryContext };
    } catch (err) {
      console.warn('[BrandMemoryNode] Error:', err);
      return { brandMemoryContext: '' };
    }
  };
}
