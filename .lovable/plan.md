

## Di chuyển Lịch sử Thanh toán vào trang Tài khoản (/account)

### Thay đổi

**1. Nhúng PaymentHistory vào Account.tsx**
- Import và render component `PaymentHistory` (hoặc tạo version nhỏ gọn hơn) bên dưới card "Lịch sử sử dụng" trong trang Account
- Bọc trong Card với tiêu đề "Lịch sử thanh toán" và icon CreditCard/Receipt

**2. Chuyển PaymentHistory thành reusable component**
- Sửa `PaymentHistory.tsx`: export thêm một named export `PaymentHistorySection` (không có layout wrapper/container) để nhúng được vào Account
- Giữ nguyên default export cho route `/payments` (backward compatible) hoặc xóa route nếu không cần nữa

**3. Xóa route riêng `/payments`**
- Xóa route `/payments` khỏi `routes.tsx` vì lịch sử thanh toán giờ nằm trong `/account`
- Cập nhật mọi link/navigate trỏ đến `/payments` (nếu có) sang `/account`

### Kỹ thuật

**File sửa:**
- `src/pages/PaymentHistory.tsx` — Tách nội dung chính thành `PaymentHistorySection` (named export), giữ lại default export wrapper
- `src/pages/Account.tsx` — Import `PaymentHistorySection`, render sau card Lịch sử sử dụng
- `src/app/routes.tsx` — Xóa route `/payments`
- Kiểm tra `src/pages/PaymentResult.tsx` và các file khác có navigate đến `/payments` để cập nhật

