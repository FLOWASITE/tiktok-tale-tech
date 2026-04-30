## Vấn đề
GeminiGen đã render xong video (status `completed`), nhưng parser của ta không tìm được URL trong response → job bị mark `failed: "Completed but no video URL returned"`.

Hiện tại đang đoán mù field name (`video_url`, `generate_result`, `result_url`, `output_url`, `files[0].url`, `videos[0].url`). Cần thấy **response thực tế** mới fix chính xác.

## Kế hoạch fix (3 bước)

### 1. Log full raw response từ history endpoint
Trong `checkGeminiGenVideoStatus` (file `supabase/functions/_shared/geminigen-video-generator.ts`), khi `status === completed`, log toàn bộ JSON body (truncate 1500 ký tự) **trước khi** thử extract URL. Mục đích: thấy chính xác cấu trúc trong logs `video-job-poller`.

```ts
console.log(`[geminigen-video] COMPLETED raw response for ${uuid}:`,
  JSON.stringify(data).slice(0, 1500));
```

Đồng thời mở rộng fallback parser để quét **đệ quy** mọi field chứa `.mp4` hoặc URL bắt đầu bằng `https://` trong object — đây là safety net để không fail nữa kể cả khi field name khác.

### 2. Thêm recursive URL finder
Helper nhỏ `findVideoUrl(obj)` duyệt object/array, return string đầu tiên match `/^https?:\/\/.*\.(mp4|mov|webm)/i`. Dùng làm fallback cuối cùng sau khi list field cứng không match.

### 3. Reset job đang fail để poller retry
Update các record `video_generations` mới fail vì lý do "Completed but no video URL returned" về `status='processing', poll_attempts=0` để poller chạy lại với parser đã sửa.

```sql
UPDATE video_generations
SET status='processing', poll_attempts=0, error_message=NULL, completed_at=NULL
WHERE provider='geminigen'
  AND status='failed'
  AND error_message LIKE '%no video URL%'
  AND created_at > now() - interval '1 hour';
```

## Kết quả mong đợi
- Video đã render xong sẽ được poller tick tiếp theo (≤30s) phát hiện URL và lưu vào `video_url` → UI ScriptVideoTab/ScriptVideoGalleryGrouped hiển thị video.
- Logs sẽ in raw response để lần sau biết chính xác field cần parse.
- Recursive finder làm hệ thống resilient nếu GeminiGen đổi schema.

## Files thay đổi
- `supabase/functions/_shared/geminigen-video-generator.ts` (log raw + recursive finder)
- 1 migration SQL nhỏ để reset job fail gần đây
