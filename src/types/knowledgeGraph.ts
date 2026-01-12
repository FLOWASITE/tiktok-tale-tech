// ============================================
// Industry Park Knowledge Graph Types
// TypeScript definitions for frontend usage
// ============================================

/**
 * Node types in the knowledge graph
 */
export type KnowledgeNodeType = 
  | 'industry' 
  | 'regulation' 
  | 'term' 
  | 'concept' 
  | 'persona' 
  | 'jurisdiction';

/**
 * Edge types defining relationships between nodes
 */
export type KnowledgeEdgeType =
  | 'related_to'        // General relationship
  | 'parent_of'         // Hierarchical (industry → sub-industry)
  | 'regulated_by'      // Subject to regulation
  | 'uses_term'         // Uses terminology
  | 'shares_audience'   // Same target audience
  | 'competes_with'     // Direct competition
  | 'requires_compliance' // Must comply with
  | 'derived_from'      // Derived/inherited from
  | 'applies_to';       // Regulation applies to jurisdiction

/**
 * Propagation status for regulatory changes
 */
export type PropagationStatus = 
  | 'pending' 
  | 'analyzing' 
  | 'ready' 
  | 'applied' 
  | 'reviewed' 
  | 'rejected';

/**
 * Priority levels for propagation
 */
export type PropagationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Change types for regulation propagation
 */
export type RegulationChangeType = 'new' | 'updated' | 'deprecated' | 'enforcement_change';

/**
 * Multilingual display name/description
 */
export interface MultilingualText {
  vi?: string;
  en?: string;
  [key: string]: string | undefined;
}

/**
 * Knowledge Graph Node
 */
export interface KnowledgeNode {
  id: string;
  global_pack_id: string | null;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: MultilingualText;
  description: MultilingualText;
  properties: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Knowledge Graph Edge
 */
export interface KnowledgeEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: KnowledgeEdgeType;
  weight: number;
  properties: Record<string, unknown>;
  is_bidirectional: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Regulation Propagation Log Entry
 */
export interface RegulationPropagation {
  id: string;
  source_node_id: string | null;
  affected_pack_id: string;
  change_type: RegulationChangeType;
  change_summary: string | null;
  impact_analysis: ImpactAnalysis;
  affected_rules: AffectedRule[];
  propagation_status: PropagationStatus;
  priority: PropagationPriority;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  propagated_at: string;
  created_at: string;
}

/**
 * AI-generated impact analysis
 */
export interface ImpactAnalysis {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affected_content_types?: string[];
  recommended_actions?: string[];
  estimated_effort?: string;
  summary?: string;
}

/**
 * Affected compliance rule
 */
export interface AffectedRule {
  rule_id?: string;
  rule_text: string;
  impact_type: 'modify' | 'remove' | 'add';
  suggested_change?: string;
}

// ============================================
// Function Return Types
// ============================================

/**
 * Result from semantic search
 */
export interface SemanticSearchResult {
  node_id: string;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: MultilingualText;
  properties: Record<string, unknown>;
  similarity: number;
}

/**
 * Result from get_connected_nodes
 */
export interface ConnectedNode {
  node_id: string;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: MultilingualText;
  edge_type: KnowledgeEdgeType;
  edge_weight: number;
  direction: 'outgoing' | 'incoming';
}

/**
 * Result from graph traversal
 */
export interface TraversalResult {
  node_id: string;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: MultilingualText;
  depth: number;
  path_weight: number;
  path: string[];
}

/**
 * Result from get_related_industries
 */
export interface RelatedIndustry {
  industry_pack_id: string;
  industry_code: string;
  industry_name: MultilingualText;
  relationship_type: KnowledgeEdgeType;
  relationship_weight: number;
}

/**
 * Result from get_industry_regulations
 */
export interface IndustryRegulation {
  regulation_node_id: string;
  regulation_key: string;
  regulation_name: MultilingualText;
  regulation_properties: Record<string, unknown>;
  relationship_type: KnowledgeEdgeType;
  is_inherited: boolean;
}

// ============================================
// Input Types for Hooks
// ============================================

/**
 * Options for semantic search
 */
export interface SemanticSearchOptions {
  query: string;
  nodeTypes?: KnowledgeNodeType[];
  globalPackId?: string;
  threshold?: number;
  limit?: number;
}

/**
 * Options for graph traversal
 */
export interface TraversalOptions {
  startNodeId: string;
  edgeTypes?: KnowledgeEdgeType[];
  maxDepth?: number;
  minWeight?: number;
}

/**
 * Options for connected nodes query
 */
export interface ConnectedNodesOptions {
  nodeId: string;
  edgeTypes?: KnowledgeEdgeType[];
  direction?: 'outgoing' | 'incoming' | 'both';
}

/**
 * Options for creating a new node
 */
export interface CreateNodeInput {
  global_pack_id?: string;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: MultilingualText;
  description?: MultilingualText;
  properties?: Record<string, unknown>;
}

/**
 * Options for creating a new edge
 */
export interface CreateEdgeInput {
  source_node_id: string;
  target_node_id: string;
  edge_type: KnowledgeEdgeType;
  weight?: number;
  properties?: Record<string, unknown>;
  is_bidirectional?: boolean;
}

/**
 * Options for updating propagation status
 */
export interface UpdatePropagationInput {
  propagation_id: string;
  status: PropagationStatus;
  review_notes?: string;
}

// ============================================
// Graph Visualization Types
// ============================================

/**
 * Node for visualization (D3/vis.js)
 */
export interface GraphVisNode {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  group: string;
  properties?: Record<string, unknown>;
}

/**
 * Edge for visualization
 */
export interface GraphVisEdge {
  id: string;
  source: string;
  target: string;
  label: KnowledgeEdgeType;
  weight: number;
  dashed?: boolean;
}

/**
 * Complete graph data for visualization
 */
export interface GraphData {
  nodes: GraphVisNode[];
  edges: GraphVisEdge[];
}

// ============================================
// Constants
// ============================================

export const NODE_TYPE_LABELS: Record<KnowledgeNodeType, { vi: string; en: string }> = {
  industry: { vi: 'Ngành', en: 'Industry' },
  regulation: { vi: 'Quy định', en: 'Regulation' },
  term: { vi: 'Thuật ngữ', en: 'Term' },
  concept: { vi: 'Khái niệm', en: 'Concept' },
  persona: { vi: 'Persona', en: 'Persona' },
  jurisdiction: { vi: 'Khu vực pháp lý', en: 'Jurisdiction' },
};

export const EDGE_TYPE_LABELS: Record<KnowledgeEdgeType, { vi: string; en: string }> = {
  related_to: { vi: 'Liên quan đến', en: 'Related to' },
  parent_of: { vi: 'Là cha của', en: 'Parent of' },
  regulated_by: { vi: 'Được điều chỉnh bởi', en: 'Regulated by' },
  uses_term: { vi: 'Sử dụng thuật ngữ', en: 'Uses term' },
  shares_audience: { vi: 'Cùng đối tượng', en: 'Shares audience' },
  competes_with: { vi: 'Cạnh tranh với', en: 'Competes with' },
  requires_compliance: { vi: 'Yêu cầu tuân thủ', en: 'Requires compliance' },
  derived_from: { vi: 'Kế thừa từ', en: 'Derived from' },
  applies_to: { vi: 'Áp dụng cho', en: 'Applies to' },
};

export const NODE_TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  industry: '#3B82F6',     // Blue
  regulation: '#EF4444',   // Red
  term: '#10B981',         // Green
  concept: '#8B5CF6',      // Purple
  persona: '#F59E0B',      // Amber
  jurisdiction: '#6366F1', // Indigo
};

export const PROPAGATION_STATUS_LABELS: Record<PropagationStatus, { vi: string; en: string; color: string }> = {
  pending: { vi: 'Chờ xử lý', en: 'Pending', color: 'yellow' },
  analyzing: { vi: 'Đang phân tích', en: 'Analyzing', color: 'blue' },
  ready: { vi: 'Sẵn sàng', en: 'Ready', color: 'green' },
  applied: { vi: 'Đã áp dụng', en: 'Applied', color: 'green' },
  reviewed: { vi: 'Đã xem xét', en: 'Reviewed', color: 'gray' },
  rejected: { vi: 'Từ chối', en: 'Rejected', color: 'red' },
};
