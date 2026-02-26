
# Báo cáo Kỹ thuật Chi tiết v2.2 — Final Edition (Revised)

> **Mục đích:** Nguồn sự thật duy nhất (Single Source of Truth) về kiến trúc hệ thống Multi-Agent Flowa.
> **Cập nhật lần cuối:** Sau Sprint 5 — Dead Code Cleanup + Type Hygiene. Revised theo góp ý chuyên gia.
> **Đối tượng:** Technical Lead, Solution Architect, Security Reviewer, Onboarding Developer.

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

**⚠️ Continuation Pattern — Giới hạn hiện tại:**

Backend đã implement đầy đủ: khi elapsed > 50s, `saveCheckpoint()` lưu GraphState vào `workflow_checkpoints`, trả partial result kèm `continuationToken` và danh sách nodes đã hoàn thành. Tuy nhiên:

- **Chưa có Resume API:** Không có endpoint riêng để client gọi lại với `continuationToken`. Client hiện nhận partial result nhưng không tự động resume.
- **Workaround tạm thời:** User gửi message mới → Orchestrator tạo plan mới → chạy lại từ đầu (không resume từ checkpoint).
- **Thiết kế Resume Flow (P1 Roadmap):**
  1. Backend trả SSE event `continuation_required` chứa `continuationToken` + danh sách nodes đã/chưa hoàn thành
  2. Frontend nhận event → hiển thị kết quả đã có + indicator "Đang tiếp tục xử lý..." → tự động gọi `POST /chat-topics` với `continuationToken` thay vì message mới
  3. Backend nhận token → `loadCheckpoint()` → rebuild GraphState → chạy tiếp từ node dang dở (không compile lại plan)
  4. **Edge cases:** Idempotency guarantee (node đã complete không chạy lại), staleness check (checkpoint > 5 phút → reject), state validation (verify data integrity)

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
| 1 | Research | `research-node.ts` | ✅ (×2) | ~3,000 | `userMessage` | `researchData`, `bestTopic`, `suggestedTopics` |
| 2 | Brand Memory | `brand-memory-node.ts` | ❌ | 0 | `brandTemplateId` | `brandMemoryContext` |
| 3 | Compliance | `compliance-node.ts` | ❌ | 0 | `userMessage`, industry rules | `complianceResult` (riskLevel, riskScore, issues[]) |
| 4 | Strategy | `strategy-node.ts` | ✅ | ~2,500 | `researchData` | `contentPlan` |
| 5 | **Content** | `content-node.ts` | ✅ (×2) | ~4,000 | `userMessage`, `bestTopic`, `contentPlan` | `generatedContent` |
| 6 | Reviewer | `reviewer-node.ts` | ✅ | ~2,000 | `generatedContent` | `reviewResult`, `reviewScore`, `reviewConfidence` |
| 7 | Governor | `governor-node.ts` | ❌ (rule-based) | 0* | `reviewScore`, `reviewConfidence` | `finalResponse` hoặc revision trigger |
| 8 | Image | `image-node.ts` | ✅ | ~1,500 | `userMessage` | `generatedImage` |

*Governor node không gọi LLM trực tiếp, nhưng Revision Controller bên trong gọi LLM (~4,000 tokens mỗi vòng revision).

### Chi tiết Node đặc biệt

**Research Node — Tools & Pipeline:**
- Tools thực tế trong code: `web_search`, `search_topics`, `discover_topics` (3 tools)
- Pipeline: (1) LLM call với `toolChoice: 'required'` → gọi tools → (2) follow-up LLM call để tổng hợp
- `discover_topics` trả về suggested topics → extract `bestTopic` (topic đầu tiên)
- Fallback: nếu không có `discover_topics` result → lấy `bestTopic` từ `web_search` results
- Cache: Redis 4h TTL

**Content Node (Critical Path) — Pipeline 2 bước:**
- 2 lần gọi LLM: (1) tool calling để generate, (2) follow-up để tổng hợp
- Tools: `generate_multichannel`, `generate_script`, `generate_carousel`, `save_topic`
- **`generate_multichannel` pipeline nội bộ:**
  1. Gọi Edge Function `generate-core-content` → tạo core content + lưu DB
  2. Gọi Edge Function `generate-multichannel` → transform core content sang các kênh
  3. Mỗi Edge Function call có timeout riêng. Nếu bước 1 thành công nhưng bước 2 thất bại → trả core content (graceful degradation)
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

**⚠️ Governor Human Escalation — Giới hạn hiện tại:**

Khi Rule 3 trigger (max revision rounds), Governor set `status: 'interrupted'` và tạo `interruptPayload` với options (accept/retry). Tuy nhiên:

- **Chưa có UI frontend** để render `interruptPayload` (P1 Roadmap)
- **Behavior hiện tại:** Workflow dừng, trả về content bản revision cuối cùng kèm `exitReason: 'human_escalation'`
- **Degradation path tạm thời (cần implement):**
  1. Trả content bản có score cao nhất trong các vòng revision
  2. Kèm SSE event `quality_warning` chứa `reviewResult` chi tiết
  3. Frontend hiển thị content với banner "Nội dung chưa đạt tiêu chuẩn tối ưu"
  4. Write record vào `escalation_queue` table để team review async
  5. Khi UI sẵn sàng → chuyển từ async sang interactive approval

**Image Node — Blackboard v2 Integration: ✅ ĐÃ IMPLEMENT:**

Image Node đã tích hợp đầy đủ Blackboard v2:
- **Retrieve:** Lấy context từ `image_generation` và `generated_content` entries
- **Store:** Sau khi generate thành công, lưu image metadata (prompt, aspect_ratio, style, channel, URL) vào Blackboard v2 với `content_type: 'image'`, `node_name: 'image_generation'`
- **Cross-session:** Image prompts và styles được kế thừa qua các phiên làm việc

---

## 4. Tool Registry

### 4.1 Danh sách Tools đầy đủ

| # | Tool Name | Category | Node sử dụng | Status | Mô tả |
|---|---|---|---|---|---|
| 1 | `web_search` | Research | Research | ✅ Active | Tìm kiếm real-time: trending, news, competitor, general |
| 2 | `search_topics` | Topic | Research | ✅ Active | Tìm topics đã lưu trong Topic Bank |
| 3 | `discover_topics` | Topic | Research | ✅ Active | Gợi ý topic mới, trending, gap analysis (qua Topic-AI) |
| 4 | `save_topic` | Topic | Content | ✅ Active | Lưu topic vào Topic Bank |
| 5 | `generate_script` | Content | Content | ✅ Active | Tạo video script TikTok/YouTube Shorts |
| 6 | `generate_carousel` | Content | Content | ✅ Active | Tạo carousel image prompts |
| 7 | `generate_multichannel` | Content | Content | ✅ Active | Tạo nội dung đa kênh (pipeline 2 bước) |
| 8 | `start_planning_session` | Planning | Content | ✅ Active | Bắt đầu phiên lập kế hoạch content |
| 9 | `generate_plan_draft` | Planning | Content | ✅ Active | Tạo bản nháp kế hoạch |
| 10 | `refine_plan` | Planning | Content | ✅ Active | Chỉnh sửa kế hoạch theo feedback |
| 11 | `finalize_plan` | Planning | Content | ✅ Active | Hoàn thành và lưu kế hoạch |
| 12 | `get_active_session` | Planning | Content | ✅ Active | Lấy thông tin planning session |
| 13 | `brand_voice_check` | Review | Reviewer | ✅ Active | Kiểm tra brand voice compliance |
| 14 | `legal_compliance_check` | Review | Reviewer | ✅ Active | Kiểm tra quy định pháp luật ngành |
| 15 | `platform_best_practices` | Review | Reviewer | ✅ Active | Đánh giá theo best practices nền tảng |
| 16 | `generate_image` | Image | Image | ✅ Active | Tạo ảnh AI từ prompt |
| 17 | `edit_image` | Image | Image | ✅ Active | Chỉnh sửa ảnh (remove bg, change style, etc.) |
| 18 | `task_complete` | Control | Agentic (legacy) | ⚠️ Legacy | Signal hoàn thành task — chỉ dùng trong agentic-loop.ts |

### 4.2 Tool → Node Mapping

| Node | Tools sử dụng | Filter constant |
|---|---|---|
| Research | `web_search`, `search_topics`, `discover_topics` | `RESEARCH_TOOLS` |
| Content | `generate_script`, `generate_carousel`, `generate_multichannel`, `save_topic` | `CONTENT_TOOLS` |
| Image | `generate_image`, `edit_image` | `IMAGE_TOOLS` |
| Reviewer | `brand_voice_check`, `legal_compliance_check`, `platform_best_practices` | (inline filter) |

---

## 5. Hệ thống Hỗ trợ

### 5.1 AI Provider (`ai-provider.ts` — 1,237 dòng)

**Multi-Provider Routing Architecture:**

| Provider | Endpoint | Models | Auth |
|---|---|---|---|
| **Lovable Gateway** (default) | `ai.gateway.lovable.dev` | `google/gemini-*`, `openai/gpt-5*`, `sonar` | `LOVABLE_API_KEY` |
| OpenAI Direct | `api.openai.com` | `gpt-*` (without prefix) | User's encrypted API key |
| Anthropic Direct | `api.anthropic.com` | `claude-*` | User's encrypted API key |
| Google Gemini Direct | `generativelanguage.googleapis.com` | `gemini-*` (without prefix) | User's API key |
| OpenRouter | `openrouter.ai` | 200+ models (`anthropic/`, `meta-llama/`, `deepseek/`, `qwen/`, etc.) | User's API key |

**Model Resolution Chain:**
1. Check `modelOverride` (admin-configured per channel/function)
2. Check `ai_function_configs` table (per organization)
3. Default: `google/gemini-2.5-flash` via Lovable Gateway

**API Key Security:**
- User API keys encrypted via `crypto.ts` (`encrypt()`/`decrypt()`)
- Stored in `ai_provider_configs.encrypted_api_key`
- Fallback: `api_key_secret_name` → Deno environment variable
- Legacy plain-text keys detected by prefix (`sk-`, `key_`, `AIza`)

### 5.2 Circuit Breaker (`circuit-breaker.ts` — 439 dòng)

**Hybrid State: Redis + In-Memory**

| Config | Giá trị | Mô tả |
|---|---|---|
| `failureThreshold` | 3 | Số failures tối thiểu trước khi trip |
| `failureRateThreshold` | 0.3 (30%) | Failure rate trigger |
| `resetTimeoutMs` | 5 phút | Thời gian chờ trước khi thử lại (half-open) |
| `halfOpenRequests` | 2 | Số test requests trong half-open state |
| `windowSizeMs` | 5 phút | Rolling window cho failure rate |

**State Machine:** `CLOSED` → (failures ≥ 3 AND rate ≥ 30%) → `OPEN` → (sau 5 phút) → `HALF-OPEN` → (success) → `CLOSED` / (failure) → `OPEN`

**State Persistence:**
- **Primary:** Upstash Redis (`flowa:cb:{model}` key, TTL = resetTimeoutMs)
- **Fallback:** In-memory `Map<string, CircuitBreakerState>` khi Redis không khả dụng
- **Sync:** Redis state được sync vào in-memory khi đọc. Giải quyết vấn đề cross-instance awareness khi auto-scale.

**Fallback Model Chain:**

| Primary Model | Fallback |
|---|---|
| `google/gemini-2.5-pro` | `google/gemini-2.5-flash` |
| `google/gemini-3-pro-preview` | `google/gemini-2.5-flash` |
| `openai/gpt-5` | `google/gemini-2.5-pro` |
| `openai/gpt-5-mini` | `google/gemini-2.5-flash` |
| `openai/gpt-5-nano` | `google/gemini-2.5-flash-lite` |
| `anthropic/claude-sonnet-4` | `google/gemini-2.5-pro` |
| `deepseek/deepseek-r1` | `google/gemini-2.5-pro` |
| (mọi model khác) | `google/gemini-2.5-flash` (default) |

**Logging:** Trip events được ghi vào `circuit_breaker_events` table (provider, model, failure_count, failure_rate, instance_id).

**Admin Override vs. Circuit Breaker:** Admin model override (từ `ai_function_configs`) được áp dụng trước khi circuit breaker check. Nếu admin-configured model bị trip → circuit breaker chuyển sang fallback model tự động.

### 5.3 Blackboard v2 (`blackboard-retriever.ts` — 330 dòng)

Vector-based context retrieval thay thế `buildStateContext()`:

| Chức năng | Mô tả | Chi tiết kỹ thuật |
|---|---|---|
| **Store** | Lưu output mỗi node | `content_embeddings` table, embedding `gte-small` (384-dim) |
| **Retrieve** | Semantic search | RPC `match_blackboard_context`, cosine similarity |
| **Cross-session** | Tìm context từ phiên trước | Filter theo `brand_template_id` |
| **Hierarchical** | Xem toàn bộ output 1 session | Order by `created_at` |

**Priority Scoring:** Same session (+0.15) > Same brand (+0.05) > Global (0). Recency decay: >90 days (-0.25), >30 days (-0.1).

**Node Integration Status:**

| Node | Retrieve | Store | Notes |
|---|---|---|---|
| Research | ✅ | ✅ (auto) | Retrieve `research_output`, `plan` |
| Content | ✅ | ✅ (auto) | Retrieve `research_output`, `plan`, `compliance_check`, `generated_content` |
| Image | ✅ | ✅ | Retrieve `image_generation`, `generated_content`. Store image metadata (prompt, style, URL) |
| Strategy | ✅ | ✅ (auto) | — |
| Reviewer | ✅ | ✅ (auto) | — |
| Brand Memory | ❌ | ❌ | DB-only fetch, không cần semantic context |
| Compliance | ❌ | ❌ | Rule-based, không cần semantic context |

### 5.4 Caching Layer (`cache/redis-cache.ts`)

**Backend:** Upstash Redis (kết nối qua REST API, graceful fallback nếu không có credentials).

| Chức năng | API | Mô tả |
|---|---|---|
| `withCache(key, fn, ttl)` | Decorator | Wrap bất kỳ async function, check cache trước khi gọi |
| `generateCacheKey(brandId, nodeType, stateSubset, promptVersion)` | Key generation | SHA-256 hash (truncated 32 chars) của payload |
| `invalidateByPrefix(prefix)` | Invalidation | Xóa tất cả keys matching `flowa:cache:{prefix}*` |

**Cache TTL per Node:**

| Node | TTL | Cache Key Inputs | Ghi chú |
|---|---|---|---|
| Research | 4 giờ | `userMessage`, `industry` | Cached vì web search results ít thay đổi trong 4h |
| Content | 1 giờ | `userMessage`, `bestTopic`, `contentPlan` (200 chars), `industry` | Ngắn hơn vì content cần freshness |
| Strategy | 2 giờ | (tùy implementation) | — |

**Cache Key Format:** `flowa:cache:{brandId}:{nodeType}:{sha256_hex[0:32]}`

**Cache Invalidation Strategy:**
- **Automatic:** `invalidate_cache_on_brand_update()` trigger → xóa cache khi brand template thay đổi (forbidden_words, tone_of_voice, preferred_words, etc.)
- **Automatic:** `invalidate_cache_on_industry_update()` trigger → xóa cache khi industry version thay đổi
- **Manual:** `invalidateByPrefix()` cho admin tools
- **Prompt versioning:** `promptVersion` parameter trong `generateCacheKey()` → thay đổi prompt tự động invalidate cache cũ (không cần xóa)

### 5.5 Checkpoint (`checkpoint.ts` — 152 dòng)

| Hàm | Mô tả | Serialization limits |
|---|---|---|
| `saveCheckpoint()` | Lưu GraphState sau mỗi node | `workflow_checkpoints` table |
| `loadCheckpoint()` | Tải checkpoint mới nhất | Filter theo `session_id` |
| `completeCheckpoint()` | Mark checkpoint = completed | — |
| `failCheckpoint()` | Mark checkpoint = failed | — |

**Serialization policy:** `generatedContent` 10K chars, `researchData` 5K chars, `nodeResults` chỉ metadata (drop `stateUpdate`, `full content`), `messages` 10 tin cuối.

**Cleanup:** `cleanup_old_checkpoints()` DB function — xóa checkpoints > 7 ngày hoặc completed/failed > 1 ngày.

### 5.6 Distributed Tracing (`tracing.ts`)

W3C Trace Context compatible. Mỗi `runOrchestrator()` tạo 1 Trace với root span. Mỗi node có child span với duration tracking. Export `getTraceHeaders()` cho external API calls. Trace ID và Span ID được inject vào `callAI()` headers (`x-trace-id`, `x-span-id`).

### 5.7 SSE Writer (`sse-writer.ts`)

Event types: `turn_start`, `tool_executing`, `tool_result`, `turn_complete`, `content_chunk`, `final_response`, `error`, `agent_step_result`. Extracted từ legacy `agentic-loop.ts` (Sprint 5).

### 5.8 Token Manager (`token-manager.ts`)

- `createTokenManager()` — khởi tạo với model config
- `summarizeConversationHistory()` — tóm tắt khi vượt 40% budget
- `TokenBudgetAllocator` — phân bổ token cho các segment context

### 5.9 Prompt Guard (`prompt-guard.ts`)

**Detection Method:** Regex-based pattern matching (không dùng ML model hay LLM call → 0 latency overhead).

**Pattern Categories:**

| Category | Severity | Ví dụ pattern | Số patterns |
|---|---|---|---|
| Instruction Override | 🔴 High | `ignore all previous instructions`, `bỏ qua hướng dẫn trước` | 3 (EN) + 1 (VI) |
| Prompt Extraction | 🔴 High / 🟡 Medium | `show me your system prompt`, `what are your instructions` | 4 |
| Role Hijacking | 🔴 High / 🟡 Medium | `you are now a`, `ADMIN MODE`, `DAN mode`, `jailbreak` | 7 |
| Delimiter Injection | 🟡 Medium | `` ```system ``, `[SYSTEM]`, `<system>` | 3 |
| Data Exfiltration | 🟡 Medium / 🔴 High | `output all data`, `list all api keys` | 2 |

**Action Matrix:**

| Risk Level | Action | Response |
|---|---|---|
| `none` | Pass through | Không thay đổi |
| `low` | Flag + pass through | Log patterns, không sửa message |
| `medium` | Flag + pass through | Log patterns, không sửa message |
| `high` | **Strip dangerous patterns** + flag | Replace patterns với `[removed]`, log to `security_events` table |

**Input limits:** Max 10,000 chars (truncate nếu vượt).

**False Positive Handling:** Patterns chỉ match cụm từ rất cụ thể (VD: "ignore all previous instructions") — không match từng từ đơn lẻ. Tuy nhiên, user viết marketing content chứa cụm "ignore all previous instructions" (VD: hướng dẫn khách hàng) sẽ bị strip ở high severity. **Known limitation** — cần context-aware detection trong tương lai.

**Logging:** `logSecurityEvent()` → fire-and-forget insert vào `security_events` table (user_id, org_id, risk_level, flagged_patterns, original_length).

### 5.10 Rate Limiter (`rate-limiter.ts`)

**Rate Limiting:**

| Plan | General (req/min) | Chat (msg/min) |
|---|---|---|
| Free | 10 | 5 |
| Starter | 30 | 15 |
| Pro | 60 | 30 |
| Enterprise | 120 | 60 |

**Implementation:** In-memory `Map` with automatic cleanup (5 phút interval). Mỗi Edge Function instance có store riêng — **limitation:** rate limit không shared across instances khi auto-scale.

**Quota Management:**
- Check `subscriptions` table → `plan_limits` table → `usage_logs` count
- Quota types: `script`, `carousel`, `multichannel`, `image_generation`, `ai_edit`
- `-1` = unlimited

**Response khi exceeded:**
- Rate limit: HTTP 429 với `Retry-After` header, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Quota: HTTP 402 với message "Đã hết quota. Nâng cấp gói để tiếp tục."

---

## 6. Security & Data Isolation

### 6.1 Authentication & Authorization

- **JWT Validation:** `verify_jwt = false` trong config.toml → validate manually trong code (cho phép custom error handling)
- **Multi-tenant isolation:** Tất cả queries filter theo `organization_id` từ JWT claims
- **RLS Policies:** Enabled trên tất cả tables chứa user data
- **Organization Roles:** `owner`, `admin`, `member` → checked via `is_org_member()`, `is_org_admin()`, `has_org_role()`

### 6.2 API Key Protection

- User API keys (OpenAI, Anthropic, etc.) encrypted via AES-256 (`crypto.ts`)
- Stored in `ai_provider_configs.encrypted_api_key`
- Decryption chỉ xảy ra at runtime trong Edge Function, không expose ra client

### 6.3 Data Access Control

| Data | Access Rule |
|---|---|
| Brand templates | Same organization only |
| Generated content | Same organization only |
| Chat conversations | Same user only |
| AI metrics | Same organization only |
| Industry templates | Public (system-managed) |

---

## 7. Pipeline Xử lý Request

```
┌─ 1. Rate Limiting + Quota Check ──────────────────────────────┐
│    ├── In-memory rate limit (per plan tier)                     │
│    └── DB quota check (usage_logs vs plan_limits)              │
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
├─ 5. Prompt Guard: Sanitize input (regex pattern detection) ───┤
│                                                                │
├─ 6. Graph Engine Execution ───────────────────────────────────┤
│    ├── a. Orchestrator → GraphPlan                             │
│    ├── b. Compile → GraphDefinition (DAG)                      │
│    └── c. Execute → Stream SSE events                          │
│                                                                │
└─ 7. Metrics + Usage Logging ──────────────────────────────────┘
```

---

## 8. Frontend Integration

### 8.1 `useChatStreaming.ts` — Agentic Chat

**SSE Event Handling:**

| SSE Event | Frontend Action | UI Component |
|---|---|---|
| `graph_plan` | Render progress steps với labels | `AgentPipelineBar` |
| `node_start` | Cập nhật step status = `active` | Pipeline dot animation |
| `node_complete` | Cập nhật step status = `completed` | ✅ checkmark + duration |
| `node_error` | Cập nhật step status = `error` | ❌ error icon |
| `content_chunk` | Append vào response text | Chat bubble (streaming) |
| `context_metadata` | Hiển thị badges | Context badges (Industry Memory, RAG, etc.) |

**Node Labels (8 nodes):**

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

### 8.2 `useStreamingGeneration` — Multichannel Editor

Hook riêng cho Multichannel content generation (tách biệt với chat):
- **Per-channel state isolation:** Dùng `useRef` + `channelUpdateSignal` để chỉ re-render kênh đang nhận data
- **Watchdog timeout:** Phát hiện generation bị stuck
- **React.memo optimization:** Ngăn re-render toàn bộ grid khi chỉ 1 kênh update

### 8.3 Error & Edge Case Handling

| Scenario | Frontend Behavior | Status |
|---|---|---|
| SSE connection drop | Hiển thị error, user retry manually | ✅ Implemented |
| `continuation_required` event | *Chưa xử lý* — chỉ nhận partial result | ❌ Cần implement (P1) |
| `quality_warning` event | *Chưa xử lý* — content trả bình thường | ❌ Cần implement (P1) |
| Long-running pipeline (>30s) | Heartbeat keepalive 15s, progress bar via `node_start`/`node_complete` | ✅ Implemented |
| Revision in progress | Không có progress indicator riêng cho revision loop | ❌ Cần implement (P2) |
| Node error (non-critical) | Skip node, tiếp tục pipeline | ✅ Implemented |
| Content Node error (critical) | Dừng pipeline, hiển thị error | ✅ Implemented |

---

## 9. Legacy Code đã Loại bỏ (Sprint 4-5)

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
- `agentic-loop.ts` (519 dòng) — vẫn tồn tại trên filesystem. Duy nhất `ai-config.ts` có entry `'agentic-loop'` trong config (cần xóa entry). `sse-writer.ts` có comment reference (cosmetic). **Cần chạy grep xác nhận trước khi xóa.**
- `tool-chain-executor.ts` — đã xác nhận 0 references trong codebase. An toàn để xóa.

---

## 10. Bảng Nâng cấp Kỹ thuật

### 10.1 Tổng hợp theo Phiên bản

| Phiên bản | Phạm vi | Sprint | Số thay đổi | Impact |
|---|---|---|---|---|
| **v2.0** | Core Engine — xây dựng nền tảng | Sprint 1 | 5 tính năng | Thay thế hoàn toàn kiến trúc cũ |
| **v2.1** | Quality & Security — hardening | Sprint 2 | 4 tính năng | Production-ready quality gates |
| **v2.2** | Polish & Cleanup — loại bỏ legacy | Sprint 3-5 | 12 thay đổi | ~1,456 dòng dead code xóa, type safety |

### 10.2 Chi tiết từng Tính năng

#### v2.0 — Core Engine (Sprint 1)

| # | Tính năng | Mô tả kỹ thuật | Files chính | Impact Metrics |
|---|---|---|---|---|
| 1 | Graph Engine (8 nodes, DAG executor) | BFS executor với `Promise.allSettled` cho parallel nodes. Hỗ trợ conditional edges, token budget tracking | `graph-engine.ts` (719 LOC) | ⭐ Core — toàn bộ hệ thống phụ thuộc |
| 2 | Orchestrator (fast-path + LLM planning) | 3-step decision: forceTemplate → tryFastPath (regex) → planWithLLM (Gemini Flash). 6 template plans | `orchestrator.ts` (388 LOC) | ~70% requests handled by fast-path (0 LLM cost) |
| 3 | Blackboard v2 (vector context) | Semantic retrieval qua `gte-small` (384-dim). Cross-session memory, RPC `match_blackboard_context` | `blackboard-retriever.ts` (330 LOC) | Thay thế hardcoded `buildStateContext()` |
| 4 | Checkpoint/Continuation | Serialize GraphState vào `workflow_checkpoints`. Resume sau Edge Function timeout (55s) | `checkpoint.ts` (152 LOC) | ⚠️ Backend only — chưa có resume API |
| 5 | Distributed Tracing | W3C Trace Context. Root span per request, child span per node. `getTraceHeaders()` cho external calls | `tracing.ts` | Observability cho production debugging |

#### v2.1 — Quality & Security (Sprint 2)

| # | Tính năng | Mô tả kỹ thuật | Files chính | Impact Metrics |
|---|---|---|---|---|
| 6 | Governor + Revision Controller | 5-rule quality gate (rule-based, 0 LLM). Revision Controller gọi LLM để sửa nội dung. Max 2 rounds | `governor-node.ts`, `revision-controller.ts` | ⚠️ Human escalation chưa có UI |
| 7 | Compliance Node | Rule-based precheck với `preCheckComplianceV2()`. Resolved rules từ `industry_jurisdiction_profiles` | `compliance-node.ts` | 0 LLM cost, chạy parallel với research |
| 8 | Redis Cache (Content Node) | Upstash Redis, cache key = SHA-256 hash(brandId + intent + topic + promptVersion). Content 1h, Research 4h TTL | `redis-cache.ts`, `content-node.ts` | Ước tính ~30-45% latency reduction cho repeated queries |
| 9 | Prompt Guard | Regex-based injection detection. High severity → strip patterns. Log to `security_events` | `prompt-guard.ts` | 0 latency overhead (regex, không LLM) |

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

### 10.3 Lộ trình Phát triển (Roadmap)

| Ưu tiên | Tính năng | Mô tả | Độ phức tạp | Prerequisites | Status |
|---|---|---|---|---|---|
| **P0** | Xóa `agentic-loop.ts` | 519 dòng legacy. Cần xóa `'agentic-loop'` entry từ `ai-config.ts` | Thấp | Sprint 5 ✅ | 🔲 Todo |
| **P0** | Xóa `tool-chain-executor.ts` | Dead code, 0 references confirmed | Thấp | Sprint 5 ✅ | 🔲 Todo |
| **P0** | Khôi phục tài liệu bị thiếu | Tool Registry, Security, AI Provider, Caching section | Thấp | — | ✅ Done (bản Revised này) |
| **P1** | Checkpoint Resume API | Endpoint `POST /chat-topics` với `continuationToken`. Idempotency, staleness check (5 phút), state validation | Trung bình | — | 🔲 Todo |
| **P1** | Governor degradation path | Trả best revision + `quality_warning` SSE event + `escalation_queue` table khi HITL chưa có UI | Trung bình | — | 🔲 Todo |
| **P1** | Observability Dashboard v1 | Aggregate `ai_metrics` + `agent_execution_logs` + `workflow_checkpoints` → dashboard: latency/node, cache hit rate, revision rate, error rate | Trung bình | — | 🔲 Todo |
| **P1** | Governor HITL UI | Frontend render `interruptPayload`: inline decision UI (Approve / Edit / Regenerate). Timeout 30 phút → auto-approve | Cao | Governor degradation path | 🔲 Todo |
| **P2** | Streaming per-node (Content first) | Content Node gọi LLM với streaming → emit SSE `node_stream` per chunk. Frontend render tab per node | Trung bình | SSE protocol extension | 🔲 Todo |
| **P2** | Multi-model routing | Orchestrator chọn model tối ưu cho từng node (cost/quality tradeoff) | Cao | Model benchmarking | 🔲 Todo |
| **P2** | Graph visualization | Frontend render DAG execution realtime (D3/React Flow) | Cao | — | 🔲 Todo |
| **P2** | Rate limiter Redis migration | Chuyển từ in-memory sang Upstash Redis để share rate limit state across instances | Trung bình | — | 🔲 Todo |
| **P3** | A/B testing pipeline | So sánh output giữa các plan/model variants | Cao | Multi-model routing | 🔲 Todo |
| **P3** | Custom node plugins | Cho phép user định nghĩa node tự tạo | Rất cao | Plugin SDK design | 🔲 Todo |

---

## 11. Cấu trúc Thư mục Backend

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
    ├── ai-provider.ts            # Multi-provider LLM routing (1,237 LOC)
    ├── circuit-breaker.ts        # Hybrid Redis+Memory circuit breaker (439 LOC)
    ├── token-manager.ts          # Token budget management
    ├── system-prompt-builder.ts  # System prompt assembly
    ├── prompt-guard.ts           # Injection detection (regex-based)
    ├── rate-limiter.ts           # Rate limiting + quota (449 LOC)
    ├── error-utils.ts            # Retry, fallback, timeout
    ├── logger.ts                 # Structured logging + metrics
    ├── cost-estimator.ts         # LLM cost estimation
    ├── crypto.ts                 # API key encryption (AES-256)
    ├── ai-config.ts              # Per-function AI configuration
    ├── tool-definitions.ts       # 18 tool definitions (612 LOC)
    ├── tool-executor.ts          # Tool execution dispatcher
    ├── agentic-loop.ts           # ⚠️ LEGACY — 519 LOC, pending deletion (P0)
    └── cache/
        └── redis-cache.ts        # Upstash Redis caching
```

---

## 12. Chỉ số Hiệu suất & Cấu hình

| Metric | Giá trị | Ghi chú |
|---|---|---|
| Max execution time | 55s | Safety margin cho Deno Edge Function timeout (60s) |
| Token budget default | 16,384 | Configurable per organization |
| Conversation history cap | 40% budget | ~6,500 tokens cho history |
| Heartbeat interval | 15s | SSE keepalive |
| Content cache TTL | 1 giờ | Upstash Redis |
| Research cache TTL | 4 giờ | Upstash Redis |
| Checkpoint serialization | 10K content, 5K research, 10 messages | Truncation policy |
| Checkpoint max age | 7 ngày (auto-cleanup) | `cleanup_old_checkpoints()` |
| Max revision rounds | 2 | Governor → Reviewer loop cap |
| Governor quality threshold | Score ≥ 90, Confidence ≥ 0.85 | Early exit (approve) |
| Budget exhaustion threshold | > 80% used | Forced early exit |
| Orchestrator confidence threshold | 0.7 | Below → LLM planning fallback |
| Embedding model | `gte-small` (384-dim) | Blackboard v2 |
| Primary LLM | `google/gemini-2.5-flash` | Orchestrator + Content Node |
| Circuit breaker threshold | 3 failures + 30% rate | 5-min rolling window |
| Circuit breaker reset | 5 phút | OPEN → HALF-OPEN |
| Rate limit (free) | 10 req/min (general), 5 msg/min (chat) | In-memory per instance |
| Rate limit (pro) | 60 req/min (general), 30 msg/min (chat) | In-memory per instance |
| Prompt Guard max input | 10,000 chars | Truncate if exceeded |
| Cache key hash length | 32 chars (SHA-256 truncated) | `generateCacheKey()` |

---

## 13. Deployment & Scaling

| Aspect | Chi tiết |
|---|---|
| Runtime | Deno Edge Functions (Supabase) |
| Timeout | 60s hard limit (55s safety margin) |
| Cold start | ~500ms-1s cho Edge Function mới |
| Concurrency | Tự động scale theo Supabase tier |
| Database | PostgreSQL (Supabase) với pgvector extension |
| Redis | Upstash Redis (REST API) — optional, graceful fallback |
| Embedding | Lovable AI Gateway (`gte-small` 384-dim) |

**Known Scaling Limitations:**
1. **Rate limiter in-memory:** Mỗi instance có store riêng → rate limit không chính xác khi auto-scale (P2 Roadmap: chuyển sang Redis)
2. **Circuit breaker partial sync:** Redis sync giúp cross-instance awareness, nhưng có latency 1-2 requests trước khi instance mới nhận state
3. **Checkpoint resume:** Chưa có API → timeout full_pipeline = mất kết quả (P1 Roadmap)

---

## 14. Architecture Decision Records (ADR)

### ADR-001: BFS-style execution thay vì topological sort thuần

- **Context:** Graph Engine cần thực thi nodes theo dependency order
- **Decision:** Dùng BFS (Breadth-First Search) style — process nodes theo layers (độ sâu), song song hóa nodes cùng layer
- **Consequences:**
  - ✅ Tự nhiên hỗ trợ parallel execution (nodes cùng layer chạy song song qua `Promise.allSettled`)
  - ✅ Dễ implement continuation (biết chính xác layer nào đang chạy)
  - ❌ Không tối ưu cho DAG phức tạp với cross-layer dependencies (hiện tại DAG đủ đơn giản)

### ADR-002: gte-small (384-dim) cho embeddings thay vì multilingual-e5

- **Context:** Blackboard v2 cần embedding model cho semantic search
- **Decision:** `gte-small` 384 dimensions
- **Consequences:**
  - ✅ Nhẹ, nhanh, phù hợp Edge Function latency requirements
  - ✅ Hỗ trợ tiếng Việt đủ tốt cho use case (matching topics, content similarity)
  - ❌ Kém hơn multilingual-e5 cho cross-lingual matching (VD: query tiếng Việt match content tiếng Anh)
  - ❌ 384 dimensions nhỏ hơn production-grade models (768-1024 dim)

### ADR-003: Upstash Redis thay vì Supabase built-in cache

- **Context:** Cần cache layer cho content generation results
- **Decision:** Upstash Redis (REST API)
- **Consequences:**
  - ✅ Sub-millisecond latency, TTL natively supported
  - ✅ REST API compatible với Deno Edge Functions (không cần TCP connection)
  - ✅ Dùng chung cho cache + circuit breaker state → giải quyết cross-instance awareness
  - ❌ Thêm external dependency (graceful fallback đã implement)
  - ❌ Cost thêm (nhưng rất thấp cho use case này)

### ADR-004: 55s timeout margin thay vì 50s

- **Context:** Deno Edge Function hard limit = 60s
- **Decision:** `continuationThresholdMs` = 50s (check), tổng safety margin = 55s
- **Consequences:**
  - ✅ 5s buffer cho checkpoint save + SSE flush + cleanup
  - ✅ 10s buffer trước hard timeout đủ cho edge cases (slow network, large checkpoint)
  - ❌ Giảm 5s execution time so với margin 50s
  - **Tradeoff:** Chấp nhận mất 5s để tránh hard timeout (HTTP 504) — better UX

### ADR-005: Regex-based Prompt Guard thay vì ML/LLM detection

- **Context:** Cần phát hiện prompt injection trước khi input đi vào LLM
- **Decision:** Regex pattern matching với severity classification
- **Consequences:**
  - ✅ 0 latency overhead (microseconds vs milliseconds cho ML, seconds cho LLM)
  - ✅ 0 cost (không cần inference call)
  - ✅ Deterministic — cùng input luôn cho cùng kết quả
  - ❌ False positives cho marketing content chứa injection-like phrases
  - ❌ Không detect novel/obfuscated injection techniques
  - **Mitigation:** High severity chỉ strip, không block — user vẫn nhận response

---

## 15. End-to-End Example: "Tạo content về skincare cho Gen Z"

```
User: "Tạo bài viết về skincare routine cho Gen Z, đăng Facebook và Instagram"

=== Step 1: Entry Point (chat-topics/index.ts) ===
- Rate limit check: ✅ (Pro plan, 45/60 requests)
- Quota check: ✅ (multichannel, 12/50 used)
- Prompt Guard: ✅ (riskLevel: none)
- Fetch context song song:
  ├── Brand: "GlowUp Beauty" (tone: friendly, forbidden: "100% tự nhiên")
  ├── Industry: "beauty" (jurisdiction: VN)
  ├── Personas: ["Gen Z nữ 18-24", "Skincare beginner"]
  └── RAG: 3 bài viết liên quan (cosine > 0.7)

=== Step 2: Orchestrator ===
- tryFastPath(): match "tạo bài viết" → intent: "generate"
- Có topic ("skincare routine cho Gen Z") → template: "generate_simple"
- Confidence: 0.85 → fast-path (0 LLM cost)

=== Step 3: Graph Engine ===
Plan: content → reviewer → governor

--- Node: content (Content Node) ---
- LLM Call #1: Gemini 2.5 Flash với toolChoice: 'required'
  → Tool called: generate_multichannel(topic: "Skincare routine cho Gen Z", channels: ["facebook", "instagram"])
  → Pipeline nội bộ:
    1. generate-core-content → tạo core content (seed role)
    2. generate-multichannel → transform sang Facebook + Instagram
- LLM Call #2: Follow-up tổng hợp kết quả
- Tokens: 3,800
- Duration: 12s
- Output: generatedContent (Facebook post + Instagram caption)

--- Node: reviewer (Reviewer Node) ---
- LLM Call: Chấm điểm nội dung
- Score: 85, Confidence: 0.90
- Issues: ["CTA có thể mạnh hơn"]
- Tokens: 1,800
- Duration: 5s

--- Node: governor (Governor Node) ---
- Rule check: Score 85 (70-89) → Soft revision
- Revision Controller:
  - LLM Call: Sửa CTA theo feedback
  - Output: revised content
- → Quay lại Reviewer

--- Node: reviewer (Round 2) ---
- Score: 92, Confidence: 0.88
- Tokens: 1,800

--- Node: governor (Round 2) ---
- Rule check: Score 92 ≥ 90 AND Confidence 0.88 ≥ 0.85 → ✅ Early exit
- exitReason: 'quality_met'

=== Step 4: Response ===
Total tokens: ~9,200 / 16,384 budget
Total duration: ~25s
Cache: SET (1h TTL)
SSE events emitted: graph_plan → node_start(content) → content_chunk × N → node_complete(content)
  → node_start(reviewer) → node_complete(reviewer) → node_start(governor) → node_complete(governor) → final_response
```

---

## 16. Đánh giá Kiến trúc (cho Expert Review)

### Điểm mạnh

1. **Zero-cost routing:** Fast-path heuristic xử lý ~70% requests không cần LLM call cho orchestration
2. **Parallel execution:** Nodes độc lập chạy song song (research ∥ brand_memory ∥ compliance) giảm latency
3. **Anti-timeout resilience:** Continuation pattern (backend) cho phép save progress — cần resume API để hoàn thiện
4. **Cost efficiency:** Brand Memory + Compliance nodes không gọi LLM (rule-based/DB-only)
5. **Quality assurance:** Governor → Reviewer loop với max 2 rounds đảm bảo output quality
6. **Resilient AI routing:** Circuit breaker hybrid (Redis + in-memory) với auto-fallback chain
7. **Security layers:** Prompt Guard + encrypted API keys + RLS + multi-tenant isolation

### Rủi ro & Hạn chế

1. **Single point of failure:** `chat-topics/index.ts` (858 LOC) là entry point duy nhất — cần monitoring chặt
2. **Blackboard v2 cold start:** Session mới không có cross-session context → chất lượng output thấp hơn
3. **Token budget rigidity:** Fixed 16,384 budget có thể không đủ cho complex_workflow với nhiều context
4. **Revision loop cost:** Mỗi revision round tiêu ~4,000 tokens thêm (Content + Reviewer) — max 2 rounds = +8,000 tokens
5. **Edge Function timeout:** 55s safety margin chặt — full_pipeline có thể timeout nếu LLM response chậm
6. **Rate limiter per-instance:** In-memory store không shared → rate limit không chính xác khi auto-scale
7. **Continuation half-implemented:** Backend saves checkpoint nhưng chưa có resume API
8. **Human escalation no-op:** Governor interrupt chạy nhưng không ai nhận notification

### Khuyến nghị (theo ưu tiên)

1. **P0:** Xóa legacy files (`agentic-loop.ts`, `tool-chain-executor.ts`) — giảm maintenance burden
2. **P1:** Implement Checkpoint resume API — giải quyết timeout cho full_pipeline
3. **P1:** Implement Governor degradation path — trả best revision + warning thay vì silent fail
4. **P1:** Build Observability Dashboard — visibility vào latency, cache hit rate, revision rate, error rate
5. **P2:** Migrate rate limiter sang Redis — chính xác khi auto-scale
6. **P2:** Split `index.ts` thành modules (context fetcher, request handler, response builder) — cải thiện maintainability
7. **P2:** Streaming per-node (Content Node first) — cải thiện perceived latency
