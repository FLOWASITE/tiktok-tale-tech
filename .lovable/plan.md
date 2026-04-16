

## Tạo ảnh Carousel dưới nền (Background Generation)

### Hiện trạng
- Ảnh carousel được tạo tuần tự (3 slide/batch) trong `CarouselGenerationTracker.tsx`, yêu cầu user ở lại màn hình chờ.
- Hệ thống đã có `generation_tasks` table + `useBackgroundGeneration` hook hỗ trợ background task cho `core_content` và `multichannel`, nhưng chưa có cho `carousel_image`.

### Kế hoạch

**1. Tạo Edge Function mới: `generate-carousel-images-batch`**
- Nhận input: `carouselId`, `slides[]` (prompt, slideNumber, options...), `taskId`
- Lặp qua từng slide, gọi logic tương tự `generate-carousel-image` nội bộ
- Cập nhật `generation_tasks.progress` và `progress_message` sau mỗi slide hoàn thành
- Lưu ảnh vào `carousel_images` table trực tiếp
- Đánh dấu task `completed` khi xong tất cả, hoặc `failed` nếu quá nhiều slide lỗi

**2. Mở rộng `generation_tasks` task_type**
- Migration: Thêm giá trị `'carousel_image'` vào enum `task_type` (hoặc dùng text nếu đã là text)
- Thêm cột `result_metadata jsonb` để lưu chi tiết (số slide thành công/thất bại)

**3. Cập nhật `useBackgroundGeneration` hook**
- Thêm `carousel_image` vào `TaskType`
- Trong `getTaskResult`, xử lý `result_type = 'carousel_images'` → fetch ảnh từ `carousel_images` table

**4. Cập nhật `CarouselGenerationTracker.tsx`**
- Sau khi carousel prompt xong, thay vì chạy `runImageGeneration()` trực tiếp:
  - Tạo background task qua `createTask('carousel_image', { carouselId, slides, brandColors... })`
  - Fire-and-forget gọi edge function `generate-carousel-images-batch`
  - Hiển thị thông báo "Ảnh đang được tạo dưới nền, bạn có thể rời đi"
  - Nút "Minimize" đã có sẵn → giữ nguyên

**5. Thêm notification khi hoàn tất**
- `useBackgroundGeneration.onTaskComplete` với `task_type = 'carousel_image'` → toast thông báo "Carousel X đã tạo xong ảnh!"
- Từ toast, user có thể click để mở lại carousel viewer

**6. Cập nhật Carousel Viewer**
- Khi mở viewer cho carousel có task đang chạy → hiển thị progress bar realtime
- Khi task hoàn tất → auto-refresh ảnh từ `carousel_images` table

### File cần thay đổi
- **Mới**: `supabase/functions/generate-carousel-images-batch/index.ts`
- **Migration**: Mở rộng `task_type` enum nếu cần
- **Sửa**: `src/hooks/useBackgroundGeneration.ts` — thêm carousel_image type
- **Sửa**: `src/components/carousel/CarouselGenerationTracker.tsx` — chuyển sang fire-and-forget
- **Sửa**: `src/components/CarouselViewer.tsx` — hiển thị progress khi có active task

### Không thay đổi
- Logic tạo prompt carousel giữ nguyên
- Edge function `generate-carousel-image` (single slide) giữ nguyên, batch function sẽ gọi nội bộ
- Flow thủ công tạo lại ảnh từng slide giữ nguyên

