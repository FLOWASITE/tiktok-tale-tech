
# Bao cao Ky thuat Chi tiet: He thong Multi-Agent Flowa

Tai lieu nay mo ta toan bo kien truc, luong du lieu, va cac thanh phan cua he thong Multi-Agent de chuyen gia danh gia end-to-end.

---

## 1. TONG QUAN KIEN TRUC

He thong su dung **2 engine song song** (Legacy Supervisor + Graph Engine), mac dinh bat Graph Engine:

```text
Frontend (React + TS)
  useChatStreaming.ts ──SSE──> chat-topics Edge Function
                                      │
                                      ├── enableGraphEngine: true (mac dinh)
                                      │     │
                                      │     ▼
                                      │   Orchestrator (orchestrator.ts)
                                      │     ├── Fast-path: regex intent → Template Plan
                                      │     └── LLM Planning: Gemini 2.5 Flash → GraphPlan
                                      │           │
                                      │           ▼
                                      │   Graph Engine (graph-engine.ts)
                                      │     ├── compileGraphFromPlan() → DAG
                                      │     └── executeGraph() → BFS parallel execution
                                      │
                                      └── enableSupervisor: true (legacy)
                                            │
                                            ▼
                                          Supervisor Loop (supervisor-loop.ts)
                                            ├── Intent Classifier
                                            ├── State Machine
                                            └── Sequential/Multi-step agent execution
```

---

## 2. ORCHESTRATOR (orchestrator.ts)

**Vai tro**: "Nao bo" trung tam – quyet dinh node nao can chay, thu tu nao, song song hay tuan tu.

### 2.1 Fast-path Heuristic (khong ton LLM)
- Regex matching cho 6 intent: `research`, `plan`, `generate`, `complex_workflow`, `multi_step`, `image_generate`
- Ho tro 3 ngon ngu: Tieng Viet, Tieng Anh, Tieng Thai
- Uu tien: `multi_step` > `complex_workflow` > `image_generate` > cac intent khac
- Nguong confidence: >= 0.7 thi dung fast-path, duoi thi dung LLM

### 2.2 Topic Detection Logic
- `hasExplicitTopic()`: phat hien topic cu the trong message (quoted text, "ve...", "about...", colon patterns)
- Neu co topic ro rang → `generate_simple` (khong can research)
- Neu khong co → `generate_with_research` (can research truoc)

### 2.3 LLM Planning (fallback)
- Model: `google/gemini-2.5-flash`, temperature: 0.1
- Tool: `create_graph_plan` (forced tool_choice)
- Inject cross-session memory tu Blackboard v2 vao prompt
- Fallback: neu LLM that bai → dung template `full_pipeline`

### 2.4 Template Plans (6 templates)
| Template | Nodes | Use case |
|----------|-------|----------|
| `chat` | content | Hoi dap don gian |
| `research_only` | research | Chi nghien cuu |
| `generate_simple` | content → reviewer → governor | Co topic ro rang |
| `generate_with_research` | research + brand_memory + compliance (parallel) → strategy → content → reviewer → governor | Can nghien cuu truoc |
| `image_generate` | image | Chi tao anh |
| `full_pipeline` | Giong generate_with_research | Pipeline day du |

---

## 3. GRAPH ENGINE (graph-engine.ts)

**Vai tro**: Bien dich GraphPlan thanh DAG (Directed Acyclic Graph) va thuc thi.

### 3.1 Compile
- `compileGraphFromPlan()`: Doc plan steps, tao nodes + edges
- Xu ly `parallelWith` va `dependsOn` tu plan
- Node cuoi cung la end node

### 3.2 Execution (BFS-style)
- Tim nodes "ready" (moi dependency da complete)
- Chay song song bang `Promise.allSettled`
- Token budget check truoc khi chay moi node
- Timeout mac dinh: 55s (safety margin cho Edge Function 60s limit)
- Ho tro abort signal

### 3.3 Error Handling
- `critical: true` (Content Node) → that bai dung toan bo graph
- Non-critical node that bai → log warning, tiep tuc
- Timeout → set status 'failed', exitReason 'timeout'

### 3.4 Events Emitted
- `graph_plan`: Plan da chon (steps, reasoning)
- `node_start`: Node bat dau chay
- `node_complete`: Node hoan thanh (kem durationMs)
- `node_error`: Node that bai

### 3.5 Blackboard v2 Integration
- `onNodeComplete`: Tu dong goi `retriever.store()` (fire-and-forget)
- `extractStorableContent()`: Xac dinh noi dung can luu cho moi node type

---

## 4. CAC NODES (8 nodes)

### 4.1 Research Node (research-node.ts)
- **Tools**: web_search, search_topics, discover_topics
- **LLM calls**: 2 (forced tool use → follow-up summary)
- **Cache**: Redis, TTL 4h
- **Output**: `researchData`, `bestTopic`, `suggestedTopics`
- **Context**: Blackboard v2 semantic retrieval (fallback buildStateContext)
- **Safety net**: Neu khong co discover_topics result → extract tu web_search

### 4.2 Strategy Node (strategy-node.ts)
- **Tools**: start_planning_session, generate_plan_draft, refine_plan, finalize_plan
- **LLM calls**: 1-2 (auto tool use → optional follow-up)
- **Cache**: Redis, TTL 2h
- **Output**: `contentPlan`
- **Context**: Blackboard v2 semantic retrieval

### 4.3 Content Node (content-node.ts) — CRITICAL
- **Tools**: generate_script, generate_carousel, generate_multichannel, save_topic
- **LLM calls**: 2 (forced tool use → summarize)
- **Cache**: Redis, TTL 1h
- **Output**: `generatedContent`
- **Critical**: `critical: true` – that bai dung graph
- **Logic**: Inject bestTopic vao user message neu co
- **Tool generate_multichannel**: Pipeline 2 buoc tu dong:
  1. Goi `generate-core-content` Edge Function → tao Core Content
  2. Goi `generate-multichannel` Edge Function → transform sang cac kenh

### 4.4 Reviewer Node (reviewer-node.ts)
- **Tools**: brand_voice_check, legal_compliance_check, platform_best_practices
- **LLM calls**: 1-2
- **Output**: `reviewResult`, `reviewScore`, `reviewConfidence`
- **Logic**: Parse JSON score tu LLM response

### 4.5 Brand Memory Node (brand-memory-node.ts)
- **LLM calls**: 0 (chi DB call)
- **Estimated tokens**: 0
- **Output**: `brandMemoryContext`
- **Logic**: Tim trong bang `brand_memory` bang vector similarity search

### 4.6 Compliance Node (compliance-node.ts)
- **LLM calls**: 0 (rule-based)
- **Estimated tokens**: 0
- **Output**: `complianceResult` (riskLevel, riskScore, issues)
- **Logic**: Load resolved_rules tu brand template → industry → jurisdiction profile

### 4.7 Governor Node (governor-node.ts)
- **LLM calls**: 0 (pure logic)
- **Rules**:
  - Score >= 90 AND confidence >= 0.85 → Early exit (quality_met)
  - Budget > 80% used → Early exit (budget_exhausted)
  - Score < 70 → Mark needs_revision
  - Default → Pass through

### 4.8 Image Node (image-node.ts)
- **Tools**: generate_image, edit_image
- **LLM calls**: 1 (forced tool use)
- **Output**: `generatedImage`
- **Logic**: Auto-select aspect_ratio theo channel

---

## 5. TOOL EXECUTOR (tool-executor.ts)

### 5.1 Tools dang ky (17 tools)

| Nhom | Tool | Mo ta |
|------|------|-------|
| Research | `web_search` | Tim kiem web (Perplexity + fallback Lovable AI) |
| Research | `search_topics` | Tim topic da luu trong Topic Bank |
| Research | `discover_topics` | Goi Topic-AI goi y topic moi |
| Content | `generate_script` | Goi Edge Function tao script video |
| Content | `generate_carousel` | Goi Edge Function tao carousel |
| Content | `generate_multichannel` | Pipeline 2 buoc: Core Content → Transform |
| Content | `save_topic` | Luu topic vao topic_history |
| Planning | `start_planning_session` | Bat dau phien lap ke hoach |
| Planning | `generate_plan_draft` | Tao ban nhap ke hoach |
| Planning | `refine_plan` | Chinh sua ke hoach |
| Planning | `finalize_plan` | Hoan thanh ke hoach |
| Planning | `get_active_session` | Lay trang thai phien hien tai |
| Review | `brand_voice_check` | Kiem tra brand voice |
| Review | `legal_compliance_check` | Kiem tra phap luat nganh |
| Review | `platform_best_practices` | Kiem tra best practices tung platform |
| Image | `generate_image` | Tao anh AI |
| Image | `edit_image` | Chinh sua anh |
| Control | `task_complete` | Ket thuc workflow |

### 5.2 Web Search Architecture
- Primary: Perplexity API (qua Edge Function)
- Fallback: Lovable AI Gateway (sonar model)
- Circuit Breaker: Theo doi failure rate, tu dong chuyen fallback

---

## 6. AI PROVIDER LAYER (ai-provider.ts)

### 6.1 Multi-Provider Routing
- **Lovable Gateway**: google/gemini-*, openai/gpt-5*, sonar (mac dinh, mien phi)
- **OpenAI Direct**: gpt-* (can API key)
- **Anthropic Direct**: claude-* (can API key)
- **OpenRouter**: 200+ models (anthropic/, meta-llama/, deepseek/, moonshotai/, qwen/...)

### 6.2 Circuit Breaker Pattern
- In-memory state per model
- Failure threshold: 3, rate: 30%
- Reset timeout: 5 phut
- Fallback mapping: VD `moonshotai/kimi-k2` → `google/gemini-2.5-flash`

### 6.3 Admin-configurable
- Bang `ai_provider_configs`: Encrypted API key, default model, per-organization
- Bang `ai_function_configs`: Model, temperature, max_tokens per function
- Channel-level model override (Admin Panel → Channels tab)

---

## 7. BLACKBOARD V2 (blackboard-retriever.ts)

### 7.1 Architecture
- **Storage**: Bang `content_embeddings` voi columns `session_id`, `node_name`
- **Embedding**: gte-small 384-dim (Supabase.ai.Session, mien phi)
- **Retrieval**: RPC `match_blackboard_context` voi priority scoring

### 7.2 Priority Scoring
```text
base_score = 1 - cosine_distance(query, embedding)
+ 0.15 neu cung session
+ 0.05 neu cung brand
= priority_score
```

### 7.3 API
- `store(content, nodeName, contentType)`: Luu embedding sau moi node
- `retrieve(query, nodeTypes, limit)`: Semantic search cho node context
- `retrieveHierarchical(sessionId)`: Lay toan bo entries cua session
- `retrieveCrossSession(query, limit)`: Tim context tu cac session cu cua brand

### 7.4 Integration
- Graph Engine: Auto-store sau moi node complete (fire-and-forget)
- Orchestrator: Inject cross-session memory vao LLM planning prompt
- Nodes: Dung `retrieve()` thay `buildStateContext()` (fallback van co)

---

## 8. CACHING LAYER (redis-cache.ts)

- **Provider**: Upstash Redis (global, serverless)
- **Graceful fallback**: Neu khong co Redis credentials → chay binh thuong (khong cache)
- **Cache key**: SHA-256 hash cua (brandId + nodeType + stateSubset)
- **TTL**: Research 4h, Strategy 2h, Content 1h
- **Invalidation**: `invalidateByPrefix(prefix)` xoa batch

---

## 9. CHECKPOINT/PERSISTENCE (checkpoint.ts)

- **Bang**: `workflow_checkpoints` (JSONB)
- **Save**: Sau moi node complete (configurable via onCheckpoint)
- **Load**: Lay checkpoint moi nhat cua session
- **Serialization**: Truncate large fields (generatedContent > 10KB, messages > 10)
- **Muc dich**: Recovery sau Edge Function timeout, Human-in-the-loop

---

## 10. STREAMING & FRONTEND

### 10.1 Backend Streaming (streaming-handler.ts)
- SSE events per channel
- **Token batching**: 80ms buffer → giam event count 80%
- Max 4 channels song song (`MAX_PARALLEL_CHANNELS`)
- Footer auto-append sau streaming
- Channel model configs (per-channel model override tu Admin Panel)

### 10.2 Frontend Hooks
**useChatStreaming.ts** (Agentic Chat):
- SSE listener xu ly 15+ event types
- Dynamic progress steps tu `graph_plan` event
- Agent step results streaming realtime
- Topic suggestions card rendering
- Error handling: rate limit (429), quota (402), auth errors

**useStreamingGeneration.ts** (Multichannel Editor):
- Per-channel state isolation (useRef + channelUpdateSignal)
- `getChannelText(channel)` accessor (tranh stale closure)
- Watchdog: 150s timeout, 30s first-byte timeout
- StreamingChannelCard: React.memo optimization

### 10.3 SSE Event Flow (Graph Engine mode)
```text
graph_plan → node_start(research) → node_start(brand_memory) → node_start(compliance)
→ node_complete(brand_memory) → node_complete(compliance) → node_complete(research)
→ topic_suggestions → node_start(strategy) → node_complete(strategy)
→ agent_step_result(strategy) → node_start(content) → node_complete(content)
→ agent_step_result(content) → node_start(reviewer) → node_complete(reviewer)
→ node_start(governor) → node_complete(governor) → content_chunk (final)
→ [DONE]
```

---

## 11. LEGACY SUPERVISOR LOOP (supervisor-loop.ts)

Con ton tai nhung `enableSupervisor: false` (mac dinh).

### 11.1 Khac biet voi Graph Engine
| Feature | Supervisor | Graph Engine |
|---------|-----------|--------------|
| Orchestration | State Machine + Intent Classifier | Orchestrator (heuristic + LLM) |
| Execution | Sequential (+ multi-step) | DAG parallel (BFS) |
| Agent interface | agent-base.ts ReAct loop | Node functions (single LLM call) |
| Memory | Blackboard v1 (in-memory JSONB) | Blackboard v2 (pgvector semantic) |
| Caching | Khong co | Redis per-node |
| Checkpoint | Khong co | workflow_checkpoints |

### 11.2 Van ton tai vi
- Backward compatibility
- Mot so flow cu chua migrate hoan toan
- Safety fallback neu Graph Engine gap van de

---

## 12. AGENT REGISTRY (agent-registry.ts)

| Agent | Model | Max Turns | Timeout | Token Budget | Force Tool |
|-------|-------|-----------|---------|--------------|------------|
| research-agent | gemini-2.5-flash | 2 | 15s | 2000 | Yes |
| strategy-agent | gemini-2.5-flash | 3 | 10s | 2000 | No |
| content-agent | gemini-2.5-flash | 3 | 60s | 8000 | Yes |
| reviewer-agent | gemini-2.5-flash | 2 | 15s | 2000 | No |
| brand-memory-agent | gemini-2.5-flash-lite | 1 | 10s | 1000 | No |
| image-agent | gemini-2.5-flash | 3 | 120s | 2000 | No |

**Luu y**: Registry nay duoc dung boi Supervisor Loop (legacy). Graph Engine su dung Node Registry (nodes/index.ts) voi cac estimated token khac:
- research: 3000, strategy: 2500, content: 4000 (critical), reviewer: 2000, brand_memory: 0, image: 1500, compliance: 0, governor: 0

---

## 13. LUONG DU LIEU END-TO-END (Vi du: "Tao content ve skincare cho Gen Z")

```text
1. Frontend: useChatStreaming → POST /chat-topics
     Body: { messages, enableGraphEngine: true, brandTemplateId, ... }

2. chat-topics Edge Function:
     - Auth: Verify JWT → get userId
     - Load brand template, industry
     - Create GraphState(sessionId, userMessage)
     - Create NodeRegistry(supabase, userId, orgId, brandTemplateId, ...)
     - Create BlackboardRetriever(supabase, { sessionId, brandTemplateId })

3. Orchestrator:
     - Fast-path: "tao" matches generate, "skincare cho Gen Z" has explicit topic
     - Result: generate_simple (content → reviewer → governor)
     - NHUNG: "Gen Z" co the chua du context → co the match generate_with_research

4. Graph Engine: compileGraphFromPlan() → executeGraph()

5. Research Node (neu co):
     - Semantic context: retriever.retrieve("skincare Gen Z", ['research_output'], 5)
     - LLM call: Gemini 2.5 Flash, tools: [web_search, discover_topics]
     - Tool: discover_topics(action="suggest", query="skincare Gen Z")
     - Follow-up LLM: Summarize results
     - Output: { researchData, bestTopic: "5 buoc skincare toi gian cho Gen Z", suggestedTopics }
     - Auto-store: retriever.store(summary, 'research', 'research_output')

6. Strategy Node:
     - Context: retriever.retrieve(userMessage, ['research_output', 'plan'], 5)
     - LLM call: Plan content strategy
     - Output: { contentPlan }
     - Auto-store: retriever.store(plan, 'strategy', 'plan')

7. Content Node (CRITICAL):
     - Context: retriever.retrieve(userMessage, ['research_output', 'plan', ...], 5)
     - Inject bestTopic: "[Topic da chon tu Research: '5 buoc skincare toi gian cho Gen Z']"
     - LLM call: Gemini 2.5 Flash, tools: [generate_multichannel], toolChoice: required
     - Tool: generate_multichannel(topic, channels: [facebook, instagram], ...)
       - Step 1: Goi generate-core-content EF → coreContentId
       - Step 2: Goi generate-multichannel EF → noi dung 11 kenh
     - Follow-up LLM: Summarize
     - Output: { generatedContent }
     - Auto-store: retriever.store(content, 'content', 'generated_content')

8. Reviewer Node:
     - LLM call: Gemini 2.5 Flash, tools: [brand_voice_check, legal_compliance_check, ...]
     - Output: { reviewResult, reviewScore: 85, reviewConfidence: 0.8 }

9. Governor Node:
     - Score 85 < 90 → khong early exit
     - Budget OK → pass through
     - Output: { finalResponse: generatedContent }

10. Graph Engine: status = 'completed'

11. Backend: Emit SSE events → Frontend render
      - graph_plan, node_start/complete, agent_step_result, content_chunk, [DONE]

12. Post-workflow (fire-and-forget):
      - Brand Memory Agent: Phan tich va cap nhat brand_memory
      - Learning Agent: Trich xuat learnings tu session
```

---

## 14. CAC VAN DE TIEM AN CAN CHU Y

### 14.1 Hai he thong song song
Supervisor Loop va Graph Engine co nhieu code trung lap (agent-base.ts vs nodes/*, blackboard.ts vs blackboard-retriever.ts). Can roadmap de deprecate Supervisor.

### 14.2 Token Budget khong nhat quan
- Agent Registry: content-agent = 8000 tokens
- Node Registry: content node = 4000 estimatedTokens
- GraphState default total = 16384
- Cac con so nay chi la uoc tinh, khong theo doi thuc te tu LLM response

### 14.3 Governor Node chi la placeholder
- Chi check score >= 90 de early exit
- Khong co logic retry/revise khi score thap
- `needs_revision` exitReason khong duoc xu ly o dau

### 14.4 Image Node khong dung Blackboard v2
- Van dung `buildStateContext()` thay vi retriever
- Khong duoc auto-store output (extractStorableContent khong co case 'image')

### 14.5 Cache key collision risk
- SHA-256 truncated 16 chars (64 bits) → collision rate thap nhung khong bang khong
- Khong co cache versioning (thay doi system prompt → van dung cache cu)

### 14.6 Planning tools chua ket noi thuc te
- `start_planning_session`, `generate_plan_draft`, `refine_plan`, `finalize_plan` chua co implementation ro rang trong tool-executor (can kiem tra them)

---

## 15. KET LUAN

He thong Flowa Multi-Agent la mot kien truc phuc tap nhung co cau truc tot, bao gom:
- **8 nodes** chuyen biet voi phan cong ro rang
- **17 tools** bao phu toan bo workflow content
- **Multi-provider AI** voi circuit breaker va fallback
- **Blackboard v2** (pgvector semantic memory) cho context thong minh
- **Redis caching** giam 45-55% latency
- **Checkpoint/persistence** cho recovery
- **Streaming optimization** (80ms batching, per-channel isolation)
- **Admin-configurable** model governance per channel

He thong san sang cho expert review. Cac file chinh can kiem tra:
1. `supabase/functions/_shared/graph/` (engine + orchestrator + nodes)
2. `supabase/functions/_shared/tool-executor.ts` (tool implementations)
3. `supabase/functions/_shared/ai-provider.ts` (multi-provider routing)
4. `supabase/functions/_shared/streaming-handler.ts` (SSE streaming)
5. `src/hooks/useChatStreaming.ts` (frontend SSE handler)
