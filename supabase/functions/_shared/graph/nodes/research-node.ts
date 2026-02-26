// ============================================
// Research Node — v3
// Prefetch trending+suggest → LLM synthesis
// ============================================

import { GraphState, buildStateContext } from "../graph-state.ts";
import { callAI, AICallResult } from "../../ai-provider.ts";
import { executeToolCall } from "../../tool-executor.ts";
import { CHAT_TOOLS } from "../../tool-definitions.ts";
import { buildResearchSystemPrompt } from "../../agents/research-agent.ts";
import { withCache, generateCacheKey } from "../../cache/redis-cache.ts";
import { formatRetrievedContext } from "../blackboard-retriever.ts";

// Only web_search and search_topics remain as LLM-callable tools
const RESEARCH_TOOLS = ['web_search', 'search_topics'];

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

// ---- Helper: extract topics array from tool result ----
function extractTopics(result: any): any[] {
  if (!result) return [];
  return result.topics || result.suggestions || [];
}

// ---- Helper: tag & boost trending topics ----
function mergeAndDedup(
  suggestTopics: any[],
  trendingTopics: any[],
  trendingBoost = 10
): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];

  // Trending first (boosted)
  for (const t of trendingTopics) {
    const name = t.title || t.topic || t.name || String(t);
    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      ...t,
      score: (t.score ?? 50) + trendingBoost,
      source: 'trending',
    });
  }

  // Then suggest
  for (const t of suggestTopics) {
    const name = t.title || t.topic || t.name || String(t);
    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...t, source: 'suggest' });
  }

  // Sort descending by score
  merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return merged;
}

// ---- Helper: format prefetched topics for LLM context ----
function formatPrefetchedContext(merged: any[]): string {
  if (merged.length === 0) return '';

  const lines = merged.slice(0, 15).map((t, i) => {
    const name = t.title || t.topic || t.name || String(t);
    const tag = t.source === 'trending' ? '[TRENDING]' : '[SUGGEST]';
    const score = t.score != null ? ` (score: ${t.score})` : '';
    const cat = t.category ? ` - ${t.category}` : '';
    return `${i + 1}. ${tag} ${name}${score}${cat}`;
  });

  return `\n\n## 📊 Dữ liệu Topics đã thu thập (tự động)\n${lines.join('\n')}`;
}

// ---- Helper: call topic-ai refine action ----
async function refineTopic(
  bestTopic: string,
  ctx: ResearchNodeContext
): Promise<{ refinedTopic: string; refinedVariants: any[] } | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const topicAiUrl = `${supabaseUrl}/functions/v1/topic-ai`;

    const response = await fetch(topicAiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'refine',
        rawTopic: bestTopic,
        brandTemplateId: ctx.brandTemplateId || null,
        organizationId: ctx.organizationId || null,
      }),
    });

    if (!response.ok) {
      console.warn(`[ResearchNode] Refine failed (${response.status}):`, await response.text());
      return null;
    }

    const data = await response.json();
    const refinedTopics: any[] = data.refinedTopics || [];

    if (refinedTopics.length === 0) {
      console.warn('[ResearchNode] Refine returned empty results');
      return null;
    }

    // Pick the first refined version as the improved bestTopic
    const best = refinedTopics[0];
    const refinedTopic = best.topic || bestTopic;

    console.log(`[ResearchNode] Refined topic: "${bestTopic}" → "${refinedTopic}"`);

    return { refinedTopic, refinedVariants: refinedTopics };
  } catch (err) {
    console.warn('[ResearchNode] Refine error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function createResearchNode(ctx: ResearchNodeContext) {
  return async function researchNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log('[ResearchNode] Starting — prefetching suggest+trending');

    const PROMPT_VERSION = 'v3';
    const cacheKey = await generateCacheKey(
      ctx.brandTemplateId || 'default',
      'research',
      { userMessage: state.userMessage, industry: ctx.industry },
      PROMPT_VERSION
    );

    return withCache(cacheKey, async () => {
      // ── Step 1: Prefetch suggest + trending in parallel ──
      const toolCtx = {
        supabase: ctx.supabase,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        brandTemplateId: ctx.brandTemplateId,
        userAccessToken: ctx.userAccessToken,
      };

      const [suggestResult, trendingResult] = await Promise.all([
        executeToolCall('discover_topics', {
          action: 'suggest',
          query: state.userMessage,
          force_refresh: true, // Bypass cache for fresh results
        }, toolCtx).catch(err => {
          console.warn('[ResearchNode] suggest prefetch failed:', err.message);
          return { success: false, result: null, tool_name: 'discover_topics' };
        }),
        executeToolCall('discover_topics', {
          action: 'trending',
          force_refresh: true, // Bypass cache for fresh trending data
        }, toolCtx).catch(err => {
          console.warn('[ResearchNode] trending prefetch failed:', err.message);
          return { success: false, result: null, tool_name: 'discover_topics' };
        }),
      ]);

      const suggestTopics = suggestResult.success ? extractTopics(suggestResult.result) : [];
      const trendingTopics = trendingResult.success ? extractTopics(trendingResult.result) : [];
      const mergedTopics = mergeAndDedup(suggestTopics, trendingTopics);
      const prefetchedContext = formatPrefetchedContext(mergedTopics);

      console.log(`[ResearchNode] Prefetch done — suggest: ${suggestTopics.length}, trending: ${trendingTopics.length}, merged: ${mergedTopics.length}`);

      // ── Step 2: Build context ──
      const systemPrompt = buildResearchSystemPrompt(ctx.brandName, ctx.industry);

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

      // ── Step 3: LLM call (web_search still available) ──
      const tools = CHAT_TOOLS.filter(t => RESEARCH_TOOLS.includes(t.function.name));

      const aiResult = await callAI({
        functionName: 'research_node',
        organizationId: ctx.organizationId,
        messages: [
          { role: 'system', content: systemPrompt + stateContext },
          { role: 'user', content: state.userMessage + prefetchedContext },
        ],
        tools: tools.length > 0 ? tools : undefined,
        toolChoice: 'auto',
      });

      if (!aiResult.success) {
        console.error('[ResearchNode] AI call failed:', aiResult.error);
        // Still return prefetched topics even if LLM fails
        const bestTopic = mergedTopics[0]
          ? (mergedTopics[0].title || mergedTopics[0].topic || mergedTopics[0].name)
          : undefined;
        return {
          researchData: { toolResults: [suggestResult, trendingResult], summary: 'LLM failed, using prefetched topics' },
          bestTopic,
          suggestedTopics: mergedTopics,
        };
      }

      let message = aiResult.data?.choices?.[0]?.message;
      let toolCalls = message?.tool_calls || [];
      let totalTokens = (aiResult.data?.usage?.prompt_tokens || 0) + (aiResult.data?.usage?.completion_tokens || 0);

      // Handle any additional tool calls from LLM (web_search etc.)
      if (toolCalls.length > 0) {
        const toolResults = await Promise.all(
          toolCalls.map(async (tc: any) => {
            const args = JSON.parse(tc.function.arguments || '{}');
            return executeToolCall(tc.function.name, args, toolCtx);
          })
        );

        const followUpMessages: any[] = [
          { role: 'system', content: systemPrompt + stateContext },
          { role: 'user', content: state.userMessage + prefetchedContext },
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
          functionName: 'research_node',
          organizationId: ctx.organizationId,
          messages: followUpMessages,
          toolChoice: 'auto',
        });

        message = finalResult.data?.choices?.[0]?.message;
        totalTokens += (finalResult.data?.usage?.prompt_tokens || 0) + (finalResult.data?.usage?.completion_tokens || 0);
      }

      const finalContent = message?.content || '';

      // ── Step 4: Best topic from merged pool ──
      const rawBestTopic = mergedTopics[0]
        ? (mergedTopics[0].title || mergedTopics[0].topic || mergedTopics[0].name || String(mergedTopics[0]))
        : undefined;

      // ── Step 5: Refine best topic via topic-ai ──
      let bestTopic = rawBestTopic;
      let refinedVariants: any[] | undefined;

      if (rawBestTopic) {
        const refineResult = await refineTopic(rawBestTopic, ctx);
        if (refineResult) {
          bestTopic = refineResult.refinedTopic;
          refinedVariants = refineResult.refinedVariants;
        }
      }

      console.log(`[ResearchNode] Complete. rawBestTopic: ${rawBestTopic}, refinedBestTopic: ${bestTopic}, merged: ${mergedTopics.length}, tokens: ${totalTokens}`);

      return {
        researchData: {
          toolResults: [suggestResult, trendingResult],
          summary: finalContent,
          refinedVariants,
        },
        bestTopic,
        suggestedTopics: mergedTopics,
        metadata: { actualTokensUsed_research: totalTokens },
      };
    }, 14400); // 4h TTL
  };
}
