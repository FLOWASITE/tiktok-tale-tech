// ============================================
// Governor Node
// Rule-based quality gate + early exit
// No LLM call — pure logic
// ============================================

import { GraphState } from "../graph-state.ts";

export function createGovernorNode() {
  return async function governorNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[GovernorNode] Starting');

    const reviewScore = state.reviewScore ?? 0;
    const reviewConfidence = state.reviewConfidence ?? 0;
    const tokensUsed = state.tokenBudget.used;
    const totalBudget = state.tokenBudget.total;
    const budgetRatio = totalBudget > 0 ? tokensUsed / totalBudget : 0;

    // Rule 1: High quality — early exit
    if (reviewScore >= 90 && reviewConfidence >= 0.85) {
      console.log(`[GovernorNode] Quality met (score=${reviewScore}, confidence=${reviewConfidence}). Early exit.`);
      return {
        status: 'completed',
        exitReason: 'quality_met',
        finalResponse: state.generatedContent || '',
      };
    }

    // Rule 2: Budget exhausted — early exit with warning
    if (budgetRatio > 0.8) {
      console.log(`[GovernorNode] Budget exhausted (${(budgetRatio * 100).toFixed(0)}%). Early exit.`);
      return {
        status: 'completed',
        exitReason: 'budget_exhausted',
        finalResponse: state.generatedContent || '',
      };
    }

    // Rule 3: Low quality — mark for future revision
    if (reviewScore > 0 && reviewScore < 70) {
      console.log(`[GovernorNode] Low quality (score=${reviewScore}). Needs revision.`);
      return {
        exitReason: 'needs_revision',
        finalResponse: state.generatedContent || '',
      };
    }

    // Default: pass through
    console.log('[GovernorNode] Complete. Passing through.');
    return {
      finalResponse: state.generatedContent || '',
    };
  };
}
