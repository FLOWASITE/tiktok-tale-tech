

# Auto-navigate đến "Duyệt kế hoạch" sau khi tạo chiến dịch

## Vấn đề
Khi user click "Xem kế hoạch", hệ thống chỉ chuyển tab sang `campaign-plans` nhưng không tự mở plan cụ thể vừa tạo. User phải tìm và click vào plan thủ công.

## Giải pháp
Truyền `plan_id` và `goal_name` từ kết quả tạo chiến dịch → `CampaignDashboard` tự động mở đúng plan đó.

### 1. `src/components/agents/GoalWizard.tsx`
- Mở rộng `GenerationResult` thêm `plan_id?: string` và `goal_name?: string`
- Truyền `goalName` (tên campaign) vào result khi gọi `onComplete`

### 2. `src/pages/AgentDashboard.tsx`
- `handleGenerateStrategy`: trả về thêm `plan_id` và `goal_name` từ edge function response
- `handleWizardComplete`: lưu `plan_id` + `goal_name` vào state mới `autoSelectPlan`
- Truyền `autoSelectPlanId` và `autoSelectGoalName` props xuống `<CampaignDashboard />`

### 3. `src/components/agents/CampaignDashboard.tsx`
- Thêm props: `autoSelectPlanId?: string`, `autoSelectGoalName?: string`
- Thêm `useEffect`: khi `autoSelectPlanId` có giá trị và plan tồn tại trong `plans`, tự động `setSelectedPlan({ planId, goalName })` → mở thẳng màn hình review

## Flow
```text
GoalWizard (click "Xem kế hoạch")
  → onComplete({ plan_id, goal_name, approval_mode })
  → AgentDashboard.handleWizardComplete
    → setActiveTab('campaign-plans')
    → setAutoSelectPlan({ planId, goalName })
  → CampaignDashboard receives autoSelectPlanId
    → useEffect auto-selects the plan
    → CampaignPlanReview renders immediately
```

Tổng: sửa **3 file**, không thay đổi DB hay edge function.

