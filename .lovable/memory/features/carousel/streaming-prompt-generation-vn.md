---
name: Carousel Prompt Streaming
description: SSE streaming với phase-based state machine + auto-launch image batch độc lập UI mount, single source of truth qua CarouselGenerationContext
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Events emit:** `progress` (kèm `phase`: planning/ai_generating/parsing/compliance/finalizing) | `slide_start` → `slide_done` (revealing per-slide với gap mượt) | `result` (100%) | `error`.

**Frontend Context:** `CarouselGenerationContext` parse SSE thành state machine. Phase mở rộng: init/planning/ai_generating/parsing/compliance/revealing/finalizing/syncing/**image_generating**/done/error/cancelled. `cancelReasonRef` Map phân biệt user-cancel vs watchdog vs backend.

**DB sync fallback:** Stream đứt không có `result` event và không phải user-cancel → phase 'syncing', poll `carousels` table mỗi 4s trong 60s. Tìm thấy → mark done với data từ DB.

**Auto-launch image batch (UI-INDEPENDENT):** Helper `src/lib/carouselImageBatch.ts::launchCarouselImageBatch()` được gọi NGAY trong context khi (a) nhận `result` event hoặc (b) DB sync thành công, với `formData.autoGenerateImages === true`. Helper:
1. Idempotency check qua `generation_tasks` table (skip nếu đã có pending/generating task cho carouselId)
2. Tạo row `generation_tasks` (task_type='carousel_image')
3. Fire-and-forget POST `/functions/v1/generate-carousel-images-batch`
→ User có thể đóng tab/rời route ngay sau khi submit form, ảnh vẫn được tạo nền và lưu vào `carousel_images`.

**UI Trackers (observer-only sau khi auto-launch):**
- `CarouselGenerationTracker` (full-page) KHÔNG còn proactive `startBackgroundGeneration` — chỉ observe `activeTasks` từ `useBackgroundGeneration` matching `input_params.carouselId`.
- `GlobalCarouselGenTracker` (mini, mounted app-wide qua `CarouselGenerationProvider`) tự lấy `activeTasks`. Khi `activeJob.status === 'done'` AND tồn tại `carousel_image` task cho carousel này → hiển thị "Đang tạo ảnh slide N/M" với progress lấy từ `task.progress` và `task.current_step` (`slide_N` format). Status text + dot row + percent đều chuyển sang image phase tự động. Cancel ẩn, dismiss ẩn (chờ task xong).

**Single source of truth:** Context = orchestrator (stream + auto-launch image). Tracker fullpage và mini chỉ render từ activeJob + activeTasks. Không có duplicate trigger.

**Helper module:** `src/lib/carouselImageBatch.ts` chứa `extractBrandColorsWithFallback`, `buildSeriesBible`, `launchCarouselImageBatch` — tái sử dụng được từ context, tracker, hoặc viewer mà không cần component mount.

Backward compat: caller không truyền `stream:true` → JSON branch như cũ.
