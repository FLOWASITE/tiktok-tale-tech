## Vấn đề

OAuth WordPress.com chạy đến bước cuối (token + sites OK) nhưng fail ở 2 chỗ:

1. **Backend**: DB `social_connections.platform` có CHECK constraint không cho phép giá trị `wordpress_com`.
   - Log: `violates check constraint "social_connections_platform_check"`
2. **Frontend**: Route `/auth/wordpress-com/callback` chưa tồn tại → 404 sau khi redirect.

## Fix

### 1. Migration: mở rộng CHECK constraint

Drop và recreate constraint trên `social_connections.platform` để bao gồm `wordpress_com` (cùng các platform hiện có: twitter, facebook, instagram, linkedin, tiktok, threads, youtube, zalo_oa, google_business, blogger, wordpress, website).

```sql
ALTER TABLE public.social_connections 
  DROP CONSTRAINT IF EXISTS social_connections_platform_check;

ALTER TABLE public.social_connections 
  ADD CONSTRAINT social_connections_platform_check 
  CHECK (platform IN (
    'twitter','facebook','instagram','linkedin','tiktok','threads',
    'youtube','zalo_oa','google_business','blogger',
    'wordpress','wordpress_com','website'
  ));
```

(Trước khi viết migration sẽ query DB lấy danh sách platform hiện đang có trong constraint để không drop nhầm.)

### 2. Tạo route frontend `/auth/wordpress-com/callback`

Tạo `src/pages/WordPressComCallback.tsx` — copy pattern từ các callback hiện có (`BloggerCallback.tsx`, `LinkedInCallback.tsx`):
- Đọc `success`, `error`, `site`, `site_url` từ query params
- Hiện toast success/error
- Redirect về `/brands` (hoặc trang quản lý brand connections) sau 1.5s

Đăng ký route trong `src/app/routes.tsx` (public, không cần `<ProtectedRoute>` vì user đã login trước khi OAuth).

### 3. Verify lại flow

- User click "Kết nối WordPress.com" → redirect WP.com → authorize → callback edge function lưu DB OK → redirect về `/auth/wordpress-com/callback?success=true&site=...` → toast → quay về Brand page → connection xuất hiện.

## Files thay đổi

- `supabase/migrations/<timestamp>_allow_wordpress_com_platform.sql` (new)
- `src/pages/WordPressComCallback.tsx` (new)
- `src/app/routes.tsx` (thêm route)

Không đụng edge function (đã đúng).
