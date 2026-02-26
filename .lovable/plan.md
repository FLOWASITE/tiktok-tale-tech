
# Báo cáo Kỹ thuật Chi tiết v2.2 — Final Edition

> **Mục đích:** Nguồn sự thật duy nhất (Single Source of Truth) về kiến trúc hệ thống Multi-Agent Flowa.
> **Cập nhật lần cuối:** Sau Sprint 5 — Dead Code Cleanup + Type Hygiene.
> **Đối tượng:** Technical Lead, Solution Architect, Security Reviewer.

---

## 1. Tổng quan Kiến trúc

Flowa sử dụng kiến trúc **Agentic Operating System** dựa trên Graph Engine — một DAG (Directed Acyclic Graph) execution engine chạy trên Deno Edge Functions. Hệ thống đã loại bỏ hoàn toàn Legacy Supervisor và Single-Turn mode qua Sprint 4-5.

```
User Message
     │
     ▼
┌─────────────────┐
│  chat-topics    │  Edge Function — điểm vào duy nhất
│  index.ts       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │  Fast-path heuristic (0 LLM cost) + LLM fallback
│  orchestrator.ts│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Graph Engine   │  DAG compiler + parallel executor
│  graph-engine.ts│
└────────┬────────┘
         │
   ┌─────┼──────┬──────┬──────┬──────┬──────┬──────┬──────┐
   ▼     ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 Research Brand  Compliance Strategy Content Reviewer Governor Image
         Memory
```

**Luồng thực thi chính:**

1. `chat-topics/index.ts` nhận request → fetch context song song (brand, persona, product, RAG, web search)
2. Orchestrator phân loại intent bằng heuristic regex (0 LLM cost). Nếu confidence < 0.7 → gọi LLM (Gemini 2.5 Flash) để lập kế hoạch
3. Graph Engine compile plan thành DAG → thực thi song song các node độc lập qua `Promise.allSettled`
4. Kết quả được stream về client qua SSE (Server-Sent Events)

---

## 2. Các Thành phần Chính

### 2.1 Graph Engine (`graph-engine.ts` — 719 dòng)

| Thành phần | Vai trò | Ghi chú kỹ thuật |
|---|---|---|
| `GraphBuilder` | API khai báo node, edge, conditional edge | Builder pattern, type-safe |
| `compileGraphFromPlan()` | Biên dịch `GraphPlan` → `GraphDefinition` | Topological sort cho dependency |
| `executeGraph()` | BFS-style executor | `Promise.allSettled` cho parallel nodes |
| `runOrchestrator()` | Entry point cao nhất | orchestrate → compile → execute |
| `TEMPLATE_PLANS` | 6 template có sẵn | Xem bảng Intent Mapping bên dưới |

**Tính năng nâng cao:**

| Tính năng | Mô tả | Ngưỡng / Cấu hình |
|---|---|---|
| Continuation Pattern | Lưu checkpoint khi elapsed > threshold, trả partial result | `continuationThresholdMs` = 50s (safety margin cho Edge Function 55s timeout) |
| Token Budget | Mỗi node có `estimatedTokens`, engine skip node khi budget cạn kiệt | Default total: 16,384 tokens |
| Conditional Edges | Governor → Reviewer loop (revision cycle) | Max 2 revision rounds |
| Distributed Tracing | W3C Trace Context compatible, mỗi node có span riêng | `traceparent` header propagation |

### 2.2 Orchestrator (`orchestrator.ts` — 388 dòng)

**Quy trình quyết định 3 bước (Decision Pipeline):**

```
Step 1: forceTemplate     → Bắt buộc dùng template chỉ định (nếu có)
         │ miss
         ▼
Step 2: tryFastPath()     → Regex-based intent matching (0 LLM cost)
         │ confidence < 0.7
         ▼
Step 3: planWithLLM()     → Gemini 2.5 Flash + tool calling `create_graph_plan`
                            Có Blackboard v2 cross-session context
```

**Bảng Intent → Template Mapping:**

| Intent | Template Plan | Nodes thực thi | Parallel Groups | Ước tính Token |
|---|---|---|---|---|
| `chat` (default) | `chat` | content | — | ~4,000 |
| `research` | `research_only` | research | — | ~3,000 |
| `plan` | `generate_with_research` | research → strategy → content → reviewer → governor | research ∥ brand_memory ∥ compliance | ~12,000 |
| `generate` (có topic) | `generate_simple` | content → reviewer → governor | — | ~8,000 |
| `generate` (không topic) | `generate_with_research` | research → strategy → content → reviewer → governor | research ∥ brand_memory ∥ compliance | ~12,000 |
| `complex_workflow` / `multi_step` | `full_pipeline` | Đầy đủ 8 nodes | research ∥ brand_memory ∥ compliance | ~16,000 |
| `image_generate` | `image_generate` | image | — | ~1,500 |

**Fast-path Regex Coverage:** 6 intent × 3 ngôn ngữ (VI, EN, TH). Ưu tiên: `multi_step > complex_workflow > image_generate > plan > generate > research`.

### 2.3 GraphState (`graph-state.ts` — 265 dòng)

State trung tâm truyền giữa các node. Thiết kế theo **Immutable Update Pattern**.

| Nhóm field | Fields | Mô tả |
|---|---|---|
| Hội thoại | `messages`, `userMessage` | Lịch sử chat + tin nhắn hiện tại |
| Phân loại | `userIntent`, `confidence`, `orchestratorPlan` | Output của Orchestrator |
| Node outputs | `researchData`, `contentPlan`, `generatedContent`, `reviewResult`, `complianceResult`, `generatedImage`, `brandMemoryContext` | Kết quả từng node |
| Quality gate | `reviewScore`, `reviewConfidence`, `finalResponse` | Governor/Reviewer scoring |
| Tracking | `nodeResults[]`, `metadata` | Lịch sử thực thi, metrics |
| Budget | `tokenBudget` (total, used, perNode) | Quản lý ngân sách token |
| HITL | `interruptPayload` | Human-in-the-loop escalation |
| Anti-timeout | `continuationToken`, `continuingFromNode` | Resume sau checkpoint |

**Merge strategy (`mergeStateUpdate()`):**
- Arrays (`nodeResults`, `messages`) → **append**
- Objects (`metadata`, `tokenBudget`) → **shallow-merge**
- Primitives → **overwrite**

---

## 3. Hệ thống 8 Nodes

| # | Node | File | Gọi LLM? | Token Cost | Input chính | Output chính |
|---|---|---|---|---|---|---|
| 1 | Research | `research-node.ts` | ✅ | ~3,000 | `userMessage` | `researchData`, `bestTopic`, `suggestedTopics` |
| 2 | Brand Memory | `brand-memory-node.ts` | ❌ | 0 | `brandTemplateId` | `brandMemoryContext` |
| 3 | Compliance | `compliance-node.ts` | ❌ | 0 | `userMessage`, industry rules | `complianceResult` (riskLevel, riskScore, issues[]) |
| 4 | Strategy | `strategy-node.ts` | ✅ | ~2,500 | `researchData` | `contentPlan` |
| 5 | **Content** | `content-node.ts` | ✅ (×2) | ~4,000 | `userMessage`, `bestTopic`, `contentPlan` | `generatedContent` |
| 6 | Reviewer | `reviewer-node.ts` | ✅ | ~2,000 | `generatedContent` | `reviewResult`, `reviewScore`, `reviewConfidence` |
| 7 | Governor | `governor-node.ts` | ❌ (rule-based) | 0 | `reviewScore`, `reviewConfidence` | `finalResponse` hoặc revision trigger |
| 8 | Image | `image-node.ts` | ✅ | ~1,500 | `userMessage` | `generatedImage` |

### Chi tiết Node đặc biệt

**Content Node (Critical Path):**
- 2 lần gọi LLM: (1) tool calling để generate, (2) follow-up để tổng hợp
- Tools: `generate_multichannel`, `generate_script`, `generate_carousel`, `save_topic`
- Có Blackboard v2 semantic context retrieval + Redis cache (1h TTL)
- `toolChoice: 'required'` — bắt buộc LLM phải gọi tool

**Governor Node (Quality Gate) — 5 quy tắc:**

| # | Điều kiện | Hành động | Kết quả |
|---|---|---|---|
| 1 | Score ≥ 90 AND confidence ≥ 0.85 | Early exit | ✅ Approve |
| 2 | Budget used > 80% | Early exit + warning | ⚠️ Approve với cảnh báo |
| 3 | Revision rounds ≥ 2 (MAX) | Human escalation | 🔴 Interrupt → HITL |
| 4 | Score < 70 | Full revision | 🔄 Gọi Revision Controller → Reviewer loop |
| 5 | Score 70–89 | Soft revision | 🔄 Gọi Revision Controller → Reviewer loop |

---

## 4. Hệ thống Hỗ trợ

### 4.1 Blackboard v2 (`blackboard-retriever.ts` — 330 dòng)

Vector-based context retrieval thay thế `buildStateContext()`:

| Chức năng | Mô tả | Chi tiết kỹ thuật |
|---|---|---|
| **Store** | Lưu output mỗi node | `content_embeddings` table, embedding `gte-small` (384-dim) |
| **Retrieve** | Semantic search | RPC `match_blackboard_context`, cosine similarity |
| **Cross-session** | Tìm context từ phiên trước | Filter theo `brand_template_id` |
| **Hierarchical** | Xem toàn bộ output 1 session | Order by `created_at` |

### 4.2 Checkpoint (`checkpoint.ts` — 152 dòng)

| Hàm | Mô tả | Serialization limits |
|---|---|---|
| `saveCheckpoint()` | Lưu GraphState sau mỗi node | `workflow_checkpoints` table |
| `loadCheckpoint()` | Tải checkpoint mới nhất | Filter theo `session_id` |

**Serialization policy:** `generatedContent` 10K chars, `researchData` 5K chars, `nodeResults` chỉ metadata, `messages` 10 tin cuối.

### 4.3 Distributed Tracing (`tracing.ts`)

W3C Trace Context compatible. Mỗi `runOrchestrator()` tạo 1 Trace với root span. Mỗi node có child span với duration tracking. Export `getTraceHeaders()` cho external API calls.

### 4.4 SSE Writer (`sse-writer.ts`)

Event types: `turn_start`, `tool_executing`, `tool_result`, `turn_complete`, `content_chunk`, `final_response`, `error`, `agent_step_result`. Extracted từ legacy `agentic-loop.ts` (Sprint 5).

### 4.5 Token Manager (`token-manager.ts`)

- `createTokenManager()` — khởi tạo với model config
- `summarizeConversationHistory()` — tóm tắt khi vượt 40% budget
- `TokenBudgetAllocator` — phân bổ token cho các segment context

### 4.6 AI Provider (`ai-provider.ts`)

Abstraction layer gọi Lovable AI Gateway. `callAI()` — unified interface cho tất cả LLM calls từ nodes. Hỗ trợ tool calling, streaming, model selection.

---

## 5. Pipeline Xử lý Request

```
┌─ 1. Rate Limiting + Quota Check ──────────────────────────────┐
│                                                                │
├─ 2. Fetch Context Song Song ──────────────────────────────────┤
│    ├── Brand template + personas + products + mappings         │
│    ├── Industry Memory + Glossary                              │
│    ├── Learning Context (feedback history)                     │
│    ├── RAG (content + conversation embeddings)                 │
│    ├── User Preferences + Cross-Session Memory                 │
│    └── Web Search Prefetch (nếu phát hiện trending intent)     │
│                                                                │
├─ 3. Token Management ─────────────────────────────────────────┤
│    ├── Ước tính token conversation                             │
│    └── Summarize history nếu vượt 40% budget                   │
│                                                                │
├─ 4. Build System Prompt (system-prompt-builder.ts) ───────────┤
├─ 5. Prompt Guard: Sanitize input (phát hiện injection) ───────┤
│                                                                │
├─ 6. Graph Engine Execution ───────────────────────────────────┤
│    ├── a. Orchestrator → GraphPlan                             │
│    ├── b. Compile → GraphDefinition (DAG)                      │
│    └── c. Execute → Stream SSE events                          │
│                                                                │
└─ 7. Metrics + Usage Logging ──────────────────────────────────┘
```

---

## 6. Frontend Integration (`useChatStreaming.ts`)

### SSE Event Handling:

| SSE Event | Frontend Action | UI Component |
|---|---|---|
| `graph_plan` | Render progress steps với labels | `AgentPipelineBar` |
| `node_start` | Cập nhật step status = `active` | Pipeline dot animation |
| `node_complete` | Cập nhật step status = `completed` | ✅ checkmark + duration |
| `node_error` | Cập nhật step status = `error` | ❌ error icon |
| `content_chunk` | Append vào response text | Chat bubble (streaming) |
| `context_metadata` | Hiển thị badges | Context badges (Industry Memory, RAG, etc.) |

### Node Labels (8 nodes):

| Node ID | Vietnamese Label | Icon |
|---|---|---|
| `research` | Nghiên cứu | `Search` |
| `brand_memory` | Thương hiệu | `Brain` |
| `compliance` | Tuân thủ | `Shield` |
| `strategy` | Chiến lược | `ClipboardList` |
| `content` | Nội dung | `PenTool` |
| `reviewer` | Kiểm duyệt | `ShieldCheck` |
| `governor` | Kiểm soát | `Gauge` |
| `image` | Hình ảnh | `Image` |

---

## 7. Legacy Code đã Loại bỏ (Sprint 4-5)

| Component | Sprint | Dòng code xóa | Lý do |
|---|---|---|---|
| `supervisor/` (6 files) | Sprint 4 | ~800 | Thay thế bởi Orchestrator + Graph Engine |
| Supervisor block trong `index.ts` | Sprint 4 | ~140 | Dead code path |
| Agentic Loop block | Sprint 4 | ~130 | Thay thế bởi Graph Engine node execution |
| Single-Turn block | Sprint 4 | ~370 | Thay thế bởi Graph Engine `chat` template |
| `executeSupervisorLoop` import | Sprint 4 | 1 | Dead import |
| `executeAgenticLoop` import | Sprint 4 | 1 | Dead import |
| `CHAT_TOOLS`, `ToolCallResult` imports | Sprint 5 | 1 | Nodes tự import tools riêng |
| `executeToolCall` import | Sprint 5 | 1 | Không còn gọi trực tiếp |
| `tool-chain-executor` imports (4 symbols) | Sprint 5 | 6 | Dead code |
| `enableTools` destructuring | Sprint 5 | 1 | Backend không dùng flag này |
| `ChatRequest` legacy flags (4 fields) | Sprint 5 | 4 | `enableAgenticLoop`, `enableSupervisor`, `enableGraphEngine`, `maxAgentTurns` |
| `enableTools: true` frontend | Sprint 5 | 1 | Graph Engine nodes tự quản lý tools |
| `createSSEWriter` từ agentic-loop.ts | Sprint 5 | 0 (moved) | Extract ra `sse-writer.ts` |

**Tổng cộng:** ~1,456 dòng dead code đã loại bỏ qua 2 sprint.

**Còn lại có thể xóa (P0 Roadmap):**
- `agentic-loop.ts` (519 dòng) — không còn ai import sau Sprint 5
- `tool-chain-executor.ts` — dead code từ Sprint 5

---

## 8. Bảng Nâng cấp Kỹ thuật

### 8.1 Tổng hợp theo Phiên bản

| Phiên bản | Phạm vi | Sprint | Số thay đổi | Impact |
|---|---|---|---|---|
| **v2.0** | Core Engine — xây dựng nền tảng | Sprint 1 | 5 tính năng | Thay thế hoàn toàn kiến trúc cũ |
| **v2.1** | Quality & Security — hardening | Sprint 2 | 4 tính năng | Production-ready quality gates |
| **v2.2** | Polish & Cleanup — loại bỏ legacy | Sprint 3-5 | 12 thay đổi | ~1,456 dòng dead code xóa, type safety |

### 8.2 Chi tiết từng Tính năng

#### v2.0 — Core Engine (Sprint 1)

| # | Tính năng | Mô tả kỹ thuật | Files chính | Đánh giá |
|---|---|---|---|---|
| 1 | Graph Engine (8 nodes, DAG executor) | BFS executor với `Promise.allSettled` cho parallel nodes. Hỗ trợ conditional edges, token budget tracking | `graph-engine.ts` (719 LOC) | ⭐ Core — toàn bộ hệ thống phụ thuộc |
| 2 | Orchestrator (fast-path + LLM planning) | 3-step decision: forceTemplate → tryFastPath (regex) → planWithLLM (Gemini Flash). 6 template plans | `orchestrator.ts` (388 LOC) | ⭐ Critical — quyết định execution path |
| 3 | Blackboard v2 (vector context) | Semantic retrieval qua `gte-small` (384-dim). Cross-session memory, RPC `match_blackboard_context` | `blackboard-retriever.ts` (330 LOC) | Thay thế hardcoded `buildStateContext()` |
| 4 | Checkpoint/Continuation | Serialize GraphState vào `workflow_checkpoints`. Resume sau Edge Function timeout (55s) | `checkpoint.ts` (152 LOC) | Giải quyết Deno 60s timeout constraint |
| 5 | Distributed Tracing | W3C Trace Context. Root span per request, child span per node. `getTraceHeaders()` cho external calls | `tracing.ts` | Observability cho production debugging |

#### v2.1 — Quality & Security (Sprint 2)

| # | Tính năng | Mô tả kỹ thuật | Files chính | Đánh giá |
|---|---|---|---|---|
| 6 | Governor + Revision Controller | 5-rule quality gate (rule-based, 0 LLM). Revision Controller gọi LLM để sửa nội dung. Max 2 rounds | `governor-node.ts`, `revision-controller.ts` | Đảm bảo output quality trước khi trả user |
| 7 | Compliance Node | Rule-based precheck với `preCheckComplianceV2()`. Resolved rules từ `industry_jurisdiction_profiles` | `compliance-node.ts` | 0 LLM cost, chạy parallel với research |
| 8 | Redis Cache (Content Node) | Upstash Redis, cache key = hash(brandId + intent + topic). TTL 1 giờ | `redis-cache.ts`, `content-node.ts` | Giảm ~40% LLM calls cho repeated queries |
| 9 | Prompt Guard | Phát hiện prompt injection patterns. Sanitize user input trước khi đưa vào LLM | `prompt-guard.ts` | Security layer bắt buộc |

#### v2.2 — Polish & Cleanup (Sprint 3-5)

| # | Tính năng | Sprint | Mô tả kỹ thuật | Impact |
|---|---|---|---|---|
| 10 | BrandContextCard forwardRef fix | S3 | Fix React ref forwarding cho BrandContextCard component | UI stability |
| 11 | Unified Feedback UI | S3 | Gộp feedback UI thành `ContentFeedback` component duy nhất | Code dedup |
| 12 | Type safety cleanup | S3 | Loại bỏ `as any` casts, thêm proper typing | DX improvement |
| 13 | Xóa Legacy Supervisor | S4 | Xóa toàn bộ `supervisor/` (6 files, ~800 LOC) + 140 LOC block trong index.ts | **-940 LOC** |
| 14 | Xóa Single-Turn + Agentic Loop | S4 | Xóa ~500 LOC dead execution paths trong index.ts | **-500 LOC** |
| 15 | Governor + Compliance labels UI | S4 | Thêm node labels cho Governor và Compliance vào `AgentPipelineBar` | UX completeness |
| 16 | Output token metrics fix | S4 | Sửa logic đếm output tokens từ LLM response `usage` header | Metrics accuracy |
| 17 | Conversation History injection | S4 | Inject conversation history vào Graph Engine state cho multi-turn context | Context continuity |
| 18 | Dead imports cleanup | S5 | Xóa 7 dead imports (CHAT_TOOLS, executeToolCall, tool-chain-executor, etc.) | **-12 LOC** |
| 19 | ChatRequest type hygiene | S5 | Xóa 4 legacy flags: `enableAgenticLoop`, `enableSupervisor`, `enableGraphEngine`, `maxAgentTurns` | Type accuracy |
| 20 | SSE Writer extraction | S5 | Extract `createSSEWriter` từ `agentic-loop.ts` (519 LOC) ra `sse-writer.ts` | Unblock legacy deletion |
| 21 | Frontend enableTools removal | S5 | Xóa `enableTools: true` từ request body — Graph Engine nodes tự quản lý tools | API contract cleanup |

### 8.3 Lộ trình Phát triển (Roadmap)

| Ưu tiên | Tính năng | Mô tả | Độ phức tạp | Ước tính effort | Prerequisites |
|---|---|---|---|---|---|
| **P0** | Xóa `agentic-loop.ts` | 519 dòng legacy, không còn import | Thấp | 0.5h | Sprint 5 ✅ |
| **P0** | Xóa `tool-chain-executor.ts` | Dead code từ Sprint 5 | Thấp | 0.5h | Sprint 5 ✅ |
| **P1** | Blackboard v2 production tuning | Index optimization, TTL policy, embedding batch insert | Trung bình | 2-3 ngày | Production traffic data |
| **P1** | Checkpoint resume API | Edge Function endpoint để resume từ checkpoint | Trung bình | 2 ngày | — |
| **P1** | Governor HITL UI | Frontend render `interruptPayload` cho approval flow | Cao | 3-4 ngày | Governor interrupt logic ✅ |
| **P2** | Multi-model routing | Orchestrator chọn model tối ưu cho từng node (cost/quality tradeoff) | Cao | 1 tuần | Model benchmarking |
| **P2** | Streaming per-node | Stream output từ từng node thay vì chỉ final content | Trung bình | 3 ngày | SSE protocol extension |
| **P2** | Graph visualization | Frontend render DAG execution realtime (D3/React Flow) | Cao | 1 tuần | — |
| **P3** | A/B testing pipeline | So sánh output giữa các plan/model variants | Cao | 2 tuần | Multi-model routing |
| **P3** | Custom node plugins | Cho phép user định nghĩa node tự tạo | Rất cao | 1 tháng | Plugin SDK design |

---

## 9. Cấu trúc Thư mục Backend

```
supabase/functions/
├── chat-topics/
│   └── index.ts                  # Entry point (858 LOC)
└── _shared/
    ├── graph/
    │   ├── graph-engine.ts       # DAG engine (719 LOC)
    │   ├── graph-state.ts        # State schema (265 LOC)
    │   ├── orchestrator.ts       # Intent → Plan (388 LOC)
    │   ├── checkpoint.ts         # Persistence (152 LOC)
    │   ├── blackboard-retriever.ts # Vector context (330 LOC)
    │   └── nodes/
    │       ├── index.ts          # Registry factory
    │       ├── research-node.ts
    │       ├── brand-memory-node.ts
    │       ├── compliance-node.ts
    │       ├── strategy-node.ts
    │       ├── content-node.ts
    │       ├── reviewer-node.ts
    │       ├── governor-node.ts
    │       ├── image-node.ts
    │       └── revision-controller.ts
    ├── types/
    │   └── chat-types.ts         # Shared type definitions
    ├── sse-writer.ts             # SSE streaming utility
    ├── tracing.ts                # Distributed tracing (W3C)
    ├── ai-provider.ts            # LLM gateway abstraction
    ├── token-manager.ts          # Token budget management
    ├── system-prompt-builder.ts  # System prompt assembly
    ├── prompt-guard.ts           # Injection detection
    ├── error-utils.ts            # Retry, fallback, timeout
    ├── logger.ts                 # Structured logging + metrics
    ├── rate-limiter.ts           # Rate limiting + quota
    ├── cost-estimator.ts         # LLM cost estimation
    └── cache/
        └── redis-cache.ts        # Upstash Redis caching
```

---

## 10. Chỉ số Hiệu suất & Cấu hình

| Metric | Giá trị | Ghi chú |
|---|---|---|
| Max execution time | 55s | Safety margin cho Deno Edge Function timeout (60s) |
| Token budget default | 16,384 | Configurable per organization |
| Conversation history cap | 40% budget | ~6,500 tokens cho history |
| Heartbeat interval | 15s | SSE keepalive |
| Content cache TTL | 1 giờ | Upstash Redis |
| Checkpoint serialization | 10K content, 5K research, 10 messages | Truncation policy |
| Max revision rounds | 2 | Governor → Reviewer loop cap |
| Governor quality threshold | Score ≥ 90, Confidence ≥ 0.85 | Early exit (approve) |
| Budget exhaustion threshold | > 80% used | Forced early exit |
| Orchestrator confidence threshold | 0.7 | Below → LLM planning fallback |
| Embedding model | `gte-small` (384-dim) | Blackboard v2 |
| Primary LLM | `google/gemini-2.5-flash` | Orchestrator + Content Node |
| Caching hit rate target | ≥ 30% | Content Node repeated queries |

---

## 11. Đánh giá Kiến trúc (cho Expert Review)

### Điểm mạnh

1. **Zero-cost routing:** Fast-path heuristic xử lý ~70% requests không cần LLM call cho orchestration
2. **Parallel execution:** Nodes độc lập chạy song song (research ∥ brand_memory ∥ compliance) giảm latency
3. **Anti-timeout resilience:** Continuation pattern cho phép resume workflow sau Edge Function timeout
4. **Cost efficiency:** Brand Memory + Compliance nodes không gọi LLM (rule-based/DB-only)
5. **Quality assurance:** Governor → Reviewer loop với max 2 rounds đảm bảo output quality

### Rủi ro & Hạn chế

1. **Single point of failure:** `chat-topics/index.ts` (858 LOC) là entry point duy nhất — cần monitoring chặt
2. **Blackboard v2 cold start:** Session mới không có cross-session context → chất lượng output thấp hơn
3. **Token budget rigidity:** Fixed 16,384 budget có thể không đủ cho complex_workflow với nhiều context
4. **Revision loop cost:** Mỗi revision round tiêu ~4,000 tokens thêm (Content + Reviewer) — max 2 rounds = +8,000 tokens
5. **Edge Function timeout:** 55s safety margin chặt — full_pipeline có thể timeout nếu LLM response chậm

### Khuyến nghị

1. **P0:** Xóa legacy files (`agentic-loop.ts`, `tool-chain-executor.ts`) — giảm maintenance burden
2. **P1:** Implement Checkpoint resume API — giải quyết timeout cho full_pipeline
3. **P1:** Add circuit breaker cho `callAI()` — prevent cascade failure khi LLM provider down
4. **P2:** Split `index.ts` thành modules (context fetcher, request handler, response builder) — cải thiện maintainability
