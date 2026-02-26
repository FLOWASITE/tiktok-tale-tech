// ============================================
// Content Node
// Generate multichannel/script/carousel content
// Critical node — failure stops graph
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildContentSystemPrompt } from "../../agents/content-agent.ts";
import { withCache, generateCacheKey } from "../../cache/redis-cache.ts";
import { formatRetrievedContext } from "../blackboard-retriever.ts";

const CONTENT_TOOLS = ['generate_script', 'generate_carousel', 'generate_multichannel', 'save_topic'];

interface ContentNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  retriever?: any;
}

export function createContentNode(ctx: ContentNodeContext) {
  return async function contentNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ContentNode] Starting');

    const cacheKey = await generateCacheKey(
      ctx.brandTemplateId || 'default',
      'content',
      { userMessage: state.userMessage, bestTopic: state.bestTopic, contentPlan: typeof state.contentPlan === 'string' ? state.contentPlan.slice(0, 200) : JSON.stringify(state.contentPlan)?.slice(0, 200), industry: ctx.industry }
    );

    return withCache(cacheKey, async () => {
    const systemPrompt = buildContentSystemPrompt(ctx.brandName, ctx.industry);

    // Blackboard v2: semantic context retrieval
    let stateContext: string;
    if (ctx.retriever) {
      try {
        const entries = await ctx.retriever.retrieve(
          state.userMessage,
          ['research_output', 'plan', 'compliance_check', 'generated_content'],
          5
        );
        stateContext = formatRetrievedContext(entries);
      } catch {
        stateContext = buildStateContext(state);
      }
    } else {
      stateContext = buildStateContext(state);
    }
    const tools = CHAT_TOOLS.filter(t => CONTENT_TOOLS.includes(t.function.name));

    // Inject bestTopic into user message if available
    let userContent = state.userMessage;
    if (state.bestTopic) {
      userContent += `\n\n[Topic đã chọn từ Research: "${state.bestTopic}"]`;
    }

    // First LLM call — force tool use
    const aiResult = await callAI({
      functionName: 'content_node',
      organizationId: ctx.organizationId,
      messages: [
        { role: 'system', content: systemPrompt + stateContext },
        { role: 'user', content: userContent },
      ],
      tools,
      toolChoice: 'required',
    });

    if (!aiResult.success) {
      throw new Error(`ContentNode AI call failed: ${aiResult.error}`);
    }

    const message = aiResult.data?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls || [];

    if (toolCalls.length === 0) {
      throw new Error('ContentNode: LLM did not call any content generation tools');
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

    // Check if any content tool succeeded
    const contentResult = toolResults.find(
      tr => ['generate_multichannel', 'generate_script', 'generate_carousel'].includes(tr.tool_name) && tr.success
    );

    if (!contentResult) {
      const errors = toolResults.filter(tr => !tr.success).map(tr => tr.error).join('; ');
      throw new Error(`ContentNode: All content tools failed: ${errors}`);
    }

    // Follow-up LLM call to summarize
    const followUpMessages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt + stateContext },
      { role: 'user', content: userContent },
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
      functionName: 'content_node',
      organizationId: ctx.organizationId,
      messages: followUpMessages,
    });

    const generatedContent = finalResult.data?.choices?.[0]?.message?.content || 
      JSON.stringify(contentResult.result);

    // Extract actual token usage
    const usage = finalResult.data?.usage;
    const actualTokensUsed = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0)
      + (aiResult.data?.usage?.prompt_tokens || 0) + (aiResult.data?.usage?.completion_tokens || 0);

    console.log(`[ContentNode] Complete. Actual tokens: ${actualTokensUsed}`);
    return { 
      generatedContent,
      metadata: { actualTokensUsed_content: actualTokensUsed },
    };
    }, 3600); // 1 hour TTL
  };
}
