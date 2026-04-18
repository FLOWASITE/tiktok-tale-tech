

## Hiểu yêu cầu

User muốn **streaming** cho quá trình tạo prompt carousel — thay vì chờ 30-60s trong im lặng, user sẽ thấy:
- Slide 1 prompt xuất hiện dần dần (token-by-token hoặc slide-by-slide)
- Progress thực (không phải fake timer dựa trên elapsed)
- Có thể đọc/preview trong khi các slide còn lại đang generate

Hiện tại: `generate-carousel` trả về 1 cục JSON sau khi LLM xong → `CarouselGenerationContext` chỉ biết "đang chạy" với fake progress dựa trên thời gian.

## Điều tra cần thực hiện (read-only)

1. **`supabase/functions/generate-carousel/index.ts`** — đọc để hiểu:
   - Đang gọi LLM 1 lần lấy hết slides hay loop từng slide?
   - Có dùng `stream: true` với Lovable AI Gateway chưa?
   - Cấu trúc response hiện tại (slides_content array)
   - Compliance post-check ở đâu (Layer 2) — quan trọng vì stream xong vẫn cần validate

2. **`generate-multichannel/index.ts`** — pattern streaming đã có sẵn (`useExpandChannelsStreaming` hook tham khảo) → tái sử dụng SSE writer pattern.

3. **`_shared/sse-writer.ts`** + **`_shared/stream-utils.ts`** — utils đã có cho SSE.

## Thiết kế giải pháp

### Tầng 1: Edge function streaming (SSE)
File: `supabase/functions/generate-carousel/index.ts`
- Detect `body.stream === true` → trả `text/event-stream` thay vì JSON.
- Sử dụng `createSSEWriter` đã có.
- Events emit:
  - `progress`: `{step: 'planning', percent: 5}` — bắt đầu plan
  - `slide_start`: `{slideNumber: 1}` — bắt đầu generate slide N
  - `slide_chunk`: `{slideNumber: 1, text: "..."}` — token streaming (tùy provider hỗ trợ)
  - `slide_done`: `{slideNumber: 1, slide: {...}}` — slide N hoàn chỉnh + đã parse
  - `progress`: `{step: 'compliance_check', percent: 90}`
  - `result`: `{carousel: {...}}` — final với DB row đã insert
  - `error`: `{message}`
- DB persist vẫn chạy trong `EdgeRuntime.waitUntil` để đảm bảo background-safe (đã có).

**Approach LLM:** Nếu hiện tại gọi 1 LLM call lấy all slides → 2 lựa chọn:
- (A) Stream raw text → parse JSON khi đủ delimiter giữa slides (phức tạp)
- (B) Loop từng slide với chained context (đã có pattern Sequential V2) → emit `slide_done` sau mỗi slide → tự nhiên streaming theo slide. **Khuyến nghị B** vì rõ ràng và đã align với kiến trúc Sequential.

### Tầng 2: Frontend streaming consumer
File: `src/contexts/CarouselGenerationContext.tsx`
- Thay `supabase.functions.invoke()` bằng `fetch()` để đọc SSE stream (như `useExpandChannelsStreaming` đã làm).
- Job state mở rộng:
  ```
  CarouselGenerationJob {
    ...existing,
    progress: number,        // % thực từ events
    currentStep: string,     // "Đang tạo slide 3/8..."
    partialSlides: CarouselSlide[],  // slides đã done
    totalSlides: number,
  }
  ```
- Watchdog timeout (30s first byte, 150s idle) — tái dùng pattern từ `useExpandChannelsStreaming`.
- AbortController để cancel.

### Tầng 3: UI feedback nâng cấp
File: `src/components/carousel/GlobalCarouselGenTracker.tsx`
- Replace fake elapsed-based percent với `activeJob.progress` thực.
- Hiển thị step text: "Đang tạo slide 3/8" thay vì "Đang tạo prompts... 23s".
- Mini progress bar reflect real progress.

(Tùy chọn) Trong `CarouselViewer` hoặc dialog tạo, nếu user đang ở màn hình → render preview slides đã `slide_done` ngay (skeleton cho slide chưa xong) → "đang tạo trước mắt user".

### Tầng 4: Backward compat
- Nếu `body.stream !== true` → giữ nguyên JSON response cũ (không break call site khác).
- Migration nhẹ: `CarouselGenerationContext` set `stream: true` mặc định.

## Files đụng

- `supabase/functions/generate-carousel/index.ts` — thêm SSE branch, loop slide với emit events, giữ JSON branch fallback
- `src/contexts/CarouselGenerationContext.tsx` — đổi sang fetch + SSE parsing, mở rộng job state
- `src/components/carousel/GlobalCarouselGenTracker.tsx` — hiển thị progress + step thực
- (Tùy chọn) `src/components/CarouselGeneratorDialog.tsx` (hoặc form caller) — preview partial slides nếu vẫn mở

## Kết quả mong đợi

- User submit → trong 1-2s đã thấy "Đang tạo slide 1/8"
- Progress bar nhích đều theo từng slide done (12.5% mỗi slide với 8 slides)
- Có thể navigate đi nơi khác → mini tracker vẫn cập nhật real-time
- Slide nào fail → event `slide_error` riêng, các slide khác vẫn tiếp tục
- Khi xong → toast + carousel xuất hiện trong list (realtime đã có)
- Cảm giác "AI đang làm việc trước mắt" thay vì spinner câm.

