---
name: Orchestrator Hardening
description: agent-pipeline Sprint 1+2+3 — timeout/downgrade, tier quota, claim CAS, approval helper + expiry cron, per-complexity model override, in-memory cache
type: feature
---

# Agent Pipeline Hardening

## Sprint 1 (đã ship)

### C1 — Creator timeout fallback
- `callFunction(...)` thêm `AbortController` timeout 120s default, override per-call.
- Stage `create` gọi với `timeoutMs: 140_000` (dưới Edge 150s).
- Retry sau timeout/504 tự động hạ model xuống `google/gemini-2.5-flash-lite`.

### C2 — Empty content recovery
- Detect `last_error.includes('empty content')` ở retry → bump `temperature += 0.2` (cap 1.2).

### C4 — Tier-based quota
- `TIER_PIPELINE_QUOTA = { free:3, starter:5, pro:15, enterprise:50 }`.
- `getOrgPipelineQuota(orgId)` đọc `organization_subscriptions.tier`.
- Approval stage `.neq("current_stage","approval")` để không chiếm quota.

### H1 — Direct schedule multi-channel
- `DIRECT_SCHEDULE_CHANNEL_CONFIG` mở rộng 11 kênh.

### H4 / H6 — `??` thay `||`, schema scores đồng bộ.

### M1 — Approval time estimate 7 ngày.

## Sprint 2 (đã ship)

### C3 full — Approval expiry + cron auto-reject
- Migration: `agent_approvals.expires_at TIMESTAMPTZ` default `now() + 7 days`, index partial trên `status='pending'`.
- Backfill rows pending cũ với expires_at = created_at + 7d.
- Action `expire_approvals`: select pending hết hạn → set `status='rejected'` + `reviewer_notes='Auto-rejected...'`, flag pipeline `is_flagged=true, flag_reason='approval_expired'`.
- pg_cron `agent-pipeline-expire-approvals-hourly` (`17 * * * *`) gọi action mỗi giờ.

### H2 — Atomic CAS claim
- Migration: `agent_pipelines.stage_claim_token TEXT, stage_claim_at TIMESTAMPTZ`, index partial.
- `claimPipelineStage(supabase, id, expectedStage)` UPDATE WHERE `claim IS NULL OR claim_at < now()-5min` AND `current_stage = expected` RETURNING id. Trả token hoặc null.
- `releasePipelineClaim(...)` clear claim sau `runStage` finally.
- `run_stage` skip với `{status:'skipped', reason:'already_claimed'}` nếu CAS fail.

### H3 full — Helper `createApprovalRecord()`
- Centralized: dedup check (skip nếu đã có pending) + H6 schema scores.
- Replace 4 sites duplicate (advance_stage, backfill_approvals, runStage approval pending, auto-advance after stage completed).
- `auto_approved` insert ở smart-auto-approve + human_on_loop giữ raw insert (status khác).

## Sprint 3 (đã ship)

### H5 — Per-complexity model override
- `getModelForComplexity(supabase, complexity, orgId)` đọc `ai_function_configs` với `function_name` IN `agent-pipeline-complexity-{simple|medium|complex}`.
- Org-specific override thắng global; fallback `COMPLEXITY_MODEL_DEFAULTS` (gemini-2.5-pro / flash / flash-lite).
- Admin có thể đổi model cho từng tier complexity từ Admin AI Management mà không cần redeploy.

### M4 — In-memory cache
- Module-scoped `Map<string, {value, expiresAt}>` TTL 5 phút, soft cap 500 entries.
- Áp cho `getAgentModelConfig` (key `agent-cfg:{org}:{agent}`) và `getModelForComplexity` (key `complexity:{org}`).
- Giảm DB hit khi `runStage` gọi liên tục cho cùng org/agent.

## TODO sprint 4
- M3: Tách 2646 LOC monolith thành sub-modules (`stages/`, `actions/`, `helpers/`).
- Cache invalidation hook khi admin update `ai_function_configs` / `ai_agent_model_configs` (Realtime channel).
- Edge function logs → centralized observability table.

## Sprint 4 (đã ship)

### Polish & resilience nhỏ
- **L3**: `STAGE_ORDER as const` + `type Stage = typeof STAGE_ORDER[number]` cho type-safety.
- **L2**: `fireNextStage` log non-OK HTTP status + message lỗi rõ ràng (kèm pipelineId+stage).
- **L1**: `parseJsonFromLLM` log preview 300 ký tự đầu khi tất cả attempts fail (debug LLM output bị truncate / format lạ).
- **M5**: Quality stage stagger từ `Math.random()` → `deterministicStagger(pipelineId, 15000)` (hash 32-bit). Reproducible khi debug, vẫn phân tán đều giữa pipelines.
- **M8**: Backlink injection so sánh `hostname+pathname` qua `new URL()` thay vì `String.includes()` thuần. Tránh double-inject khi URL có query/UTM hoặc shortened.

## TODO sprint 5
- M3: Tách 2670 LOC monolith thành sub-modules (`stages/`, `actions/`, `helpers/`).
- M6: `backfill_*` actions thêm `limit` + `dry_run` param.
- M7: Notification digest hourly thay vì spam per-pipeline.
- Cache invalidation hook khi admin update `ai_function_configs` (Realtime).
