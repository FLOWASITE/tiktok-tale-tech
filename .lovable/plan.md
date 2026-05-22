## Mục tiêu
Dừng việc hệ thống tự xóa ảnh/video và tránh ảnh hưởng tới bài đã post qua kênh Website của Flowa.

## Kết luận sau khi kiểm tra
- `Admin Social Settings` có kênh `Website / Custom API` — đây là cấu hình Website của hệ thống.
- Job `cleanup-old-media` đang có retention `7 ngày` và đang xóa:
  - `channel_image_history`
  - `carousel_images`
  - `video_generations`
  - file trong bucket `carousel-images`, bao gồm cả file mồ côi cũ hơn 7 ngày
- Luồng `publish-website` không thấy lệnh xóa bài; vấn đề chính nằm ở cleanup media 7 ngày có thể làm mất ảnh/video liên quan bài sau khi đăng.

## Kế hoạch sửa

### 1. Tắt hẳn cleanup 7 ngày ở backend function
Trong `supabase/functions/cleanup-old-media/index.ts`, thêm flag:
```ts
const CLEANUP_ENABLED = false;
```
Và cho function trả về ngay:
```ts
{ success: true, disabled: true, message: 'Media retention cleanup is temporarily disabled' }
```
Kết quả: dù cron hoặc admin bấm chạy tay, function cũng không xóa ảnh/video/bản ghi nào.

### 2. Gỡ lịch chạy cron cleanup
Chạy lệnh backend:
```sql
select cron.unschedule('cleanup-old-media');
```
Kết quả: job tự động hằng ngày không còn chạy nữa.

### 3. Cập nhật thông báo UI
Trong `src/components/MediaRetentionNotice.tsx`, đổi nội dung từ “tự động xóa sau 7 ngày” sang:
```text
Ảnh và video hiện được lưu trữ vô thời hạn.
```
Kết quả: người dùng không còn bị báo sai policy.

## Không làm
- Không xóa bài đã đăng.
- Không xóa dữ liệu cũ.
- Không đổi logic publish Website, WordPress, Blogger, Wix.
- Không đụng storage/RLS/schema.
- Không xóa code cleanup, chỉ tạm khóa để có thể bật lại sau.

## Cách bật lại nếu cần
- Đổi `CLEANUP_ENABLED = true`.
- Schedule lại cron `cleanup-old-media`.
- Đổi lại banner retention 7 ngày.