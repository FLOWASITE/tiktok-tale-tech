

# Hoàn thiện Tổng quan Campaign AI — Đo lường từng chiến dịch & Trực quan hơn

## Mục tiêu
1. **Đo lường từng chiến dịch** — Thêm section "Campaign Cards" chi tiết với metrics riêng cho mỗi campaign (pipeline progress, quality score, completion rate, flagged count, channel breakdown)
2. **Trực quan hơn** — Bổ sung biểu đồ timeline, cải thiện visual density

## Thay đổi

### 1. Sửa `src/components/agents/AICampaignOverview.tsx`

**A. Thay thế section "Tiến độ Campaigns" đơn giản → Campaign Detail Cards**

Mỗi campaign (goal) sẽ có card riêng hiển thị:
- **Header**: Tên campaign + status badge (đang chạy/tạm dừng) + channel icons
- **Metrics row** (4 mini stats): Tổng pipeline | Hoàn thành | Đang chạy | Bị flag
- **Progress bar** với label "X/Y bài" và phần trăm
- **Quality score** trung bình + Grade badge (tính từ pipelines thuộc campaign đó)
- **Mini stage distribution**: 6 dots/bar nhỏ cho thấy pipeline đang ở stage nào
- Click vào card → chuyển sang tab Pipeline với filter theo campaign đó

**B. Thêm biểu đồ "Xu hướng hoàn thành" (AreaChart)**

- Hiển thị số pipeline hoàn thành theo ngày trong 14 ngày gần nhất
- Dùng `AreaChart` từ Recharts, gradient fill
- Đặt cạnh biểu đồ Pipeline Stage Distribution (thay thế vị trí Channel Distribution lên dưới)

**C. Cải thiện layout tổng thể**

```text
┌─────────────────────────────────────────────────────────┐
│  [4 Stats Cards - giữ nguyên]                           │
├─────────────────────────────────────────────────────────┤
│  ┌─ Pipeline theo giai đoạn ─┐  ┌─ Hoàn thành 14 ngày ┐│
│  │  BarChart                 │  │  AreaChart            ││
│  └───────────────────────────┘  └───────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  ┌─ Phân bổ chất lượng ─┐ ┌─ Kênh ─┐ ┌─ Gần đây ─┐    │
│  │  Donut               │ │ Bars   │ │ Timeline  │    │
│  └──────────────────────┘ └────────┘ └───────────┘    │
├─────────────────────────────────────────────────────────┤
│  📊 Đo lường từng chiến dịch                            │
│  ┌─ Campaign A ──────────────────────────────────────┐  │
│  │ Name [Active] 📘📸   Pipeline: 8 | Done: 5 |     │  │
│  │ Flag: 1 | Quality: 82 (B)                         │  │
│  │ ████████████░░░░ 62%   [stage dots: ●●●○○○]       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌─ Campaign B ──────────────────────────────────────┐  │
│  │ ...                                               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2. Sửa `src/pages/AgentDashboard.tsx` (nhỏ)

- Truyền thêm callback `onNavigateToPipeline(goalId)` vào `AICampaignOverview` để khi click campaign card → set `filterGoalId` + chuyển tab `pipeline`

## Chi tiết kỹ thuật

- **Dữ liệu**: Tất cả đã có sẵn trong props (`goals`, `pipelines`, `plans`). Tính toán metrics cho từng campaign bằng `useMemo` filter theo `goal_id`
- **AreaChart**: Group pipelines có `completed_at` theo ngày (14 ngày), dùng `eachDayOfInterval` từ date-fns
- **Campaign cards**: Dùng component con `CampaignMetricCard` để tránh code dài
- **Không cần migration DB** — chỉ tính toán frontend từ dữ liệu hiện có

