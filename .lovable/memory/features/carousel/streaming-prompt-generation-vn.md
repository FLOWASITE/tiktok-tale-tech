---
name: Carousel Prompt Streaming
description: SSE pipeline với real-content slide reveal (slide_start → slide_preview → slide_done), bỏ heartbeat giả, single source of truth qua CarouselGenerationContext
type: feature
---

`generate-carousel` hỗ trợ `body.stream === true` → trả `text/event-stream`. Pipeline streaming **internal-fetch lại function chính trong JSON mode** → giữ nguyên `withCache` + validation + Layer-2 compliance + critique + DB insert. Chạy trong `EdgeRuntime.waitUntil` → background-safe khi client disconnect.

**Phase events thật (không heartbeat giả):**
- `progress` planning (5%) → ai_generating (15%, message duy nhất "AI đang soạn ~30-60s") → parsing (60%) → finalizing (97%) → result (100%)
- KHÔNG còn fake ramp 8→60% mỗi 2.2s. UI dựa trên elapsed timer + slide reveal stream cho liveness.

**Slide reveal — 3 events/slide với content thật:**
1. `slide_start`: `{slideNumber, totalSlides, message: "Prompt cho Slide N"}`
2. `slide_preview`: `{slideNumber, objective, textPreview, promptPreview}` — UI hiện objective + 1-2 dòng text thật trong khi "đang viết"
3. `slide_done`: full slide data + percent

`textPreview` ghép từ `textContent` (headline · subtitle · dataValue · caption), max 220 chars. `promptPreview` từ `imagePrompt.fullPrompt` max 180 chars.

**Frontend Context:** `CarouselGenerationContext` parse 3 event types. Thêm `revealingSlideMeta: {slideNumber, objective, textPreview, promptPreview}` clear khi slide_done/result. Phase mở rộng: init/planning/ai_generating/parsing/compliance/revealing/finalizing/syncing/**image_generating**/done/error/cancelled. `cancelReasonRef` Map phân biệt user-cancel vs watchdog vs backend.

**UI render preview thật:**
- `CarouselGenExpandedPanel`: slide đang current hiện "Prompt cho Slide N" + objective bold + textPreview line-clamp-2 (thay skeleton trống)
- `CarouselGenerationTracker` (full-page): card "writing step" hiện box preview với objective + textPreview thật từ `revealingSlideMeta`
- `GlobalCarouselGenTracker`: status text ưu tiên `Slide N: {objective}` thay generic "Đang hiển thị slide N/M"

**DB sync fallback:** Stream đứt không có `result` event và không phải user-cancel → phase 'syncing', poll `carousels` table mỗi 4s trong 60s. Tìm thấy → mark done với data từ DB.

**Auto-launch image batch (UI-INDEPENDENT):** Helper `src/lib/carouselImageBatch.ts::launchCarouselImageBatch()` được gọi NGAY trong context khi (a) nhận `result` event hoặc (b) DB sync thành công, với `formData.autoGenerateImages === true`. Idempotent qua `generation_tasks` check.

**Single source of truth:** Context = orchestrator (stream + auto-launch image). Tracker fullpage và mini chỉ render từ activeJob + activeTasks.

Backward compat: caller không truyền `stream:true` → JSON branch như cũ.
