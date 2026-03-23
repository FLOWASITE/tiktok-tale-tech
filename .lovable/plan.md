

# Thêm liên kết Chiến dịch vào Goal Wizard

## Mục tiêu
Cho phép user chọn một Chiến dịch (Campaign) khi tạo AI Campaign trong Goal Wizard. Content được AI tạo ra sẽ tự động gán vào chiến dịch đó.

## Thay đổi

### 1. Database Migration
- Thêm cột `campaign_id` (UUID, nullable, FK → campaigns) vào bảng `agent_goals`
- Thêm cột `campaign_id` vào bảng `agent_pipelines` (kế thừa từ goal)

### 2. Sửa `GoalWizard.tsx` — Step 3 (Thương hiệu)
- Thêm `CampaignSelector` component (đã có sẵn) vào Step 3, ngay dưới Brand Template selector
- Thêm state `campaignId` và truyền vào `onSubmit`
- Hiển thị campaign đã chọn ở Step 4 (Xác nhận)

### 3. Sửa types & hooks
- **`src/types/agent.ts`**: Thêm `campaign_id?: string | null` vào `AgentGoal` interface
- **`src/hooks/useAgentGoals.ts`**: Thêm `campaign_id` vào `createGoal` mutationFn

### Files

| File | Loại |
|------|------|
| Migration SQL | Tạo — thêm cột campaign_id |
| `src/components/agents/GoalWizard.tsx` | Sửa — thêm CampaignSelector |
| `src/types/agent.ts` | Sửa — thêm campaign_id |
| `src/hooks/useAgentGoals.ts` | Sửa — thêm campaign_id |

