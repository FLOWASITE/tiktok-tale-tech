// ============================================
// Strategy Node
// Content planning (single LLM call + tools)
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildStrategySystemPrompt } from "../../agents/strategy-agent.ts";
import { withCache, generateCacheKey } from "../../cache/redis-cache.ts";
import { formatRetrievedContext } from "../blackboard-retriever.ts";

const STRATEGY_TOOLS = ['start_planning_session', 'generate_plan_draft', 'refine_plan', 'finalize_plan'];

interface StrategyNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  retriever?: any;
}

export function createStrategyNode(ctx: StrategyNodeContext) {
  return async function strategyNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[StrategyNode] Starting');

    const cacheKey = await generateCacheKey(
      ctx.brandTemplateId || 'default',
      'strategy',
      { userMessage: state.userMessage, bestTopic: state.bestTopic, industry: ctx.industry }
    );

    return withCache(cacheKey, async () => {
    const systemPrompt = buildStrategySystemPrompt(ctx.brandName, ctx.industry);

    // Blackboard v2: semantic context retrieval
    let stateContext: string;
    if (ctx.retriever) {
      try {
        const entries = await ctx.retriever.retrieve(state.userMessage, ['research_output', 'plan', 'compliance_check'], 5);
        stateContext = formatRetrievedContext(entries);
      } catch {
        stateContext = buildStateContext(state);
      }
    } else {
      stateContext = buildStateContext(state);
    }
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

    // Extract actual token usage
    const usage = finalResult.data?.usage;
    const actualTokensUsed = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0)
      + (aiResult.data?.usage?.prompt_tokens || 0) + (aiResult.data?.usage?.completion_tokens || 0);

    console.log(`[StrategyNode] Complete. Tokens: ${actualTokensUsed}`);
    return { 
      contentPlan,
      metadata: { actualTokensUsed_strategy: actualTokensUsed },
    };
    }, 7200); // 2 hours TTL
  };
}
