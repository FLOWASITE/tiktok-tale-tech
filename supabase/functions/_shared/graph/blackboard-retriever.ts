// ============================================
// Blackboard Retriever v2
// Unified vector-based context retrieval
// Replaces buildStateContext() for semantic search
// ============================================

import { GraphState } from "./graph-state.ts";

// ---- Types ----

export interface BlackboardContext {
  sessionId: string;
  brandTemplateId?: string;
  organizationId?: string;
}

export interface RetrievedEntry {
  id: string;
  contentType: string;
  contentText: string;
  nodeName: string | null;
  sessionId: string | null;
  similarity: number;
  priorityScore: number;
  metadata: Record<string, any>;
  createdAt: string;
}

// ---- BlackboardRetriever ----

export class BlackboardRetriever {
  private supabase: any;
  private ctx: BlackboardContext;

  constructor(supabase: any, ctx: BlackboardContext) {
    this.supabase = supabase;
    this.ctx = ctx;
  }

  /**
   * Store a node's output as an embedding in content_embeddings.
   * Uses Supabase.ai gte-small (384-dim) — free, no API key needed.
   */
  async store(
    content: string,
    nodeName: string,
    contentType: string = 'blackboard',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!content || content.length < 10) return;

    try {
      // Truncate to avoid oversized embeddings
      const truncated = content.slice(0, 4000);

      // Generate embedding via gte-small (384-dim)
      const embedding = await this.generateEmbedding(truncated);
      if (!embedding) {
        console.warn(`[BlackboardRetriever] Failed to generate embedding for ${nodeName}, storing without vector`);
      }

      const { error } = await this.supabase.from('content_embeddings').insert({
        content_type: contentType,
        content_text: truncated,
        node_name: nodeName,
        session_id: this.ctx.sessionId,
        brand_template_id: this.ctx.brandTemplateId || null,
        organization_id: this.ctx.organizationId || null,
        embedding: embedding,
        metadata: {
          ...metadata,
          stored_by: 'blackboard_v2',
          node_name: nodeName,
        },
      });

      if (error) {
        console.error(`[BlackboardRetriever] Store failed for ${nodeName}:`, error.message);
      } else {
        console.log(`[BlackboardRetriever] Stored ${nodeName} output (${truncated.length} chars)`);
      }
    } catch (err) {
      console.error(`[BlackboardRetriever] Store error:`, err);
    }
  }

  /**
   * Retrieve relevant context via vector similarity search.
   * Uses match_blackboard_context RPC for hybrid priority scoring.
   */
  async retrieve(
    query: string,
    nodeTypes?: string[],
    limit: number = 5,
    threshold: number = 0.65
  ): Promise<RetrievedEntry[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) {
        console.warn('[BlackboardRetriever] No embedding generated for query, returning empty');
        return [];
      }

      const { data, error } = await this.supabase.rpc('match_blackboard_context', {
        query_embedding: embedding,
        match_session_id: this.ctx.sessionId,
        match_brand_id: this.ctx.brandTemplateId || null,
        match_node_types: nodeTypes || null,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) {
        console.error('[BlackboardRetriever] Retrieve RPC error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        contentType: row.content_type,
        contentText: row.content_text,
        nodeName: row.node_name,
        sessionId: row.session_id,
        similarity: row.similarity,
        priorityScore: row.priority_score,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('[BlackboardRetriever] Retrieve error:', err);
      return [];
    }
  }

  /**
   * Retrieve all entries for a specific session (hierarchical view).
   * Simple query — replaces graph traversal for session history.
   */
  async retrieveHierarchical(sessionId?: string): Promise<RetrievedEntry[]> {
    try {
      const targetSession = sessionId || this.ctx.sessionId;

      const { data, error } = await this.supabase
        .from('content_embeddings')
        .select('id, content_type, content_text, node_name, session_id, metadata, created_at')
        .eq('session_id', targetSession)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[BlackboardRetriever] Hierarchical query error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        contentType: row.content_type,
        contentText: row.content_text,
        nodeName: row.node_name,
        sessionId: row.session_id,
        similarity: 1.0,
        priorityScore: 1.0,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('[BlackboardRetriever] Hierarchical error:', err);
      return [];
    }
  }

  /**
   * Cross-session memory: find relevant context from past sessions for same brand.
   * Enables long-term brand memory across workflows.
   */
  async retrieveCrossSession(
    query: string,
    limit: number = 3,
    threshold: number = 0.7
  ): Promise<RetrievedEntry[]> {
    if (!this.ctx.brandTemplateId) return [];

    try {
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return [];

      // Search across all sessions for this brand, excluding current session
      const { data, error } = await this.supabase.rpc('match_blackboard_context', {
        query_embedding: embedding,
        match_session_id: null, // Don't prioritize any session
        match_brand_id: this.ctx.brandTemplateId,
        match_node_types: null,
        match_threshold: threshold,
        match_count: limit + 5, // Fetch extra to filter out current session
      });

      if (error) {
        console.error('[BlackboardRetriever] Cross-session RPC error:', error.message);
        return [];
      }

      // Filter out current session entries
      const filtered = (data || [])
        .filter((row: any) => row.session_id !== this.ctx.sessionId)
        .slice(0, limit);

      return filtered.map((row: any) => ({
        id: row.id,
        contentType: row.content_type,
        contentText: row.content_text,
        nodeName: row.node_name,
        sessionId: row.session_id,
        similarity: row.similarity,
        priorityScore: row.priority_score,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('[BlackboardRetriever] Cross-session error:', err);
      return [];
    }
  }

  // ---- Private Helpers ----

  /**
   * Generate embedding via Supabase.ai gte-small (384-dim).
   * Free, built-in, no API key needed.
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // @ts-ignore - Supabase.ai is available in Edge Functions
      const session = new Supabase.ai.Session('gte-small');
      const result = await session.run(text, { mean_pool: true, normalize: true });

      // Convert Float32Array to regular array
      if (result instanceof Float32Array) {
        return Array.from(result);
      }
      if (Array.isArray(result)) {
        return result;
      }

      console.warn('[BlackboardRetriever] Unexpected embedding result type');
      return null;
    } catch (err) {
      console.error('[BlackboardRetriever] Embedding generation error:', err);
      return null;
    }
  }
}

// ---- Formatting Helpers ----

/**
 * Format retrieved entries into a context string for LLM prompts.
 * Replaces buildStateContext() output format.
 */
export function formatRetrievedContext(entries: RetrievedEntry[]): string {
  if (!entries || entries.length === 0) return '';

  const sections = entries.map((entry, i) => {
    const source = entry.nodeName ? `[${entry.nodeName}]` : `[${entry.contentType}]`;
    const sim = `(relevance: ${(entry.similarity * 100).toFixed(0)}%)`;
    const text = entry.contentText.slice(0, 1500);
    return `${i + 1}. ${source} ${sim}\n${text}`;
  });

  return `\n## 📋 Relevant Context (Blackboard v2)\n${sections.join('\n\n')}`;
}

/**
 * Extract storable text from a node's state update.
 * Determines what content to embed for each node type.
 */
export function extractStorableContent(
  nodeName: string,
  update: Partial<GraphState>
): { content: string; contentType: string } | null {
  switch (nodeName) {
    case 'research': {
      if (!update.researchData) return null;
      const summary = typeof update.researchData === 'string'
        ? update.researchData
        : (update.researchData?.summary || JSON.stringify(update.researchData));
      const topic = update.bestTopic ? `\nBest Topic: ${update.bestTopic}` : '';
      return { content: summary + topic, contentType: 'research_output' };
    }
    case 'strategy': {
      if (!update.contentPlan) return null;
      const plan = typeof update.contentPlan === 'string'
        ? update.contentPlan
        : JSON.stringify(update.contentPlan);
      return { content: plan, contentType: 'plan' };
    }
    case 'content': {
      if (!update.generatedContent) return null;
      return { content: update.generatedContent, contentType: 'generated_content' };
    }
    case 'reviewer': {
      if (!update.reviewResult) return null;
      const review = typeof update.reviewResult === 'string'
        ? update.reviewResult
        : JSON.stringify(update.reviewResult);
      return { content: review, contentType: 'review' };
    }
    case 'compliance': {
      if (!update.complianceResult) return null;
      return {
        content: JSON.stringify(update.complianceResult),
        contentType: 'compliance_check',
      };
    }
    case 'image': {
      if (!update.generatedImage) return null;
      const img = update.generatedImage;
      const meta = [
        img.prompt && `Prompt: ${img.prompt}`,
        img.aspect_ratio && `Aspect: ${img.aspect_ratio}`,
        img.style && `Style: ${img.style}`,
        img.channel && `Channel: ${img.channel}`,
        update.metadata?.imagePrompt && `Prompt: ${update.metadata.imagePrompt}`,
        update.metadata?.imageAspectRatio && `Aspect: ${update.metadata.imageAspectRatio}`,
      ].filter(Boolean).join('\n');
      const content = meta || (typeof img === 'string' ? img : JSON.stringify(img));
      return { content, contentType: 'image_generation' };
    }
    default:
      return null;
  }
}
