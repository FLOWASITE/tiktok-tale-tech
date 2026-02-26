// ============================================
// Governor Node
// Rule-based quality gate + revision orchestration
// No LLM call — pure logic + Revision Controller
// ============================================

import { GraphState } from "../graph-state.ts";
import { createRevisionController, MAX_REVISION_ROUNDS, type RevisionMode } from "./revision-controller.ts";

interface GovernorNodeContext {
  organizationId?: string;
  brandName?: string;
  industry?: string;
}

export function createGovernorNode(ctx: GovernorNodeContext = {}) {
  const revisionController = createRevisionController({
    organizationId: ctx.organizationId,
    brandName: ctx.brandName,
    industry: ctx.industry,
  });

  return async function governorNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[GovernorNode] Starting');

    const reviewScore = state.reviewScore ?? 0;
    const reviewConfidence = state.reviewConfidence ?? 0;
    const tokensUsed = state.tokenBudget.used;
    const totalBudget = state.tokenBudget.total;
    // Use reserved revision budget if available (Sprint 6E)
    const revisionReserve = (state.metadata?.revisionBudgetReserve as number) || 0;
    const effectiveBudget = revisionReserve > 0 ? totalBudget + revisionReserve : totalBudget;
    const budgetRatio = effectiveBudget > 0 ? tokensUsed / effectiveBudget : 0;
    const revisionRound = (state.metadata?.revisionRound as number) || 0;

    // Rule 1: High quality — early exit
    if (reviewScore >= 90 && reviewConfidence >= 0.85) {
      console.log(`[GovernorNode] Quality met (score=${reviewScore}, confidence=${reviewConfidence}). Early exit.`);
      return {
        status: 'completed',
        exitReason: 'quality_met',
        finalResponse: state.generatedContent || '',
        completedAt: Date.now(),
      };
    }

    // Rule 2: Budget exhausted — early exit with warning
    if (budgetRatio > 0.8) {
      console.log(`[GovernorNode] Budget exhausted (${(budgetRatio * 100).toFixed(0)}%). Early exit.`);
      return {
        status: 'completed',
        exitReason: 'budget_exhausted',
        finalResponse: state.generatedContent || '',
        completedAt: Date.now(),
      };
    }

    // Rule 3: Max revision rounds exceeded — escalate to human
    if (revisionRound >= MAX_REVISION_ROUNDS) {
      console.log(`[GovernorNode] Max revision rounds reached (${revisionRound}). Returning best available content with quality warning.`);
      return {
        status: 'completed',
        exitReason: 'quality_warning',
        finalResponse: state.generatedContent || '',
        completedAt: Date.now(),
        metadata: {
          ...state.metadata,
          revisionRound,
          reviewScore,
          reviewConfidence,
          qualityWarning: true,
          lastRevisionDiff: state.metadata?.lastRevisionDiff,
        },
      };
    }

    // Rule 4: Low quality (< 70) — full revision
    if (reviewScore > 0 && reviewScore < 70 && state.generatedContent) {
      console.log(`[GovernorNode] Low quality (score=${reviewScore}). Triggering full revision round ${revisionRound + 1}.`);
      
      const revisionResult = await revisionController({
        mode: 'full',
        originalContent: state.generatedContent,
        reviewResult: state.reviewResult,
        reviewScore,
        revisionRound: revisionRound + 1,
      });

      return {
        generatedContent: revisionResult.revisedContent,
        exitReason: 'revised_full',
        metadata: {
          ...state.metadata,
          revisionRound: revisionRound + 1,
          lastRevisionDiff: revisionResult.diff,
          revisionMode: 'full',
        },
      };
    }

    // Rule 5: Medium quality (70-89) — soft revision
    if (reviewScore >= 70 && reviewScore < 90 && state.generatedContent) {
      console.log(`[GovernorNode] Medium quality (score=${reviewScore}). Triggering soft revision round ${revisionRound + 1}.`);

      const revisionResult = await revisionController({
        mode: 'soft',
        originalContent: state.generatedContent,
        reviewResult: state.reviewResult,
        reviewScore,
        revisionRound: revisionRound + 1,
      });

      return {
        generatedContent: revisionResult.revisedContent,
        exitReason: 'revised_soft',
        finalResponse: revisionResult.revisedContent,
        metadata: {
          ...state.metadata,
          revisionRound: revisionRound + 1,
          lastRevisionDiff: revisionResult.diff,
          revisionMode: 'soft',
        },
      };
    }

    // Default: pass through (no review score yet, or score = 0)
    console.log('[GovernorNode] Complete. Passing through.');
    return {
      finalResponse: state.generatedContent || '',
    };
  };
}
