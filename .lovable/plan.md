

# Hoàn thiện đăng ký qua Google

## Vấn đề hiện tại

1. **`handle_new_user` trigger chỉ đọc `full_name`** — Google OAuth cung cấp tên trong field `full_name` (do Lovable Cloud maps nó), nhưng **avatar_url** từ Google không được lưu vào `profiles.avatar_url`.

2. **Không cập nhật profile khi đăng nhập lại** — Nếu user đăng nhập Google lần 2+ (đã có profile), avatar/tên mới từ Google không được sync.

3. **Redirect sau Google sign-in** — Hiện tại `redirect_uri` là `window.location.origin` (trang chủ `/`). Cần đảm bảo redirect về đúng trang user muốn truy cập trước đó (nếu có).

## Thay đổi

### 1. Cập nhật `handle_new_user` trigger (Migration SQL)

Sửa trigger để lưu `avatar_url` từ Google metadata vào profiles:

```sql
INSERT INTO public.profiles (id, email, full_name, avatar_url)
VALUES (
  NEW.id, 
  NEW.email, 
  COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
  NEW.raw_user_meta_data ->> 'avatar_url'
);
```

Cũng cập nhật tên workspace dùng `COALESCE(full_name, name, email)`.

### 2. Sync profile khi đăng nhập lại (`AuthContext.tsx`)

Trong `onAuthStateChange`, khi event là `SIGNED_IN` và provider là Google:
- Lấy `avatar_url` và `full_name` từ `session.user.user_metadata`
- Upsert vào `profiles` nếu các field đang null (không ghi đè nếu user đã tự set)

### 3. Cải thiện Google redirect (`Auth.tsx`)

- Truyền `redirect_uri` kèm `location.state?.from` để sau Google login quay về đúng trang trước đó
- Thêm loading state rõ ràng hơn khi đang redirect sang Google

## Tóm tắt file thay đổi

| File | Thay đổi |
|---|---|
| Migration SQL | Cập nhật `handle_new_user` lưu `avatar_url` từ Google |
| `src/contexts/AuthContext.tsx` | Sync avatar/name từ Google metadata khi `SIGNED_IN` |
| `src/pages/Auth.tsx` | Cải thiện redirect_uri, loading state Google |

