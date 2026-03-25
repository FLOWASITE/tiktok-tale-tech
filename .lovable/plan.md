

# Phase 1: Strategy Agent — Kế hoạch triển khai

## Tổng quan tình hình hiện tại

**Đã có sẵn và hoạt động:**
- `clarify-campaign-intent/index.ts` — hỏi lại user nếu thiếu context (nhưng dùng sai AI URL: `https://ai.lovable.dev/api/chat` thay vì gateway đúng)
- `generate-campaign-strategy/index.ts` — lên kế hoạch N bài với tool calling (hoạt động tốt, dùng đúng Lovable AI gateway)
- `GoalWizard.tsx` — wizard 5 bước, có clarification step
- `useCampaignPlans.ts` — hook quản lý plan (approve, regenerate)
- `CampaignPlanReview.tsx` — UI review plan trước khi approve
- `agent-pipeline/index.ts` action `create_from_plan` — tạo pipelines từ plan đã duyệt

**Vấn đề cần sửa:**
1. `clarify-campaign-intent` dùng sai AI endpoint
2. `generate-campaign-strategy` vẫn dùng 9 stages cũ trong pipeline_state khi tạo pipelines (full_auto mode)
3. `generate-campaign-strategy` chưa có trường `content_type` cho mỗi piece (chỉ có `format`)  
4. `agent-pipeline/index.ts` action `trigger_from_goal` vẫn dùng `current_stage: "research"` (stage cũ)
5. `agent-pipeline/index.ts` action `create_from_plan` cũng dùng `current_stage: "research"` và 9 stages cũ
6. `agent-pipeline/index.ts` STAGE_ORDER vẫn là 9 stages cũ
7. GoalWizard chưa có fields mới: campaign_duration_days, campaign_start_date, approval_mode
8. GoalWizard flow: submit goal → trigger_from_goal (tạo 1 pipeline/topic) thay vì → generate_plan (tạo N bài)

---

## Các thay đổi cần thực hiện

### 1. Sửa `clarify-campaign-intent/index.ts`
- Đổi AI endpoint từ `https://ai.lovable.dev/api/chat` → `https://ai.gateway.lovable.dev/v1/chat/completions`
- Đổi model sang `google/gemini-3-flash-preview`

### 2. Sửa `generate-campaign-strategy/index.ts`
- Thêm `content_type` vào tool calling schema: enum `["multichannel", "video_script", "carousel"]`
- Cập nhật system prompt: hướng dẫn AI chọn content_type phù hợp với kênh + topic
- Khi tạo pipelines (full_auto mode): dùng 6 stages mới, bắt đầu từ `current_stage: "create"` (bỏ qua strategy vì đã xong), thêm `content_type` vào record
- Fetch 30 tiêu đề content gần nhất để tránh trùng lặp (dedup)

### 3. Sửa `agent-pipeline/index.ts` — STAGE_ORDER + actions
- Đổi `STAGE_ORDER` → `["strategy", "create", "quality", "approval", "publish", "analyze"]`
- `createPipelineState()`: dùng 6 stages mới
- `trigger_from_goal`: đổi `current_stage: "research"` → gọi `generate-campaign-strategy` trực tiếp thay vì tạo 1 pipeline/topic. Nếu full_auto → strategy function tự tạo pipelines. Nếu không → trả về plan_id để UI hiện review screen.
- `create_from_plan`: đổi `current_stage: "research"` → `"create"`, thêm `content_type` từ piece data, dùng 6 stages mới trong pipeline_state
- `check_scheduled_goals`: đổi stage references sang mới
- `advance_stage`: đổi approval record references (creation→create, optimization→quality, expansion→bỏ, compliance→bỏ)
- `resolveContentId()`: đổi reference từ `stages.creation` → `stages.create`

### 4. Sửa `GoalWizard.tsx` — thêm fields mới
- Thêm Step "Chiến dịch" (giữa Tự động và Liên kết): chọn campaign_duration (1 tuần/2 tuần/1 tháng/tùy chỉnh), campaign_start_date, approval_mode (3 option cards)
- Cập nhật STEPS indicator: 6 bước
- `onSubmit` data thêm: `campaign_duration_days`, `campaign_start_date`, `approval_mode`

### 5. Sửa `AgentDashboard.tsx` — flow mới
- `handleCreateGoal`: sau khi tạo goal → gọi `generate-campaign-strategy` thay vì `trigger_from_goal` → nhận plan_id → chuyển sang tab "Kế hoạch" để user review
- Bỏ flow cũ: trigger_from_goal tạo 1 pipeline/topic

### 6. Sửa `useCampaignPlans.ts`
- `approvePlan`: đảm bảo dùng `create_from_plan` (đã đúng)
- Không cần thay đổi nhiều

### 7. Sửa `useAgentPipelines.ts`
- Cập nhật filter stages: `"published","analyzing"` → `"publish","analyze"`

---

## Thứ tự thực hiện

```text
1. agent-pipeline/index.ts    — STAGE_ORDER + createPipelineState + resolveContentId
2. clarify-campaign-intent     — fix AI endpoint
3. generate-campaign-strategy  — thêm content_type + dedup + 6 stages
4. agent-pipeline actions      — trigger_from_goal flow mới, create_from_plan update
5. GoalWizard.tsx              — thêm campaign fields + 6 steps
6. AgentDashboard.tsx          — flow: goal → strategy → plan review
7. useAgentPipelines.ts        — stage references
```

### Kiểm tra sau khi hoàn thành
- Tạo campaign "Dịch vụ kế toán tháng 7", channels [facebook, tiktok, linkedin], duration 14 ngày
- Strategy phải trả về 5-7 bài, có ít nhất 1 multichannel + 1 video_script + 1 carousel
- Tất cả bài phải về kế toán
- Plan hiển thị trên UI với content_type icons
- Approve plan → pipelines tạo với `current_stage: "create"` và `content_type` đúng

