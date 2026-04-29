## Mục tiêu
Bổ sung **tab "Gói đăng ký"** vào trang `/reports` để workspace owner theo dõi mức dùng vs hạn mức của gói hiện tại, biết quota nào sắp cạn, và xem các addon đang active. Không cần export.

## UX trong tab mới

```text
┌──────────────────────────────────────────────────────────┐
│ Gói hiện tại: PRO    Chu kỳ: 01/04 → 30/04 (còn 12 ngày)│
│ [Xem chi tiết gói] [Nâng cấp]                           │
├──────────────────────────────────────────────────────────┤
│ 4 cards quota chính:                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │Scripts   │ │Carousel  │ │Đa kênh   │ │Ảnh AI    │    │
│ │ 45/100   │ │ 12/50    │ │ 230/500  │ │ 380/400  │    │
│ │ ▓▓▓░░ 45%│ │ ▓▓░░░ 24%│ │ ▓▓▓▓░ 46%│ │ ▓▓▓▓▓ 95%│    │
│ │          │ │          │ │          │ │ ⚠ sắp hết│    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├──────────────────────────────────────────────────────────┤
│ Cảnh báo (chỉ hiển thị nếu có item ≥80%):              │
│  • Ảnh AI: 380/400 (95%) – dự kiến cạn 25/04            │
│  • Scripts: sắp hết trong 5 ngày                        │
├──────────────────────────────────────────────────────────┤
│ Tiêu thụ theo ngày (line chart, từ usage_logs)         │
│ X = ngày trong chu kỳ, Y = số lượt; series = 4 quota   │
├──────────────────────────────────────────────────────────┤
│ Top kênh tiêu thụ ảnh (bar): facebook 120, IG 80...    │
├──────────────────────────────────────────────────────────┤
│ Addon đã mua (active):                                  │
│  • Pro x1 — mua 02/04, hết 02/05 — +50 scripts...      │
│  • (nếu rỗng) "Chưa mua addon nào" + nút Mua thêm      │
└──────────────────────────────────────────────────────────┘
```

Mỗi card quota hiển thị: used / total, % bar, badge trạng thái (`OK`/`Sắp hết` ≥80%/`Đã hết` =100%/`Không giới hạn` khi limit=-1). Card chuyển màu warning amber khi ≥80%, destructive khi =100%. Addon hết hạn trong 7 ngày → badge cảnh báo.

## Technical changes

### 1. Hook mới `src/hooks/reports/useSubscriptionReport.ts`
- Tái sử dụng `useSubscription()` để lấy `subscription`, `currentPlanLimits`, `usage`, `activeAddons`, `currentPeriod`.
- Query thêm `usage_logs` trong khoảng `currentPeriod.start → end`, lọc theo `organization_id` (qua join tới subscription user) — gom theo `date_trunc('day', created_at)` + `usage_type` để build daily series.
- Tính `projectedExhaustionDate` cho mỗi quota: `daysToExhaust = (limit - used) / avgPerDay`; nếu rơi trước `current_period_end` → cảnh báo.
- Trả về `{ planMeta, quotas: [{key,label,used,limit,pct,status,projectedExhaustionDate}], dailySeries, imageBreakdown, addons }`.

### 2. Component mới `src/components/reports/SubscriptionReportTab.tsx`
- Render: `PlanHeaderCard`, `QuotaCardsGrid` (4 card dùng `Progress` + `Badge`), `QuotaWarningsList`, `DailyUsageChart` (recharts `LineChart`, reuse pattern từ Engagement tab), `ImageChannelBreakdown` (recharts `BarChart`), `ActiveAddonsList`.
- Empty states: chưa có subscription → CTA "Chọn gói"; chưa có usage → placeholder.
- CTA buttons: "Nâng cấp" mở `UpgradePlanDialog`, "Mua thêm lượt" mở `AddonPurchaseDialog` (đã có sẵn).

### 3. Cập nhật `src/pages/Reports.tsx`
- Thêm `<TabsTrigger value="subscription">Gói đăng ký</TabsTrigger>` (vị trí: sau "Insights", icon `CreditCard` từ lucide).
- Thêm `<TabsContent value="subscription">` render `<SubscriptionReportTab />`.
- Tab này KHÔNG dùng `ReportFiltersBar` global (vì period đã cố định theo subscription cycle), tự render header riêng.

### 4. Không cần migration
Tất cả data đã có sẵn trong `subscriptions`, `plan_limits`, `addon_purchases`, `usage_logs`. RLS đã cho org member đọc.

## Files
- **Tạo mới**: 
  - `src/hooks/reports/useSubscriptionReport.ts`
  - `src/components/reports/SubscriptionReportTab.tsx`
- **Sửa**: 
  - `src/pages/Reports.tsx` (thêm tab)

Không edge function, không export PDF/CSV (theo yêu cầu).
