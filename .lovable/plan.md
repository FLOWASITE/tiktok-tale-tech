

## Hiểu yêu cầu

User muốn **hoàn thiện streaming tạo prompt carousel** — fix các điểm còn thô + nâng cấp UX. Hiện tại đã có:
- Edge function `generate-carousel` hỗ trợ `stream:true` với SSE events (`progress`, `slide_done`, `result`, `error`)
- `CarouselGenerationContext` parse SSE, expose `progress`, `currentStep`, `partialSlides`, `completedSlides`, `totalSlides`
- `GlobalCarouselGenTracker` mini bar với progress thực

## Điểm cần điều tra (read-only)

1. **`CarouselGenerationContext.tsx`** — kiểm tra xử lý `error` event, watchdog timeout, abort, retry; có race khi 2 jobs cùng chạy không
2. **`generate-carousel/index.ts`** — pacing emit (`progress` có spread đều giữa 8-65% AI phase không, hay nhảy cục), `slide_done` có emit đủ N lần không, error path có close stream sạch không
3. **`GlobalCarouselGenTracker.tsx`** — hiện chỉ show 1 dòng status; chưa có:
   - Indicator slide-by-slide (vd: 5 dot với dot done = green)
   - Click expand → mở dialog xem partial slides ngay
   - Cancel button
4. **`CarouselGeneratorDialog`** (caller) — sau submit có đóng dialog ngay không, có hiển thị partial preview không

## Thiết kế hoàn thiện (5 hạng mục)

### 1. Slide-by-slide visual indicator trong mini tracker
File: `GlobalCarouselGenTracker.tsx` + `CarouselMiniTracker.tsx`
- Thêm dãy `totalSlides` chấm tròn dưới progress bar:
  - Done: filled primary
  - Đang làm: pulse animation
  - Chưa: outline muted
- Tooltip mỗi chấm: "Slide N — done/in progress/pending"

### 2. Expand panel xem partial slides
File mới: `src/components/carousel/CarouselGenExpandedPanel.tsx`
- Click maximize trên mini tracker → expand thành panel ~360x500px (vẫn floating, không full dialog)
- Render `partialSlides` đã có với card mini (slideNumber + objective + 100 chars preview)
- Slide đang generate: skeleton shimmer
- Slide chưa: placeholder
- Nút "Mở carousel" → navigate khi done

### 3. Cancel button + abort
File: `CarouselGenerationContext.tsx`
- Đảm bảo `AbortController` lưu trong job state
- Expose `cancelJob(jobId)` → abort fetch + update status='cancelled' + cleanup
- Mini tracker có nút X (chỉ khi status='generating')
- Backend: client disconnect → `EdgeRuntime.waitUntil` vẫn complete DB persist (đã có), nhưng UI ngừng tracking

### 4. Error UX nâng cấp
- Khi `error` event tới: mini tracker chuyển đỏ, hiện message ngắn + nút "Thử lại" (re-call với cùng formData) + "Đóng"
- Watchdog timeout (đã có 30s/150s) → emit error giả "Mất kết nối streaming, vui lòng thử lại"

### 5. Smooth progress + ETA
File: `GlobalCarouselGenTracker.tsx`
- Hiện `percent` nhảy cục theo events. Thêm tween animation 300ms cho progress bar.
- Tính ETA dựa trên: `(elapsed / completedSlides) * (totalSlides - completedSlides)` → "Còn ~25s"
- Nếu chưa có slide nào done → "Đang khởi tạo..."

### 6. Backend pacing fix (nếu phát hiện)
File: `generate-carousel/index.ts`
- Đảm bảo emit `progress` ít nhất mỗi 3-5s trong AI phase (heartbeat) để frontend không hit watchdog
- `slide_done` events phải có `percent` tăng đều: `82 + (slideNumber/totalSlides) * 12`

## Files dự kiến đụng

- `src/contexts/CarouselGenerationContext.tsx` — cancelJob, error UX, abort cleanup
- `src/components/carousel/GlobalCarouselGenTracker.tsx` — slide dots, ETA, smooth tween, cancel/retry buttons, expand toggle
- `src/components/carousel/CarouselMiniTracker.tsx` — props mở rộng (totalSlides, completedSlides, onCancel, onRetry, onExpand)
- `src/components/carousel/CarouselGenExpandedPanel.tsx` — **mới**, panel preview partial slides
- `supabase/functions/generate-carousel/index.ts` — heartbeat pacing nếu thiếu
- `.lovable/memory/features/carousel/streaming-prompt-generation-vn.md` — cập nhật

## Kết quả mong đợi

- Mini tracker show dot row 5-10 chấm sống động → cảm giác "AI đang làm việc"
- Expand → preview slide đã done ngay, không phải chờ
- Cancel được khi cần, retry khi fail
- ETA hiển thị thay vì chỉ "đang chạy"
- Progress mượt, không giật cục

