

# Hoàn thiện AI Campaign — End-to-End Functional

## Vấn đề hiện tại

Hệ thống có đủ UI và database schema, nhưng pipeline không thực sự chạy:

1. **Pipeline không tự chạy stages** — tạo xong pipeline ở "research" rồi dừng, không auto-execute
2. **Backend gọi sai function** — `generate-topic-suggestions` (không tồn tại) thay vì `topic-ai`
3. **Không truyền brand_template_id** — goal có brand nhưng pipeline không dùng
4. **campaign_id không truyền** — goal có campaign nhưng pipeline không kế thừa
5. **Optimization/Expansion là stub** — không gọi `geo-score-content` hay `generate-multichannel`
6. **Approval không gọi backend** — approve/reject chỉ update DB local, không gọi `agent-approve` edge function (pipeline không advance)
7. **Campaigns tab thiếu tính năng** — không edit/delete goal, không xem pipelines của goal

## Thay đổi

### 1. Sửa `agent-pipeline` Edge Function — Pipeline thực sự hoạt động

**`trigger_from_goal`:**
- Truyền `campaign_id` từ goal vào pipeline
- Truyền `brand_template_id` vào `pipeline_state` metadata
- Sau khi tạo pipeline → tự động gọi `run_stage` cho stage "research" (auto-chain)

**`run_stage`:**
- **Research**: Gọi `topic-ai` (function đúng) với `action: "suggest"`, truyền `brand_template_id`
- **Creation**: Gọi `generate-core-content` với `brand_template_id`, `organization_id`, lưu `content_id` vào pipeline
- **Optimization**: Gọi `geo-score-content` thật thay vì mock
- **Expansion**: Gọi `generate-multichannel` với `content_id` từ creation output
- **Auto-advance**: Sau mỗi stage thành công → tự động advance sang stage tiếp + gọi `run_stage` tiếp (trừ `approval` stage khi `human_in_loop`)

**`advance_stage`:**
- Khi advance sang `approval` + `human_in_loop` → tạo approval record với content preview thực

### 2. Sửa Frontend — Approval gọi backend đúng

**`useAgentApprovals.ts`:**
- `updateApproval` gọi `agent-approve` edge function thay vì chỉ update DB trực tiếp
- Đảm bảo pipeline advance sau approve

### 3. Sửa Campaigns Tab — Quản lý goal đầy đủ

**`AgentDashboard.tsx` — Campaigns tab:**
- Hiển thị thêm: autonomy level, brand template name, số pipelines đang chạy
- Thêm nút Edit (mở wizard pre-filled) và Delete
- Thêm nút "Chạy ngay" (trigger pipeline thủ công cho goal)
- Click goal → filter pipeline kanban theo goal đó

### 4. Sửa GoalWizard — Support edit mode

- Nhận optional `initialData` prop để pre-fill form khi edit
- Reset form khi close

### 5. Sửa `handleCreateGoal` trong Dashboard

- Sau khi tạo goal + trigger pipeline, toast hiển thị số pipeline đã tạo
- Loading state trong khi đợi

## Files cần sửa

| File | Loại | Mô tả |
|------|------|--------|
| `supabase/functions/agent-pipeline/index.ts` | Sửa | Fix function calls, auto-chain, campaign_id, brand |
| `src/hooks/useAgentApprovals.ts` | Sửa | Gọi agent-approve edge function |
| `src/pages/AgentDashboard.tsx` | Sửa | Campaigns tab đầy đủ, edit/delete/run |
| `src/components/agents/GoalWizard.tsx` | Sửa | Support edit mode |
| `src/hooks/useAgentGoals.ts` | Sửa | Thêm delete confirmation |

## Thứ tự triển khai

1. Sửa `agent-pipeline` edge function (core logic)
2. Sửa `useAgentApprovals` (approval flow)
3. Sửa Dashboard + GoalWizard (UI management)

