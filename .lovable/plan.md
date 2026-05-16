# Báo cáo Audit — AI Agent Pipeline & Orchestrator

**Phạm vi:** `supabase/functions/agent-pipeline/index.ts` (2460 LOC, 9 actions, 6 stages) + tương tác với `agent-creator-v2`, `agent-quality`, `agent-approve`, `agent-orchestrator-analytics`.

**Phương pháp:** Đọc code + query trạng thái thực tế `agent_pipelines` (13 pipelines chưa hoàn thành: 3 fail ở `create`, 10 kẹt ở `approval`).

---

## 🔴 CRITICAL (cần fix ngay)

### C1. `agent-creator-v2` 504 timeout không có fallback
**Bằng chứng DB:**
```
flag_reason: Stage "create" failed after 3 retries: agent-creator-v2 returned 504
```
2/3 pipeline `create` thất bại đều vì 504 (Edge Function timeout 150s). `callFunction()` không có abort timeout, không downgrade model, không split per-channel khi quá tải.
**Hệ quả:** Retry 3 lần × 150s = lãng phí 7.5 phút + tiền AI, pipeline bị flag vĩnh viễn.
**Fix:**
- Thêm `AbortController` timeout 120s trong `callFunction`.
- Khi nhận 504/timeout ở stage `create`: tự động hạ `modelOverride` xuống `flash-lite` cho retry 2, hoặc tách multichannel thành per-channel calls.
- Phân loại error 504 thành `type: 'timeout'` đã có, nhưng `strategy: 'retry'` cần thêm "downgrade_model".

### C2. Empty content vẫn bị flag, không revalidate prompt
```
flag_reason: Content generation completed but all channels (facebook) returned empty content
```
**Vấn đề:** `agent-creator-v2` trả `success: true` nhưng nội dung rỗng → orchestrator throw → retry y nguyên prompt → fail mãi.
**Fix:** Trong stage `create`, check `creatorResult.output.empty_channels`; nếu có thì retry với `temperature += 0.2` + giảm `target_channels` xuống 1 kênh test.

### C3. Pipelines kẹt vĩnh viễn ở `approval` (10 pipeline cũ từ 2026-05-01)
`recover_stuck` cố tình bỏ qua `approval` (`.not("current_stage", "eq", "approval")`) vì cần human. Nhưng không có cơ chế **expiry** → 12 ngày sau vẫn pending, chiếm slot `MAX_CONCURRENT_PIPELINES=10`.
**Fix:**
- Thêm `approval_expires_at` (default +7 ngày) khi tạo approval record.
- Cron job daily: tự `auto_approve` (nếu quality > threshold) hoặc `auto_reject` các approval quá hạn.
- Hoặc loại bỏ approval cũ khỏi quota check (chỉ đếm pipeline đang chạy thực sự).

### C4. `MAX_CONCURRENT_PIPELINES = 10` hardcode toàn org
Không phân biệt Free/Starter/Pro/Enterprise. Org Pro trả tiền vẫn bị throttle như Free.
**Fix:** Đọc từ `organization_subscriptions.tier` → map sang quota (Free 3, Starter 5, Pro 15, Enterprise 50).

---

## 🟠 HIGH

### H1. `check_scheduled_publish` chỉ xử lý kênh `facebook` cho direct schedules
```ts
.eq("channel", "facebook")  // L635
```
Các content_schedules direct cho IG/LinkedIn/X/TikTok... bị bỏ qua hoàn toàn.
**Fix:** Mở rộng `DIRECT_SCHEDULE_CHANNEL_CONFIG` cho tất cả channels đã có publish-* edge function, query `IN` thay vì `EQ`.

### H2. Race condition trong fire-and-forget self-loop
`fireNextStage` POST lại `agent-pipeline` (chính nó). Dedup guard chỉ 10s (`elapsed < 10000`). Nếu cron `recover_stuck` chạy đồng thời với auto-advance → có thể fire 2 lần stage `create`/`quality` → double AI cost, duplicate `agent_approvals`.
**Bằng chứng:** stage `quality` đã thêm `setTimeout(staggerDelay)` 0-15s random — đây là patch tạm cho race condition này.
**Fix:** Dùng `SELECT FOR UPDATE` hoặc atomic CAS trên `pipeline_state.stages[stage].status` ('pending'→'in_progress') trước khi chạy. Tăng dedup window lên ≥ STAGE_TIME_ESTIMATES.

### H3. Tạo duplicate `agent_approvals` ở 3 nơi khác nhau
- L434-445 (`advance_stage`)
- L1767-1780 (runStage `approval`)
- L2295-2307 (auto-advance khi sang approval)

Schema scores cũng khác nhau (`seo_score` cũ vs `geo.overall_score` mới). Dễ tạo record trùng + UI hiển thị inconsistent.
**Fix:** Extract `createApprovalRecord(supabase, pipeline, pState)` helper duy nhất, check `existing` bằng `pipeline_id` + `status='pending'` trước khi insert.

### H4. `agentTemperature || undefined` bug
```ts
const agentTemperature = agentConfig?.temperature || undefined;
```
Nếu admin set `temperature = 0` (deterministic) → `0 || undefined` = `undefined` → ignore. Tương tự `max_tokens = 0`.
**Fix:** `agentConfig?.temperature ?? undefined`.

### H5. `getModelForComplexity` ignore admin override + ignore 9Router
Hardcode `google/gemini-2.5-*`. Vừa tích hợp 9Router xong nhưng pipeline không tận dụng được model 9Router cho stage.
**Fix:** Đọc default từ `ai_function_configs` (function_name='agent-pipeline', complexity_tier='simple|medium|complex') thay vì hardcode.

### H6. Approval auto-approve dùng schema scores cũ ở `advance_stage`
```ts
scores: { seo: qualityOutput?.seo_score, geo: qualityOutput?.geo_score, ... }  // L440
```
Nhưng `runStage` quality lưu là `qualityOutput.geo.overall_score`. → `advance_stage` luôn ghi `null` cho geo/seo/compliance.
**Fix:** Đồng bộ schema với `runStage` (L1773-1778).

---

## 🟡 MEDIUM

### M1. `STAGE_TIME_ESTIMATES.approval = 300000ms` (5 phút)
`approval` chờ human, có thể vài ngày. Sau 80% × 5min = 4min đã log `early_warning` "slow_stage" → spam logs.
**Fix:** `approval: 7 * 24 * 60 * 60 * 1000` (7 ngày), hoặc tắt early_warning cho stage `approval`.

### M2. Compliance LLM dùng `model_override` của agent `quality` không có config riêng
`callAIWithMetrics({ functionName: 'agent-pipeline-quality' ...})` nhưng admin chỉ thấy `agent-pipeline` trong AI config, không thấy sub-function `-quality`. Khó override.
**Fix:** Đăng ký `agent-pipeline-quality` + `agent-pipeline-persona-fit` vào `ai_function_configs` registry.

### M3. `agent-pipeline/index.ts` = 2460 LOC monolith
9 actions + runStage 1160 LOC + retry/advance logic chen lẫn. Khó test, khó review.
**Fix:** Tách thành:
- `actions/trigger-from-goal.ts`, `actions/create-from-plan.ts`, `actions/recover-stuck.ts`...
- `stages/strategy.ts`, `stages/create.ts`, `stages/quality.ts`...
- `_shared/pipeline/advance.ts` (shared logic advance + create approval).

### M4. `getAgentModelConfig` không cache
Mỗi pipeline stage = 1 query `agent_model_configs`. Cron fire 10+ pipelines cùng lúc = 10+ queries trùng.
**Fix:** Memoize per orgId+agentName trong 60s qua `memoryCache`.

### M5. Quality stagger 0-15s random không deterministic
`Math.floor(Math.random() * 15000)` — patch tạm cho race condition. Khi debug rất khó reproduce timing.
**Fix:** Dùng hash(pipelineId) % 15000 thay vì random thuần.

### M6. `backfill_*` actions không có rate limit / dry-run
Chạy không giới hạn, có thể tạo hàng trăm approval/schedule cùng lúc.
**Fix:** Thêm `limit` param (default 50), thêm `dry_run` flag.

### M7. Notification spam — mỗi pipeline complete = N notifications cho N admins
Org có 5 admin → 5 notif + 5 telegram per pipeline. Campaign 30 pieces = 150+ noti.
**Fix:** Batch theo campaign hoặc dùng digest hourly.

### M8. Backlink URL injection check chuỗi đơn giản dễ false positive
```ts
if (rawText && !rawText.includes(blogBacklinkUrl))
```
Nếu URL chứa query param hoặc đã shortened, sẽ inject lặp.
**Fix:** Parse URL hostname+pathname để so sánh.

---

## 🟢 LOW (nice-to-have)

- **L1.** `parseJsonFromLLM` không log raw text khi parse fail → khó debug.
- **L2.** `fireNextStage` `.catch()` swallow error, không metric → không biết bao nhiêu invocation thất bại.
- **L3.** STAGE_ORDER là const array — nên export type `Stage = typeof STAGE_ORDER[number]` để type-safe.
- **L4.** Console.log mix tiếng Việt + Anh không nhất quán.
- **L5.** `slugify(... || 'campaign')` fallback string nên là constant.

---

## 📊 Tóm tắt priority

| # | Vấn đề | Severity | Hiệu ứng | Effort |
|---|---|---|---|---|
| C1 | Creator 504 không fallback | 🔴 | Mất 7.5min/pipeline, flag vĩnh viễn | M |
| C2 | Empty content retry vô ích | 🔴 | Lãng phí AI credit | S |
| C3 | Approval kẹt vĩnh viễn chiếm quota | 🔴 | Org bị throttle false | M |
| C4 | Quota hardcode không theo tier | 🔴 | Pro/Enterprise bị giới hạn như Free | S |
| H1 | Direct schedule chỉ FB | 🟠 | IG/LinkedIn/X scheduled không publish | S |
| H2 | Race condition fire-and-forget | 🟠 | Double AI cost, duplicate approvals | M |
| H3 | Duplicate approval ở 3 nơi | 🟠 | UI hiển thị sai | S |
| H4 | `||` thay vì `??` | 🟠 | Admin config bị ignore | XS |
| H5 | Model hardcode ignore 9Router | 🟠 | Không tận dụng provider mới | S |
| H6 | Schema scores cũ ở advance_stage | 🟠 | Approval scores null | XS |
| M1-M8 | Stability/maintainability | 🟡 | Tăng dần technical debt | S-M |

**Khuyến nghị:** Fix C1→C4 + H4→H6 trong 1 sprint (XS+S+M = ~6h). H1-H3 + M3 cần refactor lớn hơn, tách sprint riêng.

Sau khi bạn approve plan này, mình có thể chuyển sang implement theo từng nhóm (C/H/M) — bạn chọn nhóm nào ưu tiên fix trước.