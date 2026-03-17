

# Phương án xử lý: Hạn mức dư thừa & Nâng cấp giữa chu kỳ

## Phân tích hiện trạng

**Hiện tại khi nâng cấp gói (`vnpay-callback`):**
- Reset `current_period_start = now()`, `current_period_end = now + 1 tháng/năm`
- **Không xử lý proration** (tính phí theo tỷ lệ ngày còn lại)
- **Không cộng dồn hạn mức** chưa dùng từ gói cũ
- Usage query chỉ đếm trong `period_start → period_end`, nên khi reset period → usage cũng bị reset về 0

**2 vấn đề cần giải quyết:**

| Trường hợp | Hiện tại | Mong muốn |
|---|---|---|
| Hạn mức dư cuối tháng | Mất hoàn toàn khi chu kỳ mới bắt đầu | **Không rollover** (phổ biến trong SaaS) hoặc **Rollover một phần** |
| Nâng cấp giữa tháng | Period reset → usage reset → được dùng lại từ đầu | Nên **cộng thêm hạn mức mới - đã dùng** hoặc **tính phí prorate** |

## Đề xuất phương án

### Phương án A: Không rollover + Immediate upgrade (đơn giản, khuyến nghị)

**Hạn mức dư cuối tháng:** Mất hết, reset về 0 khi chu kỳ mới → **không cần thay đổi gì** (đây là chuẩn SaaS).

**Nâng cấp giữa tháng:**
1. **Prorate phí thanh toán**: Chỉ tính phí cho số ngày còn lại trong chu kỳ hiện tại
2. **Giữ nguyên period dates**: KHÔNG reset `current_period_start/end` → chỉ đổi `plan_type`
3. **Hạn mức mới áp dụng ngay**: Usage đã dùng vẫn tính, nhưng limit cao hơn → tự động có thêm room

**Ví dụ:** User đã dùng 8/10 scripts (Starter), nâng lên Pro (50 scripts) → còn lại 42 scripts trong tháng.

### Thay đổi cần làm

#### 1. Edge function `create-vnpay-payment` — Tính prorate
- Tính `daysRemaining = (periodEnd - now) / totalDays`
- `proratedAmount = planPrice × (daysRemaining / totalDays)`
- Lưu `prorated: true` và `original_amount` vào `payment_orders.metadata`

#### 2. Edge function `vnpay-callback` — Giữ period khi upgrade
- Khi upgrade (gói mới > gói cũ): **chỉ update `plan_type`**, KHÔNG reset `current_period_start/end`
- Lưu `previous_plan`, `upgraded_at` vào `metadata` để audit trail

#### 3. DB Migration — Thêm cột `previous_plan_type` vào `subscriptions`
- `previous_plan_type plan_type NULL` — track gói cũ trước khi upgrade

#### 4. UI: `UpgradePlanDialog` — Hiển thị prorated price
- Hiện giá prorate: "Thanh toán 150.000₫ cho 15 ngày còn lại (thay vì 499.000₫/tháng)"
- Hiện hạn mức sẽ được nâng: "Scripts: 8/10 → 8/50"

#### 5. `UsageQuotaWidget` — Badge "Vừa nâng cấp"
- Nếu `metadata.upgraded_at` trong 7 ngày qua → hiện badge nhỏ "Đã nâng cấp" với tooltip giải thích

## Files thay đổi (~5)

| File | Thay đổi |
|---|---|
| `supabase/functions/create-vnpay-payment/index.ts` | Tính prorated amount |
| `supabase/functions/vnpay-callback/index.ts` | Giữ period dates khi upgrade, chỉ đổi plan_type |
| DB Migration | Thêm `previous_plan_type` vào `subscriptions` |
| `src/components/UpgradePlanDialog.tsx` | Hiện giá prorate + hạn mức trước/sau |
| `src/components/dashboard/UsageQuotaWidget.tsx` | Badge "vừa nâng cấp" |

## Chi tiết kỹ thuật

**Prorated calculation:**
```text
daysInPeriod = (period_end - period_start) / 86400000
daysRemaining = (period_end - now) / 86400000  
proratedPrice = Math.ceil(newPlanPrice × daysRemaining / daysInPeriod)
```

**vnpay-callback upgrade logic:**
```text
IF order.plan_type rank > current subscription.plan_type rank:
  → UPDATE plan_type only, keep period dates
  → Save previous_plan_type, upgraded_at in metadata
ELSE (new subscription / renewal):
  → Reset period dates as current behavior
```

