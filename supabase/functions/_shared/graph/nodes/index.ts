// ============================================
// Node Registry
// Re-exports + createNodeRegistry() factory
// ============================================

import { NodeConfig } from "../graph-engine.ts";
import { createResearchNode } from "./research-node.ts";
import { createStrategyNode } from "./strategy-node.ts";
import { createContentNode } from "./content-node.ts";
import { createReviewerNode } from "./reviewer-node.ts";
import { createImageNode } from "./image-node.ts";
import { createGovernorNode } from "./governor-node.ts";
import { createRevisionController } from "./revision-controller.ts";

export { createResearchNode } from "./research-node.ts";
export { createStrategyNode } from "./strategy-node.ts";
export { createContentNode } from "./content-node.ts";
export { createReviewerNode } from "./reviewer-node.ts";
export { createBrandMemoryNode } from "./brand-memory-node.ts";
export { createImageNode } from "./image-node.ts";
export { createComplianceNode } from "./compliance-node.ts";
export { createGovernorNode } from "./governor-node.ts";
export { createRevisionController } from "./revision-controller.ts";

// ---- Shared execution context ----

export interface NodeExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  complianceRules?: string[];
  /** Blackboard retriever for semantic context (v2) */
  retriever?: any;
}

// ---- Factory ----

/**
 * Create a Map of all 6 node configs, each bound to the given execution context.
 * Ready to pass to `compileGraphFromPlan()` or `runOrchestrator()`.
 */
export function createNodeRegistry(context: NodeExecutionContext): Map<string, NodeConfig> {
  const registry = new Map<string, NodeConfig>();

  registry.set('research', {
    name: 'research',
    fn: createResearchNode(context),
    estimatedTokens: 3000,
  });

  registry.set('strategy', {
    name: 'strategy',
    fn: createStrategyNode(context),
    estimatedTokens: 2500,
  });

  registry.set('content', {
    name: 'content',
    fn: createContentNode(context),
    critical: true,
    estimatedTokens: 4000,
  });

  registry.set('reviewer', {
    name: 'reviewer',
    fn: createReviewerNode(context),
    estimatedTokens: 2000,
  });

  registry.set('image', {
    name: 'image',
    fn: createImageNode(context),
    estimatedTokens: 1500,
  });

  registry.set('governor', {
    name: 'governor',
    fn: createGovernorNode({
      organizationId: context.organizationId,
      brandName: context.brandName,
      industry: context.industry,
    }),
    estimatedTokens: 2000, // Revision controller may call LLM
  });

  return registry;
}
