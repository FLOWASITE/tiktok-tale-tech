// ============================================
// Knowledge Graph Context Fetcher
// ============================================
// Provides context from the Industry Park Knowledge Graph
// for enhanced AI content generation

import { generateQueryEmbedding } from "./rag-fetcher.ts";

// Types for Knowledge Graph
export interface KnowledgeNode {
  id: string;
  node_type: 'industry' | 'regulation' | 'term' | 'concept' | 'persona' | 'trend';
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  source_id?: string;
  source_table?: string;
}

export interface KnowledgeEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: 'related_to' | 'regulated_by' | 'parent_of' | 'synonym_of' | 'applies_to' | 'derived_from';
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphContext {
  primaryIndustry?: KnowledgeNode;
  relatedIndustries: KnowledgeNode[];
  regulations: KnowledgeNode[];
  relevantTerms: KnowledgeNode[];
  concepts: KnowledgeNode[];
  trends: KnowledgeNode[];
  // Flattened for prompt injection
  complianceNotes: string[];
  industryContext: string;
  termDefinitions: string[];
}

// Empty context for fallback
const EMPTY_CONTEXT: KnowledgeGraphContext = {
  relatedIndustries: [],
  regulations: [],
  relevantTerms: [],
  concepts: [],
  trends: [],
  complianceNotes: [],
  industryContext: '',
  termDefinitions: [],
};

/**
 * Fetch Knowledge Graph context for content generation
 * Uses semantic search to find relevant nodes based on topic
 */
export async function fetchKnowledgeGraphContext(
  supabase: any,
  options: {
    topic: string;
    industryTemplateId?: string;
    organizationId?: string;
    limit?: number;
  }
): Promise<KnowledgeGraphContext> {
  const { topic, industryTemplateId, organizationId, limit = 10 } = options;
  
  try {
    // Step 1: If industryTemplateId provided, find the primary industry node
    let primaryIndustry: KnowledgeNode | undefined;
    if (industryTemplateId) {
      const { data: industryNode } = await supabase
        .from('industry_knowledge_nodes')
        .select('*')
        .eq('source_id', industryTemplateId)
        .eq('node_type', 'industry')
        .single();
      
      if (industryNode) {
        primaryIndustry = mapToKnowledgeNode(industryNode);
      }
    }

    // Step 2: Semantic search for relevant nodes based on topic
    const embedding = await generateQueryEmbedding(topic);
    let semanticResults: KnowledgeNode[] = [];
    
    if (embedding) {
      const embeddingStr = `[${embedding.join(',')}]`;
      
      const { data: searchResults, error } = await supabase.rpc('search_knowledge_nodes', {
        query_embedding: embeddingStr,
        match_count: limit,
        similarity_threshold: 0.6,
      });
      
      if (!error && searchResults) {
        semanticResults = searchResults.map((r: any) => mapToKnowledgeNode(r));
      }
    }

    // Step 3: If primary industry exists, get connected nodes
    let connectedNodes: KnowledgeNode[] = [];
    if (primaryIndustry) {
      const { data: connected, error } = await supabase.rpc('get_connected_nodes', {
        p_node_id: primaryIndustry.id,
        p_relationship_types: ['regulated_by', 'related_to', 'applies_to'],
        p_max_depth: 2,
      });
      
      if (!error && connected) {
        connectedNodes = connected.map((r: any) => mapToKnowledgeNode(r));
      }
    }

    // Step 4: Categorize nodes by type
    const allNodes = [...semanticResults, ...connectedNodes];
    const uniqueNodes = deduplicateNodes(allNodes);
    
    const relatedIndustries = uniqueNodes.filter(n => n.node_type === 'industry' && n.id !== primaryIndustry?.id);
    const regulations = uniqueNodes.filter(n => n.node_type === 'regulation');
    const relevantTerms = uniqueNodes.filter(n => n.node_type === 'term');
    const concepts = uniqueNodes.filter(n => n.node_type === 'concept');
    const trends = uniqueNodes.filter(n => n.node_type === 'trend');

    // Step 5: Build flattened context for prompt injection
    const complianceNotes = regulations.map(r => 
      r.metadata?.['summary'] as string || r.description || r.name
    ).filter(Boolean);
    
    const industryContext = buildIndustryContextString(primaryIndustry, relatedIndustries);
    
    const termDefinitions = relevantTerms.map(t => 
      `${t.name}: ${t.description || 'N/A'}`
    );

    return {
      primaryIndustry,
      relatedIndustries: relatedIndustries.slice(0, 5),
      regulations: regulations.slice(0, 5),
      relevantTerms: relevantTerms.slice(0, 10),
      concepts: concepts.slice(0, 5),
      trends: trends.slice(0, 5),
      complianceNotes,
      industryContext,
      termDefinitions,
    };
  } catch (error) {
    console.error('Error fetching Knowledge Graph context:', error);
    return EMPTY_CONTEXT;
  }
}

/**
 * Get regulations that apply to a specific industry
 */
export async function getIndustryRegulations(
  supabase: any,
  industryNodeId: string
): Promise<KnowledgeNode[]> {
  try {
    const { data, error } = await supabase.rpc('get_industry_regulations', {
      p_industry_node_id: industryNodeId,
    });
    
    if (error) {
      console.error('Error fetching industry regulations:', error);
      return [];
    }
    
    return (data || []).map((r: any) => mapToKnowledgeNode(r));
  } catch (error) {
    console.error('Error in getIndustryRegulations:', error);
    return [];
  }
}

/**
 * Get related industries for cross-reference
 */
export async function getRelatedIndustries(
  supabase: any,
  industryNodeId: string,
  limit: number = 5
): Promise<KnowledgeNode[]> {
  try {
    const { data, error } = await supabase.rpc('get_related_industries', {
      p_industry_node_id: industryNodeId,
      p_limit: limit,
    });
    
    if (error) {
      console.error('Error fetching related industries:', error);
      return [];
    }
    
    return (data || []).map((r: any) => mapToKnowledgeNode(r));
  } catch (error) {
    console.error('Error in getRelatedIndustries:', error);
    return [];
  }
}

/**
 * Build prompt section from Knowledge Graph context
 * Used to inject graph-derived context into AI prompts
 */
export function buildKnowledgeGraphPromptSection(context: KnowledgeGraphContext): string {
  const sections: string[] = [];
  
  // Industry Context
  if (context.industryContext) {
    sections.push(`## BỐI CẢNH NGÀNH\n${context.industryContext}`);
  }
  
  // Compliance Notes
  if (context.complianceNotes.length > 0) {
    sections.push(
      `## QUY ĐỊNH TUÂN THỦ\n` +
      context.complianceNotes.map(n => `- ${n}`).join('\n')
    );
  }
  
  // Term Definitions
  if (context.termDefinitions.length > 0) {
    sections.push(
      `## THUẬT NGỮ LIÊN QUAN\n` +
      context.termDefinitions.map(t => `- ${t}`).join('\n')
    );
  }
  
  // Trends
  if (context.trends.length > 0) {
    sections.push(
      `## XU HƯỚNG HIỆN TẠI\n` +
      context.trends.map(t => `- ${t.name}: ${t.description || ''}`).join('\n')
    );
  }
  
  return sections.join('\n\n');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapToKnowledgeNode(raw: any): KnowledgeNode {
  return {
    id: raw.id,
    node_type: raw.node_type,
    name: raw.name,
    description: raw.description,
    metadata: raw.metadata,
    source_id: raw.source_id,
    source_table: raw.source_table,
  };
}

function deduplicateNodes(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const seen = new Set<string>();
  return nodes.filter(node => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function buildIndustryContextString(
  primary?: KnowledgeNode,
  related: KnowledgeNode[] = []
): string {
  const parts: string[] = [];
  
  if (primary) {
    parts.push(`Ngành chính: ${primary.name}`);
    if (primary.description) {
      parts.push(primary.description);
    }
  }
  
  if (related.length > 0) {
    parts.push(`Ngành liên quan: ${related.map(r => r.name).join(', ')}`);
  }
  
  return parts.join('\n');
}
