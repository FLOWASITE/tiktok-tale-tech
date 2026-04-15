

## Chức năng Mua thêm gói (Add-on Packs)

### Ý tưởng
Cho phép workspace mua thêm gói hạn mức (Starter/Pro/Enterprise) bổ sung vào subscription hiện tại. Ví dụ: workspace đang dùng Pro có thể mua thêm 1 gói Starter để cộng thêm 20 lượt multichannel, 20 ảnh AI, v.v.

### Database

**Bảng mới: `addon_purchases`**
- `id`, `organization_id`, `plan_type` (gói add-on mua), `billing_cycle`, `amount` (số tiền), `status` (active/expired), `purchased_at`, `expires_at` (= current_period_end hoặc cuối tháng), `payment_order_id`, `metadata`

**Migration:**
- Tạo bảng `addon_purchases` với RLS (org members có thể đọc, service role ghi)

### Backend (Edge Functions)

**1. Sửa `create-payos-payment`:**
- Thêm trường `purchase_type: 'upgrade' | 'addon'` vào request body
- Khi `purchase_type = 'addon'`: không tính proration, lấy giá gốc của gói, lưu `purchase_type` vào `payment_orders.metadata`

**2. Sửa `payos-webhook`:**
- Khi `metadata.purchase_type === 'addon'`: thay vì update subscription, INSERT vào `addon_purchases` với `expires_at` = cuối chu kỳ hiện tại

**3. Sửa `verify-payos-order`:** Tương tự webhook logic cho addon

### Frontend

**1. Sửa `useSubscription` hook:**
- Query `addon_purchases` active trong chu kỳ hiện tại
- Cộng dồn hạn mức add-on vào `currentPlanLimits` (e.g. nếu mua thêm Starter → +20 multichannel, +20 images...)

**2. Sửa `can_use_feature` DB function:**
- Tính tổng hạn mức = plan gốc + tổng add-on purchases active

**3. UI — Dialog mua thêm gói:**
- Thêm nút "Mua thêm gói" trên trang `/account` và `UsageQuotaWidget`
- Dialog hiện danh sách gói (Starter/Pro/Enterprise) với thông tin hạn mức sẽ được cộng thêm
- Sử dụng flow PayOS hiện có, chỉ khác `purchase_type: 'addon'`

**4. Hiển thị add-on đã mua:**
- Trang `/account` hiện danh sách add-on active kèm ngày hết hạn

### Luồng hoạt động

```text
User click "Mua thêm gói"
  → Chọn gói (Starter/Pro/Enterprise)
  → Chọn chu kỳ (tháng/năm)
  → Thanh toán PayOS (purchase_type: addon)
  → Webhook xác nhận → INSERT addon_purchases
  → useSubscription cộng dồn hạn mức
  → can_use_feature tính tổng mới
```

### File cần tạo/sửa
- **Tạo:** Migration cho bảng `addon_purchases`
- **Tạo:** `src/components/AddonPurchaseDialog.tsx`
- **Sửa:** `supabase/functions/create-payos-payment/index.ts`
- **Sửa:** `supabase/functions/payos-webhook/index.ts`
- **Sửa:** `supabase/functions/verify-payos-order/index.ts`
- **Sửa:** `src/hooks/useSubscription.ts` (cộng dồn add-on)
- **Sửa:** DB function `can_use_feature` (tính add-on)
- **Sửa:** `src/pages/Account.tsx` (hiện add-on + nút mua)
- **Sửa:** `src/components/dashboard/UsageQuotaWidget.tsx` (nút mua thêm)

