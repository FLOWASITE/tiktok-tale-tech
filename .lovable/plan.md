

# Hoàn thiện đăng ký: Google Sign-in + Cải thiện UX

## 1. Thêm đăng nhập Google

Sử dụng Lovable Cloud managed Google OAuth (không cần API key).

### Thay đổi:
- **Gọi Configure Social Auth tool** để tạo module `src/integrations/lovable/`
- **`src/pages/Auth.tsx`**: Thêm nút "Đăng nhập với Google" ở cả tab login và register, phía trên form, kèm divider "hoặc". Import `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.

## 2. Cải thiện UX form đăng ký

### `src/pages/Auth.tsx`:
- **Confirm password**: Thêm field "Nhập lại mật khẩu" với validation khớp
- **Họ và tên bắt buộc**: Thêm `required` cho field name
- **Checkbox đồng ý điều khoản**: Thêm checkbox bắt buộc "Tôi đồng ý với Điều khoản và Chính sách bảo mật" — disable nút submit nếu chưa tick
- **Thông báo sau đăng ký rõ ràng hơn**: Thay toast bằng hiển thị inline success message hướng dẫn người dùng kiểm tra email để xác nhận (vì auto-confirm đang tắt)

## Tóm tắt file thay đổi

| File | Thay đổi |
|---|---|
| `src/pages/Auth.tsx` | Thêm Google sign-in button, confirm password, required name, ToS checkbox, success message |
| `src/integrations/lovable/` | Auto-generated bởi Configure Social Auth tool |

