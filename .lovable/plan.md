## Mục tiêu
Thay form xác nhận xóa campaign từ `window.confirm()` mặc định của trình duyệt (đang hiển thị xấu, lộ domain `id-preview--...lovable.app`) bằng `AlertDialog` của shadcn — đồng bộ với design system Soft Luxury.

## Thay đổi

### `src/pages/AgentDashboard.tsx`
- Thêm state `deletingGoal: AgentGoal | null`.
- `handleDeleteGoal(goal)` → chỉ `setDeletingGoal(goal)` (không gọi `confirm()` nữa).
- Render `<AlertDialog>` ở cuối page:
  - **Title**: "Xóa campaign?"
  - **Description**: `Bạn có chắc muốn xóa campaign "{name}"? Các pipeline đang chạy sẽ không bị ảnh hưởng. Hành động này không thể hoàn tác.`
  - **Cancel**: "Huỷ"
  - **Action** (destructive style: `bg-destructive text-destructive-foreground hover:bg-destructive/90`): "Xóa campaign" → gọi `deleteGoal.mutate(deletingGoal.id)` rồi `setDeletingGoal(null)`.
  - Disable nút khi `deleteGoal.isPending`, hiện `Loader2` spin.
- Import `AlertDialog*` từ `@/components/ui/alert-dialog` và icon `Trash2`/`Loader2`.

### Không đổi
- Logic `useAgentGoals.deleteGoal` mutation.
- Các nơi khác dùng `confirm()` (vd `CampaignPlanReview.tsx`) — ngoài scope yêu cầu.

## Ghi chú UX
- Icon cảnh báo `AlertTriangle` màu `text-destructive` ở header (giống pattern `UnlinkIndustryDialog`).
- Dialog `max-w-md`, dùng semantic tokens, không hardcode màu.
