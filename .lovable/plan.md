Tôi đã kiểm tra trực tiếp record mới nhất `c2e83af5...`: `website_content` có 6139 ký tự nhưng `blogger_content = 0`, `wordpress_content = 0`. Nghĩa là mockup không nhận text vì DB vẫn đang lưu rỗng, không phải do component mockup render sai.

Nguyên nhân cụ thể hiện tại:
1. Backend streaming có log AI đã sinh Blogger 1549 chars và WordPress retry 3207 chars.
2. Nhưng sau đó record lưu vào DB vẫn `blogger_content/wordpress_content = NULL`.
3. Nhánh streaming đang lấy kết quả từ `parallelResult.channelResults` rồi ghi thẳng sang DB. Kết quả retry/guard có thể nằm trong buffer nội bộ `channelResults`, nhưng chưa có lớp “assert trước insert + assert sau insert”. Vì vậy backend vẫn có đường thoát ghi thành công record thiếu text.
4. Frontend mockup đang đọc đúng cột riêng (`blogger_content`, `wordpress_content`) và không fallback website, nên khi DB rỗng thì mockup rỗng là đúng.

Plan sửa dứt điểm:

1. Khóa backend streaming trước khi lưu
- Trong `supabase/functions/generate-multichannel/index.ts`, ngay trước `.insert(buildMultiChannelCreatePayload(...))` và `.update(...)`, tạo payload vào biến riêng.
- Ép lấy text Blogger/WordPress bằng helper chuẩn hóa từ `channelResults.blogger` / `channelResults.wordpress`.
- Nếu kênh được chọn mà payload vẫn thiếu text sau retry: trả lỗi 422, fail task, không cho insert/update record rỗng.
- Log rõ `pre-insert lens={blogger=..., wordpress=...}`.

2. Kiểm chứng sau khi lưu DB
- Sau insert/update, đọc lại chính record vừa lưu với `select('id, blogger_content, wordpress_content, website_content')`.
- Nếu kênh được chọn nhưng DB trả về rỗng: lập tức patch update lại bằng text đã có trong memory.
- Nếu patch vẫn không thành công: trả lỗi thay vì báo success.
- Điều này chặn hoàn toàn case “AI có text nhưng DB lưu NULL mà UI báo xong”.

3. Trả result cho frontend bằng record đã verify
- Event `result` trong SSE sẽ dùng record sau verify/patch, không dùng object cũ `savedContent` có thể thiếu cột.
- Như vậy khi chuyển sang viewer/mockup, object nhận được đã có `blogger_content` và `wordpress_content`.

4. Sửa regenerate để cập nhật viewer state đúng cách
- Trong `MultiChannelViewer`, callback regenerate hiện đang gọi `onUpdateContent(content.id, channel, newContent)` sau khi backend đã regenerate. Cách này có thể ghi đè bằng text từ stream nếu result parse thiếu.
- Đổi sang: sau regenerate success, refetch/update bằng full row backend trả về hoặc gọi `onRegenerate` non-stream fallback chỉ khi cần. Mục tiêu: viewer state luôn nhận full `MultiChannelContent` mới, không chỉ string.

5. Sửa lỗi phụ đang có trong update map
- Trong `useMultiChannelContents.ts`, `updateChannelContent` đang map sai:
  - `pinterest: 'instagram_content'`
  - `bluesky: 'Bluesky'`
- Tôi sẽ sửa thành `pinterest_content` và `bluesky_content` để tránh các kênh khác bị ghi nhầm khi edit/save.

6. Bổ sung fallback frontend cho bài cũ đang rỗng
- Với các record cũ như `c2e83af5...` đã bị lưu rỗng, mockup vẫn sẽ hiển thị banner “Chưa có nội dung riêng”.
- Nút “Tạo nội dung riêng” sẽ regenerate và sau fix sẽ cập nhật đúng cột + refresh mockup ngay.
- Không copy website sang Blogger/WordPress vì yêu cầu đã chốt là 3 kênh long-form độc lập.

Files cần sửa:
- `supabase/functions/generate-multichannel/index.ts`
- `src/hooks/useStreamingRegenerate.ts`
- `src/components/MultiChannelViewer.tsx`
- `src/hooks/useMultiChannelContents.ts`
- cập nhật memory longform để ghi lại invariant: “selected Blogger/WordPress must be non-empty in DB before success”.

Sau khi approve, tôi sẽ implement ngay và triển khai edge function để test bằng record mới/regenerate.