---
name: Carousel Prompt Streaming
description: SSE streaming cho generate-carousel với phased progress + slide-by-slide reveal, fetch-based consumer, watchdog timeouts
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** (không refactor LLM call) → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Events emit:** `progress` (planning 3% → ai_generating heartbeat 8-65% → parsing 70% → compliance 80% → finalizing 96%) | `slide_done` (82-94% reveal từng slide) | `result` (100% với carousel row) | `error` (status + message).

**Frontend:** `CarouselGenerationContext` dùng `fetch()` thay vì `supabase.functions.invoke()`, parse SSE line-by-line, mở rộng job state với `progress`, `currentStep`, `partialSlides`, `completedSlides`, `totalSlides`. Watchdog: 30s first-byte / 150s idle. AbortController sẵn sàng cancel.

**UI:** `GlobalCarouselGenTracker` ưu tiên `activeJob.progress` thực, fallback elapsed-timer chỉ khi progress=0. Status text show "{step} ({completed}/{total})". Backward compat: caller không truyền `stream:true` → JSON branch như cũ.
