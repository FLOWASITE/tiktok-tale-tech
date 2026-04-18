
## Kết luận ngắn gọn: vì sao token bị trừ mà không có ảnh

Đây là lỗi backend pipeline, không phải chỉ do UI.

1. `generate-carousel-image` có thể gọi provider ngoài trước (`GeminiGen` / `PoYo` / `KIE`) nên credits/token đã bị tiêu ở upstream trước khi app kịp lưu ảnh.
2. Nếu provider ngoài fail hoặc timeout, code rơi sang fallback Lovable AI Gateway, nhưng hiện tại gateway đang dùng `model: imageModel`.
   - `imageModel` ban đầu lấy từ `aiConfig.model`
   - với case đang nghi ngờ, giá trị này có thể là model ngoài như `geminigen/nano-banana-2`
   - model này không hợp lệ cho Lovable AI Gateway
   - nên fallback cuối có thể fail sau khi credits ở provider ngoài đã bị trừ
3. `generate-carousel-images-batch` chỉ insert vào `carousel_images` sau khi request con `generate-carousel-image` trả về thành công. Nếu request con bị timeout / connection closed / shutdown thì ảnh không được persist vào DB.
4. Frontend đang đọc trực tiếp từ `carousel_images` (`useCarouselImages`, `useCarouselCardImages`). Nghĩa là nếu DB có row thì UI sẽ thấy. Việc không thấy ảnh cho thấy vấn đề chính nằm ở khâu generate xong nhưng không lưu được.

## Dấu hiệu trong code
- `supabase/functions/generate-carousel-image/index.ts`
  - route provider ngoài ở vùng `PoYo/KIE/GeminiGen`
  - fallback Gateway dùng `model: imageModel` tại đoạn gọi `https://ai.gateway.lovable.dev/v1/chat/completions`
  - chưa thấy bước normalize model ngoài sang model hợp lệ của Lovable AI trước khi fallback
- `supabase/functions/generate-carousel-images-batch/index.ts`
  - vẫn gọi nested HTTP sang `generate-carousel-image`
  - chỉ insert `carousel_images` sau khi response thành công
  - nếu request con timeout thì không có row ảnh nào được lưu
- `src/hooks/useCarouselImages.ts` và `src/hooks/useCarouselCardImages.ts`
  - UI chỉ cần có row trong `carousel_images` là hiển thị được
  - nên hiện tượng “bị trừ token nhưng trắng ảnh” phù hợp với lỗi persistence/backend

## Kế hoạch sửa
1. **Sửa fallback model normalization**
   - Trong `generate-carousel-image`, tách:
     - `requestedModel` để log/telemetry
     - `gatewayModel` để gọi Lovable AI
   - Map toàn bộ model ngoài (`geminigen/*`, `poyo/*`, `kie/*`) sang model ảnh hợp lệ của Lovable AI, ưu tiên `google/gemini-3.1-flash-image-preview` hoặc model gateway mặc định an toàn.

2. **Fail fast để tránh đốt credits vô ích**
   - Với provider ngoài:
     - gặp `402` thì bỏ retry vô ích
     - timeout thì rơi xuống fallback nhanh hơn
   - Giảm thời gian treo ở nhánh không có khả năng trả ảnh usable.

3. **Bỏ điểm gãy nested HTTP dài**
   - Tách core image-generation sang shared helper trong `supabase/functions/_shared/`
   - để batch gọi trực tiếp shared helper thay vì `fetch('/functions/v1/generate-carousel-image')`
   - đây là fix gốc để tránh trường hợp slide tạo xong ở upstream nhưng chết trước khi DB insert.

4. **Persist ngay khi từng slide xong**
   - Sau mỗi slide thành công:
     - insert `carousel_images`
     - update `generation_tasks.progress`
     - ghi `result_metadata.results`
   - Nếu slide fail thì ghi lỗi rõ, không làm mất kết quả các slide trước.

5. **Rà completion/status flow**
   - Chuẩn hóa `_shared/task-tracking.ts` để `carousel_images` là result type hợp lệ thật, không phải cast tạm.
   - Đảm bảo task luôn về `completed` hoặc `failed` rõ ràng.

## File dự kiến cần sửa
- `supabase/functions/generate-carousel-image/index.ts`
- `supabase/functions/generate-carousel-images-batch/index.ts`
- `supabase/functions/_shared/geminigen-image-generator.ts`
- `supabase/functions/_shared/task-tracking.ts`
- thêm 1 shared helper mới trong `supabase/functions/_shared/`

## Kết quả mong đợi sau khi sửa
- Không còn tình trạng credits/token bị trừ mà `carousel_images` vẫn trống
- Fallback cuối luôn dùng model hợp lệ
- Ảnh nào tạo xong sẽ xuất hiện ngay trong DB và UI
- Batch không còn chết giữa chừng vì timeout/nested HTTP
