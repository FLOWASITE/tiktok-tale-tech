

# Thêm chọn lịch đăng khi nhấn nút Duyệt

## Mô tả
Khi nhấn nút "Duyệt" trên Pipeline Monitor, thay vì duyệt ngay, hiện dialog cho phép chọn ngày giờ đăng bài. Nếu pipeline đã có `scheduled_publish_at` từ Campaign Plan, hiển thị sẵn. User có thể giữ nguyên, thay đổi, hoặc chọn "Đăng ngay".

## Thay đổi

### 1. `src/components/agents/ApproveWithScheduleDialog.tsx` (mới)
- Dialog chứa DatePicker + TimePicker cho ngày giờ đăng
- Nếu pipeline có `scheduled_publish_at`, pre-fill vào form
- 2 nút: "Duyệt & Lên lịch" và "Duyệt & Đăng ngay"
- Props: `open`, `onClose`, `pipeline` (để lấy scheduled_publish_at, content_title), `onConfirm(scheduledAt: string | null)`

### 2. `src/pages/AgentMonitorPage.tsx`
- Thêm state `approveDialog` lưu pipeline đang chọn
- Khi click nút Duyệt → mở dialog thay vì duyệt trực tiếp
- `handleApprove` nhận thêm `scheduledAt` parameter
- Truyền `scheduled_publish_at` vào edge function

### 3. `src/hooks/useAgentApprovals.ts`
- Thêm `scheduled_publish_at` vào mutation params
- Gửi kèm trong body khi gọi `agent-approve`

### 4. `supabase/functions/agent-approve/index.ts`
- Nhận thêm `scheduled_publish_at` từ body
- Khi approve: cập nhật `agent_pipelines.scheduled_publish_at` với giá trị mới (nếu có)
- Nếu `scheduled_publish_at` trong tương lai → pipeline chờ cron trigger, không publish ngay

### Files
| File | Thay đổi |
|------|----------|
| `src/components/agents/ApproveWithScheduleDialog.tsx` | Tạo mới - dialog chọn lịch đăng |
| `src/pages/AgentMonitorPage.tsx` | Mở dialog thay vì duyệt trực tiếp |
| `src/hooks/useAgentApprovals.ts` | Thêm `scheduled_publish_at` vào mutation |
| `supabase/functions/agent-approve/index.ts` | Cập nhật scheduled_publish_at khi approve |

