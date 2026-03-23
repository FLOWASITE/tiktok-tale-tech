

# Pipeline Detail Dialog — Click card Kanban hiện chi tiết

## Mục tiêu
Click vào pipeline card trên Kanban → mở Dialog hiển thị full thông tin pipeline: stage timeline, execution logs, scores, và actions (change stage, flag, delete).

## Thay đổi

### 1. Component `PipelineDetailDialog.tsx` (tạo mới)
Dialog hiển thị 3 phần:

**Header:** Title, topic, priority badge, autonomy level, timestamps (created, ETA, completed)

**Pipeline Stage Timeline:** Hiển thị 9 stages dạng horizontal stepper — stage hiện tại highlight, stages đã qua có checkmark, stages chưa đến mờ đi. Dữ liệu từ `pipeline_state`.

**Tabs:**
- **Logs:** Bảng execution logs từ `agent_pipeline_logs` — agent_name, action, duration, tokens, cost, error. Sorted mới nhất trước.
- **Scores:** Hiển thị SEO/GEO/Compliance scores từ `pipeline_state` (nếu có). Cards với progress bars.
- **Actions:** Buttons: Change Stage (dropdown), Toggle Flag, Delete Pipeline.

### 2. Hook `useAgentPipelineLogs.ts` (tạo mới)
- Fetch `agent_pipeline_logs` theo `pipeline_id`
- Query đơn giản, ordered by `created_at DESC`

### 3. Sửa `PipelineKanban.tsx`
- Thêm `onCardClick` callback cho `PipelineCard`
- Click card → gọi `onCardClick(pipeline)` (khác với drag)
- `PipelineKanban` nhận thêm prop `onPipelineClick`
- Trong `PipelineKanban`, thêm state `selectedPipeline` + render `PipelineDetailDialog`

### 4. Sửa `AgentDashboard` (nếu cần)
- Truyền `onStageChange` và `onDelete` callbacks xuống

## Files

| File | Loại |
|------|------|
| `src/components/agents/PipelineDetailDialog.tsx` | Tạo |
| `src/hooks/useAgentPipelineLogs.ts` | Tạo |
| `src/components/agents/PipelineKanban.tsx` | Sửa — thêm click handler + render dialog |

