---
name: Orchestrator Hardening Sprint 1
description: agent-pipeline fixes — callFunction timeout 140s, downgrade-on-504, temperature bump on empty, tier-based quota, expanded direct-schedule channels, approval dedup
type: feature
---

# Agent Pipeline Hardening (Sprint 1)

Fixes triển khai trong `supabase/functions/agent-pipeline/index.ts`:

## C1 — Creator timeout fallback
- `callFunction(...)` thêm `AbortController` với `timeoutMs` mặc định 120s, có override.
- Stage `create` gọi với `timeoutMs: 140_000` (dưới Edge 150s).
- Retry sau timeout/504 tự động hạ model xuống `google/gemini-2.5-flash-lite`.

## C2 — Empty content recovery
- Detect `last_error.includes('empty content')` ở retry.
- Bump `temperature += 0.2` (cap 1.2) để phá deterministic loop.

## C3 (partial) — Approval không chiếm quota
- Quota query thêm `.neq("current_stage", "approval")` ở 2 nơi (`check_scheduled_goals`, `create_from_plan`).
- Approval expiry/auto-reject cron job để sprint sau.

## C4 — Tier-based quota
- `TIER_PIPELINE_QUOTA = { free:3, starter:5, pro:15, enterprise:50 }`.
- `getOrgPipelineQuota(orgId)` đọc `organization_subscriptions.tier`.
- Thay thế `MAX_CONCURRENT_PIPELINES = 10` hardcode ở 3 nơi.

## H1 — Direct schedule multi-channel
- `DIRECT_SCHEDULE_CHANNEL_CONFIG` mở rộng từ chỉ `facebook` → 11 kênh (FB, IG, LinkedIn, Twitter, Threads, TikTok, YouTube, Zalo OA, Telegram, Google Maps, Website).
- `check_scheduled_publish` dùng `.in("channel", DIRECT_SCHEDULE_CHANNELS)`.

## H3 (partial) — Approval dedup
- `advance_stage` thêm check `existing pending approval` trước khi insert.

## H4 — `??` thay `||`
- `agentConfig?.temperature ?? undefined` (giữ 0).
- Sites gọi tool dùng `!== undefined` thay vì truthy check.

## H6 — Schema scores đồng bộ
- `advance_stage` approval record dùng schema `qualityOutput?.geo?.overall_score` mới (đồng bộ với `runStage`).

## M1 — Approval time estimate
- `STAGE_TIME_ESTIMATES.approval` từ 300_000ms (5min) → 7 ngày để tránh spam `early_warning`.

## TODO sprint 2
- H2: Atomic CAS race condition.
- H3 full: Helper `createApprovalRecord()` thay cho 3 sites.
- H5: `ai_function_configs` per-complexity-tier override.
- C3 full: Migration `approval_expires_at` + cron auto-reject.
- M3: Tách 2460 LOC monolith.
