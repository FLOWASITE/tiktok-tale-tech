## Vấn đề
Khi xoá một Campaign (`agent_goals`), hook `useAgentGoals.deleteGoal`:
1. Set `agent_pipelines.goal_id = NULL` cho các pipeline liên quan
2. `DELETE FROM agent_goals` → trigger cascade xoá `campaign_content_plans` (vì plan có FK `goal_id` ON DELETE CASCADE)
3. ❌ Postgres báo lỗi:
   ```
   update or delete on table "campaign_content_plans" violates foreign key
   constraint "agent_pipelines_campaign_plan_id_fkey" on table "agent_pipelines"
   ```

Nguyên nhân: FK `agent_pipelines.campaign_plan_id → campaign_content_plans.id` đang là **NO ACTION**. Pipeline vẫn trỏ tới plan cũ → không xoá được plan → không xoá được goal.

## Giải pháp
Đổi FK `agent_pipelines.campaign_plan_id` thành `ON DELETE SET NULL` (giống cách `goal_id` và `campaign_id` đang xử lý). Pipeline cũ vẫn được giữ làm lịch sử, chỉ mất liên kết tới plan đã xoá.

### Migration
```sql
ALTER TABLE public.agent_pipelines
  DROP CONSTRAINT IF EXISTS agent_pipelines_campaign_plan_id_fkey;

ALTER TABLE public.agent_pipelines
  ADD CONSTRAINT agent_pipelines_campaign_plan_id_fkey
  FOREIGN KEY (campaign_plan_id)
  REFERENCES public.campaign_content_plans(id)
  ON DELETE SET NULL;
```

### Code (`src/hooks/useAgentGoals.ts`)
Mở rộng `deleteGoal` để null cả `campaign_plan_id` trước khi xoá (defense-in-depth, phòng plan khác cùng goal):

```ts
await supabase.from('agent_pipelines')
  .update({ goal_id: null, campaign_plan_id: null })
  .eq('goal_id', id);
```

## Phạm vi không đụng
- Không sửa schema `campaign_content_plans`
- Không sửa logic display ở `CampaignDashboard`
- Không thay đổi RLS
