

## Thêm nhập Voucher vào PaymentConfirmDialog

### Hiện trạng
- Voucher chỉ nhập được ở `UpgradePlanDialog` trước khi mở confirm
- `PaymentConfirmDialog` chỉ **hiển thị** voucher đã áp dụng, không cho nhập/thay đổi
- `Pricing.tsx` không có voucher

### Cải tiến
Thêm ô nhập voucher trực tiếp vào `PaymentConfirmDialog` để user có thể nhập/thay đổi mã ngay tại bước xác nhận.

### Kỹ thuật

**`src/components/PaymentConfirmDialog.tsx`**
- Thêm state `voucherInput`, `voucherLoading`, `localVoucher`
- Thêm logic `handleApplyVoucher` (query bảng `vouchers`, validate ngày/lượt dùng/applicable_plans)
- Thêm `handleRemoveVoucher`
- Tự động tính lại `displayFinalPrice` khi voucher thay đổi
- Thay section voucher tĩnh thành input field tương tự UpgradePlanDialog (nhập mã → áp dụng → hiển thị badge + nút xóa)
- Thêm props: `onVoucherChange?: (voucher: VoucherInfo | null, newPrice: number) => void` để callback lên parent cập nhật state
- Thêm prop `applicablePlan?: string` để validate voucher theo gói

**`src/components/UpgradePlanDialog.tsx`**
- Truyền `onVoucherChange` vào PaymentConfirmDialog để đồng bộ voucher khi user thay đổi ở confirm dialog
- Cập nhật `finalPrice` và `appliedVoucher` khi nhận callback

**`src/pages/Pricing.tsx`**
- Thêm tương tự: truyền `onVoucherChange` để hỗ trợ voucher từ trang Pricing

