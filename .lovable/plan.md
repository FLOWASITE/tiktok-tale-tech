
## Chẩn đoán hiện tại
Lần sửa trước chỉ giải quyết lỗi `generation_tasks.task_type`. Theo code và log hiện tại, luồng đã đi xa hơn:
- Frontend vẫn tạo task `carousel_image` đúng qua `useBackgroundGeneration.createTask(...)`.
- Tracker gọi `generate-carousel-images-batch`.
- Batch gọi tiếp `generate-carousel-image` cho từng slide.
- Log mới cho thấy `generate-carousel-image` chạy rất lâu với `geminigen/nano-banana-2`:
  - poll tối đa `35 × 3s = 105s`
  - request thực tế đã lên khoảng `170056ms`
  - có log `Http: connection closed before message completed`
- Nghĩa là root cause hiện tại không còn là check constraint, mà là luồng batch đang phụ thuộc vào một HTTP call con quá dài và bị đóng kết nối trước khi trả kết quả ổn định.

Ngoài ra có 2 điểm phụ:
- `describeImageForContinuity(...)` đang gặp `402` nên `sceneDescription` bị `NULL`, nhưng đây là phụ, không phải lý do chính làm không có ảnh.
- `generate-carousel-images-batch` đang insert vào `carousel_images` nhưng không lưu `scene_description`; việc này ảnh hưởng seamless continuity hơn là chuyện ảnh không xuất hiện.

## Kế hoạch triển khai
### 1) Chuyển batch pipeline sang hướng không phụ thuộc nested HTTP dài
Thay vì để `generate-carousel-images-batch` gọi HTTP sang `generate-carousel-image` rồi chờ response rất lâu cho từng slide, em sẽ gom phần sinh ảnh cốt lõi thành shared image-generation module và để:
- `generate-carousel-image` dùng shared module cho single-slide/manual flow
- `generate-carousel-images-batch` dùng cùng shared module trực tiếp cho background flow

Mục tiêu:
- bỏ điểm gãy `connection closed before message completed`
- tránh phụ thuộc response HTTP của function con trong lúc batch đang chạy nền
- giữ nguyên logic provider, fallback, continuity, logging

### 2) Giữ đúng background persistence cho batch
Batch function hiện có intent chạy nền, nhưng phần nặng nhất vẫn dựa vào HTTP request con. Sau khi tách shared module, em sẽ để batch:
- xử lý từng slide trực tiếp trong cùng background job
- persist `generation_tasks.progress`, `result_metadata`
- persist `carousel_images` ngay khi từng slide xong
- mark `completed/failed` ở cuối mà không cần đợi nested function trả HTTP hoàn chỉnh

### 3) Đồng bộ dữ liệu ảnh và continuity metadata
Khi batch lưu ảnh xong, em sẽ đồng bộ insert vào `carousel_images` theo cùng shape mà frontend đang đọc:
- `carousel_id`
- `slide_number`
- `image_url`
- `is_selected`
- `organization_id`
- `created_by`
- `prompt`
- `scene_description`

Mục tiêu:
- viewer/tracker thấy ảnh ngay từ DB
- continuity chain sống qua refresh/regenerate

### 4) Ràng timeout và fallback thực tế hơn cho GeminiGen path
Từ log hiện tại, GeminiGen là nhánh gây request kéo dài. Em sẽ:
- siết timeout/abort cho poll path ở background flow
- nếu provider bị treo quá lâu thì fall through nhanh hơn sang fallback đã có
- giữ circuit breaker / fallback model theo pattern hiện có

Mục tiêu:
- không để 1 slide treo quá lâu làm cả batch “đứng”
- ưu tiên có ảnh xuất hiện ổn định trước, rồi mới tối ưu provider chính

### 5) Rà lại UI tracker để phản ánh đúng trạng thái DB
Frontend hiện đọc task + `carousel_images`, nhưng em sẽ rà lại các điểm sau:
- tracker hoàn tất khi task `completed`
- viewer/refetch ảnh khi có insert mới
- không bị mắc ở trạng thái “đang xử lý dưới nền...” dù DB đã có ảnh

Em cũng sẽ kiểm tra nguy cơ tracker bị mount lặp trong các nhánh full/minimized để tránh duplicate trigger.

## File dự kiến đụng tới
- `supabase/functions/generate-carousel-images-batch/index.ts`
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/_shared/geminigen-image-generator.ts`
- thêm/tách shared image-generation helper trong `supabase/functions/_shared/`
- có thể rà thêm:
  - `src/components/carousel/CarouselGenerationTracker.tsx`
  - `src/hooks/useCarouselImages.ts`
  - `src/hooks/useBackgroundGeneration.ts`

## Technical details
```text
Hiện tại
Frontend
  -> create generation_tasks row
  -> call generate-carousel-images-batch
     -> fetch generate-carousel-image (slide 1)
        -> GeminiGen poll lâu
        -> response bị đóng kết nối
     -> batch không nhận được result ổn định
  -> UI không thấy ảnh hoàn chỉnh

Sau khi sửa
Frontend
  -> create generation_tasks row
  -> call generate-carousel-images-batch
     -> dùng shared image generation trực tiếp
     -> mỗi slide xong là insert carousel_images ngay
     -> update task progress/result_metadata
     -> complete task
  -> UI đọc ảnh từ DB và hiện kết quả
```

## Kết quả mong đợi sau khi triển khai
- Tạo carousel mới không còn treo ở bước tạo ảnh
- Ít nhất slide thành công sẽ xuất hiện trong `carousel_images` và hiện trên viewer/tracker
- Task background kết thúc rõ ràng `completed` hoặc `failed`
- Không còn phụ thuộc vào nested HTTP response kéo dài hơn giới hạn kết nối
