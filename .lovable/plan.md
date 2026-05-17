## Mục tiêu
Thêm khả năng chọn nhiều campaign cùng lúc trong **CampaignDashboard** (`/agents` → tab Campaign) để thao tác hàng loạt: **Tạm dừng**, **Chạy tiếp**, **Xóa**. Áp dụng cho cả 2 view "Danh sách" (theo plan) và "Chiến dịch" (theo goal).

## Thay đổi

### 1. `src/components/agents/CampaignDashboard.tsx`
- Thêm state `selectedIds: Set<string>` + `selectionMode: boolean`.
- Mỗi `Card` campaign/plan thêm `Checkbox` ở góc trái, hiện khi hover hoặc khi `selectionMode = true`. Click checkbox → toggle; click vào card vẫn mở chi tiết (stopPropagation trên checkbox).
- Header (cạnh "X kế hoạch · Y chiến dịch") thêm nút **"Chọn"** → bật selection mode + nút **"Chọn tất cả"** khi đang ở mode.
- Khi `selectedIds.size > 0` render `<CampaignBulkActionsBar />` (floating bottom-center, theo pattern `CharacterBulkBar`/`TopicBulkActions`):
  - Badge `Đã chọn {n}`
  - **Chạy tiếp** (`Play` icon) — chỉ enable khi có item đang paused
  - **Tạm dừng** (`Pause` icon) — chỉ enable khi có item đang chạy
  - **Xóa** (`Trash2`, có `AlertDialog` confirm)
  - Nút `X` để clear selection

### 2. `src/components/agents/CampaignBulkActionsBar.tsx` (mới)
Component thuần UI, nhận props:
```ts
{ selectedCount, hasRunning, hasPaused,
  onPause, onResume, onDelete, onClear, isProcessing }
```
Style giống `CharacterBulkBar` (dark pill, `bg-foreground text-background`, sticky bottom).

### 3. Logic bulk actions (trong `CampaignDashboard.tsx`)
Map từ `selectedIds` → danh sách `goal.id` (nếu view = campaign) hoặc qua `plan.goal_id` (nếu view = list).

- **Pause**: `supabase.from('agent_goals').update({ is_paused: true }).in('id', goalIds)` → invalidate `['agent-goals', orgId]`.
- **Resume**: same với `{ is_paused: false }`.
- **Delete**: loop `deleteGoal.mutateAsync(id)` (đã có sẵn unlink pipelines + `ON DELETE SET NULL` từ migration trước). Có `Promise.allSettled` để 1 lỗi không chặn cả batch; toast tổng kết `Đã xóa X/Y`.

Sau mỗi action: `setSelectedIds(new Set())` + `setSelectionMode(false)`.

### 4. Không thay đổi
- Schema DB (không cần migration mới).
- Hook `useAgentGoals` (đã đủ `updateGoal` + `deleteGoal`).
- View chi tiết plan, các alert card, stats.

## Câu hỏi xác nhận
- "Chạy" trong yêu cầu = **Resume campaign đang paused** (unset `is_paused`). Đúng ý bạn chứ? Nếu bạn muốn nghĩa khác (vd "force run pipeline tiếp theo ngay"), nói thêm để mình điều chỉnh.
