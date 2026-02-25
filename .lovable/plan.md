

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

# Phase 4: Integration - DONE ✅

Graph Engine được kết nối vào `chat-topics/index.ts` edge function:

- **Feature flag**: `enableGraphEngine?: boolean` trong `ChatRequest` (chat-types.ts)
- **Execution path**: Block mới trong `chat-topics/index.ts` trước supervisor block
- **SSE Streaming**: Real-time events qua SSE — `graph_plan`, `node_start`, `node_complete`, `node_error`, `content_chunk`
- **Heartbeat**: `:heartbeat` mỗi 15s giữ connection alive
- **Metrics**: Log đầy đủ vào `ai_metrics` với `mode: graph_engine`
- **Backward compatible**: Mặc định off, chỉ kích hoạt khi `enableGraphEngine: true`

Flow: `enableGraphEngine` → `createNodeRegistry(context)` → `runOrchestrator(userMessage, registry)` → SSE stream results

Files thay đổi:
- `supabase/functions/_shared/types/chat-types.ts` — Thêm `enableGraphEngine`
- `supabase/functions/chat-topics/index.ts` — Import graph engine, thêm execution block
- `.lovable/plan.md` — Cập nhật
