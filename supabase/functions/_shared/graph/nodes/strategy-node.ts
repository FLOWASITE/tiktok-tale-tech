// ============================================
// Strategy Node
// Content planning (single LLM call + tools)
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildStrategySystemPrompt } from "../../agents/strategy-agent.ts";

const STRATEGY_TOOLS = ['start_planning_session', 'generate_plan_draft', 'refine_plan', 'finalize_plan'];

interface StrategyNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
}

export function createStrategyNode(ctx: StrategyNodeContext) {
  return async function strategyNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[StrategyNode] Starting');
    const systemPrompt = buildStrategySystemPrompt(ctx.brandName, ctx.industry);
    const stateContext = buildStateContext(state);
    const tools = CHAT_TOOLS.filter(t => STRATEGY_TOOLS.includes(t.function.name));

    const aiResult = await callAI({
      functionName: 'strategy_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt + stateContext },
        { role: 'user', content: state.userMessage },
      ],
      tools,
      toolChoice: 'auto',
    });

    if (!aiResult.success) {
      console.error('[StrategyNode] AI call failed:', aiResult.error);
      return { contentPlan: null };
    }

    const message = aiResult.data?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];

    if (toolCalls.length === 0) {
      // No tools needed, LLM provided plan directly
      return { contentPlan: message?.content || '' };
    }

    // Execute tools
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

    // Follow-up LLM call with tool results
    const followUpMessages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt + stateContext },
      { role: 'user', content: state.userMessage },
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
      functionName: 'strategy_node',
      organizationId: ctx.organizationId,
      messages: followUpMessages,
    });

    const contentPlan = finalResult.data?.choices?.[0]?.message?.content || '';
    console.log('[StrategyNode] Complete');
    return { contentPlan };
  };
}
