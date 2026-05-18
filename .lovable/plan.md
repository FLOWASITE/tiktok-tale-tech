## Mục tiêu

Hiện tại để xem progress 1 kế hoạch (ví dụ "Nội dung tháng 5" — 0/16, 5 kênh), user phải: **Campaigns → Kế hoạch → click card → CampaignPlanReview**. Quá sâu.

→ Đưa "snapshot" của các kế hoạch đang chạy lên **Tab Tổng quan** dạng widget, vẫn click được để mở chi tiết.

## Phạm vi

Chỉ chỉnh frontend. Không đổi schema, không đổi edge function. Reuse hook `useCampaignPlans` + cơ chế `autoSelectPlan` đã có sẵn trong `AgentDashboard.tsx`.

## Thiết kế widget

**Component mới:** `src/components/agents/ActivePlansWidget.tsx`

Card "Kế hoạch đang chạy" hiển thị tối đa **3 plan** ưu tiên status `executing` → `planned` → `planning`. Mỗi row:

```text
┌────────────────────────────────────────────────────────────┐
│ Kế hoạch đang chạy                          Xem tất cả →  │
├────────────────────────────────────────────────────────────┤
│ Nội dung tháng 5            [Đang chạy]         5/16  31% │
│ 🌐 📘 📌 Ⓦ 🅑  · 18/05 → 01/06 · Tự động                │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░                        │
├────────────────────────────────────────────────────────────┤
│ Plan Q2 Beauty Clinic       [Chờ duyệt]        0/24   0% │
│ 📘 📸 🎵  · 01/04 → 30/06                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                        │
└────────────────────────────────────────────────────────────┘
```

Mỗi row:
- Tên plan + status badge (reuse `STATUS_CONFIG` từ `CampaignDashboard.tsx`)
- Channel icons (reuse `ChannelIcon` SVG component, không emoji)
- Khoảng ngày + autonomy badge
- Progress bar + `completed/total` + `%` (format `toLocaleString('vi-VN')`)
- Click row → `setActiveTab('campaigns')` + `setCampaignSubTab('plans')` + `setAutoSelectPlan({planId, goalName})` để CampaignPlanReview tự mở

Empty state khi chưa có plan: dòng nhỏ "Chưa có kế hoạch nào đang chạy" + link "Tạo campaign mới" → `setActiveTab('campaigns')`.

Nút "Xem tất cả →" ở header → `setActiveTab('campaigns')` + `setCampaignSubTab('plans')`.

## Tích hợp vào AgentDashboard

`src/pages/AgentDashboard.tsx` lines 271-282 (`TabsContent value="overview"`):

```tsx
<TabsContent value="overview" className="mt-4 space-y-6">
  <AICampaignOverview ... />
  <ActivePlansWidget
    plans={plans}
    goals={goals}
    onOpenPlan={(planId, goalName) => {
      setAutoSelectPlan({ planId, goalName });
      setCampaignSubTab('plans');
      setActiveTab('campaigns');
    }}
    onViewAll={() => {
      setCampaignSubTab('plans');
      setActiveTab('campaigns');
    }}
  />
  <OrchestratorHealthPanel />
</TabsContent>
```

`plans`, `goals`, `setAutoSelectPlan`, `setCampaignSubTab`, `setActiveTab` đều đã tồn tại trong AgentDashboard — không cần thêm hook mới.

## Styling

Theo Core memory "Soft Luxury": semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `text-primary`), progress bar dùng `Progress` từ `ui/progress.tsx`, badge dùng STATUS_CONFIG có sẵn. Không màu raw.

## Không thay đổi

- Toggle "Danh sách / Kế hoạch" trong tab Campaigns giữ nguyên (đường vào sâu vẫn dùng được).
- `CampaignDashboard`, `CampaignPlanReview` không đổi.
- Không đổi DB / edge function.

## Test nhanh sau khi build

1. Vào `/agents` (mặc định Tổng quan) → thấy widget với plan "Nội dung tháng 5" + progress.
2. Click row → tự nhảy sang Campaigns → Kế hoạch → mở đúng plan detail.
3. Click "Xem tất cả" → vào Campaigns → Kế hoạch list.
4. Khi 0 plan → empty state hiển thị.
