

## Nguyên nhân

Image generation **chỉ trigger khi `CarouselGenerationTracker` mount + Tracker page đang được render** (qua `startBackgroundGeneration` trong `useEffect [promptDone]` ở line 397-402).

Khi user rời `/carousel` **TRƯỚC khi prompt xong**:
1. `CarouselGenerationTracker` unmount → `useEffect` cleanup
2. Stream prompt vẫn chạy ở `CarouselGenerationContext` (global) và lưu carousel vào DB OK
3. Nhưng **không ai gọi `generate-carousel-images-batch`** vì tracker đã unmount → ảnh không được tạo

Ngoài ra `CarouselViewer` cũng gate auto-gen bằng `open && carousel?.id` → chỉ chạy khi user mở viewer.

→ **Image generation phụ thuộc UI mount**, vi phạm nguyên tắc "thoát màn hình vẫn chạy" của Lovable Cloud streaming pattern (memory `streaming-prompt-generation-vn`).

## Hướng sửa

Tách image-batch trigger ra **độc lập với UI mount**, đặt vào `CarouselGenerationContext` (đã global qua `CarouselGenerationProvider` ở app root).

### 1. Trong `CarouselGenerationContext.tsx`
Khi nhận event `result` (carousel created) **VÀ** `formData.autoGenerateImages === true`:
- Gọi thẳng `fetch('/functions/v1/generate-carousel-images-batch')` từ context
- Tạo `background_generation_task` qua `useBackgroundGeneration` style (insert row trực tiếp với supabase client)
- Fire-and-forget — không phụ thuộc tracker mount

### 2. Trong `CarouselGenerationTracker.tsx`
- Bỏ `startBackgroundGeneration` chủ động
- Chỉ **đọc** trạng thái task qua `activeTasks` từ `useBackgroundGeneration` (đã match `carouselId`)
- Tracker mount lại bất kỳ lúc nào sẽ tự pick up task đang chạy nền

### 3. DB sync fallback (mở rộng existing)
- Khi context detect carousel done qua DB sync (stream đứt) → vẫn trigger image batch nếu `autoGenerateImages`
- Đảm bảo idempotent: check `background_generation_tasks` xem đã có task cho `carouselId` này chưa trước khi tạo mới

### 4. Toast UX
- Khi context auto-launch image batch → toast "🎨 Ảnh đang được tạo nền. Bạn có thể rời đi bất cứ lúc nào!"
- Mini tracker hiện thêm row "Đang tạo ảnh slide N/M" sau khi prompt xong

## File cần sửa
- `src/contexts/CarouselGenerationContext.tsx` — thêm `launchImageBatch(carousel, formData)`, gọi sau `result` event + sau DB sync; insert background_generation_tasks row
- `src/components/carousel/CarouselGenerationTracker.tsx` — bỏ `startBackgroundGeneration` proactive, chỉ render trạng thái task
- `src/components/carousel/GlobalCarouselGenTracker.tsx` — hiển thị thêm phase "image_generating" với slide N/M counter
- `.lovable/memory/features/carousel/streaming-prompt-generation-vn.md` — cập nhật pattern auto-launch image độc lập UI

## Kết quả
- User submit form `autoGenerateImages=true` → có thể đóng tab/rời route ngay
- Prompt xong → context tự fire image batch → ảnh được tạo và lưu vào `carousel_images`
- Quay lại bất kỳ lúc nào → tracker/viewer pick up từ DB + active tasks
- Không còn case "prompt xong, ảnh không tạo"

