---
name: Carousel Prompt Streaming
description: SSE streaming với phase-based state machine (planning/ai_generating/parsing/compliance/revealing/finalizing/syncing), per-slide reveal events (slide_start + slide_done), DB sync fallback khi stream đứt, single source of truth qua CarouselGenerationContext
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** (LLM tool-call không thể split per-slide thật) → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Events emit:** `progress` (mỗi event đính kèm `phase`: planning 3% → ai_generating heartbeat 8-60% với rotate messages thực tế "AI đang viết hook...", "AI đang tinh chỉnh CTA..." → parsing 65% → compliance 72%) | `slide_start` (báo slide N đang được reveal) → `slide_done` (75-95% reveal từng slide với 60-90ms gap cho UX mượt) | `result` (100%) | `error`.

**Frontend Context:** `CarouselGenerationContext` parse SSE thành state machine. Job state mở rộng: `phase: CarouselGenPhase` (init/planning/ai_generating/parsing/compliance/revealing/finalizing/syncing/done/error/cancelled), `lastEventAt`, `abortReason: 'user'|'watchdog'|'network'|'backend'`, `revealingSlide: number|null`. `cancelReasonRef` Map phân biệt user-cancel vs watchdog vs backend khi `AbortError` fire. `updateJob` tự stamp `lastEventAt`.

**DB sync fallback:** Khi stream kết thúc không có `result` event và không phải user-cancel → chuyển phase 'syncing', poll `carousels` table mỗi 4s trong 60s tìm row khớp `topic+startedAt`. Nếu thấy → mark done với data từ DB. Bảo vệ trường hợp backend chạy xong nhưng connection bị đứt giữa chừng.

**UI Tracker:** `GlobalCarouselGenTracker` mounted app-wide qua `CarouselGenerationProvider`. Status text bám phase: "Đang đồng bộ..." khi syncing, "Đang hiển thị slide N/M..." khi revealing. ETA chỉ hiện khi phase='revealing' (lúc per-slide pace có nghĩa) — phase trước đó hiện elapsed thuần, không bịa ETA giả. Mini bar có dot row N indicator + smooth tween rAF.

**Single source of truth:** Trang `/carousel` đã loại bỏ duplicate hidden `CarouselGenerationTracker` + local `CarouselMiniTracker` overlay. Mini tracker streaming-phase chỉ render từ Global một nguồn. Local `CarouselGenerationTracker` (full-page) vẫn giữ cho Phase 2 image generation.

**Auto image launch:** Khi `result` event tới + `formData.autoGenerateImages` → `launchCarouselImageBatch()` chạy fire-and-forget độc lập navigation.

Backward compat: caller không truyền `stream:true` → JSON branch như cũ.
