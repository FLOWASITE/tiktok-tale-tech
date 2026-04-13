

## Focus trải nghiệm "Tạo Brand" cho user mới lần đầu sử dụng

### Vấn đề hiện tại
Khi user mới đăng nhập lần đầu, họ vào Dashboard (`/`) - thấy một dashboard trống rỗng với nhiều widget không có dữ liệu. Không có hướng dẫn rõ ràng rằng bước đầu tiên quan trọng nhất là **Tạo Brand**.

### Giải pháp
Thêm logic phát hiện user mới (chưa có brand nào) và hiển thị **màn hình onboarding tạo Brand** thay vì dashboard trống.

### Thay đổi cụ thể

**1. `src/pages/Dashboard.tsx` - Thêm "Empty State" cho user chưa có brand**
- Kiểm tra `brands.length === 0` sau khi load xong
- Khi chưa có brand: hiển thị một card CTA lớn, nổi bật ở trung tâm dashboard thay vì các widget rỗng
- Card bao gồm: icon thương hiệu, tiêu đề "Bắt đầu với Brand đầu tiên", mô tả ngắn, nút "Tạo Brand ngay" → navigate đến `/brands/new`
- Ẩn các widget phụ (stats, timeline, schedules...) khi chưa có brand để tránh giao diện rối

**2. `src/components/dashboard/QuickActionGrid.tsx` (hoặc tương tự) - Highlight CTA tạo brand**
- Khi `brands.length === 0`: đổi quick action "Tạo Brand" thành nút primary nổi bật nhất, có badge "Bắt đầu tại đây"

**3. `src/pages/Auth.tsx` - Redirect user mới đến `/brands/new`**
- Sau đăng ký thành công (lần đầu login), redirect thẳng đến `/brands/new` thay vì `/`
- Phát hiện bằng cách kiểm tra user metadata hoặc brands count = 0

### Luồng trải nghiệm mới

```text
User mới đăng ký/đăng nhập
  ↓
Dashboard load → brands.length === 0?
  ↓ YES
Hiển thị Welcome CTA Card:
┌─────────────────────────────────┐
│  🎨 Chào mừng đến Flowa!       │
│                                 │
│  Bước đầu tiên: Tạo Brand      │
│  Template để AI hiểu thương     │
│  hiệu của bạn.                 │
│                                 │
│  [✨ Tạo Brand ngay]            │
│                                 │
│  Hoặc khám phá: Xem demo       │
└─────────────────────────────────┘
  ↓ Click "Tạo Brand ngay"
/brands/new (Quick Start dialog mở tự động)
```

### File cần thay đổi
- `src/pages/Dashboard.tsx` - Thêm empty state component khi chưa có brand
- Tạo `src/components/dashboard/NewUserWelcome.tsx` - Component welcome card cho user mới
- `src/pages/Auth.tsx` - Optional: redirect user mới thẳng đến brand creation

