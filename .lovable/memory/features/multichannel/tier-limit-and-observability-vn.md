---
name: Multichannel Tier Limit + Observability + Auto-Recover
description: P4 hard-limit channels/run theo tier (Free 3/Starter 6/Pro 12/Ent ∞), P5 admin observability page, P6 cron recover-stale tasks mỗi 2 phút
type: feature
---

## Tier limit (P4)
- Constant chung: `_shared/multichannel-tier-limits.ts` (backend) + `src/lib/multichannelTierLimits.ts` (frontend) — Free 3 / Starter 6 / Pro 12 / Enterprise ∞.
- Backend: `generate-multichannel/index.ts` check sau khi resolve `organizationId`, return 402 với code `TIER_LIMIT_EXCEEDED` nếu vượt. Bỏ qua khi `action='regenerate'|'expand'`.
- Frontend: `MultiChannelFormWizard` đọc `useSubscription().subscription.plan_type`, disable nút submit + hiện banner rose khi vượt, link `/settings/plans`.

## Observability (P5)
- Route admin: `/admin/multichannel-observability` (page `AdminMultichannelObservability.tsx`).
- KPI 24h: total/completed/failed/cancelled/generating/auto-recover, success rate %, avg + p95 duration. Failure table 50 dòng cuối.
- Refetch 30s. Truy vấn `generation_tasks` filter `task_type IN ('multichannel','multi_channel','multi-channel')`.
- Nav từ `AdminDashboard` quick actions.

## Auto-recover stale (P6)
- Edge function `recover-stale-multichannel-tasks` (verify_jwt=false): scan `generation_tasks` status='generating' với `last_heartbeat_at < now()-5m` HOẶC null + `created_at < now()-10m`, mark `failed` với `error_message='Auto-recovered: no heartbeat for >5 minutes...'`.
- pg_cron job `recover-stale-multichannel-tasks` chạy `*/2 * * * *`.
- Ghi `cron_run_logs` với `summary={scanned, recovered, threshold_minutes}`.
- Phân biệt task auto-recover vs user-cancel/normal-fail nhờ prefix message → dashboard count riêng.
