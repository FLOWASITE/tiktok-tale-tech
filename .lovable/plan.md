

## Sửa lỗi: Số tiền thanh toán khác số tiền gói

### Nguyên nhân
Dialog "Nâng cấp gói" đang tính **prorate** (chia theo ngày còn lại trong chu kỳ). Ví dụ: gói Starter 10.000đ/tháng nhưng còn 29/30 ngày → chỉ thu 9.667đ. Tương tự Pro 549.000đ → thu 530.700đ.

### Sửa chữa
Bỏ logic prorate — khi nâng cấp gói, **thu full giá** và bắt đầu chu kỳ mới 30 ngày từ thời điểm thanh toán.

#### File: `src/components/UpgradePlanDialog.tsx`
- **Xóa** hàm `getProrateInfo` (dòng 57-67)
- **Xóa** mọi tham chiếu `prorateInfo` trong plan cards: block hiển thị "Thanh toán theo ngày còn lại", logic tính `priceBeforeDiscount`, nút bấm
- Giá hiển thị = `fullPrice` (hoặc `fullPrice` sau voucher)
- Nút bấm: `Thanh toán ${formatPrice(finalPrice)}₫`

#### File: `src/components/PaymentConfirmDialog.tsx`
- Giữ interface `ProrateInfo` cho backward compat nhưng block prorate sẽ không bao giờ hiện (vì `prorateInfo` luôn null)

### Kết quả
- Starter hiện đúng **10.000₫**, Pro hiện đúng **549.000₫**, Enterprise hiện đúng **1.499.000₫**
- Sau thanh toán thành công, chu kỳ mới bắt đầu từ ngày thanh toán

