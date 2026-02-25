

# Phase 3: Agent Nodes - DONE ✅

6 node functions đã được tạo trong `supabase/functions/_shared/graph/nodes/`:

- `research-node.ts` — Reuse `buildResearchSystemPrompt()`, tools: web_search, search_topics, discover_topics. Force tool use, 1 round-trip. Output: researchData, bestTopic, suggestedTopics.
- `strategy-node.ts` — Reuse `buildStrategySystemPrompt()`, tools: planning tools. Auto tool choice. Output: contentPlan.
- `content-node.ts` — Reuse `buildContentSystemPrompt()`, tools: generate_*. Force tool use, critical node. Output: generatedContent.
- `reviewer-node.ts` — Reuse `buildReviewerSystemPrompt()`, tools: review tools. Auto tool choice. Output: reviewResult.
- `brand-memory-node.ts` — Lightweight, direct DB call via searchBrandMemory(). No LLM. Output: brandMemoryContext.
- `image-node.ts` — Image generation, tools: generate_image, edit_image. Force tool use. Output: generatedImage.
- `index.ts` — Re-exports + `createNodeRegistry(context)` factory returning Map<string, NodeConfig>.

`graph-engine.ts` updated to re-export `createNodeRegistry` and `NodeExecutionContext`.

Backward compatible: agent-base.ts, research-agent.ts, content-agent.ts etc. untouched.
