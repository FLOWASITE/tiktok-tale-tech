
# Flowa Agentic OS — Project Plan v2.5

## Trang thai Hien tai: Sprint 8 COMPLETED ✅

---

## Da hoan thanh

### Sprint 1-5: Core Platform
- Multi-agent graph engine (DAG) with BFS parallel execution
- Brand templates, personas, products, journey mapping
- Content generation (multichannel, script, carousel)
- RAG search with gte-small embeddings (384d)
- Industry Memory v2 with Knowledge Graph
- Ad Copy management with A/B testing & performance tracking
- Campaign management with KPI notifications

### Sprint 6-7: Architecture & Reliability
- Dead code cleanup (Supervisor Loop, Agentic Loop removed)
- index.ts decomposition → pipeline modules
- Governor degradation (graceful fallback)
- Observability SQL views (v_daily_metrics, v_node_performance, v_cache_and_revision)
- Error taxonomy with structured error types
- Resume API for interrupted sessions
- Blackboard bootstrap for semantic context
- Token budget reserve 25%
- forwardRef fixes for DashboardStats components

### Sprint 8: Security Hardening & Production Optimization
- **Task 32:** `sales_chat_messages_log` — replaced `USING(true)` anonymous insert with validated policy (session_id required, content < 5000 chars)
- **Task 33:** `social_platform_settings` — created `v_social_platform_settings_safe` view (SECURITY INVOKER) hiding OAuth secrets; admin-only RLS retained
- **Task 34:** `ad_copy_performance` — added direct `organization_id` column with auto-populate trigger; replaced complex join-chain RLS with direct org membership check
- **Task 35:** Context Fetcher — implemented per-source timeouts (DB: 3s, RAG: 4s, Web: 5s) with `Promise.allSettled()` for graceful partial results
- **Task 36:** Cache Safety — added `version` column to `brand_templates` with auto-increment trigger; `generateCacheKey()` now includes `brandVersion` to prevent stale cache on brand updates

---

## Security Posture

| Area | Status | Notes |
|------|--------|-------|
| `sales_chat_messages_log` | ✅ Fixed | Validated anonymous insert |
| `social_platform_settings` | ✅ Mitigated | Safe view for frontend, secrets hidden |
| `ad_copy_performance` | ✅ Fixed | Direct org isolation |
| Observability views | ✅ Fixed | SECURITY INVOKER |
| Function search_path | ✅ Fixed | All SET search_path TO 'public' |
| `duplicate_ignore_list` | ✅ Fixed | Scoped to auth.uid() |
| Industry personas v2 | ✅ Fixed | Admin-only write, authenticated read |
| OAuth Vault migration | ⏳ Deferred | RLS restriction sufficient for now |

**Remaining linter warnings:** ~17 `USING(true)` on service-role/public-read tables (by design)

---

## Khong lam (Backlog)

- **Rate limiter Redis** (P2) — in-memory sufficient
- **HITL UI** (P2) — degradation path covers this
- **Multi-model routing** (P2) — needs observability data first
- **OAuth Vault migration** (P3) — high effort, RLS restriction adequate
- **Streaming per-node** (P3) — requires SSE protocol redesign
- **Custom Node Plugins** (P3) — future extensibility

---

## Architecture Notes

- **Execution:** Graph Engine (DAG) only, BFS parallel with 55s safety limit
- **Pipeline:** request-validator → context-fetcher → token-processor → prompt-assembler
- **Cache:** Upstash Redis with graceful fallback; brand_version in cache key
- **Auth:** JWT propagation with trusted fallback for service-role calls
- **Context:** Per-source timeouts, Promise.allSettled for partial results
