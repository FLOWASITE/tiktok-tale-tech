

## Tăng khả năng hiển thị CTA "Mua thêm gói"

### Vấn đề
Nút "Mua thêm" hiện chỉ xuất hiện ở 2 chỗ kín: trang Account (cùng hàng với nút Nâng cấp) và widget UsageQuota trên dashboard. Khi quota hết, `QuotaExhaustedBanner` chỉ hiện nút "Nâng cấp" mà không có "Mua thêm".

### Sửa chữa

#### 1. `QuotaExhaustedBanner` — thêm nút "Mua thêm"
- Thêm `AddonPurchaseDialog` và nút "Mua thêm" bên cạnh nút "Nâng cấp"
- Khi hết quota, user thấy 2 lựa chọn rõ ràng: nâng cấp gói hoặc mua thêm lượt

#### 2. Trang Account — làm nổi bật nút "Mua thêm"
- Đổi nút "Mua thêm" từ `variant="outline"` sang `variant="default"` với màu primary
- Thêm icon nổi bật hơn (Package hoặc Plus)

#### 3. `UsageQuotaWidget` — highlight khi quota gần hết
- Khi bất kỳ quota nào >= 80%, đổi nút "Mua thêm" từ `variant="outline"` sang `variant="default"` để nổi bật hơn

### File cần sửa
- `src/components/QuotaExhaustedBanner.tsx` — thêm nút + dialog "Mua thêm"
- `src/pages/Account.tsx` — đổi variant nút "Mua thêm"
- `src/components/dashboard/UsageQuotaWidget.tsx` — highlight nút khi quota cao

