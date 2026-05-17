---
name: Async Creator (Option B)
description: agent-creator-v2 carousel chạy fire-and-forget, agent-pipeline create stage poll generation_tasks qua action poll_pending_creators + cron 2 phút
type: feature
---

# Option B — Async Creator Pattern (carousel)

## Vấn đề
Carousel content cần ≥3 phút (text prompts + batch image generation) nhưng `agent-pipeline.runStage('create')` chỉ cấp **140s** (Edge limit 150s). → Mọi pipeline carousel bị flag `failed after 3 retries`.

## Giải pháp
1. **agent-creator-v2 routeCarousel**: sau khi `generate-carousel` xong (Phase 1, text prompts + carousel row), fire `generate-carousel-images-batch` rồi **return immediately** với `{ deferred: true, async_task_id, content_id }`. Helper `generateCarouselImages` nhận arg `fireAndForget=true` để skip 5-phút polling cũ.
2. **agent-pipeline create stage**: 
   - Đầu stage, nếu `pState.stages.create.async_task_id` tồn tại → poll `generation_tasks` → completed: clear marker, advance như bình thường; failed: throw; pending: set `result.status='awaiting_async'`, `shouldAutoAdvance=false`.
   - Sau khi gọi creator, nếu response `deferred=true` → save `async_task_id`, set `awaiting_async`.
3. **runStage tail**: khi `result.status === 'awaiting_async'` thì set `stages[stage].status='awaiting_async'` (KHÔNG mark completed) và log action `awaiting_async`.
4. **Action mới `poll_pending_creators`**: scan `current_stage='create' AND stages.create.status='awaiting_async'`, stagger fire `run_stage` 1s/each, cap 50/run.
5. **pg_cron `agent-pipeline-poll-creators-2min`** `*/2 * * * *` POST action trên.

## Dedup an toàn
Status `awaiting_async` không trùng `completed`/`in_progress`(>10s) nên dedup guard cho phép re-entry. Retry count KHÔNG tăng khi poll vì đường awaiting_async không đi qua `catch`.

## Verified
Pipeline `b737ab70` (carousel comparison, từng fail 3 lần) chạy create stage 4.7s, trả `deferred=true`, async_task_id=9aa7942d.
