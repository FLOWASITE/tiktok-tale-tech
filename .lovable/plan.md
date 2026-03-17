

# Làm lại thống kê bài viết & ảnh cho từng user

## Hiện trạng

`UserDetailSheet.tsx` hiện chỉ đếm từ bảng `usage_logs` theo `usage_type` → không phản ánh chính xác số bài viết/ảnh thực tế đã tạo.

## Thay đổi

### Sửa: `src/components/admin/UserDetailSheet.tsx`

Thay thế phần "Usage (kỳ hiện tại)" bằng **thống kê thực tế** query trực tiếp từ các bảng nội dung:

1. **Bài đa kênh**: `SELECT count(*) FROM multi_channel_contents WHERE user_id = ?`
2. **Carousel**: `SELECT count(*) FROM carousels WHERE user_id = ?`
3. **Ảnh AI**: `SELECT count(*) FROM channel_image_history WHERE created_by = ?`
4. **Usage logs** (giữ lại): Vẫn đếm `usage_logs` theo kỳ hiện tại để so sánh với plan limit

UI mới sẽ gồm 2 section:
- **Tổng nội dung đã tạo** (all-time): Grid cards hiển thị số multi-channel, carousel, ảnh AI thực tế
- **Usage kỳ hiện tại** (giữ nguyên): Hiển thị usage_logs so với giới hạn plan

Fetch tất cả trong `fetchDetails()` bằng `Promise.all` để không ảnh hưởng performance.

### Scope
- **1 file sửa**: `UserDetailSheet.tsx`
- Không cần migration hay edge function mới

