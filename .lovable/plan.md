
## Mục tiêu

Hiện mỗi campaign trong widget "Kế hoạch đang chạy" chỉ là 1 row text + 1 thanh progress mỏng. Nhìn không đủ "đã mắt" để theo dõi nhanh. Đổi thành **Campaign Card trực quan** — 1 cái nhìn thấy ngay: tiến độ, mix kênh, deadline, hoạt động gần đây, item cần chú ý.

Toàn bộ data đã có sẵn trong `plan.plan_data` (array `CampaignContentPiece`) — không cần query mới, không đổi DB/edge function.

## Thiết kế card mới

```text
┌──────────────────────────────────────────────────────────────────┐
│ ● Nội dung tháng 5     [Đang chạy] [Tự động]      18 ngày còn lại │
│   18/05 → 01/06                                                   │
├──────────────────────────────────────────────────────────────────┤
│  ╭─────╮    🌐 Website     ████████░░  6/8                       │
│  │ 31% │    📘 Facebook    ████░░░░░░  2/5                       │
│  │5/16 │    📌 Pinterest   ██░░░░░░░░  1/3                       │
│  ╰─────╯    Ⓦ  WordPress  ░░░░░░░░░░  0/2                       │
│                                                                   │
│  [Nháp 3] [Đang tạo 2] [Chờ duyệt 4] [Đã duyệt 2] [Xong 5]      │
│                                                                   │
│  Hoạt động 14 ngày ▁▁▂▃▅▇▆▄▃▂▁▂▄▆                                │
│                                                                   │
│  ⚠ 4 item chờ duyệt · 1 item lỗi              Mở chi tiết →     │
└──────────────────────────────────────────────────────────────────┘
```

## 5 khối visual

1. **Header**
   - Status dot (màu theo `STATUS_CONFIG`) + tên goal + badge status + badge autonomy
   - Phải: chip **"N ngày còn lại"** tính từ `campaign_end_date` — đỏ khi <3 ngày, amber khi <7, mặc định muted
   - Dòng phụ: khoảng `start → end`

2. **Donut progress** (cột trái, 72px)
   - SVG circle stroke + `pct%` ở giữa + dòng nhỏ `done/total` dưới
   - Stroke color theo % (giống `CampaignProgressBar`): ≥100 green, ≥75 primary, ≥50 yellow, ≥25 orange, còn lại muted

3. **Channel breakdown** (cột phải)
   - Group `pieces` theo `target_channel` → mỗi kênh 1 row: `<ChannelIcon>` + tên + mini bar (10 ô filled theo %) + `done/total`
   - Tối đa 4 kênh; còn lại gộp dòng "+N kênh khác"

4. **Pill-strip theo trạng thái item** (full width, scroll-x trên mobile)
   - 5 pill: `Nháp` → `Đang tạo` → `Chờ duyệt` → `Đã duyệt` → `Xong`
   - Đếm pieces theo `status` (`draft`/`generating`/`pending_approval`/`approved`/`completed`)
   - Pill rỗng (count=0) làm mờ opacity-40
   - Click pill → mở plan detail (v1 chỉ navigate, filter status để v2)

5. **Sparkline hoạt động 14 ngày** (chỉ hiện khi `executing`/`approved`/`completed`)
   - Aggregate pieces theo `completed_at`/`updated_at` per day (client-side reduce, không query thêm)
   - SVG polyline ~120×24, stroke `hsl(var(--primary))`
   - Tooltip hover "DD/MM: N items"

6. **Footer alert + CTA**
   - Chip amber "N chờ duyệt" nếu có piece `pending_approval`
   - Chip red "N lỗi" nếu có piece `failed`
   - Text "Mở chi tiết →" bên phải (cả card vẫn click được)

## Responsive

- ≥ md (≥768px): donut + channel breakdown `grid-cols-[80px_1fr] gap-4`
- < md: stack dọc, donut center, channel breakdown full width
- Pill-strip + sparkline luôn full width
- Giảm `maxItems` mặc định **3 → 2** để mỗi card thoáng hơn (override được qua prop)

## Implementation

- Sửa duy nhất `src/components/agents/ActivePlansWidget.tsx`
- Tách 4 sub-component cùng file:
  - `<CampaignDonut value={pct} done={n} total={m} />`
  - `<ChannelBreakdownList pieces={pieces} />`
  - `<PieceStatusFunnel pieces={pieces} />`
  - `<ActivitySparkline pieces={pieces} days={14} />`
- Reuse `STATUS_CONFIG`, `ChannelIcon`, `Progress`, `Badge`, `Tooltip` shadcn
- Semantic tokens only (`bg-card`, `text-primary`, `border-border`, `text-muted-foreground`); không hard-code raw color
- Days-remaining helper: `Math.ceil((endDate - now) / 86400000)`

## Không thay đổi

- DB / edge function / `useCampaignPlans` / vị trí widget trong `AgentDashboard` (vẫn tab "Tổng quan")
- Tab Campaigns / `CampaignPlanReview` giữ nguyên
- Cơ chế `onOpenPlan` / `onViewAll` props không đổi → không cần sửa `AgentDashboard.tsx`

## Test nhanh sau build

1. Plan 16 pieces (5 done, 4 pending, 1 failed, 4 kênh) → donut 31%, 4 bar kênh đúng số, pill `_ _ 4 _ 5`, sparkline có nhịp, footer "4 chờ duyệt · 1 lỗi"
2. Plan mới (0/16) → donut 0%, sparkline phẳng, không footer alert
3. Plan còn 2 ngày → chip "2 ngày còn lại" đỏ
4. Mobile 375px → donut + breakdown stack, pill-strip scroll mượt
5. Empty state (0 plan) giữ nguyên
