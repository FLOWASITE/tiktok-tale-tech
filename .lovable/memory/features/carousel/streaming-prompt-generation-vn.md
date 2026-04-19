---
name: Carousel Prompt Streaming + Background Image Auto-launch
description: SSE streaming cho generate-carousel với phased progress + slide-by-slide reveal, fetch-based consumer, watchdog timeouts, và tự động kick off image batch background-safe khi user thoát màn hình
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** (không refactor LLM call) → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Events emit:** `progress` (planning 3% → ai_generating heartbeat 8-65% → parsing 70% → compliance 80% → finalizing 96%) | `slide_done` (82-94% reveal từng slide) | `result` (100% với carousel row) | `error` (status + message).

**Frontend:** `CarouselGenerationContext` dùng `fetch()` thay vì `supabase.functions.invoke()`, parse SSE line-by-line, mở rộng job state với `progress`, `currentStep`, `partialSlides`, `completedSlides`, `totalSlides`. Watchdog: 30s first-byte / 150s idle. AbortController sẵn sàng cancel.

**UI:** `GlobalCarouselGenTracker` ưu tiên `activeJob.progress` thực, fallback elapsed-timer chỉ khi progress=0. Status text show "{step} ({completed}/{total})". Backward compat: caller không truyền `stream:true` → JSON branch như cũ.

**Background-safe image auto-launch (V2):** Khi `formData.autoGenerateImages=true` và nhận `result` event, `CarouselGenerationContext` gọi `launchCarouselImageBatch()` (file `src/lib/carousel/imageGenLauncher.ts`) ngay tại context (sống ở root, không bị unmount khi user navigate khỏi page Carousel). Launcher: (1) Idempotency check — query `generation_tasks` tìm pending/generating task cho `carouselId` → skip nếu có. (2) Build brandColors + seriesBible + siblingsSummary. (3) Insert DB task row. (4) Fire-and-forget `generate-carousel-images-batch` (đã `EdgeRuntime.waitUntil`). `CarouselGenerationTracker` cũng dùng cùng launcher → nếu user vẫn xem màn hình, tracker sẽ "adopt" task đã tồn tại thay vì tạo trùng.
