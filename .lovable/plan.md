

## Sửa lỗi màn hình trắng sau thanh toán PayOS thành công

### Nguyên nhân

Có 2 vấn đề chính:

1. **SPA reload chậm**: Khi PayOS redirect về app, trình duyệt tải lại toàn bộ SPA (JS bundle, auth init, route matching). Trong thời gian này, `index.html` không có loading indicator → hiện màn trắng.

2. **Auth token hết hạn**: Logs cho thấy lỗi `JWT has expired` khi gọi `verify-payos-order`. Nếu user mất thời gian thanh toán, token hết hạn → ProtectedRoute chặn và redirect về `/auth` hoặc hiện skeleton lâu.

### Sửa chữa

#### 1. Thêm loading indicator vào `index.html`
- Thêm spinner/loading text vào `<div id="root">` để hiện ngay khi browser load page, trước khi React mount.

#### 2. Xử lý tốt hơn tại `PaymentResult.tsx`
- Khi URL params đã có `status=PAID` hoặc `code=00`, hiện kết quả thành công **ngay lập tức** mà không cần đợi verify.
- Chạy verify ở background để cập nhật DB, nhưng không block UI.
- Thêm timeout cho verify (max 10s), nếu quá thì vẫn hiện thành công dựa trên URL params.

#### 3. Sửa `verify-payos-order` — bỏ `getClaims` dùng `getUser`
- Edge function đang dùng `getClaims()` (đã bị deprecated) gây lỗi JWT expired.
- Chuyển sang dùng `supabase.auth.getUser(token)` theo memory pattern `edge-function-auth-pattern-vn`.

### File cần sửa
- `index.html` — thêm loading placeholder
- `src/pages/PaymentResult.tsx` — hiện success ngay từ URL params, verify chạy background
- `supabase/functions/verify-payos-order/index.ts` — thay `getClaims` bằng `getUser`

