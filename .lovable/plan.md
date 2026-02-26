
# Flowa — Báo cáo Kiến trúc Hệ thống v2.2

**Phân loại:** Tài liệu nội bộ — Dành cho Technical Review  
**Phiên bản:** 2.2 Final · Cập nhật sau Sprint 5  
**Đối tượng:** Solution Architect, Technical Lead, Security Reviewer  
**Ngày phát hành:** Tháng 2/2026

---

## Mục lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Graph Engine](#2-graph-engine)
3. [Orchestrator](#3-orchestrator)
4. [Graph State](#4-graph-state)
5. [Node System (8 Nodes)](#5-node-system)
6. [Tool Registry (18 Tools)](#6-tool-registry)
7. [AI Provider & Circuit Breaker](#7-ai-provider--circuit-breaker)
8. [Hệ thống Hỗ trợ](#8-hệ-thống-hỗ-trợ)
9. [Bảo mật & Cách ly Dữ liệu](#9-bảo-mật--cách-ly-dữ-liệu)
10. [Pipeline Xử lý Request](#10-pipeline-xử-lý-request)
11. [Frontend Integration](#11-frontend-integration)
12. [Chỉ số Vận hành](#12-chỉ-số-vận-hành)
13. [Deployment & Scaling](#13-deployment--scaling)
14. [Lịch sử Nâng cấp (Sprint 1–5)](#14-lịch-sử-nâng-cấp)
15. [Lộ trình Phát triển](#15-lộ-trình-phát-triển)
16. [Architecture Decision Records](#16-architecture-decision-records)
17. [End-to-End Trace Example](#17-end-to-end-trace-example)
18. [Đánh giá Kiến trúc](#18-đánh-giá-kiến-trúc)
19. [Cấu trúc Thư mục](#19-cấu-trúc-thư-mục)

---

## 1. Tổng quan Kiến trúc

Flowa là nền tảng B2B SaaS **Content Orchestration** dựa trên AI, phục vụ 5 phân hệ: Nội dung Đa kênh (11+ nền tảng), Kịch bản Video, Carousel Prompts, Ad Copies, và Core Content. Hệ thống được bảo vệ bởi Industry Memory (463+ bộ quy tắc ngành) và Knowledge Graph (760+ thực thể).

Kiến trúc lõi là **Agentic Operating System** — một DAG (Directed Acyclic Graph) execution engine chạy trên Deno Edge Functions. Tất cả execution paths cũ (Legacy Supervisor, Agentic Loop, Single-Turn) đã được loại bỏ hoàn toàn qua Sprint 4–5.

```
                          User Message
                               │
                               ▼
                    ┌──────────────────────┐
                    │   chat-topics/       │  Deno Edge Function
                    │   index.ts (858 LOC) │  Điểm vào duy nhất
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Orchestrator       │  Fast-path regex (0 LLM cost)
                    │   388 LOC            │  + LLM fallback (Gemini 2.5 Flash)
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Graph Engine       │  DAG compiler + BFS executor
                    │   719 LOC            │  Promise.allSettled parallelism
                    └──────────┬───────────┘
                               │
          ┌────────┬───────┬───┴───┬────────┬────────┬─────────┬────────┐
          ▼        ▼       ▼       ▼        ▼        ▼         ▼        ▼
       Research  Brand   Compl-  Strategy Content  Reviewer Governor  Image
                Memory  iance
```

**Luồng thực thi:**

| Bước | Mô tả | Thời gian điển hình |
|------|--------|---------------------|
| 1 | `index.ts` nhận request, fetch context song song (brand, persona, product, RAG, web search) | 500ms–2s |
| 2 | Orchestrator phân loại intent bằng heuristic regex. Nếu confidence < 0.7, gọi LLM | 10ms (fast-path) / 2–3s (LLM) |
| 3 | Graph Engine compile plan → DAG, thực thi song song nodes độc lập | 5–25s tùy pipeline |
| 4 | Stream kết quả về client qua SSE (Server-Sent Events) | Real-time |

---

## 2. Graph Engine

**File:** `graph-engine.ts` — 719 LOC

| Thành phần | Vai trò |
|------------|---------|
| `GraphBuilder` | Builder pattern API: khai báo node, edge, conditional edge |
| `compileGraphFromPlan()` | Biên dịch `GraphPlan` → `GraphDefinition` (dependency resolution) |
| `executeGraph()` | BFS-style executor: xử lý nodes theo layers, song song hóa nodes cùng layer qua `Promise.allSettled` |
| `runOrchestrator()` | Entry point tổng: orchestrate → compile → execute |
| `TEMPLATE_PLANS` | 6 template có sẵn (xem bảng Intent Mapping ở Section 3) |

### 2.1 Continuation Pattern

Khi thời gian thực thi vượt ngưỡng `continuationThresholdMs` (50s), engine lưu checkpoint và trả partial result, tránh Deno Edge Function timeout (hard limit 60s, safety margin 55s).

| Thành phần | Trạng thái | Ghi chú |
|------------|-----------|---------|
| `saveCheckpoint()` (backend) | ✅ Hoạt động | Lưu GraphState vào `workflow_checkpoints` |
| `continuationToken` trong response | ✅ Hoạt động | Kèm danh sách nodes đã hoàn thành |
| Resume API (client tự động gọi lại) | ❌ Chưa implement | **P1 Roadmap** — xem Section 15 |

**Hệ quả hiện tại:** Khi timeout xảy ra, client nhận partial result nhưng không tự động resume. User phải gửi message mới → Orchestrator tạo plan mới → chạy lại từ đầu.

**Thiết kế Resume Flow (đề xuất — P1):**
1. Backend emit SSE event `continuation_required` chứa `continuationToken` + danh sách nodes đã/chưa hoàn thành
2. Frontend hiển thị kết quả hiện có + indicator "Đang tiếp tục..." → tự động `POST /chat-topics` với `continuationToken`
3. Backend load checkpoint → rebuild GraphState → chạy tiếp từ node dang dở (không compile lại plan)
4. Edge cases: idempotency guarantee, staleness check (> 5 phút → reject), state validation

### 2.2 Token Budget

Mỗi node có `estimatedTokens`. Engine skip node khi tổng `used + estimated > total`. Default total: 16,384 tokens.

### 2.3 Conditional Edges

Governor → Reviewer loop (revision cycle). Tối đa 2 vòng revision. Xem chi tiết tại Governor Node (Section 5.7).

### 2.4 Distributed Tracing

W3C Trace Context compatible. Mỗi `runOrchestrator()` tạo 1 Trace với root span. Mỗi node có child span với duration tracking. `getTraceHeaders()` propagate `traceparent` header cho external API calls.

---

## 3. Orchestrator

**File:** `orchestrator.ts` — 388 LOC

Quy trình quyết định 3 bước:

```
forceTemplate (nếu caller chỉ định)
      │ miss
      ▼
tryFastPath() — regex-based intent matching, 6 intent × 3 ngôn ngữ (VI/EN/TH)
      │ confidence < 0.7
      ▼
planWithLLM() — Gemini 2.5 Flash + tool calling `create_graph_plan`
               Có Blackboard v2 cross-session context
```

**Regex Priority:** `multi_step > complex_workflow > image_generate > plan > generate > research`

### Intent → Template Mapping

| Intent | Template | Nodes thực thi | Parallel Groups | Token ước tính |
|--------|----------|----------------|-----------------|----------------|
| `chat` (default) | `chat` | content | — | ~4,000 |
| `research` | `research_only` | research | — | ~3,000 |
| `plan` | `generate_with_research` | research → strategy → content → reviewer → governor | research ∥ brand_memory ∥ compliance | ~12,000 |
| `generate` (có topic) | `generate_simple` | content → reviewer → governor | — | ~8,000 |
| `generate` (không topic) | `generate_with_research` | (như `plan`) | research ∥ brand_memory ∥ compliance | ~12,000 |
| `complex_workflow` | `full_pipeline` | Đầy đủ 8 nodes | research ∥ brand_memory ∥ compliance | ~16,000 |
| `image_generate` | `image_generate` | image | — | ~1,500 |

**Ước tính:** ~70% requests được xử lý bởi fast-path (0 LLM cost cho orchestration).

---

## 4. Graph State

**File:** `graph-state.ts` — 265 LOC

State trung tâm truyền giữa các node, thiết kế theo Immutable Update Pattern.

| Nhóm | Fields | Mô tả |
|------|--------|-------|
| Hội thoại | `messages`, `userMessage` | Lịch sử chat + tin nhắn hiện tại |
| Phân loại | `userIntent`, `confidence`, `orchestratorPlan` | Output của Orchestrator |
| Node outputs | `researchData`, `contentPlan`, `generatedContent`, `reviewResult`, `complianceResult`, `generatedImage`, `brandMemoryContext` | Kết quả từng node |
| Quality gate | `reviewScore`, `reviewConfidence`, `finalResponse` | Governor/Reviewer scoring |
| Tracking | `nodeResults[]`, `metadata` | Lịch sử thực thi, metrics |
| Budget | `tokenBudget` (total, used, perNode) | Quản lý ngân sách token |
| Human-in-the-loop | `interruptPayload` | Escalation payload |
| Anti-timeout | `continuationToken`, `continuingFromNode` | Resume sau checkpoint |

**Merge strategy (`mergeStateUpdate()`):**
- Arrays (`nodeResults`, `messages`) → append
- Objects (`metadata`, `tokenBudget`) → shallow-merge
- Primitives → overwrite

---

## 5. Node System

### Tổng quan 8 Nodes

| # | Node | File | Gọi LLM? | Token Cost | Input chính | Output chính |
|---|------|------|----------|------------|-------------|--------------|
| 1 | Research | `research-node.ts` | ✅ (×2 calls) | ~3,000 | `userMessage` | `researchData`, `bestTopic`, `suggestedTopics` |
| 2 | Brand Memory | `brand-memory-node.ts` | ❌ (DB only) | 0 | `brandTemplateId` | `brandMemoryContext` |
| 3 | Compliance | `compliance-node.ts` | ❌ (rule-based) | 0 | `userMessage`, industry rules | `complianceResult` |
| 4 | Strategy | `strategy-node.ts` | ✅ | ~2,500 | `researchData` | `contentPlan` |
| 5 | Content | `content-node.ts` | ✅ (×2 calls) | ~4,000 | `userMessage`, `bestTopic`, `contentPlan` | `generatedContent` |
| 6 | Reviewer | `reviewer-node.ts` | ✅ | ~2,000 | `generatedContent` | `reviewResult`, `reviewScore` |
| 7 | Governor | `governor-node.ts` | ❌ (rule-based)* | 0* | `reviewScore`, `reviewConfidence` | `finalResponse` hoặc revision trigger |
| 8 | Image | `image-node.ts` | ✅ | ~1,500 | `userMessage` | `generatedImage` |

*Governor không gọi LLM trực tiếp, nhưng Revision Controller bên trong gọi LLM (~4,000 tokens mỗi vòng revision).

### 5.1 Research Node

- **Tools:** `web_search`, `search_topics`, `discover_topics`
- **Pipeline:** (1) LLM call với `toolChoice: 'required'` → gọi tools → (2) follow-up LLM call tổng hợp
- **Topic extraction:** `discover_topics` trả `suggestedTopics` → extract `bestTopic`. Fallback: lấy từ `web_search` results
- **Cache:** Redis 4h TTL

### 5.2 Brand Memory Node

- **Không gọi LLM** — chỉ fetch dữ liệu từ DB
- Load: brand context, industry memory, glossary
- Output: `brandMemoryContext` (string nối)

### 5.3 Compliance Node

- **Không gọi LLM** — rule-based precheck
- Dùng `preCheckComplianceV2()` với resolved rules từ `industry_jurisdiction_profiles`
- Output: `complianceResult { riskLevel, riskScore, issues[] }`
- Hỗ trợ 11 jurisdiction: VN, TH, US, SG, ID, MY, PH, JP, KR, EU, GLOBAL

### 5.4 Strategy Node

- Lập kế hoạch nội dung dựa trên research data
- Output: `contentPlan`

### 5.5 Content Node — Critical Path

Node quan trọng nhất — failure dừng toàn bộ pipeline (`critical: true`).

**Pipeline 2 bước:**
1. LLM Call #1 (`toolChoice: 'required'`): Gọi tool generation
2. LLM Call #2: Follow-up tổng hợp kết quả tool

**Tools:** `generate_multichannel`, `generate_script`, `generate_carousel`, `save_topic`

**`generate_multichannel` pipeline nội bộ:**

| Bước | Hành động | Timeout | Failure behavior |
|------|-----------|---------|------------------|
| 1 | Gọi Edge Function `generate-core-content` → tạo core content + lưu DB | Riêng | — |
| 2 | Gọi Edge Function `generate-multichannel` → transform sang các kênh | Riêng | Trả core content (graceful degradation) |

**Context:** Blackboard v2 semantic retrieval + Redis cache (1h TTL)

### 5.6 Reviewer Node

- Chấm điểm nội dung theo tiêu chí: brand voice, compliance, chất lượng
- Output: `reviewResult`, `reviewScore` (0–100), `reviewConfidence` (0–1)

### 5.7 Governor Node — Quality Gate

**Không gọi LLM trực tiếp** — rule-based quality gate với 5 quy tắc:

| # | Điều kiện | Hành động | Kết quả |
|---|-----------|-----------|---------|
| 1 | Score ≥ 90 AND confidence ≥ 0.85 | Early exit | ✅ Approve |
| 2 | Budget used > 80% | Early exit + warning | ⚠️ Approve kèm cảnh báo |
| 3 | Revision rounds ≥ 2 (MAX) | Human escalation | 🔴 Interrupt → HITL |
| 4 | Score < 70 | Full revision | 🔄 Revision Controller → quay lại Reviewer |
| 5 | Score 70–89 | Soft revision | 🔄 Revision Controller → quay lại Reviewer |

**Revision Controller** (`revision-controller.ts`): Gọi LLM để sửa nội dung dựa trên reviewer feedback. ~4,000 tokens mỗi vòng.

**⚠️ Human Escalation — Giới hạn hiện tại:**

Khi Rule 3 trigger, Governor set `status: 'interrupted'` và tạo `interruptPayload`. Tuy nhiên:
- **Chưa có frontend UI** để render decision interface (P1 Roadmap)
- **Behavior hiện tại:** Trả content bản revision cuối cùng kèm `exitReason: 'human_escalation'`
- **Degradation path đề xuất:** Trả bản có score cao nhất + SSE event `quality_warning` + write vào `escalation_queue` table

### 5.8 Image Node

- Tạo hình ảnh AI từ prompt
- **Blackboard v2:** ✅ Đã tích hợp — retrieve context từ `image_generation`, `generated_content`; store image metadata (prompt, style, URL) với `content_type: 'image'`

---

## 6. Tool Registry

### 6.1 Danh sách đầy đủ (18 tools)

| # | Tool | Category | Node | Status | Mô tả |
|---|------|----------|------|--------|-------|
| 1 | `web_search` | Research | Research | ✅ Active | Tìm kiếm real-time: trending, news, competitor |
| 2 | `search_topics` | Topic | Research | ✅ Active | Tìm topics đã lưu trong Topic Bank |
| 3 | `discover_topics` | Topic | Research | ✅ Active | Gợi ý topic mới, trending, gap analysis |
| 4 | `save_topic` | Topic | Content | ✅ Active | Lưu topic vào Topic Bank |
| 5 | `generate_script` | Content | Content | ✅ Active | Tạo video script TikTok/YouTube Shorts |
| 6 | `generate_carousel` | Content | Content | ✅ Active | Tạo carousel image prompts |
| 7 | `generate_multichannel` | Content | Content | ✅ Active | Tạo nội dung đa kênh (pipeline 2 bước) |
| 8 | `start_planning_session` | Planning | Content | ✅ Active | Bắt đầu phiên lập kế hoạch |
| 9 | `generate_plan_draft` | Planning | Content | ✅ Active | Tạo bản nháp kế hoạch |
| 10 | `refine_plan` | Planning | Content | ✅ Active | Chỉnh sửa kế hoạch theo feedback |
| 11 | `finalize_plan` | Planning | Content | ✅ Active | Hoàn thành và lưu kế hoạch |
| 12 | `get_active_session` | Planning | Content | ✅ Active | Lấy thông tin planning session |
| 13 | `brand_voice_check` | Review | Reviewer | ✅ Active | Kiểm tra brand voice compliance |
| 14 | `legal_compliance_check` | Review | Reviewer | ✅ Active | Kiểm tra quy định pháp luật ngành |
| 15 | `platform_best_practices` | Review | Reviewer | ✅ Active | Đánh giá theo best practices nền tảng |
| 16 | `generate_image` | Image | Image | ✅ Active | Tạo ảnh AI từ prompt |
| 17 | `edit_image` | Image | Image | ✅ Active | Chỉnh sửa ảnh |
| 18 | `task_complete` | Control | Legacy | ⚠️ Deprecated | Chỉ tồn tại trong `agentic-loop.ts` — pending deletion |

### 6.2 Tool → Node Mapping

| Node | Tools | Filter Constant |
|------|-------|-----------------|
| Research | `web_search`, `search_topics`, `discover_topics` | `RESEARCH_TOOLS` |
| Content | `generate_script`, `generate_carousel`, `generate_multichannel`, `save_topic` + 5 planning tools | `CONTENT_TOOLS` |
| Reviewer | `brand_voice_check`, `legal_compliance_check`, `platform_best_practices` | Inline filter |
| Image | `generate_image`, `edit_image` | `IMAGE_TOOLS` |

---

## 7. AI Provider & Circuit Breaker

### 7.1 Multi-Provider Routing

**File:** `ai-provider.ts` — 1,237 LOC

| Provider | Endpoint | Models | Auth |
|----------|----------|--------|------|
| **Lovable Gateway** (default) | `ai.gateway.lovable.dev` | `google/gemini-*`, `openai/gpt-5*`, `sonar` | `LOVABLE_API_KEY` |
| OpenAI Direct | `api.openai.com` | `gpt-*` (without prefix) | User's encrypted API key |
| Anthropic Direct | `api.anthropic.com` | `claude-*` | User's encrypted API key |
| Google Gemini Direct | `generativelanguage.googleapis.com` | `gemini-*` (without prefix) | User's API key |
| OpenRouter | `openrouter.ai` | 200+ models | User's API key |

**Model Resolution Chain:**
1. `modelOverride` (admin-configured per channel/function)
2. `ai_function_configs` table (per organization)
3. Default: `google/gemini-2.5-flash` via Lovable Gateway

### 7.2 Circuit Breaker

**File:** `circuit-breaker.ts` — 439 LOC  
**State persistence:** Hybrid Redis (primary) + In-memory (fallback)

| Parameter | Giá trị |
|-----------|---------|
| `failureThreshold` | 3 failures |
| `failureRateThreshold` | 30% |
| `resetTimeoutMs` | 5 phút |
| `halfOpenRequests` | 2 |
| `windowSizeMs` | 5 phút |

**State machine:** `CLOSED` → (≥3 failures AND ≥30% rate) → `OPEN` → (5 phút) → `HALF-OPEN` → success → `CLOSED` / failure → `OPEN`

**Redis sync:** State lưu tại `flowa:cb:{model}` với TTL = resetTimeoutMs. Giải quyết cross-instance awareness khi auto-scale.

**Fallback Chain:**

| Primary Model | Fallback |
|---------------|----------|
| `google/gemini-2.5-pro` | `google/gemini-2.5-flash` |
| `google/gemini-3-pro-preview` | `google/gemini-2.5-flash` |
| `openai/gpt-5` | `google/gemini-2.5-pro` |
| `openai/gpt-5-mini` | `google/gemini-2.5-flash` |
| `openai/gpt-5-nano` | `google/gemini-2.5-flash-lite` |
| `anthropic/claude-sonnet-4` | `google/gemini-2.5-pro` |
| `deepseek/deepseek-r1` | `google/gemini-2.5-pro` |
| Mọi model khác | `google/gemini-2.5-flash` |

**Admin Override vs. Circuit Breaker:** Admin model override được áp dụng trước circuit breaker check. Nếu admin model bị trip → circuit breaker tự động chuyển sang fallback.

### 7.3 API Key Security

- API keys mã hóa AES-256 via `crypto.ts` (`encrypt()`/`decrypt()`)
- Lưu tại `ai_provider_configs.encrypted_api_key`
- Giải mã chỉ tại runtime trong Edge Function
- Fallback: `api_key_secret_name` → Deno environment variable
- Phát hiện legacy plain-text keys qua prefix (`sk-`, `key_`, `AIza`)

---

## 8. Hệ thống Hỗ trợ

### 8.1 Blackboard v2 — Semantic Context Retrieval

**File:** `blackboard-retriever.ts` — 330 LOC

Thay thế `buildStateContext()` bằng vector-based retrieval.

| Chức năng | Chi tiết kỹ thuật |
|-----------|-------------------|
| **Store** | Lưu output mỗi node vào `content_embeddings`, embedding `gte-small` (384-dim) |
| **Retrieve** | Semantic search qua RPC `match_blackboard_context`, cosine similarity |
| **Cross-session** | Tìm context từ phiên trước theo `brand_template_id` |
| **Priority scoring** | Same session (+0.15) > Same brand (+0.05) > Global (0). Recency decay: >90 ngày (−0.25), >30 ngày (−0.1) |

**Tích hợp theo Node:**

| Node | Retrieve | Store | Ghi chú |
|------|----------|-------|---------|
| Research | ✅ | ✅ (auto) | Retrieve `research_output`, `plan` |
| Content | ✅ | ✅ (auto) | Retrieve `research_output`, `plan`, `compliance_check`, `generated_content` |
| Image | ✅ | ✅ | Store image metadata (prompt, style, URL) |
| Strategy | ✅ | ✅ (auto) | — |
| Reviewer | ✅ | ✅ (auto) | — |
| Brand Memory | ❌ | ❌ | DB-only fetch |
| Compliance | ❌ | ❌ | Rule-based |

### 8.2 Caching Layer — Upstash Redis

**File:** `cache/redis-cache.ts`  
**Backend:** Upstash Redis (REST API). Graceful fallback nếu không có credentials.

| API | Mô tả |
|-----|-------|
| `withCache(key, fn, ttl)` | Decorator — check cache trước khi gọi function |
| `generateCacheKey(brandId, nodeType, stateSubset, promptVersion)` | SHA-256 hash (truncated 32 chars) |
| `invalidateByPrefix(prefix)` | Xóa tất cả keys matching `flowa:cache:{prefix}*` |

**TTL Policy:**

| Node | TTL | Cache Key Inputs |
|------|-----|------------------|
| Research | 4 giờ | `userMessage`, `industry` |
| Content | 1 giờ | `userMessage`, `bestTopic`, `contentPlan` (200 chars), `industry` |
| Strategy | 2 giờ | Tùy implementation |

**Key format:** `flowa:cache:{brandId}:{nodeType}:{sha256_hex[0:32]}`

**Invalidation tự động:**
- `invalidate_cache_on_brand_update()` trigger → xóa cache khi brand template thay đổi
- `invalidate_cache_on_industry_update()` trigger → xóa cache khi industry version thay đổi
- `promptVersion` parameter → thay đổi prompt version tự động invalidate cache cũ

### 8.3 Checkpoint

**File:** `checkpoint.ts` — 152 LOC

| Hàm | Mô tả |
|-----|-------|
| `saveCheckpoint()` | Lưu GraphState vào `workflow_checkpoints` |
| `loadCheckpoint()` | Tải checkpoint mới nhất theo `session_id` |
| `completeCheckpoint()` | Mark checkpoint = completed |
| `failCheckpoint()` | Mark checkpoint = failed |

**Serialization:** `generatedContent` 10K chars, `researchData` 5K chars, `nodeResults` chỉ metadata, `messages` 10 tin cuối.

**Cleanup:** `cleanup_old_checkpoints()` — xóa checkpoints > 7 ngày hoặc completed/failed > 1 ngày.

### 8.4 Token Manager

**File:** `token-manager.ts`

- `createTokenManager()` — khởi tạo với model config
- `summarizeConversationHistory()` — tóm tắt khi vượt 40% budget (~6,500 tokens)
- `TokenBudgetAllocator` — phân bổ token cho các segment context

### 8.5 Prompt Guard

**File:** `prompt-guard.ts`  
**Phương pháp:** Regex-based pattern matching — 0 latency overhead.

**Pattern Categories:**

| Category | Severity | Ví dụ | Số patterns |
|----------|----------|-------|-------------|
| Instruction Override | 🔴 High | `ignore all previous instructions`, `bỏ qua hướng dẫn trước` | 4 |
| Prompt Extraction | 🔴 High / 🟡 Medium | `show me your system prompt` | 4 |
| Role Hijacking | 🔴 High / 🟡 Medium | `you are now a`, `DAN mode`, `jailbreak` | 7 |
| Delimiter Injection | 🟡 Medium | `` ```system ``, `[SYSTEM]` | 3 |
| Data Exfiltration | 🟡 Medium / 🔴 High | `output all data`, `list all api keys` | 2 |

**Action Matrix:**

| Risk Level | Hành động |
|------------|-----------|
| `none` / `low` / `medium` | Flag + pass through (log patterns, không sửa message) |
| `high` | Strip patterns (replace với `[removed]`) + log to `security_events` |

**Giới hạn đã biết:** Marketing content chứa cụm injection-like (VD: hướng dẫn khách hàng "ignore all previous...") bị strip ở high severity. Cần context-aware detection trong tương lai.

**Input limit:** Max 10,000 chars (truncate nếu vượt).

### 8.6 Rate Limiter

**File:** `rate-limiter.ts` — 449 LOC

**Rate Limiting theo Plan:**

| Plan | General (req/min) | Chat (msg/min) |
|------|-------------------|----------------|
| Free | 10 | 5 |
| Starter | 30 | 15 |
| Pro | 60 | 30 |
| Enterprise | 120 | 60 |

**Implementation:** In-memory `Map` với automatic cleanup (5 phút interval).

**⚠️ Giới hạn:** Rate limit không shared across instances khi auto-scale (P2 Roadmap: chuyển sang Redis).

**Quota Management:**
- Check `subscriptions` → `plan_limits` → `usage_logs` count
- Quota types: `script`, `carousel`, `multichannel`, `image_generation`, `ai_edit`
- `-1` = unlimited

**Response khi exceeded:**
- Rate limit: HTTP 429 + `Retry-After`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Quota: HTTP 402 + message upgrade

### 8.7 SSE Writer

**File:** `sse-writer.ts`  
Event types: `turn_start`, `tool_executing`, `tool_result`, `turn_complete`, `content_chunk`, `final_response`, `error`, `agent_step_result`.

### 8.8 Distributed Tracing

**File:** `tracing.ts`  
W3C Trace Context compatible. Root span per request, child span per node. Trace ID inject vào `callAI()` headers (`x-trace-id`, `x-span-id`).

---

## 9. Bảo mật & Cách ly Dữ liệu

### 9.1 Authentication & Authorization

- **JWT Validation:** `verify_jwt = false` trong config.toml → validate manually (custom error handling)
- **Multi-tenant isolation:** Tất cả queries filter theo `organization_id` từ JWT claims
- **RLS Policies:** Enabled trên tất cả tables chứa user data
- **Organization Roles:** `owner`, `admin`, `member` → checked via `is_org_member()`, `is_org_admin()`

### 9.2 Data Access Control

| Dữ liệu | Access Rule |
|----------|-------------|
| Brand templates | Same organization only |
| Generated content | Same organization only |
| Chat conversations | Same user only |
| AI metrics | Same organization only |
| Industry templates | Public (system-managed) |

---

## 10. Pipeline Xử lý Request

```
┌─ 1. Rate Limiting + Quota Check ─────────────────────────────┐
│    In-memory rate limit (per plan tier)                        │
│    DB quota check (usage_logs vs plan_limits)                  │
├─ 2. Fetch Context Song Song ─────────────────────────────────┤
│    ├── Brand template + personas + products + mappings         │
│    ├── Industry Memory + Glossary                              │
│    ├── Learning Context (feedback history)                     │
│    ├── RAG (content + conversation embeddings)                 │
│    ├── User Preferences + Cross-Session Memory                 │
│    └── Web Search Prefetch (nếu phát hiện trending intent)     │
├─ 3. Token Management ────────────────────────────────────────┤
│    Ước tính token conversation                                 │
│    Summarize history nếu vượt 40% budget                       │
├─ 4. Build System Prompt ─────────────────────────────────────┤
├─ 5. Prompt Guard ────────────────────────────────────────────┤
│    Regex pattern detection + strip high-severity               │
├─ 6. Graph Engine Execution ──────────────────────────────────┤
│    Orchestrator → GraphPlan → DAG → Stream SSE events          │
└─ 7. Metrics + Usage Logging ─────────────────────────────────┘
```

---

## 11. Frontend Integration

### 11.1 `useChatStreaming.ts` — Agentic Chat

| SSE Event | Frontend Action | UI Component |
|-----------|-----------------|--------------|
| `graph_plan` | Render progress steps | `AgentPipelineBar` |
| `node_start` | Step status = `active` | Pipeline dot animation |
| `node_complete` | Step status = `completed` | ✅ checkmark + duration |
| `node_error` | Step status = `error` | ❌ error icon |
| `content_chunk` | Append vào response text | Chat bubble (streaming) |
| `context_metadata` | Hiển thị badges | Context badges |

**Node Labels:**

| Node ID | Label | Icon |
|---------|-------|------|
| `research` | Nghiên cứu | `Search` |
| `brand_memory` | Thương hiệu | `Brain` |
| `compliance` | Tuân thủ | `Shield` |
| `strategy` | Chiến lược | `ClipboardList` |
| `content` | Nội dung | `PenTool` |
| `reviewer` | Kiểm duyệt | `ShieldCheck` |
| `governor` | Kiểm soát | `Gauge` |
| `image` | Hình ảnh | `Image` |

### 11.2 `useStreamingGeneration` — Multichannel Editor

Hook riêng cho Multichannel content generation:
- Per-channel state isolation (`useRef` + `channelUpdateSignal`)
- Watchdog timeout phát hiện generation bị stuck
- `React.memo` optimization — chỉ re-render kênh đang nhận data

### 11.3 Error & Edge Case Handling

| Scenario | Behavior | Trạng thái |
|----------|----------|------------|
| SSE connection drop | Hiển thị error, user retry manually | ✅ Implemented |
| `continuation_required` event | Chưa xử lý — nhận partial result | ❌ P1 |
| `quality_warning` event | Chưa xử lý — content trả bình thường | ❌ P1 |
| Long-running pipeline (>30s) | Heartbeat 15s + progress bar | ✅ Implemented |
| Revision in progress | Không có progress indicator riêng | ❌ P2 |
| Non-critical node error | Skip node, tiếp tục pipeline | ✅ Implemented |
| Critical node error (Content) | Dừng pipeline, hiển thị error | ✅ Implemented |

---

## 12. Chỉ số Vận hành

| Metric | Giá trị | Ghi chú |
|--------|---------|---------|
| Max execution time | 55s | Safety margin cho 60s hard limit |
| Token budget default | 16,384 | Configurable per organization |
| Conversation history cap | 40% budget | ~6,500 tokens |
| Heartbeat interval | 15s | SSE keepalive |
| Content cache TTL | 1 giờ | Upstash Redis |
| Research cache TTL | 4 giờ | Upstash Redis |
| Checkpoint max age | 7 ngày | Auto-cleanup |
| Max revision rounds | 2 | Governor cap |
| Quality threshold (approve) | Score ≥ 90, Confidence ≥ 0.85 | Early exit |
| Budget exhaustion | > 80% used | Forced early exit |
| Orchestrator confidence | 0.7 | Below → LLM fallback |
| Embedding model | `gte-small` (384-dim) | Blackboard v2 |
| Primary LLM | `google/gemini-2.5-flash` | Default model |
| Circuit breaker threshold | 3 failures + 30% rate | 5-min window |
| Circuit breaker reset | 5 phút | OPEN → HALF-OPEN |
| Rate limit (Free / Pro) | 10/60 req/min | Per instance |
| Prompt Guard input limit | 10,000 chars | Truncate |
| Cache key hash | 32 chars SHA-256 | `generateCacheKey()` |

---

## 13. Deployment & Scaling

| Aspect | Chi tiết |
|--------|----------|
| Runtime | Deno Edge Functions |
| Timeout | 60s hard limit (55s safety margin) |
| Cold start | ~500ms–1s |
| Concurrency | Tự động scale |
| Database | PostgreSQL + pgvector extension |
| Redis | Upstash Redis (REST API) — optional, graceful fallback |
| Embedding | Lovable AI Gateway (`gte-small` 384-dim) |

**Giới hạn Scaling đã biết:**

| # | Vấn đề | Impact | Mitigation |
|---|--------|--------|------------|
| 1 | Rate limiter in-memory | Rate limit không chính xác khi multi-instance | P2: Chuyển sang Redis |
| 2 | Circuit breaker sync latency | 1–2 requests trước khi instance mới nhận state | Chấp nhận — low impact |
| 3 | Checkpoint không có resume API | Timeout full_pipeline = mất kết quả | P1: Resume API |

---

## 14. Lịch sử Nâng cấp

### Sprint 1 — Core Engine (v2.0)

| # | Tính năng | Files chính | Impact |
|---|-----------|-------------|--------|
| 1 | Graph Engine (8 nodes, DAG executor) | `graph-engine.ts` (719 LOC) | Core — toàn bộ hệ thống phụ thuộc |
| 2 | Orchestrator (fast-path + LLM planning) | `orchestrator.ts` (388 LOC) | ~70% requests fast-path (0 LLM cost) |
| 3 | Blackboard v2 (vector context) | `blackboard-retriever.ts` (330 LOC) | Thay thế `buildStateContext()` |
| 4 | Checkpoint/Continuation | `checkpoint.ts` (152 LOC) | ⚠️ Backend only — chưa có resume API |
| 5 | Distributed Tracing | `tracing.ts` | Observability cho production debugging |

### Sprint 2 — Quality & Security (v2.1)

| # | Tính năng | Files chính | Impact |
|---|-----------|-------------|--------|
| 6 | Governor + Revision Controller | `governor-node.ts`, `revision-controller.ts` | ⚠️ HITL chưa có UI |
| 7 | Compliance Node | `compliance-node.ts` | 0 LLM cost, parallel với research |
| 8 | Redis Cache | `redis-cache.ts`, `content-node.ts` | ~30–45% latency reduction (ước tính) |
| 9 | Prompt Guard | `prompt-guard.ts` | 0 latency overhead |

### Sprint 3–5 — Polish & Cleanup (v2.2)

| # | Tính năng | Sprint | Impact |
|---|-----------|--------|--------|
| 10 | BrandContextCard forwardRef fix | S3 | UI stability |
| 11 | Unified Feedback UI | S3 | Code dedup |
| 12 | Type safety cleanup | S3 | DX improvement |
| 13 | Xóa Legacy Supervisor (6 files) | S4 | **−940 LOC** |
| 14 | Xóa Single-Turn + Agentic Loop blocks | S4 | **−500 LOC** |
| 15 | Governor + Compliance labels UI | S4 | UX completeness |
| 16 | Output token metrics fix | S4 | Metrics accuracy |
| 17 | Conversation History injection | S4 | Context continuity |
| 18 | Dead imports cleanup (7 imports) | S5 | **−12 LOC** |
| 19 | ChatRequest type hygiene (4 legacy flags) | S5 | Type accuracy |
| 20 | SSE Writer extraction | S5 | Unblock legacy deletion |
| 21 | Frontend `enableTools` removal | S5 | API contract cleanup |

**Tổng:** ~1,456 LOC dead code đã loại bỏ qua Sprint 4–5.

---

## 15. Lộ trình Phát triển

| Ưu tiên | Tính năng | Mô tả | Độ phức tạp | Status |
|---------|-----------|-------|-------------|--------|
| **P0** | Xóa `agentic-loop.ts` | 519 LOC legacy. Cần xóa entry từ `ai-config.ts` | Thấp | 🔲 Todo |
| **P0** | Xóa `tool-chain-executor.ts` | Dead code, 0 references confirmed | Thấp | 🔲 Todo |
| **P1** | Checkpoint Resume API | Endpoint với `continuationToken`. Idempotency, staleness check, state validation | Trung bình | 🔲 Todo |
| **P1** | Governor degradation path | Trả best revision + `quality_warning` SSE + `escalation_queue` table | Trung bình | 🔲 Todo |
| **P1** | Observability Dashboard v1 | Aggregate `ai_metrics` + logs → latency/node, cache hit rate, error rate | Trung bình | 🔲 Todo |
| **P1** | Governor HITL UI | Frontend `interruptPayload`: Approve / Edit / Regenerate. Timeout 30 phút | Cao | 🔲 Todo |
| **P2** | Streaming per-node | Content Node streaming → SSE `node_stream`. Frontend tab per node | Trung bình | 🔲 Todo |
| **P2** | Multi-model routing | Orchestrator chọn model tối ưu cho từng node | Cao | 🔲 Todo |
| **P2** | Rate limiter Redis migration | Share state across instances | Trung bình | 🔲 Todo |
| **P2** | Graph visualization | Frontend render DAG execution realtime | Cao | 🔲 Todo |
| **P3** | A/B testing pipeline | So sánh output giữa plan/model variants | Cao | 🔲 Todo |
| **P3** | Custom node plugins | User-defined nodes + Plugin SDK | Rất cao | 🔲 Todo |

---

## 16. Architecture Decision Records

### ADR-001: BFS-style Execution

- **Bối cảnh:** Graph Engine cần thực thi nodes theo dependency order
- **Quyết định:** BFS (Breadth-First Search) — xử lý nodes theo layers, song song hóa cùng layer qua `Promise.allSettled`
- **Hệ quả (+):** Tự nhiên hỗ trợ parallel execution; dễ implement continuation (biết chính xác layer đang chạy)
- **Hệ quả (−):** Không tối ưu cho DAG phức tạp với cross-layer dependencies (hiện tại DAG đủ đơn giản)

### ADR-002: gte-small (384-dim) cho Embeddings

- **Bối cảnh:** Blackboard v2 cần embedding model cho semantic search
- **Quyết định:** `gte-small` 384 dimensions
- **Hệ quả (+):** Nhẹ, nhanh, phù hợp Edge Function latency; hỗ trợ tiếng Việt đủ tốt cho use case
- **Hệ quả (−):** Kém hơn multilingual-e5 cho cross-lingual matching; 384 dim nhỏ hơn production-grade (768–1024)

### ADR-003: Upstash Redis thay vì Internal Cache

- **Bối cảnh:** Cần cache layer cho content generation
- **Quyết định:** Upstash Redis (REST API)
- **Hệ quả (+):** Sub-ms latency, TTL native, REST API compatible Deno; dùng chung cho cache + circuit breaker
- **Hệ quả (−):** External dependency (đã implement graceful fallback); cost thêm (rất thấp)

### ADR-004: 55s Timeout Margin

- **Bối cảnh:** Deno Edge Function hard limit = 60s
- **Quyết định:** `continuationThresholdMs` = 50s (check), safety margin 55s
- **Hệ quả (+):** 5s buffer cho checkpoint save + SSE flush; 10s buffer trước hard timeout
- **Tradeoff:** Chấp nhận giảm 5s execution time để tránh HTTP 504

### ADR-005: Regex-based Prompt Guard

- **Bối cảnh:** Cần phát hiện prompt injection trước khi input vào LLM
- **Quyết định:** Regex pattern matching với severity classification
- **Hệ quả (+):** 0 latency overhead (microseconds); 0 cost; deterministic
- **Hệ quả (−):** False positives cho marketing content; không detect novel injection techniques
- **Mitigation:** High severity chỉ strip, không block — user vẫn nhận response

---

## 17. End-to-End Trace Example

**Scenario:** *"Tạo bài viết về skincare routine cho Gen Z, đăng Facebook và Instagram"*

```
═══ Step 1: Entry Point (chat-topics/index.ts) ═══
  Rate limit:    ✅ Pro plan, 45/60 requests
  Quota:         ✅ multichannel, 12/50 used
  Prompt Guard:  ✅ riskLevel: none
  Context fetch (parallel):
    ├── Brand: "GlowUp Beauty" (tone: friendly, forbidden: "100% tự nhiên")
    ├── Industry: "beauty" (jurisdiction: VN)
    ├── Personas: ["Gen Z nữ 18-24", "Skincare beginner"]
    └── RAG: 3 bài viết liên quan (cosine > 0.7)

═══ Step 2: Orchestrator ═══
  tryFastPath(): match "tạo bài viết" → intent: "generate"
  Có topic ("skincare routine cho Gen Z") → template: "generate_simple"
  Confidence: 0.85 → fast-path (0 LLM cost)

═══ Step 3: Graph Engine ═══
  Plan: content → reviewer → governor

  ── content (Content Node) ──
  LLM #1: Gemini 2.5 Flash, toolChoice: required
    → generate_multichannel(topic: "Skincare routine cho Gen Z", channels: ["facebook", "instagram"])
    → Pipeline: generate-core-content → generate-multichannel
  LLM #2: Follow-up tổng hợp
  Tokens: 3,800 · Duration: 12s

  ── reviewer (Reviewer Node) ──
  Score: 85, Confidence: 0.90
  Issues: ["CTA có thể mạnh hơn"]
  Tokens: 1,800 · Duration: 5s

  ── governor (Governor Node) ──
  Rule: Score 85 (70–89) → Soft revision
  Revision Controller: LLM sửa CTA
  → Quay lại Reviewer

  ── reviewer (Round 2) ──
  Score: 92, Confidence: 0.88
  Tokens: 1,800

  ── governor (Round 2) ──
  Rule: Score 92 ≥ 90 AND Confidence 0.88 ≥ 0.85 → ✅ Early exit
  exitReason: 'quality_met'

═══ Step 4: Response ═══
  Total tokens:  ~9,200 / 16,384 budget
  Total duration: ~25s
  Cache: SET (1h TTL)
  SSE: graph_plan → node_start(content) → content_chunk ×N → node_complete(content)
     → node_start(reviewer) → ... → final_response
```

---

## 18. Đánh giá Kiến trúc

### Điểm mạnh

1. **Zero-cost routing:** Fast-path xử lý ~70% requests không cần LLM cho orchestration
2. **Parallel execution:** Nodes độc lập chạy song song (research ∥ brand_memory ∥ compliance)
3. **Cost efficiency:** Brand Memory + Compliance nodes không gọi LLM
4. **Quality assurance:** Governor → Reviewer loop, max 2 rounds, rule-based
5. **Resilient AI routing:** Circuit breaker hybrid Redis + in-memory, auto-fallback chain
6. **Security layers:** Prompt Guard + encrypted API keys + RLS + multi-tenant isolation
7. **Anti-timeout:** Continuation pattern (backend) cho phép save progress

### Rủi ro & Giới hạn

| # | Rủi ro | Impact | Mitigation hiện tại | Roadmap |
|---|--------|--------|---------------------|---------|
| 1 | `index.ts` (858 LOC) — single point of failure | Cao | Monitoring | P2: Split modules |
| 2 | Blackboard v2 cold start (session mới) | Trung bình | Fallback to `buildStateContext()` | — |
| 3 | Token budget cố định (16,384) | Trung bình | Configurable per org | — |
| 4 | Revision loop cost (+8,000 tokens max) | Trung bình | Max 2 rounds cap | — |
| 5 | Edge Function timeout (55s) | Cao | Continuation pattern | P1: Resume API |
| 6 | Rate limiter per-instance | Thấp | Chấp nhận | P2: Redis migration |
| 7 | Continuation chưa có resume | Cao | User gửi lại message | P1: Resume API |
| 8 | Human escalation không có UI | Trung bình | Trả last revision | P1: HITL UI |

### Khuyến nghị (theo ưu tiên)

1. **P0:** Xóa legacy files — giảm maintenance burden
2. **P1:** Implement Resume API — giải quyết timeout cho full_pipeline
3. **P1:** Governor degradation path — trả best revision + warning thay vì silent fail
4. **P1:** Observability Dashboard — visibility vào latency, cache hit rate, error rate
5. **P2:** Rate limiter Redis — chính xác khi auto-scale
6. **P2:** Split `index.ts` — cải thiện maintainability
7. **P2:** Streaming per-node — cải thiện perceived latency

---

## 19. Cấu trúc Thư mục

```
supabase/functions/
├── chat-topics/
│   └── index.ts                   # Entry point (858 LOC)
└── _shared/
    ├── graph/
    │   ├── graph-engine.ts        # DAG engine (719 LOC)
    │   ├── graph-state.ts         # State schema (265 LOC)
    │   ├── orchestrator.ts        # Intent → Plan (388 LOC)
    │   ├── checkpoint.ts          # Persistence (152 LOC)
    │   ├── blackboard-retriever.ts # Vector context (330 LOC)
    │   └── nodes/
    │       ├── index.ts           # Registry factory
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
    │   └── chat-types.ts          # Shared type definitions
    ├── sse-writer.ts              # SSE streaming utility
    ├── tracing.ts                 # Distributed tracing (W3C)
    ├── ai-provider.ts             # Multi-provider routing (1,237 LOC)
    ├── circuit-breaker.ts         # Hybrid Redis+Memory (439 LOC)
    ├── token-manager.ts           # Token budget management
    ├── system-prompt-builder.ts   # System prompt assembly
    ├── prompt-guard.ts            # Injection detection (regex)
    ├── rate-limiter.ts            # Rate limiting + quota (449 LOC)
    ├── error-utils.ts             # Retry, fallback, timeout
    ├── logger.ts                  # Structured logging + metrics
    ├── cost-estimator.ts          # LLM cost estimation
    ├── crypto.ts                  # API key encryption (AES-256)
    ├── ai-config.ts               # Per-function AI configuration
    ├── tool-definitions.ts        # 18 tool definitions (612 LOC)
    ├── tool-executor.ts           # Tool execution dispatcher
    ├── agentic-loop.ts            # ⚠️ LEGACY — 519 LOC, pending deletion
    └── cache/
        └── redis-cache.ts         # Upstash Redis caching
```

---

*Hết tài liệu. Mọi thay đổi kiến trúc phải đối soát với tài liệu này.*
