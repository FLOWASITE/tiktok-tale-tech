// ============================================
// Reviewer Node
// Compliance + quality check
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildReviewerSystemPrompt } from "../../agents/reviewer-agent.ts";

const REVIEWER_TOOLS = ['brand_voice_check', 'legal_compliance_check', 'platform_best_practices'];

interface ReviewerNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  complianceRules?: string[];
  userAccessToken?: string;
}

export function createReviewerNode(ctx: ReviewerNodeContext) {
  return async function reviewerNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ReviewerNode] Starting');

    if (!state.generatedContent) {
      console.warn('[ReviewerNode] No content to review, skipping');
      return { reviewResult: { skipped: true, reason: 'No content to review' } };
    }

    const systemPrompt = buildReviewerSystemPrompt(ctx.brandName, ctx.industry, ctx.complianceRules);
    const tools = CHAT_TOOLS.filter(t => REVIEWER_TOOLS.includes(t.function.name));

    const aiResult = await callAI({
      functionName: 'reviewer_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Review the following content:\n\n${state.generatedContent}` },
      ],
      tools,
      toolChoice: 'auto',
    });

    if (!aiResult.success) {
      console.error('[ReviewerNode] AI call failed:', aiResult.error);
      return { reviewResult: { error: aiResult.error } };
    }

    const message = aiResult.data?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];

    if (toolCalls.length === 0) {
      // LLM reviewed without tools
      let reviewResult: any;
      try { reviewResult = JSON.parse(message?.content || '{}'); } catch { reviewResult = { feedback: message?.content }; }
      return { reviewResult };
    }

    // Execute review tools
    const toolResults = await Promise.all(
      toolCalls.map(async (tc: any) => {
        const args = JSON.parse(tc.function.arguments || '{}');
        return executeToolCall(tc.function.name, args, {
          supabase: ctx.supabase,
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          brandTemplateId: ctx.brandTemplateId,
          userAccessToken: ctx.userAccessToken,
        });
      })
    );

    // Follow-up for final verdict
    const followUpMessages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Review the following content:\n\n${state.generatedContent}` },
      { role: 'assistant', content: message?.content || '', tool_calls: toolCalls },
    ];
    for (let i = 0; i < toolCalls.length; i++) {
      followUpMessages.push({
        role: 'tool',
        content: JSON.stringify(toolResults[i]?.result || toolResults[i]?.error || 'No result'),
        tool_call_id: toolCalls[i].id,
      });
    }

    const finalResult = await callAI({
      functionName: 'reviewer_node',
      organizationId: ctx.organizationId,
      messages: followUpMessages,
    });

    const finalContent = finalResult.data?.choices?.[0]?.message?.content || '';
    let reviewResult: any;
    try { reviewResult = JSON.parse(finalContent); } catch { reviewResult = { feedback: finalContent }; }

    // Extract score and confidence for Governor node
    const reviewScore = reviewResult?.score ?? reviewResult?.overall_score ?? reviewResult?.quality_score ?? 0;
    const reviewConfidence = reviewResult?.confidence ?? (reviewScore > 0 ? 0.7 : 0);

    console.log(`[ReviewerNode] Complete. Score=${reviewScore}, Confidence=${reviewConfidence}`);
    return { reviewResult, reviewScore, reviewConfidence };
  };
}
