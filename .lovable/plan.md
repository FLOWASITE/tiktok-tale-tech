
# Sprint 7: Hoàn thiện Flowa — Kế hoạch Triển khai

Dựa trên Sprint 6 đã hoàn thành và các Known Limitations còn tồn tại, đây là kế hoạch các bước tiếp theo được ưu tiên theo impact và effort.

---

## Tổng quan Tình trạng Hiện tại

**Đã hoàn thành (Sprint 6):**
- Dead code cleanup (agentic-loop.ts, tool-chain-executor.ts)
- Governor degradation path (quality_warning thay vì interrupt)
- Observability SQL views (v_daily_metrics, v_node_performance, v_cache_and_revision)
- Token budget reserve 25% cho revision loop

**Còn tồn đọng (từ Known Limitations + Roadmap P1):**
1. index.ts monolith (858 LOC) — chưa tách
2. Resume API cho Continuation Pattern — checkpoint lưu nhưng không dùng
3. Blackboard v2 bootstrap strategy — session mới fallback về buildStateContext()
4. Error taxonomy — tất cả errors là generic strings
5. Rate limiter vẫn in-memory

---

## Sprint 7A: Tách index.ts Monolith (P1 — Effort cao, Impact cao)

Đây là blocker lớn nhất cho testability. File 858 dòng xử lý 7 pipeline stages.

### Kế hoạch tách:

**File 1: `supabase/functions/_shared/pipeline/request-validator.ts`**
- Extract logic rate limiting + quota check (khoảng dòng 113-150 của index.ts)
- Export: `validateRequest(supabase, userId, orgId, corsHeaders)`
- Trả về: `{ allowed: boolean, errorResponse?: Response }`

**File 2: `supabase/functions/_shared/pipeline/context-fetcher.ts`**
- Extract toàn bộ parallel context fetch (brand, persona, product, RAG, web search, learning context, user preferences, cross-session memory)
- Khoảng dòng 152-500 của index.ts
- Export: `fetchAllContext(supabase, request, userAccessToken)`
- Trả về: `PipelineContext` chứa tất cả fetched data

**File 3: `supabase/functions/_shared/pipeline/token-processor.ts`**
- Extract token management + conversation summarization
- Khoảng dòng 561-634 của index.ts
- Export: `processTokenBudget(messages, contextSources)`

**File 4: `supabase/functions/_shared/pipeline/prompt-assembler.ts`**
- Extract system prompt building logic
- Export: `assemblePrompt(context, tokenManager)`

**Cập nhật index.ts:**
- Import 4 modules mới
- index.ts giảm từ 858 xuống khoảng 250-300 dòng
- Chỉ còn: parse request -> validate -> fetch context -> process tokens -> build prompt -> run graph engine -> stream response

---

## Sprint 7B: Resume API (P1 — Effort trung bình)

### Prerequisite:
- Kiểm tra timeout rate thực tế qua `v_daily_metrics` view
- Nếu timeout rate < 2%, đánh giá lại priority

### Thiết kế:
1. Thêm logic trong `index.ts`: khi request body chứa `continuationToken`, load checkpoint thay vì tạo GraphState mới
2. Validate checkpoint: staleness check (> 5 phút = reject), brand_version check
3. Rebuild state từ checkpoint, skip nodes đã completed
4. Chạy graph engine từ node tiếp theo

**Files cần sửa:**
- `supabase/functions/chat-topics/index.ts` — thêm continuation flow
- `supabase/functions/_shared/graph/checkpoint.ts` — thêm `validateCheckpoint()`
- `supabase/functions/_shared/graph/graph-engine.ts` — thêm `resumeFromCheckpoint()`

### Frontend:
- `src/hooks/useChatStreaming.ts` — xử lý SSE event `continuation_required`, tự động gọi lại với token

---

## Sprint 7C: Error Taxonomy (P1 — Effort trung bình)

### Thiết kế FlowaError hierarchy:

```text
FlowaError (base)
  +-- TransientError (retry-able)
  |     +-- LLMTimeoutError
  |     +-- RateLimitError
  |     +-- NetworkError
  +-- PermanentError (fail fast)
  |     +-- AuthenticationError
  |     +-- InvalidInputError
  |     +-- ConfigurationError
  +-- DegradationError (skip & continue)
        +-- NonCriticalNodeError
        +-- CacheError
        +-- EmbeddingError
```

**Files cần tạo/sửa:**
- Tạo `supabase/functions/_shared/errors/flowa-error.ts` — error classes
- Sửa `supabase/functions/_shared/error-utils.ts` — dùng FlowaError trong retry/fallback logic
- Sửa `graph-engine.ts` — check error type khi node fail: TransientError retry, DegradationError skip, PermanentError fail

---

## Sprint 7D: Blackboard v2 Bootstrap (P2 — Effort thấp)

### Vấn đề:
Session mới không có embedding nào, fallback về `buildStateContext()` tạo 2 code paths.

### Giải pháp:
- Trong `blackboard-retriever.ts`, khi session mới: tự động query cross-session context từ cùng `brand_template_id`
- Chỉ fallback về `buildStateContext()` khi brand hoàn toàn mới (0 embeddings)
- Giảm tần suất fallback đáng kể

**File:** `supabase/functions/_shared/graph/blackboard-retriever.ts`

---

## Sprint 7E: Cập nhật Tài liệu (P0)

- Cập nhật `.lovable/plan.md` lên v2.4
- Ghi Sprint 7 completions
- Cập nhật Known Limitations (xóa items đã fix)
- Thêm Impact Metrics nếu có data từ SQL views

---

## Thứ tự Thực hiện Đề xuất

| Bước | Sprint | Lý do |
|------|--------|-------|
| 1 | 7A (Tách index.ts) | Unblock testability, giảm blast radius |
| 2 | 7C (Error taxonomy) | Foundation cho tất cả error handling |
| 3 | 7B (Resume API) | Chỉ làm nếu timeout rate > 2% |
| 4 | 7D (Blackboard bootstrap) | Cải thiện cold start UX |
| 5 | 7E (Tài liệu) | Cập nhật cuối cùng |

---

## Chi tiết Kỹ thuật

### Sprint 7A — Pipeline Module Pattern

Mỗi module pipeline sẽ follow pattern:

```typescript
// pipeline/context-fetcher.ts
export interface PipelineContext {
  brand: BrandContext | null;
  personas: any[];
  products: any[];
  ragResults: RAGResult[];
  webSearch: WebSearchResponse | null;
  learningContext: LearningContext | null;
  userPreferences: UserPreferencesContext | null;
  crossSessionMemory: CrossSessionMemory | null;
  industryMemory: IndustryMemory | null;
  glossary: GlossaryTerm[];
}

export async function fetchAllContext(
  supabase: any,
  request: ChatRequest,
  userAccessToken: string
): Promise<PipelineContext> {
  // Promise.allSettled cho tất cả fetches
  // Mỗi source có timeout riêng (web search 3s, RAG 2s, DB 1s)
  // Graceful degrade nếu 1 source fail
}
```

### Sprint 7B — Resume Flow

```text
Client                    Edge Function
  |                           |
  |--- POST /chat-topics ---->|
  |    {message: "..."}       |
  |                           |-- run pipeline -->
  |                           |   (timeout approaching)
  |<-- SSE: continuation -----|
  |    {token: "abc123"}      |
  |                           |
  |--- POST /chat-topics ---->|
  |    {continuationToken:    |
  |     "abc123"}             |
  |                           |-- load checkpoint
  |                           |-- validate (< 5min, brand ok)
  |                           |-- resume from next node
  |<-- SSE: results ---------|
```

### Sprint 7C — Error Usage in Graph Engine

```text
Node throws error
      |
      v
  Is TransientError?
      |-- Yes --> Retry (max 2)
      |            |-- Still fails --> Is critical?
      |                                  |-- Yes --> Fail graph
      |                                  |-- No  --> Skip, continue
      |
      |-- Is DegradationError?
      |    |-- Yes --> Log warning, skip node, continue
      |
      |-- Is PermanentError?
      |    |-- Yes --> Fail immediately (no retry)
      |
      |-- Unknown error --> Treat as Transient (retry once)
```

### Không làm trong Sprint 7 (defer tiếp)
- **HITL UI** (P2) — degradation path đủ dùng
- **Rate limiter Redis** (P2) — in-memory đủ cho scale hiện tại
- **Multi-model routing** (P2) — cần thêm data về model performance
- **Streaming per-node** (P2) — effort cao, cần redesign SSE protocol
- **Custom Node Plugins** (P3) — cần eager execution trước
