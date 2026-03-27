

# Dashboard Tổng quan Chiến dịch AI

## Mục tiêu
Xây dựng tab **"Tổng quan"** mới trong trang AI Agents (`/agents`) hiển thị cái nhìn tổng thể về hiệu suất chiến dịch AI, thay vì chỉ có stats cards đơn giản hiện tại.

## Thiết kế UI

```text
┌─────────────────────────────────────────────────────────────┐
│  [Tổng quan]  [Pipeline]  [Duyệt]  [Campaigns]  [Kế hoạch] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Campaigns │ │ Pipeline │ │ Hoàn thành│ │ Tỷ lệ   │       │
│  │    5      │ │   12     │ │   48     │ │  85%     │       │
│  │ active    │ │ running  │ │ tuần này │ │ quality  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌──── Pipeline theo giai đoạn ────┐ ┌── Nội dung/Kênh ──┐ │
│  │  BarChart (6 stages)            │ │  Channel breakdown │ │
│  │  strategy | create | quality..  │ │  facebook: 12      │ │
│  └─────────────────────────────────┘ │  tiktok: 8         │ │
│                                      │  instagram: 6      │ │
│  ┌── Chất lượng trung bình ────────┐ └────────────────────┘ │
│  │  Donut: Quality Grade A/B/C/D   │                        │
│  │  Avg Score: 82 (Grade B)        │ ┌── Hoạt động gần ──┐ │
│  └──────────────────────────────────┘ │  Timeline pipeline │ │
│                                       │  completions       │ │
│  ┌── Campaigns đang chạy ─────────┐  └────────────────────┘ │
│  │  Campaign cards with progress   │                        │
│  └─────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## File thay đổi

### 1. Tạo `src/components/agents/AICampaignOverview.tsx` (mới)
Component dashboard tổng quan gồm:
- **Stats Row** (4 cards): Active campaigns, Running pipelines, Completed this week, Avg Quality Score (grade badge)
- **Pipeline Stage Distribution** (BarChart - Recharts): Hiển thị số lượng pipeline ở mỗi giai đoạn (6 stages)
- **Channel Distribution**: Thống kê nội dung theo kênh target từ campaign plans
- **Quality Grade Distribution**: Donut chart phân bổ điểm chất lượng A-F
- **Campaign Progress Cards**: Danh sách campaigns đang active kèm progress bar, timeline, completion %
- **Recent Completions Timeline**: 10 pipeline hoàn thành gần nhất với thời gian

Dữ liệu lấy từ hooks sẵn có: `useAgentGoals`, `useAgentPipelines`, `useAgentApprovals`, `useCampaignPlans`

### 2. Sửa `src/pages/AgentDashboard.tsx`
- Thêm tab "Tổng quan" (icon `BarChart3`) đặt đầu tiên
- Default tab thành `overview` thay vì `pipeline`
- Import và render `AICampaignOverview` trong TabsContent

## Thiết kế kỹ thuật
- Tất cả dữ liệu đã có sẵn từ hooks hiện tại, không cần migration DB
- Sử dụng Recharts (đã có trong project) cho biểu đồ
- Tuân thủ Soft Luxury design: `backdrop-blur`, `rounded-2xl`, monochromatic tones
- Quality Grade sử dụng `getGradeFromScore` từ `@/types/creativeScore`
- Responsive: 2 cols trên desktop, 1 col trên mobile

