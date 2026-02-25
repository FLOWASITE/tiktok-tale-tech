

# Phase 3: Agent Nodes - DONE ✅

6 node functions đã được tạo trong `supabase/functions/_shared/graph/nodes/`:

- `research-node.ts` — Reuse `buildResearchSystemPrompt()`, tools: web_search, search_topics, discover_topics. Force tool use, 1 round-trip. Output: researchData, bestTopic, suggestedTopics.
- `strategy-node.ts` — Reuse `buildStrategySystemPrompt()`, tools: planning tools. Auto tool choice. Output: contentPlan.
- `content-node.ts` — Reuse `buildContentSystemPrompt()`, tools: generate_*. Force tool use, critical node. Output: generatedContent.
- `reviewer-node.ts` — Reuse `buildReviewerSystemPrompt()`, tools: review tools. Auto tool choice. Output: reviewResult.
- `brand-memory-node.ts` — Lightweight, direct DB call via searchBrandMemory(). No LLM. Output: brandMemoryContext.
- `image-node.ts` — Image generation, tools: generate_image, edit_image. Force tool use. Output: generatedImage.
- `index.ts` — Re-exports + `createNodeRegistry(context)` factory returning Map<string, NodeConfig>.

# Phase 4: Integration - DONE ✅

Graph Engine kết nối vào `chat-topics/index.ts`:

- Feature flag `enableGraphEngine?: boolean` trong `ChatRequest`
- Execution path mới với SSE streaming (`graph_plan`, `node_start`, `node_complete`, `node_error`, `content_chunk`)
- Heartbeat, metrics logging, backward compatible

# Phase 5: SSE Event Rendering - DONE ✅

Frontend parse & render graph engine SSE events:

- **useChatStreaming.ts**: Parse 4 event types mới — `graph_plan` (build dynamic ProgressStep[]), `node_start` (mark active), `node_complete` (mark complete + duration), `node_error` (mark error)
- **AgentPipelineBar.tsx**: Thêm `brand_memory` node, `error` status styling (destructive colors), dynamic filtering chỉ hiển thị nodes có trong plan
- **TopicAIChatbot.tsx**: Bỏ gate `supervisorEnabled` — pipeline bar hiển thị cho cả Supervisor và Graph Engine mode
- Agent contributions tự động tracked từ `node_complete` events

Files thay đổi:
- `src/hooks/useChatStreaming.ts` — Graph engine event handlers
- `src/components/topic/chatbot/AgentPipelineBar.tsx` — Brand memory node, error status, dynamic filtering
- `src/components/topic/TopicAIChatbot.tsx` — Remove supervisor gate for pipeline bar
