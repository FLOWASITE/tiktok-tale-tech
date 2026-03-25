

# Phase 4: Campaign Pipeline Analytics Dashboard

## Tổng quan

Bổ sung vào tab Analytics của Campaign Detail các thống kê từ Agent Pipeline: pipeline performance (tỷ lệ hoàn thành, thời gian TB), approval rate, quality scores trung bình, và pillar/channel distribution.

## Kế hoạch

### 1. Hook mới: `useCampaignPipelineStats`

**File: `src/hooks/useCampaignPipelineStats.ts`** (MỚI)

- Query `agent_pipelines` WHERE `campaign_id = campaignId`
- Tính toán client-side:
  - **Pipeline stats**: total, completed, failed (is_flagged), in-progress, completion rate, avg completion time
  - **Approval rate**: pipelines qua stage `approval` không bị flagged / tổng pipelines đã tới approval
  - **Quality scores**: trung bình `overall_quality_score`, distribution theo grade (A-F)
  - **Stage distribution**: count pipelines ở mỗi stage (strategy→analyze)
  - **Channel distribution**: group by `content_type` hoặc parse từ `pipeline_state.metadata.target_channels`
- Cũng query `campaign_content_plans` WHERE `goal_id` IN campaign's goals để lấy pillar distribution từ `plan_data[].content_role`

### 2. Component mới: `PipelineAnalyticsSection`

**File: `src/components/campaign/analytics/PipelineAnalyticsSection.tsx`** (MỚI)

Gồm 3 phần:

**a) Stats Cards Row** (4 cards):
- Tổng pipelines / Hoàn thành
- Tỷ lệ Approval (%)
- Quality Score TB (với badge A-F)
- Thời gian hoàn thành TB

**b) Stage Distribution Bar Chart**:
- Horizontal bar chart hiển thị số pipelines ở mỗi stage (6 stages, color-coded theo `PIPELINE_STAGES`)
- Dùng Recharts BarChart (đã có trong project)

**c) Pillar/Content Role Distribution**:
- Donut chart hoặc horizontal bars hiển thị phân bổ `content_role` (educate, engage, convert, inspire...)
- Hiển thị tỷ lệ % so với campaign plan

### 3. Tích hợp vào CampaignAnalyticsDashboard

**File: `src/components/campaign/analytics/CampaignAnalyticsDashboard.tsx`** (SỬA)

- Import `PipelineAnalyticsSection`
- Thêm section "Pipeline Performance" phía trên KPI charts
- Truyền `campaign.id` để hook fetch data

### 4. Cập nhật CampaignDetail page

**File: `src/pages/CampaignDetail.tsx`** (KHÔNG CẦN SỬA — campaign object đã được truyền)

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useCampaignPipelineStats.ts` | MỚI — fetch pipelines + plans, tính stats |
| `src/components/campaign/analytics/PipelineAnalyticsSection.tsx` | MỚI — stats cards + stage chart + pillar chart |
| `src/components/campaign/analytics/CampaignAnalyticsDashboard.tsx` | SỬA — thêm PipelineAnalyticsSection |

Không cần migration. Không cần edge function. Dữ liệu từ `agent_pipelines` và `campaign_content_plans` đã có sẵn.

