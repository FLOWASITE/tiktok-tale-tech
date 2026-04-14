

## Thêm trang Xác nhận Thanh toán (Payment Confirmation)

### Hiện trạng
Khi user click "Thanh toán qua VNPay" ở UpgradePlanDialog hoặc Pricing page → gọi edge function → redirect thẳng sang VNPay. User không có cơ hội xem lại thông tin trước khi thanh toán.

### Cải tiến
Thêm bước xác nhận trung gian hiển thị tóm tắt đơn hàng trước khi redirect sang VNPay.

**Flow mới:**
```text
Chọn gói → Dialog xác nhận (review) → Click "Xác nhận & Thanh toán" → Redirect VNPay
```

### Nội dung trang xác nhận (Dialog/Sheet)

Hiển thị trong một Dialog mới `PaymentConfirmDialog`:
- **Workspace**: Tên workspace hiện tại
- **Gói hiện tại → Gói mới**: Free → Pro
- **Chu kỳ**: Hàng tháng / Hàng năm
- **Giá gốc**: 549.000₫
- **Prorate** (nếu có): Chỉ trả 320.000₫ cho 18 ngày còn lại
- **Voucher** (nếu có): Mã SALE20 — Giảm 20% → hiển thị giá sau giảm
- **Tổng thanh toán**: Số tiền cuối cùng (bold, lớn)
- **Phương thức**: VNPay (ATM, QR, Ví điện tử)
- Nút "Xác nhận & Thanh toán" + "Quay lại"

### Kỹ thuật

**File mới:**
- `src/components/PaymentConfirmDialog.tsx` — Dialog xác nhận với props: planType, billingCycle, price, prorateInfo, voucher, onConfirm, onCancel

**File sửa:**
- `src/components/UpgradePlanDialog.tsx` — Khi click "Thanh toán", thay vì gọi API ngay → mở `PaymentConfirmDialog` với thông tin đã tính. Chỉ gọi API khi user confirm.
- `src/pages/Pricing.tsx` — Tương tự, thêm bước confirm trước khi redirect

