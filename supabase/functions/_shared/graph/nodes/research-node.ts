// ============================================
// Research Node
// Web search + topic discovery (single LLM call)
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI, AICallResult } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS, ToolDefinition } from "../../tool-definitions.ts";
import { buildResearchSystemPrompt } from "../../agents/research-agent.ts";
import { withCache, generateCacheKey } from "../../cache/redis-cache.ts";
import { formatRetrievedContext } from "../blackboard-retriever.ts";

const RESEARCH_TOOLS = ['web_search', 'search_topics', 'discover_topics'];

interface ResearchNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  retriever?: any;
}

export function createResearchNode(ctx: ResearchNodeContext) {
  return async function researchNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ResearchNode] Starting');

    // Try cache first (TTL 4h)
    const cacheKey = await generateCacheKey(
      ctx.brandTemplateId || 'default',
      'research',
      { userMessage: state.userMessage, industry: ctx.industry }
    );

    return withCache(cacheKey, async () => {
    const systemPrompt = buildResearchSystemPrompt(ctx.brandName, ctx.industry);

    // Blackboard v2: semantic context retrieval (fallback to buildStateContext)
    let stateContext: string;
    if (ctx.retriever) {
      try {
        const entries = await ctx.retriever.retrieve(state.userMessage, ['research_output', 'plan'], 5);
        stateContext = formatRetrievedContext(entries);
      } catch {
        stateContext = buildStateContext(state);
      }
    } else {
      stateContext = buildStateContext(state);
    }

    const tools = CHAT_TOOLS.filter(t => RESEARCH_TOOLS.includes(t.function.name));

    // First LLM call with forced tool use
    const aiResult = await callAI({
      functionName: 'research_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt + stateContext },
        { role: 'user', content: state.userMessage },
      ],
      tools,
      toolChoice: 'required',
    });

    if (!aiResult.success) {
      console.error('[ResearchNode] AI call failed:', aiResult.error);
      return { researchData: null };
    }

    const message = aiResult.data?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];

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

    // Build tool results messages for follow-up
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

    // Second LLM call to get final response
    const finalResult = await callAI({
      functionName: 'research_node',
      organizationId: ctx.organizationId,
      messages: followUpMessages,
      toolChoice: 'auto',
    });

    const finalContent = finalResult.data?.choices?.[0]?.message?.content || '';

    // Extract best topic and suggested topics from discover_topics results
    let bestTopic: string | undefined;
    let suggestedTopics: any[] | undefined;

    for (const tr of toolResults) {
      if (tr.tool_name === 'discover_topics' && tr.success && tr.result) {
        const topics = tr.result.topics || tr.result.suggestions || [];
        if (topics.length > 0) {
          suggestedTopics = topics;
          bestTopic = topics[0]?.title || topics[0]?.topic || topics[0]?.name || String(topics[0]);
        }
      }
    }

    // Safety net: if no discover_topics result, try to extract from search results
    if (!bestTopic) {
      for (const tr of toolResults) {
        if (tr.tool_name === 'web_search' && tr.success && tr.result?.results?.length) {
          bestTopic = tr.result.results[0]?.title;
          break;
        }
      }
    }

    console.log('[ResearchNode] Complete. bestTopic:', bestTopic);

    return {
      researchData: { toolResults, summary: finalContent },
      bestTopic,
      suggestedTopics,
    };
    }, 14400); // 4 hours TTL
  };
}
