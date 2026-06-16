## Kết quả kiểm tra

Nguyên nhân khả dĩ nhất: luồng `generate-multichannel` đang bị kẹt/timeout trước khi UI nhận được tiến độ thực sự.

Dấu hiệu từ backend:
- Các task multichannel gần nhất bị đánh dấu failed do stale background task sau hơn 10 phút.
- Task dừng ở `progress=5`, `current_step=init`, tức là đã tạo task và mới vào bước khởi tạo, nhưng không tiến tới batch/channel generation.
- Các request lỗi thường chọn rất nhiều kênh cùng lúc, gồm nhiều long-form nặng: `website`, `blogger`, `wordpress`, `medium`, `shopify`, `wix` + nhiều social.
- Một task cũ có lỗi rõ: `wix chưa tạo được nội dung riêng...`, cho thấy long-form guard đang chặn lưu khi một long-form trả rỗng/quá ngắn.

Vấn đề trong code hiện tại:
- `generate-multichannel` làm nhiều bước nặng trước khi tạo/return SSE stream: AI config, smart context, knowledge graph, product/persona, SEO context, prompt lớn.
- Vì SSE chưa được trả ngay, UI không có heartbeat/progress để biết backend còn chạy.
- Với nhiều long-form, edge runtime dễ bị timeout hoặc stream bị ngắt; task sau đó bị recovery đánh dấu stale.
- UI hiện có batch banner, nhưng backend chỉ emit batch sau khi đã qua khối khởi tạo nặng, nên người dùng vẫn thấy lỗi/treo ở đầu.

## Kế hoạch sửa

1. **Trả SSE sớm hơn**
   - Đưa việc tạo `ReadableStream`/heartbeat lên ngay khi vào streaming mode.
   - Emit `init/context` ngay lập tức trước khi chạy các bước context nặng.
   - Cập nhật task progress theo từng bước context để tránh bị stale ở `init`.

2. **Tách tiến độ pre-flight rõ ràng**
   - Emit các bước: tải cấu hình AI, brand context, SEO/persona/product context, chuẩn bị prompt.
   - UI sẽ thấy tiến độ trước khi batch đầu tiên bắt đầu.

3. **Giới hạn batch long-form an toàn hơn**
   - Với long-form nặng (`website/blogger/wordpress/medium/shopify/wix`), chạy tuần tự hoặc batch nhỏ hơn khi số kênh lớn.
   - Giữ social batch nhanh hơn sau long-form.

4. **Xử lý lỗi từng kênh rõ hơn**
   - Nếu 1 long-form như Wix/Medium fail, emit lỗi channel cụ thể vào UI thay vì để cả task stale.
   - Khi backend chặn lưu do nội dung rỗng/quá ngắn, hiển thị tên kênh lỗi và gợi ý retry.

5. **Dọn Telegram khỏi luồng multichannel UI liên quan**
   - Vì yêu cầu trước là không còn hiển thị Telegram, loại Telegram khỏi mapping UI/form/image picker còn sót để tránh user chọn nhầm hoặc pipeline cũ gửi `telegram`.
   - Không xoá schema/cột backend, chỉ ẩn khỏi UI và lọc payload frontend.

6. **Kiểm chứng sau sửa**
   - Test case nhỏ: Facebook + Instagram + Website.
   - Test case nặng: toàn bộ long-form + social, xác nhận UI nhận heartbeat, batch progress và không stale ở `init`.
   - Kiểm tra task mới cập nhật progress vượt qua `init` và nếu fail thì có message cụ thể theo kênh.

## File dự kiến chỉnh

- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/_shared/streaming-handler.ts`
- `src/hooks/useStreamingGeneration.ts`
- `src/pages/MultiChannelCreate.tsx`
- Các component multichannel còn reference Telegram trong UI/form picker nếu cần