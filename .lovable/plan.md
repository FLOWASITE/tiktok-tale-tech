

# Thêm Dropdown chọn chiến dịch cho toàn bộ Tổng quan

## Ý tưởng
Thêm một dropdown Select ở đầu dashboard để người dùng chọn xem **"Tất cả"** hoặc **một chiến dịch cụ thể**. Khi chọn chiến dịch, tất cả stats cards, biểu đồ, và dữ liệu bên dưới đều lọc theo chiến dịch đó.

## Thay đổi

### `src/components/agents/AICampaignOverview.tsx`

1. **Thêm dropdown ở đầu component** — ngay trên hàng Stats Cards:
   - Option "Tất cả chiến dịch" (mặc định) — hiển thị tổng hợp như hiện tại
   - Mỗi campaign goal là một option, hiển thị tên + badge trạng thái

2. **Thêm state `selectedGoalId`** (`null` = tất cả, hoặc `string` = một campaign cụ thể)

3. **Filter dữ liệu theo selection** — tất cả `useMemo` hiện tại (stats, stageData, completionTrend, gradeData, channelData, recentCompletions) sẽ filter pipelines/plans theo `selectedGoalId` khi không phải "Tất cả"

4. **Gộp section "Đo lường chiến dịch" vào logic chung** — khi chọn một campaign cụ thể, `CampaignMetricCard` hiển thị bên dưới các biểu đồ. Khi chọn "Tất cả", ẩn card này hoặc hiển thị danh sách tóm tắt.

```text
┌─────────────────────────────────────────────────┐
│  [📊 Tổng quan Campaign AI]  [▼ Tất cả chiến dịch]  │
├─────────────────────────────────────────────────┤
│  [4 Stats Cards - filtered]                      │
│  [Charts - filtered]                             │
│  [Quality + Channel + Recent - filtered]         │
│  [CampaignMetricCard - khi chọn 1 campaign]      │
└─────────────────────────────────────────────────┘
```

## Chi tiết kỹ thuật

- Di chuyển `useState` cho `selectedGoalId` lên component chính `AICampaignOverview`
- Tạo `filteredPipelines` và `filteredPlans` bằng `useMemo` dựa trên `selectedGoalId`
- Thay thế `pipelines` / `plans` bằng `filteredPipelines` / `filteredPlans` trong tất cả các `useMemo` tính toán
- Xóa `CampaignDetailSection` riêng — logic gộp vào component chính
- Không cần migration DB, chỉ thay đổi frontend

### File thay đổi
- **Sửa**: `src/components/agents/AICampaignOverview.tsx`

