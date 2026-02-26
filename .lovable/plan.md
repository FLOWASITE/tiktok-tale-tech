
# Flowa Technical Documentation v2.4

## Sprint 7 Completions

### 7A: index.ts Monolith Decomposition ✅
- Extracted 4 pipeline modules:
  - `pipeline/request-validator.ts` — Rate limiting + quota check
  - `pipeline/context-fetcher.ts` — Parallel context fetching (brand, persona, RAG, web search, etc.)
  - `pipeline/token-processor.ts` — Token budget management + conversation summarization
  - `pipeline/prompt-assembler.ts` — System prompt building + context metadata
- `index.ts` reduced from 858 LOC to ~250 LOC
- Each stage independently testable

### 7B: Resume API ✅
- Added `validateCheckpoint()` in `checkpoint.ts` — staleness check (5min), status validation
- Frontend auto-resume: `useChatStreaming.ts` now automatically sends continuation request when `continuation_required` SSE event is received
- Flow: timeout → save checkpoint → emit token → frontend auto-resumes with token

### 7C: Error Taxonomy ✅
- Created `errors/flowa-error.ts` with structured hierarchy:
  - `TransientError` (LLMTimeoutError, RateLimitError, NetworkError) → retry
  - `PermanentError` (AuthenticationError, InvalidInputError, ConfigurationError) → fail fast
  - `DegradationError` (NonCriticalNodeError, CacheError, EmbeddingError) → skip & continue
- `classifyError()` auto-classifies unknown errors
- `getErrorStrategy()` returns 'retry' | 'skip' | 'fail'
- `graph-engine.ts` updated: nodes now retry once on TransientError, skip on DegradationError, fail on PermanentError
- Re-exported from `error-utils.ts` for backward compatibility

### 7D: Blackboard v2 Bootstrap ✅
- `blackboard-retriever.ts` `retrieve()` now auto-falls back to cross-session context when session has no embeddings
- Only falls back to `buildStateContext()` when brand is completely new (0 embeddings across all sessions)
- Reduces cold start fallback frequency significantly

---

## Sprint 6 Completions (Previous)
- Dead code cleanup (agentic-loop.ts, tool-chain-executor.ts — ~600 LOC removed)
- Governor degradation path (quality_warning instead of interrupt)
- Observability SQL views (v_daily_metrics, v_node_performance, v_cache_and_revision)
- Token budget reserve 25% for revision loop

---

## Known Limitations (Updated)
1. ~~index.ts monolith~~ → Fixed in Sprint 7A
2. ~~Error taxonomy missing~~ → Fixed in Sprint 7C
3. ~~Blackboard cold start~~ → Fixed in Sprint 7D
4. Rate limiter: still in-memory, resets on Edge Function cold start (P2)
5. HITL UI: not implemented, using degradation path (quality_warning) as workaround
6. Resume API: backend ready, frontend auto-resume implemented but not battle-tested in production

---

## Roadmap (Updated)

### Deferred (P2-P3)
- **Rate limiter Redis migration** — in-memory sufficient for current scale
- **Multi-model routing** — needs performance data from observability views
- **Streaming per-node** — high effort, requires SSE protocol redesign
- **Custom Node Plugins** — requires eager execution (DAG improvement)
- **HITL UI** — degradation path covers most cases

### Monitoring
- Use `v_daily_metrics` to track timeout rate (if > 2%, prioritize Resume API hardening)
- Use `v_node_performance` to identify bottleneck nodes
- Use `v_cache_and_revision` to validate cache hit rate assumptions
