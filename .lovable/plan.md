
# Sprint 6: Expert Review Implementation Plan

Ke hoach thuc hien cac khuyen nghi tu chuyen gia, chia thanh 6 sprint nho (Sprint 6A-6F), sap xep theo priority va effort.

---

## Sprint 6A: Xoa Dead Code (P0 — Effort thap)

### Task 24: Xoa `agentic-loop.ts` (519 dong)
- Xoa file `supabase/functions/_shared/agentic-loop.ts`
- Xoa reference `agentic-loop` trong `ai-config.ts` (dong 55-58, config entry cho `agentic-loop`)
- Cap nhat comment trong `sse-writer.ts` dong 1 (xoa "extracted from agentic-loop.ts")

### Task 25: Xoa `tool-chain-executor.ts`
- Xoa file `supabase/functions/_shared/tool-chain-executor.ts`
- Verify khong con import nao reference file nay (da confirm: 0 matches)

---

## Sprint 6B: Governor Degradation Path (P0 — Effort trung binh)

### Task 26: Sua Governor Node — tra best revision thay vi interrupt khi chua co HITL UI

**Van de hien tai:** Khi `revisionRound >= MAX_REVISION_ROUNDS`, Governor set `status: 'interrupted'` va tao `interruptPayload`. Nhung frontend chua co UI xu ly interrupt → workflow dung, user khong nhan duoc content.

**Giai phap:** Thay vi interrupt, tra content ban revision tot nhat kem `quality_warning` event:

```text
Governor Rule 3 (hien tai):
  revisionRound >= 2 → status: 'interrupted', interruptPayload

Governor Rule 3 (moi):
  revisionRound >= 2 → status: 'completed', exitReason: 'quality_warning'
  + emit quality_warning SSE event voi reviewResult chi tiet
  + finalResponse = generatedContent (ban revision cuoi)
```

**File:** `supabase/functions/_shared/graph/nodes/governor-node.ts`
- Sua Rule 3: doi `status: 'interrupted'` thanh `status: 'completed'`
- Xoa `interruptPayload`
- Them `exitReason: 'quality_warning'`
- Giu metadata (revisionRound, reviewScore) de frontend hien thi warning

### Task 27: Frontend hien thi quality warning
**File:** `src/hooks/useChatStreaming.ts`
- Them xu ly SSE event `quality_warning` hoac check `exitReason` trong `node_complete` cua governor
- Hien thi toast canh bao: "Noi dung chua dat tieu chuan toi uu"

---

## Sprint 6C: Observability SQL Views (P1 — Effort thap)

### Task 28: Tao SQL views cho core metrics

Tao 3 database views aggregate data tu `ai_metrics`:

1. **`v_daily_metrics`**: P50/P95 latency, request count, error rate, theo ngay
2. **`v_node_performance`**: Latency trung binh per node, fast-path ratio
3. **`v_cache_and_revision`**: Cache hit rate, revision rate, circuit breaker trips

```sql
-- View 1: Daily overview
CREATE VIEW v_daily_metrics AS
SELECT
  DATE(created_at) as day,
  COUNT(*) as total_requests,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration_ms) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) as p95_ms,
  AVG(CASE WHEN had_error THEN 1.0 ELSE 0.0 END) as error_rate,
  AVG(estimated_cost_usd) as avg_cost_usd
FROM ai_metrics
GROUP BY DATE(created_at);

-- View 2 & 3 tuong tu
```

**Tool:** Database migration

---

## Sprint 6D: Tach index.ts Monolith (P1 — Effort cao)

### Task 29: Extract context fetching thanh module rieng

**Van de:** `index.ts` 858 dong, thuc hien 7 buoc pipeline trong 1 file.

**Giai phap:** Extract thanh pipeline stages:

1. **`supabase/functions/_shared/pipeline/context-fetcher.ts`** (~200 dong)
   - Move dong 152-387 (brand, persona, product, RAG, web search fetch)
   - Export function `fetchAllContext(supabase, request): Promise<PipelineContext>`

2. **`supabase/functions/_shared/pipeline/request-validator.ts`** (~50 dong)
   - Move rate limiting + quota check (dong 113-150)
   - Export function `validateRequest(supabase, userId, corsHeaders): Promise<ValidationResult>`

3. **`supabase/functions/_shared/pipeline/token-processor.ts`** (~70 dong)
   - Move token management + conversation summarization (dong 561-634)
   - Export function `processTokenBudget(messages, context): ProcessedMessages`

4. Cap nhat `index.ts` import va goi 3 modules moi
   - `index.ts` giam tu 858 xuong ~350-400 dong
   - Moi stage co the unit test doc lap

---

## Sprint 6E: Token Budget Reserve cho Revision (P1 — Effort thap)

### Task 30: Reserve 25% token budget cho revision loop

**Van de:** Revision round 1 (content ~4K + reviewer ~2K) + round 2 (content ~4K + reviewer ~2K) = 12K tokens. Voi budget 16,384 tokens, pipeline chinh da dung ~12K → revision round 2 bi skip do het budget.

**Giai phap:**
- Trong `graph-engine.ts`, khi plan co governor node, set `tokenBudget.total` cho pipeline chinh = 75% (12,288 tokens)
- Reserve 25% (4,096 tokens) cho revision rounds
- Governor node check reserved budget thay vi total budget

**File:** `supabase/functions/_shared/graph/graph-engine.ts` — sua `runOrchestrator()` de allocate budget

---

## Sprint 6F: Cap nhat Tai lieu (P0 — Effort thap)

### Task 31: Cap nhat `.lovable/plan.md`

- Ghi Sprint 6A-6F completions
- Them section "Known Limitations" ghi ro:
  - Continuation Pattern: backend luu checkpoint nhung chua co Resume API
  - HITL UI: chua co, dang dung degradation path (quality_warning)
  - Rate limiter: in-memory, reset khi Edge Function restart
- Cap nhat Roadmap priorities theo khuyen nghi chuyen gia

---

## Tom tat Priority va Impact

| Sprint | Tasks | Priority | Effort | Impact |
|--------|-------|----------|--------|--------|
| 6A | Xoa dead code (2 files, ~600 LOC) | P0 | Thap | Codebase sach |
| 6B | Governor degradation path | P0 | Trung binh | Fix silent quality failure |
| 6C | SQL views observability | P1 | Thap | Team khong con "bay mu" |
| 6D | Tach index.ts monolith | P1 | Cao | Testability, maintainability |
| 6E | Token budget revision reserve | P1 | Thap | Fix revision skip do het budget |
| 6F | Cap nhat tai lieu | P0 | Thap | Accuracy |

### Thu tu thuc hien de xuat
1. Sprint 6A (xoa dead code) — lam truoc vi effort thap nhat, risk thap nhat
2. Sprint 6B (governor degradation) — fix UX issue nghiem trong
3. Sprint 6C (SQL views) — bat dau do metrics
4. Sprint 6E (token budget) — fix logic bug
5. Sprint 6F (tai lieu) — cap nhat sau khi code thay doi
6. Sprint 6D (tach index.ts) — effort cao nhat, lam cuoi

### Khong lam trong sprint nay (defer)
- **Resume API** (P1) — can do timeout rate truoc. Neu < 2%, deprioritize
- **HITL UI** (P2) — degradation path o Sprint 6B da cover tam thoi
- **Rate limiter Redis migration** (P2) — in-memory du cho scale hien tai
- **Error taxonomy** (P2) — can thiet nhung effort cao, plan rieng
