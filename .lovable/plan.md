## Hoàn thiện Trang Quản lý Gói (`/admin/plans`)

Trang `AdminPlans.tsx` đã có 6 tab nhưng còn thiếu polish & chưa khớp 100% với Pricing v2 (3 đơn vị Nội dung/Ảnh/Video). Plan này tập trung **hoàn thiện phần admin** (không động vào user-facing đã làm xong).

### Mục tiêu
1. **PlanLimitsManager**: Sắp xếp lại UI để Pricing v2 (3 units) làm trọng tâm, ẩn legacy fields vào "Nâng cao".
2. **RevenueStats**: Bổ sung KPI quota usage (sum units consumed/tier, average % quota fill) — cho admin biết tier nào "hết quota nhanh".
3. **SubscriptionDetailDrawer**: Thêm panel **Usage hiện tại** (3 units progress) + diff so với plan limit.
4. **AdminPlans page**: Thêm header KPI strip (tổng MRR + workspace + quota burn rate) hiển thị xuyên suốt mọi tab.

---

### 1. PlanLimitsManager — Tách "Hạn mức v2" vs "Legacy"

Hiện tại 7 limit fields trộn lẫn trong 1 group "Hạn mức". Sửa thành 2 nhóm:

```text
┌─ Pricing v2 (đơn vị output) ────────────────┐
│  Nội dung units │ Ảnh units │ Video units   │
└──────────────────────────────────────────────┘
┌─ Legacy / Phụ trợ (collapse mặc định) ──────┐
│  Brands │ Scripts │ Carousels │ Đa kênh │   │
│  Ảnh raw │ AI Edits                          │
└──────────────────────────────────────────────┘
```

- Group v2 hiển thị inline với badge **v2** primary color
- Group legacy có toggle `<Collapsible>` "Hiển thị fields phụ trợ" (mặc định ẩn)
- Nút **"Đề xuất giá"** đã có, giữ nguyên logic (tính từ 3 units × cost × markup 2.5x)

### 2. RevenueStats — Thêm Quota KPI

Thêm 2 card KPI mới + 1 chart mới sau pie chart:

- **Card "Quota tiêu thụ TB"**: Trung bình % units đã dùng của tất cả workspaces active (gọi `get_org_usage_units_batch` cho top 100 active subs, average ratio)
- **Card "Workspace cần upgrade"**: Số workspace có ≥1 unit ≥80% (có thể click → filter tab Subscriptions)
- **Bar chart "Tiêu thụ units theo tier"**: 4 tier × 3 units (stacked bar) — show absolute units consumed cycle hiện tại

### 3. SubscriptionDetailDrawer — Panel Usage v2

Thêm section **"Usage chu kỳ hiện tại"** sau "Chu kỳ":

```text
Nội dung   ███████░░░  142/200  (71%)
Ảnh AI     ██████████  198/200  ⚠ Sắp hết
Video      ░░░░░░░░░░  0/10     (0%)
```

- Query `get_org_usage_units_batch(organization_id)` + plan limits
- Progress bar màu tự động: <50% xanh, 50-80% vàng, >80% đỏ
- Tooltip breakdown: Nội dung = scripts + carousels + multichannel + video script

### 4. AdminPlans — Header KPI strip

Thêm strip 4 KPI cards trên cùng (trên Tabs):
- Tổng workspace active
- MRR ước tính (VNĐ)
- ARPU
- Burn rate quota TB (% units đã dùng / chu kỳ)

Hiện tại các tabs tự tính riêng → tách shared hook `useAdminPlanStats()` để tránh duplicate query.

---

### Files cần sửa

- **Updated** `src/components/admin/plans/PlanLimitsManager.tsx` — tách v2/legacy groups + Collapsible
- **Updated** `src/components/admin/plans/RevenueStats.tsx` — thêm 2 KPI + bar chart units/tier
- **Updated** `src/components/admin/plans/SubscriptionDetailDrawer.tsx` — thêm panel Usage v2
- **Updated** `src/pages/AdminPlans.tsx` — thêm header KPI strip
- **Created** `src/hooks/admin/useAdminPlanStats.ts` — shared stats hook

### Kỹ thuật

- **Query batch**: dùng RPC `get_org_usage_units_batch(org_id)` đã có sẵn → không cần migration
- **Performance**: limit query usage chỉ top 100 active subs để tránh N+1 (hoặc dùng SQL aggregate)
- **Re-use**: `formatVND`, `formatLimit` đã có trong PlanLimitsManager → export ra `lib/plan-format.ts`

### Không thuộc phạm vi
- Không sửa user-facing (`Pricing.tsx`, `UsageQuotaWidget`, `UpgradePlanDialog`) — đã làm xong v2
- Không sửa schema DB / migrations — dùng RPC sẵn có
- Không animate/redesign Subscription table (đã ổn)
