
## Kết luận sau khi đọc code

Luồng stream hiện tại vẫn **chưa phải stream thật**:

1. `supabase/functions/generate-carousel/index.ts`
   - Nhánh `stream:true` chỉ mở SSE rồi gọi lại **chính function đó ở JSON mode**.
   - `runCarouselPipelineStreaming()` đang bắn heartbeat giả `ai_generating` từ 8% → 60%.
   - `slide_start/slide_done` chỉ xuất hiện **sau khi JSON toàn bộ đã xong**.

2. Log backend xác nhận đúng pattern này
   - Có log `Http: connection closed before message completed`
   - Nghĩa là SSE có thể đóng trước khi nhánh JSON nội bộ hoàn tất.
   - Frontend sau đó rơi vào `syncing`, hết timeout thì báo: `Tạo carousel chưa hoàn tất...`

3. UI hiện chưa thể hiện “prompt đang viết” thật
   - `CarouselGenExpandedPanel` chỉ hiện skeleton cho slide đang chạy.
   - Context chưa giữ preview/objective của slide đang viết.

## Plan sửa đúng gốc

### 1. Đổi backend từ “stream bọc JSON” sang pipeline stream thật theo slide
Refactor `generate-carousel` để không internal-fetch JSON toàn bộ nữa.

Luồng mới:
- Phase 1: tạo **outline/plan** cho toàn carousel
- Phase 2: generate **từng slide riêng**
- Mỗi slide emit ngay:
  - `slide_start`
  - `slide_preview`
  - `slide_done`
- Cuối cùng mới chạy:
  - compliance/final validation
  - save DB
  - `result`

Kết quả:
- user thấy Slide 1 bắt đầu thật, không phải đợi gần xong mới hiện hàng loạt
- bỏ hẳn progress heartbeat giả

### 2. Thêm event preview để UI hiện rõ “Prompt cho Slide 1”
Mở rộng event stream:
- `slide_start`: slideNumber
- `slide_preview`: `slideNumber`, `objective`, `textPreview`, `promptPreview`
- `slide_done`: full slide data như hiện tại

Như vậy expanded panel và tracker có thể hiện:
- “Prompt cho Slide 1”
- objective ngắn
- 1-2 dòng preview đang được viết

### 3. Harden stream lifecycle để không báo fail giả
Trong backend:
- nếu client disconnect, vẫn tiếp tục background-safe và persist kết quả
- không coi việc socket đóng là pipeline fail
- chỉ emit `error` khi generation thật sự fail

Trong frontend context:
- khi stream kết thúc mà chưa có `result`, chuyển `syncing` mềm hơn
- tăng độ tin cậy sync bằng `jobId/requestId` riêng thay vì chỉ dò theo `topic + startedAt`
- chỉ báo fail sau khi hết thời gian chờ thực sự và không tìm thấy row nào

### 4. Đồng bộ lại state source cho full-page tracker
Hiện `CarouselGenerationTracker` vẫn nhận một phần state từ prop (`promptGenerating`, `carousel`) và một phần từ context.

Sẽ đổi để tracker lấy trạng thái prompt chủ yếu từ `activeJob`:
- `promptDone` dựa trên `activeJob.status/activeJob.carousel`
- không phụ thuộc promise return của `generateCarousel`
- tránh case backend vẫn chạy nhưng page tracker thoát/error sớm

### 5. Nâng UI stream để phản ánh dữ liệu thật
Cập nhật:
- `CarouselGenerationContext.tsx`
  - thêm `revealingSlideMeta`
  - parse `slide_preview`
  - giữ `partialSlides` + preview slide đang viết
- `CarouselGenExpandedPanel.tsx`
  - render preview thật thay skeleton trống
- `GlobalCarouselGenTracker.tsx`
  - status text ưu tiên objective của slide hiện tại
- `CarouselGenerationTracker.tsx`
  - card “Tạo Prompt” bám phase/event thật
  - hiện “Đang viết slide N/M” + preview thật

### 6. Giữ image generation độc lập UI như hiện tại
Phần auto-launch ảnh sau `result` trong context là đúng hướng, sẽ giữ nguyên.
Chỉ cần đảm bảo nó chạy sau khi stream pipeline mới đã save carousel thành công.

## File sẽ chỉnh

- `supabase/functions/generate-carousel/index.ts`
- `src/contexts/CarouselGenerationContext.tsx`
- `src/components/carousel/CarouselGenExpandedPanel.tsx`
- `src/components/carousel/GlobalCarouselGenTracker.tsx`
- `src/components/carousel/CarouselGenerationTracker.tsx`
- `src/pages/Carousel.tsx`
- `.lovable/memory/features/carousel/streaming-prompt-generation-vn.md`

## Kết quả mong đợi

- không còn progress giả 8% → 60%
- user thấy rõ “Prompt cho Slide 1” và nội dung preview thật
- slide xuất hiện dần theo stream thật
- rớt kết nối không báo fail giả nếu backend vẫn hoàn tất
- full-page tracker và mini tracker cùng đọc một nguồn trạng thái, không lệch nhau
