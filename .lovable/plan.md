
# Flowa Agentic OS — System Architecture Report v2.3

**Updated:** 2026-02-26
**Status:** Sprint 6 Complete

---

## Sprint 6 Completion Summary

### Sprint 6A: Dead Code Removal ✅
- Deleted `agentic-loop.ts` (~519 LOC)
- Deleted `tool-chain-executor.ts`
- Removed `agentic-loop` config entry from `ai-config.ts`
- Cleaned `sse-writer.ts` comment reference

### Sprint 6B: Governor Degradation Path ✅
- **Governor Rule 3** changed: `status: 'interrupted'` → `status: 'completed'` with `exitReason: 'quality_warning'`
- Removed `interruptPayload` (HITL UI not yet available)
- Governor now returns best available content + quality metadata (revisionRound, reviewScore)
- `graph-engine.ts`: `onNodeComplete` for governor now emits exitReason, revisionRound, reviewScore in SSE event
- **Frontend**: `useChatStreaming.ts` detects `quality_warning` exitReason on governor node_complete → shows amber toast warning

### Sprint 6C: Observability SQL Views ✅
- Created `v_daily_metrics`: P50/P95/P99 latency, error rate, cost per day
- Created `v_node_performance`: Avg duration, fast-path ratio, error rate per function
- Created `v_cache_and_revision`: Cache hit rate, revision rate, circuit breaker trips per day

### Sprint 6D: Tách index.ts Monolith — DEFERRED
- Effort cao, sẽ thực hiện trong sprint riêng

### Sprint 6E: Token Budget Reserve ✅
- `runOrchestrator()`: When plan includes governor, reserves 25% of token budget (4,096 tokens) for revision loop
- Pipeline chính chạy với 75% budget (12,288 tokens)
- Governor node uses `effectiveBudget` (pipeline + reserve) for budget exhaustion check
- Prevents revision rounds being skipped due to budget exhaustion

### Sprint 6F: Documentation ✅
- Updated this file to v2.3

---

## Known Limitations

1. **Continuation Pattern**: Backend saves checkpoints to `workflow_checkpoints` table, but no Resume API exists yet. If a request times out, the checkpoint data is saved but never consumed.

2. **HITL UI**: No frontend UI for human-in-the-loop interactions. Governor uses degradation path (`quality_warning`) instead of `interrupted` status.

3. **Rate Limiter**: In-memory implementation — resets when Edge Function cold starts. Sufficient for current scale.

4. **index.ts Monolith**: 858 LOC entry point handling 7 pipeline stages. Blocks unit testing of individual stages.

5. **Error Taxonomy**: No structured error hierarchy. All errors are generic strings.

---

## Roadmap (Updated Q2/2026)

### P0 — Completed
- ✅ Dead code removal (agentic-loop, tool-chain-executor)
- ✅ Governor degradation path
- ✅ Observability SQL views

### P1 — Next
- Tách `index.ts` monolith → pipeline modules
- Resume API (pending: measure timeout rate via `v_daily_metrics` first)
- Blackboard v2 bootstrap strategy (cross-session retrieval for new sessions)

### P2 — Later
- HITL UI (degradation path covers interim)
- Rate limiter Redis migration
- Error taxonomy (FlowaError hierarchy)
- Multi-model routing per node
- Streaming results per node

### P3 — Future
- Custom Node Plugins + eager execution
- A/B Testing Pipeline
- Key rotation automation
