# Cleanup 7 ngày: xóa cả ảnh đang dùng

## Thay đổi
Hiện tại `cleanup-old-media` bảo vệ ảnh `is_selected = true` (ảnh đã chọn cho bài đăng). Theo yêu cầu mới: **mọi ảnh/video > 7 ngày đều bị xóa**, không chừa ảnh đang dùng.

## Sửa `supabase/functions/cleanup-old-media/index.ts`

### 1. Bỏ filter `is_selected = false` khi quét xóa
- `channel_image_history`: xóa cả selected lẫn unselected nếu `created_at < cutoff`
- `carousel_images`: tương tự
- `video_generations`: giữ nguyên (chỉ xóa completed/failed >7 ngày — vì pending/processing chưa xong)

### 2. Cập nhật protected set — chỉ giữ ảnh "còn trong 7 ngày"
Bỏ điều kiện `is_selected.eq.true` khỏi query protect. Chỉ URL của record có `created_at >= cutoff` (tức là vừa tạo gần đây và sẽ tiếp tục tồn tại trong DB) mới được protect khỏi storage.remove. Điều này tránh xóa file storage mà DB record kia (cùng URL, mới tạo) vẫn đang trỏ tới.

### 3. Giữ nguyên
- Logic dedupe URL theo bucket (Set)
- Chunked remove 100 files
- Error handling "Object not found" → warning
- `MediaRetentionNotice` UI (giữ wording hiện tại, không đổi tone)

## Hệ quả
- Bài đăng publish trước đó >7 ngày sẽ mất ảnh hiển thị → user phải re-upload nếu muốn giữ. UI đã cảnh báo "tải về nếu muốn giữ".
- Carousel slides đã chọn cũng bị xóa sau 7 ngày.
- Cron schedule và edge function khác: không đụng tới.

## File chỉnh
- `supabase/functions/cleanup-old-media/index.ts` — bỏ `.eq("is_selected", false)` ở 2 query xóa, bỏ `is_selected.eq.true` ở 3 query protect.
