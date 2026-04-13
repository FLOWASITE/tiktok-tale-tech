

# Fix: Nút duyệt Pipeline Monitor không hoạt động

## Nguyên nhân

`AgentMonitorPage.handleApprove` gửi `{ pipeline_id }` đến edge function `agent-approve`, nhưng edge function yêu cầu `{ approval_id }`. Vì `approval_id` là `undefined`, edge function trả lỗi "approval_id and action required".

Kanban hoạt động đúng vì nó truyền `approval.id` (ID của bản ghi approval), không phải pipeline ID.

## Giải pháp

Cần tìm `approval_id` tương ứng với pipeline trước khi gọi edge function.

### 1. `src/pages/AgentMonitorPage.tsx`
- Import và sử dụng `useAgentApprovals` hook để lấy danh sách approvals
- Trong `handleApprove`, tra cứu approval record có `pipeline_id` khớp và `status === 'pending'`
- Gửi đúng `approval_id` thay vì `pipeline_id` đến edge function
- Nếu không tìm thấy approval record, hiện toast lỗi rõ ràng

### 2. Fallback: Cập nhật edge function `agent-approve`
- Thêm logic: nếu không có `approval_id` nhưng có `pipeline_id`, tự động tìm approval record pending tương ứng
- Đảm bảo backward-compatible với cả Kanban và Monitor

### Files
| File | Thay đổi |
|------|----------|
| `src/pages/AgentMonitorPage.tsx` | Dùng `useAgentApprovals` để tra cứu approval_id đúng |
| `supabase/functions/agent-approve/index.ts` | Fallback: tìm approval từ pipeline_id nếu không có approval_id |

