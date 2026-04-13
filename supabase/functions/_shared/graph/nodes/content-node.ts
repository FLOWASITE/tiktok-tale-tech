// ============================================
// Content Node
// Generate multichannel/script/carousel content
// Critical node — failure stops graph
// Optimized: fast-path skips LLM calls when topic/plan exists
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildContentSystemPrompt } from "../../agents/content-agent.ts";
import { withCache, generateCacheKey } from "../../cache/redis-cache.ts";
import { formatRetrievedContext } from "../blackboard-retriever.ts";
import { getOffTopicResponse } from "../orchestrator.ts";

const CONTENT_TOOLS = ['generate_script', 'generate_carousel', 'generate_multichannel', 'save_topic'];

export type ContentProgressCallback = (subStep: string, label: string, progress: number) => void;

interface ContentNodeContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  retriever?: any;
  brandVersion?: number;
  onProgress?: ContentProgressCallback;
}

/** Extract topic string from contentPlan (string or object) */
function extractTopicFromPlan(contentPlan: any): string | undefined {
  if (!contentPlan) return undefined;
  if (typeof contentPlan === 'string') {
    // Try to extract first meaningful line
    const lines = contentPlan.split('\n').filter((l: string) => l.trim());
    return lines[0]?.trim();
  }
  // Object — look for common keys
  return contentPlan.topic || contentPlan.title || contentPlan.bestTopic || undefined;
}

export function createContentNode(ctx: ContentNodeContext) {
  return async function contentNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ContentNode] Starting');

    // ─── Off-topic fast exit: return canned response, no LLM call ───
    if (state.orchestratorPlan?.reasoning === 'off_topic' || 
        state.orchestratorPlan?.reasoning?.includes('off_topic') ||
        state.metadata?.isOffTopic) {
      console.log('[ContentNode] Off-topic detected — returning canned response');
      return {
        generatedContent: getOffTopicResponse(),
        metadata: { actualTokensUsed_content: 0, contentOffTopic: true },
      };
    }

    const PROMPT_VERSION = 'v3';
    const cacheKey = await generateCacheKey(
      ctx.brandTemplateId || 'default',
      'content',
      { userMessage: state.userMessage, bestTopic: state.bestTopic, contentPlan: typeof state.contentPlan === 'string' ? state.contentPlan.slice(0, 200) : JSON.stringify(state.contentPlan)?.slice(0, 200), industry: ctx.industry },
      PROMPT_VERSION,
      ctx.brandVersion
    );

    return withCache(cacheKey, async () => {
      const hasPipelineContext = !!(state.bestTopic || state.contentPlan);

      // ─── Fast Path: skip both LLM calls when topic/plan exists ───
      if (hasPipelineContext) {
        console.log('[ContentNode] Fast path — skipping LLM, calling tool directly');

        ctx.onProgress?.('preparing', 'Chuẩn bị nội dung...', 10);

        const topic = state.bestTopic || extractTopicFromPlan(state.contentPlan) || state.userMessage;
        const channels = ['facebook', 'instagram', 'tiktok'];
        const toolArgs: Record<string, any> = {
          topic,
          channels,
        };

        const toolResult = await executeToolCall('generate_multichannel', toolArgs, {
          supabase: ctx.supabase,
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          brandTemplateId: ctx.brandTemplateId,
          userAccessToken: ctx.userAccessToken,
          onProgress: ctx.onProgress,
        });

        if (!toolResult.success) {
          throw new Error(`ContentNode fast-path failed: ${toolResult.error}`);
        }

        ctx.onProgress?.('finalizing', 'Đang hoàn thiện...', 90);

        console.log('[ContentNode] Fast path complete');
        return {
          generatedContent: typeof toolResult.result === 'string'
            ? toolResult.result
            : JSON.stringify(toolResult.result),
          metadata: { actualTokensUsed_content: 0, contentFastPath: true },
        };
      }

      // ─── Fallback Path: use LLM #1 to pick tool (free chat) ───
      console.log('[ContentNode] Fallback path — using LLM to select tool');
      ctx.onProgress?.('analyzing', 'Đang phân tích yêu cầu...', 15);

      const systemPrompt = buildContentSystemPrompt(ctx.brandName, ctx.industry);

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

      const aiResult = await callAI({
        functionName: 'content-agent',
        organizationId: ctx.organizationId,
        messages: [
          { role: 'system', content: systemPrompt + stateContext },
          { role: 'user', content: state.userMessage },
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
      // Progress events will be emitted inside executeToolCall → executeGenerateMultichannel
      const toolResults = await Promise.all(
        toolCalls.map(async (tc: any) => {
          const args = JSON.parse(tc.function.arguments || '{}');
          return executeToolCall(tc.function.name, args, {
            supabase: ctx.supabase,
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            brandTemplateId: ctx.brandTemplateId,
            userAccessToken: ctx.userAccessToken,
            onProgress: ctx.onProgress,
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

      ctx.onProgress?.('finalizing', 'Đang hoàn thiện...', 90);
      // Use tool result directly — NO follow-up LLM call
      const generatedContent = typeof contentResult.result === 'string'
        ? contentResult.result
        : JSON.stringify(contentResult.result);

      const usage = aiResult.data?.usage;
      const actualTokensUsed = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);

      console.log(`[ContentNode] Fallback path complete. Tokens: ${actualTokensUsed}`);
      return {
        generatedContent,
        metadata: { actualTokensUsed_content: actualTokensUsed, contentFastPath: false },
      };
    }, 3600); // 1 hour TTL
  };
}
