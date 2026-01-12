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
  personas: KnowledgeNode[];
  // Enhanced flattened context for prompt injection
  complianceNotes: string[];
  industryContext: string;
  termDefinitions: string[];
  regulationSummaries: string[];
  personaInsights: string[];
  trendAnalysis: string[];
  crossIndustryContext: string[];
  // Token budget tracking
  estimatedTokens: number;
}

// Empty context for fallback
const EMPTY_CONTEXT: KnowledgeGraphContext = {
  relatedIndustries: [],
  regulations: [],
  relevantTerms: [],
  concepts: [],
  trends: [],
  personas: [],
  complianceNotes: [],
  industryContext: '',
  termDefinitions: [],
  regulationSummaries: [],
  personaInsights: [],
  trendAnalysis: [],
  crossIndustryContext: [],
  estimatedTokens: 0,
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
    const personas = uniqueNodes.filter(n => n.node_type === 'persona');

    // Step 5: Build enhanced flattened context for prompt injection
    const complianceNotes = regulations.map(r => 
      r.metadata?.['summary'] as string || r.description || r.name
    ).filter(Boolean);
    
    const industryContext = buildIndustryContextString(primaryIndustry, relatedIndustries);
    
    const termDefinitions = relevantTerms.map(t => 
      `**${t.name}**: ${t.description || 'N/A'}`
    );

    // Enhanced: Detailed regulation summaries with action items
    const regulationSummaries = regulations.map(r => {
      const summary = r.metadata?.['summary'] as string || r.description || '';
      const actionItems = r.metadata?.['action_items'] as string[] || [];
      const severity = r.metadata?.['severity'] as string || 'medium';
      return `[${severity.toUpperCase()}] ${r.name}: ${summary}${actionItems.length > 0 ? ` | Actions: ${actionItems.join('; ')}` : ''}`;
    }).filter(Boolean);

    // Enhanced: Persona insights for audience targeting
    const personaInsights = personas.map(p => {
      const painPoints = p.metadata?.['pain_points'] as string[] || [];
      const motivations = p.metadata?.['motivations'] as string[] || [];
      return `**${p.name}**: ${p.description || ''}${painPoints.length > 0 ? ` | Pain points: ${painPoints.join(', ')}` : ''}${motivations.length > 0 ? ` | Motivations: ${motivations.join(', ')}` : ''}`;
    }).filter(Boolean);

    // Enhanced: Trend analysis with impact assessment
    const trendAnalysis = trends.map(t => {
      const impact = t.metadata?.['impact'] as string || '';
      const timeframe = t.metadata?.['timeframe'] as string || '';
      return `${t.name}: ${t.description || ''}${impact ? ` [Impact: ${impact}]` : ''}${timeframe ? ` [${timeframe}]` : ''}`;
    }).filter(Boolean);

    // Enhanced: Cross-industry context for broader perspective
    const crossIndustryContext = relatedIndustries.slice(0, 3).map(ind => {
      const relevance = ind.metadata?.['relevance_note'] as string || '';
      return `${ind.name}: ${ind.description || relevance || 'Related industry'}`;
    }).filter(Boolean);

    // Estimate token count for budget management
    const contextText = [
      industryContext,
      ...complianceNotes,
      ...termDefinitions,
      ...regulationSummaries,
      ...personaInsights,
      ...trendAnalysis,
      ...crossIndustryContext,
    ].join(' ');
    const estimatedTokens = Math.ceil(contextText.length / 4); // ~4 chars per token

    return {
      primaryIndustry,
      relatedIndustries: relatedIndustries.slice(0, 5),
      regulations: regulations.slice(0, 8),
      relevantTerms: relevantTerms.slice(0, 15),
      concepts: concepts.slice(0, 5),
      trends: trends.slice(0, 5),
      personas: personas.slice(0, 3),
      complianceNotes,
      industryContext,
      termDefinitions,
      regulationSummaries,
      personaInsights,
      trendAnalysis,
      crossIndustryContext,
      estimatedTokens,
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
 * Enhanced with token budget management and priority-based inclusion
 */
export function buildKnowledgeGraphPromptSection(
  context: KnowledgeGraphContext,
  options: {
    maxTokens?: number;
    includeRegulations?: boolean;
    includeTerms?: boolean;
    includeTrends?: boolean;
    includePersonas?: boolean;
    includeCrossIndustry?: boolean;
    language?: 'vi' | 'en';
  } = {}
): string {
  const {
    maxTokens = 2000,
    includeRegulations = true,
    includeTerms = true,
    includeTrends = true,
    includePersonas = true,
    includeCrossIndustry = true,
    language = 'vi',
  } = options;

  const sections: string[] = [];
  let currentTokens = 0;
  
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const canAdd = (text: string) => currentTokens + estimateTokens(text) <= maxTokens;
  
  const labels = language === 'vi' ? {
    industry: '## 🏭 BỐI CẢNH NGÀNH',
    regulations: '## ⚖️ QUY ĐỊNH TUÂN THỦ',
    terms: '## 📚 THUẬT NGỮ CHUYÊN NGÀNH',
    trends: '## 📈 XU HƯỚNG THỊ TRƯỜNG',
    personas: '## 👥 ĐỐI TƯỢNG MỤC TIÊU',
    crossIndustry: '## 🔗 NGÀNH LIÊN QUAN',
  } : {
    industry: '## 🏭 INDUSTRY CONTEXT',
    regulations: '## ⚖️ COMPLIANCE REQUIREMENTS',
    terms: '## 📚 INDUSTRY TERMINOLOGY',
    trends: '## 📈 MARKET TRENDS',
    personas: '## 👥 TARGET AUDIENCE',
    crossIndustry: '## 🔗 RELATED INDUSTRIES',
  };
  
  // Priority 1: Industry Context (always include)
  if (context.industryContext) {
    const section = `${labels.industry}\n${context.industryContext}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  // Priority 2: Regulations (critical for compliance)
  if (includeRegulations && context.regulationSummaries.length > 0) {
    const items = context.regulationSummaries.slice(0, 5);
    const section = `${labels.regulations}\n${items.map(n => `- ${n}`).join('\n')}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  // Priority 3: Term Definitions (important for accuracy)
  if (includeTerms && context.termDefinitions.length > 0) {
    const items = context.termDefinitions.slice(0, 10);
    const section = `${labels.terms}\n${items.map(t => `- ${t}`).join('\n')}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  // Priority 4: Persona Insights (for targeting)
  if (includePersonas && context.personaInsights.length > 0) {
    const items = context.personaInsights.slice(0, 3);
    const section = `${labels.personas}\n${items.map(p => `- ${p}`).join('\n')}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  // Priority 5: Trends (for relevance)
  if (includeTrends && context.trendAnalysis.length > 0) {
    const items = context.trendAnalysis.slice(0, 3);
    const section = `${labels.trends}\n${items.map(t => `- ${t}`).join('\n')}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  // Priority 6: Cross-Industry Context (for broader perspective)
  if (includeCrossIndustry && context.crossIndustryContext.length > 0) {
    const items = context.crossIndustryContext.slice(0, 3);
    const section = `${labels.crossIndustry}\n${items.map(c => `- ${c}`).join('\n')}`;
    if (canAdd(section)) {
      sections.push(section);
      currentTokens += estimateTokens(section);
    }
  }
  
  return sections.join('\n\n');
}

/**
 * Build a compact context string for token-constrained scenarios
 */
export function buildCompactKnowledgeContext(context: KnowledgeGraphContext): string {
  const parts: string[] = [];
  
  if (context.primaryIndustry) {
    parts.push(`Industry: ${context.primaryIndustry.name}`);
  }
  
  if (context.regulations.length > 0) {
    parts.push(`Key regulations: ${context.regulations.slice(0, 3).map(r => r.name).join(', ')}`);
  }
  
  if (context.relevantTerms.length > 0) {
    parts.push(`Terms: ${context.relevantTerms.slice(0, 5).map(t => t.name).join(', ')}`);
  }
  
  return parts.join(' | ');
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
