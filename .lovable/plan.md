

# Sửa lỗi hiển thị người tạo ảnh trong Gallery

## Vấn đề
- 12 bản ghi trong `channel_image_history` có `created_by = NULL`
- Gallery hiện fallback sang `multi_channel_contents.user_id` (chủ nội dung), dẫn đến hiển thị sai người tạo ảnh
- Ví dụ: Ảnh do tài khoản Võ Duy (flowasite@gmail.com) tạo nhưng hiển thị là "Phạm Thị Tường Vi" vì cô ấy là chủ nội dung

## Thay đổi

### 1. Migration: Backfill `created_by` cho 12 record NULL
- Cập nhật `channel_image_history` records có `created_by IS NULL` bằng cách lấy `user_id` của user đã đăng nhập tạo ảnh gần nhất (Võ Duy = `c618b2dc`)
- Vì tất cả 12 ảnh NULL đều được tạo bởi tài khoản admin chính

### 2. Fix Gallery fallback logic (`useCarouselGallery.ts`)
- **Bỏ fallback** sang `multi_channel_contents.user_id` / `carousels.user_id` khi `created_by` là NULL
- Khi `created_by` NULL → hiển thị "Không rõ" thay vì hiển thị sai người

### 3. Fix edge function không ghi `created_by`
- Kiểm tra và đảm bảo `resolveUserId` trả về đúng user ID trong tất cả các flow tạo ảnh
- Thêm log warning khi `userId` là undefined trước khi insert

| File | Thay đổi |
|------|----------|
| Migration SQL | Backfill 12 records NULL → `c618b2dc` |
| `src/hooks/useCarouselGallery.ts` | Bỏ fallback sai, chỉ dùng `created_by` |
| `supabase/functions/generate-brand-image/index.ts` | Thêm log warning khi userId undefined |

