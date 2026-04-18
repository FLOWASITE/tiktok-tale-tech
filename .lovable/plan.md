
## Kết luận từ phần đọc code/log
- `generate-carousel-image` đang tạo ảnh thật: log có `Background uploaded` và `Returning background image` cho slide 1.
- `generate-carousel-images-batch` vẫn báo `Slide 1 attempt 1 failed: Timeout sau 150s`, rồi function có log `shutdown`, không thấy log hoàn tất batch.
- Batch đang gọi nested HTTP sang `generate-carousel-image` rồi cố chạy nền bằng `responsePromise` + `waitUntil`/fire-and-forget.
- Frontend chỉ hiện trạng thái hoàn tất khi `generation_tasks` được update sang `completed/failed`, còn ảnh card/viewer thì đọc từ `carousel_images`.

## Plan
1. **Sửa điểm gãy batch background**
   - Refactor `supabase/functions/generate-carousel-images-batch/index.ts` để không phụ thuộc flow fire-and-forget dễ bị shutdown.
   - Chuyển sang xử lý tuần tự trong lifecycle ổn định hơn, đảm bảo mỗi slide xong là persist ngay.

2. **Bỏ nested HTTP dài hoặc làm nó bền hơn**
   - Tách phần core image-generation dùng chung từ `generate-carousel-image` sang shared helper.
   - Để batch gọi shared helper trực tiếp thay vì `fetch('/functions/v1/generate-carousel-image')`.
   - Giữ continuity data: `previousImageUrl`, `previousSceneDescription`, `scene_description`.

3. **Persist chắc chắn theo từng slide**
   - Sau mỗi slide thành công:
     - insert `carousel_images`
     - update `generation_tasks.progress`, `current_step`, `result_metadata`
   - Nếu một slide fail, vẫn tiếp tục các slide sau và ghi lỗi rõ trong metadata.

4. **Hoàn tất task đúng để UI thấy ảnh**
   - Đảm bảo batch luôn gọi `completeTask(..., carouselId, 'carousel_images')` hoặc `failTask(...)` ở cuối.
   - Rà lại `_shared/task-tracking.ts` để type/result flow khớp với `carousel_images`.

5. **Rà UI tracker/viewer**
   - Kiểm tra `CarouselGenerationTracker`, `useBackgroundGeneration`, `useCarouselImages`, `useCarouselCardImages` để chắc rằng:
     - task completed → tracker thoát trạng thái loading
     - có row mới trong `carousel_images` → viewer/card thấy ngay
     - không bị kẹt ở “Đang xử lý dưới nền...”

## Files dự kiến đụng tới
- `supabase/functions/generate-carousel-images-batch/index.ts`
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/_shared/task-tracking.ts`
- thêm/shared helper trong `supabase/functions/_shared/`
- có thể rà nhẹ:
  - `src/components/carousel/CarouselGenerationTracker.tsx`
  - `src/hooks/useBackgroundGeneration.ts`

## Kết quả mong đợi
- Task tạo ảnh carousel không bị dừng giữa chừng.
- `generation_tasks` chuyển sang `completed` hoặc `failed` rõ ràng.
- `carousel_images` có row ngay khi từng slide xong.
- Card, tracker, viewer đều thấy ảnh Carousel xuất hiện ổn định.
