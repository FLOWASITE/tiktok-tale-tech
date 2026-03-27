

# Làm lại Tổng quan Campaign AI — Dashboard Marketing toàn diện

## Vấn đề hiện tại
Dashboard hiện chỉ tập trung vào **pipeline operations** (số lượng pipeline, stage distribution, completion trend). Thiếu các tiêu chí marketing quan trọng mà một Campaign Manager cần theo dõi:
- Không thấy **tiến độ KPI** (reach, engagement, conversion)
- Không thấy **ngân sách** đã chi / còn lại
- Không thấy **timeline** chiến dịch (bao nhiêu ngày còn lại, milestone)
- Không thấy **phân bổ nội dung theo pillar** (Hero/Hub/Help)
- Không thấy **tỷ lệ duyệt** (approval rate) và **thời gian trung bình hoàn thành**

## Thiết kế mới

Khi chọn **"Tất cả"** → hiển thị tổng hợp operations như hiện tại.
Khi chọn **một chiến dịch cụ thể** → hiển thị dashboard marketing đầy đủ cho chiến dịch đó.

```text
┌─────────────────────────────────────────────────────────┐
│  [📊 Tổng quan]  [▼ Chọn chiến dịch]                    │
├─────────────────────────────────────────────────────────┤
│  KHI CHỌN "TẤT CẢ": (giữ nguyên layout hiện tại)       │
│  [4 Stats] → [Charts] → [Quality+Channel+Recent]        │
├─────────────────────────────────────────────────────────┤
│  KHI CHỌN 1 CHIẾN DỊCH:                                 │
│                                                         │
│  ROW 1: Campaign Header                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Tên CD [Active] [Awareness] 📘📸               │    │
│  │ ████████░░░░░ 62% · 12 ngày còn lại             │    │
│  │ Budget: 8.5M / 15M (57%)                        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ROW 2: 6 Stats Cards                                   │
│  [Pipeline] [Hoàn thành] [Đang chạy] [Flag]            │
│  [Chất lượng TB] [Tỷ lệ duyệt]                         │
│                                                         │
│  ROW 3: Charts (2 cột)                                  │
│  ┌─ Pipeline stages ─┐ ┌─ Hoàn thành 14 ngày ─┐       │
│  │  BarChart          │ │  AreaChart            │       │
│  └────────────────────┘ └───────────────────────┘       │
│                                                         │
│  ROW 4: Chi tiết (3 cột)                                │
│  ┌─ Chất lượng ─┐ ┌─ Kênh ─┐ ┌─ Content Pillar ─┐     │
│  │  Donut        │ │ Bars   │ │ Hero/Hub/Help %  │     │
│  └───────────────┘ └────────┘ └──────────────────┘     │
│                                                         │
│  ROW 5: Hoạt động gần đây                               │
└─────────────────────────────────────────────────────────┘
```

## Thay đổi chi tiết

### 1. Sửa `src/components/agents/AICampaignOverview.tsx`

**A. Fetch thêm dữ liệu Campaign khi chọn cụ thể:**
- Import `useCampaigns` hook để lấy thông tin campaign (budget, KPI goals, dates, type, status)
- Map `selectedGoalId` → `campaign_id` từ goal → tìm campaign tương ứng

**B. Thêm Campaign Header Card (chỉ hiện khi chọn 1 chiến dịch):**
- Tên chiến dịch + Status badge + Type badge + Channel icons
- Progress bar tổng (dựa trên pipeline completion)
- Timeline: ngày bắt đầu → kết thúc, số ngày còn lại
- Budget: đã chi / tổng, phần trăm

**C. Mở rộng Stats Cards từ 4 → 6 (khi chọn 1 chiến dịch):**
- Giữ: Tổng pipeline, Hoàn thành, Đang chạy, Chất lượng TB
- Thêm: **Bị flag** (số pipeline lỗi) + **Tỷ lệ duyệt** (% qua approval không flag)

**D. Thêm Content Pillar Distribution (thay Recent khi chọn 1 chiến dịch):**
- Lấy `content_role` từ `plan_data` (Hero/Hub/Help/Hygiene)
- Hiển thị dạng horizontal bars hoặc stacked bar

**E. Giữ nguyên** charts Pipeline Stages, Completion Trend, Quality Donut, Channel Distribution — chỉ filter theo campaign đã chọn (đã có logic `filteredPipelines`/`filteredPlans`)

### 2. Sửa `src/components/agents/CampaignMetricCard.tsx`
- Không cần nữa khi chọn 1 chiến dịch (logic đã gộp vào header card) → giữ lại component cho mục đích khác nhưng bỏ render trong overview

## Chi tiết kỹ thuật

- **Dữ liệu Campaign**: Dùng `useCampaigns()` hook đã có sẵn, tìm campaign qua `goal.campaign_id`
- **Approval rate**: Tính từ pipelines đã qua stage `publish`/`analyze` mà không bị flag chia tổng pipelines qua approval
- **Content Pillar**: Parse từ `plan_data[].content_role` trong `CampaignContentPlan`
- **Budget**: Lấy trực tiếp từ `campaign.budget_total` / `campaign.budget_spent`
- **Timeline**: Dùng `differenceInDays` từ date-fns
- Không cần migration DB

### File thay đổi
- **Sửa**: `src/components/agents/AICampaignOverview.tsx`

