---
name: Carousel Prompt Streaming
description: SSE streaming cho generate-carousel với phased progress + slide-by-slide reveal, expanded panel preview, cancel/retry, smooth tween + ETA
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** (không refactor LLM call) → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Events emit:** `progress` (planning 3% → ai_generating heartbeat 8-65% → parsing 70% → compliance 80% → finalizing 96%) | `slide_done` (82-94% reveal từng slide) | `result` (100% với carousel row) | `error` (status + message).

**Frontend Context:** `CarouselGenerationContext` dùng `fetch()` + SSE parsing. Job state: `progress`, `currentStep`, `partialSlides`, `completedSlides`, `totalSlides`, `status: 'generating'|'done'|'error'|'cancelled'`. `AbortController` lưu trong `abortersRef` Map → `cancelJob(id)` abort + flag cancelled. `retryJob(id)` dismiss + re-call với cùng formData. Watchdog: 30s first-byte / 150s idle.

**UI Tracker:** `GlobalCarouselGenTracker` có 2 chế độ — mini bar (default) và expanded panel (360x500px floating). Mini bar gồm: progress bar tween 300ms, dot row N slide indicator (done=primary, current=pulse, pending=muted), ETA tính `(elapsed/completedSlides) * remaining`, nút cancel/retry/dismiss tùy status. Expanded panel: render `partialSlides` cards với checkmark + objective + text preview, skeleton shimmer cho slide đang generate, placeholder cho slide chờ.

**Auto image launch:** Khi `result` event tới + `formData.autoGenerateImages` → `launchCarouselImageBatch()` chạy fire-and-forget độc lập navigation (decoupled khỏi UI lifecycle).

Backward compat: caller không truyền `stream:true` → JSON branch như cũ. Carousel.tsx page-local tracker dùng `status` prop string thay vì `allDone` bool.
