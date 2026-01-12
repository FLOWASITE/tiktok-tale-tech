// ============================================
// Data Fetchers - Barrel Export
// ============================================

export { generateQueryEmbedding, searchRelevantContent } from "./rag-fetcher.ts";
export { fetchIndustryMemory } from "./industry-fetcher.ts";
export { fetchIndustryGlossary } from "./glossary-fetcher.ts";
// Knowledge Graph Integration - Phase 6
export {
  fetchKnowledgeGraphContext,
  getIndustryRegulations,
  getRelatedIndustries,
  buildKnowledgeGraphPromptSection,
  type KnowledgeNode,
  type KnowledgeEdge,
  type KnowledgeGraphContext,
} from "./knowledge-graph-fetcher.ts";
