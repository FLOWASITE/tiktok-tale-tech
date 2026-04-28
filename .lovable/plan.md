# Fix: Auto-cleanup media 7 ngày chưa hoạt động

## Hiện trạng
- Cron job `cleanup-old-media-daily` đã tồn tại (3:00 UTC mỗi ngày, gọi edge function `cleanup-old-media`).
- Edge function `cleanup-old-media/index.ts` đã có code đầy đủ (xóa channel_image_history, carousel_images, video_generations >7 ngày + dọn storage có protect logic).
- **Nhưng edge function chưa từng chạy** (không có log boot/invoke nào).
- DB còn tồn 5 channel images + 22 carousel images >7 ngày chưa bị xóa.

## Nguyên nhân
Edge function `cleanup-old-media` chưa được deploy/active trên Lovable Cloud, nên `pg_net.http_post` từ cron gọi vào URL `/functions/v1/cleanup-old-media` trả về 404 và không có log nào ghi nhận tại function level.

## Các bước fix

### 1. Re-deploy edge function `cleanup-old-media`
- Touch lại file `supabase/functions/cleanup-old-media/index.ts` (no-op edit + cập nhật comment header) để Lovable Cloud trigger auto-deploy khi commit.
- Verify `supabase/config.toml` không vô tình require `verify_jwt = true` cho function này (cron gọi bằng anon key).

### 2. Trigger chạy ngay (manual invoke) để xác nhận hoạt động
- Sau khi deploy, gọi function 1 lần để dọn 27 records cũ tồn đọng và xác nhận log xuất hiện.

### 3. Kiểm tra `pg_net` request history
- Query `net._http_response` để confirm cron các ngày trước đã gọi nhưng nhận status code gì (404 / 401 / 500).
- Nếu phát hiện 401, đổi cron dùng service_role key thay vì anon key.

### 4. Sanity check sau khi chạy
- Verify số rows >7 ngày trong `channel_image_history`, `carousel_images`, `video_generations` = 0.
- Verify storage bucket không còn orphan files (qua summary trả về của function).

## Files ảnh hưởng
- `supabase/functions/cleanup-old-media/index.ts` (touch để force redeploy)
- Có thể cần migration nhỏ update cron headers nếu phát hiện auth issue

## Không cần thay đổi
- Logic function (đã đúng, có protect logic, có chunk delete 100, có dedupe per bucket).
- Schedule cron (3h UTC = 10h sáng VN — hợp lý, low traffic).
- RLS / DB schema.

## Rủi ro
- Thấp. Function dùng service role key nội bộ, có error handling đầy đủ, đã có protect logic chống xóa nhầm ảnh đang dùng.
