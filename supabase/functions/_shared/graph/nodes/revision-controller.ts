// ============================================
// Revision Controller
// Mini-orchestrator for content quality revision
// Separated from Governor for SRP
// ============================================

import { GraphState } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";

// ---- Types ----

export type RevisionMode = 'full' | 'soft';

export interface RevisionRequest {
  mode: RevisionMode;
  originalContent: string;
  reviewResult: any;
  reviewScore: number;
  revisionRound: number;
}

export interface RevisionResult {
  revisedContent: string;
  diff: RevisionDiff;
  mode: RevisionMode;
  round: number;
}

export interface RevisionDiff {
  original: string;
  revised: string;
  changedSections: string[];
}

export interface RevisionControllerContext {
  organizationId?: string;
  brandName?: string;
  industry?: string;
}

// ---- Constants ----

const MAX_REVISION_ROUNDS = 2;

// ---- Controller ----

export function createRevisionController(ctx: RevisionControllerContext) {
  /**
   * Execute a revision cycle.
   * - Full revision (score < 70): Regenerate with issue-aware prompt
   * - Soft revision (score 70-89): Patch only flagged sections
   */
  return async function revisionController(
    request: RevisionRequest
  ): Promise<RevisionResult> {
    console.log(`[RevisionController] Round ${request.revisionRound}, mode=${request.mode}`);

    if (request.revisionRound > MAX_REVISION_ROUNDS) {
      console.warn('[RevisionController] Max rounds exceeded, returning original');
      return {
        revisedContent: request.originalContent,
        diff: {
          original: request.originalContent,
          revised: request.originalContent,
          changedSections: [],
        },
        mode: request.mode,
        round: request.revisionRound,
      };
    }

    const issues = extractIssues(request.reviewResult);
    const prompt = request.mode === 'full'
      ? buildFullRevisionPrompt(request.originalContent, issues, ctx)
      : buildSoftRevisionPrompt(request.originalContent, issues, ctx);

    const aiResult = await callAI({
      functionName: 'revision_controller',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    });

    if (!aiResult.success) {
      console.error('[RevisionController] AI call failed:', aiResult.error);
      return {
        revisedContent: request.originalContent,
        diff: {
          original: request.originalContent,
          revised: request.originalContent,
          changedSections: [],
        },
        mode: request.mode,
        round: request.revisionRound,
      };
    }

    const revisedContent = aiResult.data?.choices?.[0]?.message?.content || request.originalContent;

    // Build diff
    const changedSections = identifyChangedSections(request.originalContent, revisedContent);

    console.log(`[RevisionController] Round ${request.revisionRound} complete. Changed ${changedSections.length} sections.`);

    return {
      revisedContent,
      diff: {
        original: request.originalContent,
        revised: revisedContent,
        changedSections,
      },
      mode: request.mode,
      round: request.revisionRound,
    };
  };
}

// ---- Helpers ----

function extractIssues(reviewResult: any): string[] {
  if (!reviewResult) return [];

  const issues: string[] = [];

  // Extract from structured review result
  if (reviewResult.issues && Array.isArray(reviewResult.issues)) {
    for (const issue of reviewResult.issues) {
      issues.push(typeof issue === 'string' ? issue : (issue.description || issue.message || JSON.stringify(issue)));
    }
  }

  // Extract from feedback string
  if (reviewResult.feedback && typeof reviewResult.feedback === 'string') {
    issues.push(reviewResult.feedback);
  }

  // Extract from specific fields
  if (reviewResult.brand_voice_issues) {
    issues.push(`Brand voice: ${JSON.stringify(reviewResult.brand_voice_issues)}`);
  }
  if (reviewResult.compliance_issues) {
    issues.push(`Compliance: ${JSON.stringify(reviewResult.compliance_issues)}`);
  }
  if (reviewResult.quality_issues) {
    issues.push(`Quality: ${JSON.stringify(reviewResult.quality_issues)}`);
  }

  return issues.length > 0 ? issues : ['General quality improvement needed'];
}

function buildFullRevisionPrompt(
  content: string,
  issues: string[],
  ctx: RevisionControllerContext
): { system: string; user: string } {
  return {
    system: `You are a Content Revision Specialist. Your job is to rewrite content to fix specific quality issues while preserving the original intent and structure.

## Rules
- Fix ALL issues listed below
- Maintain the same format (multichannel, script, carousel, etc.)
- Keep the same tone and brand voice${ctx.brandName ? ` for ${ctx.brandName}` : ''}
${ctx.industry ? `- Industry: ${ctx.industry}` : ''}
- Output ONLY the revised content, no explanations

## Issues to Fix
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`,

    user: `Rewrite the following content, fixing all listed issues:\n\n${content}`,
  };
}

function buildSoftRevisionPrompt(
  content: string,
  issues: string[],
  ctx: RevisionControllerContext
): { system: string; user: string } {
  return {
    system: `You are a Content Editor. Make MINIMAL changes to fix specific flagged issues. Do NOT rewrite sections that are acceptable.

## Rules
- ONLY modify the parts directly related to the flagged issues
- Keep everything else exactly as-is
- Maintain format and structure${ctx.brandName ? ` for ${ctx.brandName}` : ''}
${ctx.industry ? `- Industry: ${ctx.industry}` : ''}
- Output the complete content with targeted fixes

## Issues to Fix (patch only these)
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`,

    user: `Apply targeted fixes to this content:\n\n${content}`,
  };
}

function identifyChangedSections(original: string, revised: string): string[] {
  const origLines = original.split('\n');
  const revLines = revised.split('\n');
  const changed: string[] = [];

  const maxLen = Math.max(origLines.length, revLines.length);
  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i] || '';
    const revLine = revLines[i] || '';
    if (origLine.trim() !== revLine.trim() && revLine.trim().length > 0) {
      changed.push(revLine.trim().slice(0, 100));
    }
  }

  return changed.slice(0, 10); // Cap at 10 for readability
}

export { MAX_REVISION_ROUNDS };
