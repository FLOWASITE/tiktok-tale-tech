

# Rà soát Agent System — Các vấn đề cần cải thiện

## 1. Bug: `useAgentTeam` đếm pipeline sai

**File**: `src/hooks/useAgentTeam.ts` dòng 62

```typescript
pipelines_this_month: (pipelineCounts || []).length, // simplified
```

Mọi member đều nhận **cùng một con số** (tổng pipeline của cả org) thay vì đếm pipeline riêng từng user. Cần group theo `created_by` từ `agent_goals` hoặc thêm trường `created_by` vào pipeline query.

**Fix**: Join pipeline với goal để lấy `created_by`, rồi filter theo `user_id` của từng member.

---

## 2. `useAgentPipelines` không giới hạn số lượng rows

**File**: `src/hooks/useAgentPipelines.ts` dòng 18-25

Query lấy **tất cả** pipeline không có `.limit()`. Khi org có > 1000 pipeline sẽ bị Supabase cắt tại 1000 rows mà không báo lỗi → dữ liệu bị thiếu âm thầm.

**Fix**: Thêm `.limit(200)` hoặc pagination, hoặc lọc theo khoảng thời gian (ví dụ 30 ngày gần nhất).

---

## 3. `useAgentApprovals` cũng thiếu limit

**File**: `src/hooks/useAgentApprovals.ts` dòng 17-22

Tương tự issue #2, query lấy tất cả approvals không giới hạn.

**Fix**: Thêm `.limit()` hoặc filter chỉ lấy pending + 30 ngày gần nhất.

---

## 4. `AgentMonitorPage` thiếu filter/pagination

**File**: `src/pages/AgentMonitorPage.tsx`

Trang monitor hiển thị tất cả pipeline trong một bảng duy nhất, không có:
- Filter theo status (running/completed/flagged)
- Filter theo thời gian
- Pagination
- Tìm kiếm theo tên

Khi có nhiều pipeline, trang sẽ rất chậm và khó sử dụng.

**Fix**: Thêm filter bar (status, date range) + pagination cho `PipelineMonitorTable`.

---

## 5. `useAgentPerformance` thiếu filter theo org

**File**: `src/hooks/useAgentPerformance.ts` dòng 42-46

Query `agent_execution_logs` **không filter theo `organization_id`** mặc dù đã kiểm tra `currentOrganization?.id`. Nếu bảng có RLS thì OK, nhưng nếu không thì sẽ lấy logs của tất cả org.

**Fix**: Thêm `.eq('organization_id', currentOrganization.id)` hoặc xác nhận RLS policy đã cover.

---

## 6. `PipelineMonitorTable` retry gọi `run_stage` thay vì logic retry đúng

**File**: `src/components/agents/PipelineMonitorTable.tsx` dòng 60-74

Hàm `handleRetry` gọi `agent-pipeline` với `action: 'run_stage'` nhưng **không reset pipeline state** (không clear `is_flagged`, `flag_reason`, v.v.). Trong khi `useAgentPipelines.retryPipeline` (hook) có logic reset đầy đủ hơn.

**Fix**: Thống nhất sử dụng `retryPipeline` mutation từ hook thay vì gọi edge function trực tiếp.

---

## 7. `ApprovalQueue` preview dialog thiếu `DialogDescription`

**File**: `src/components/agents/ApprovalQueue.tsx` dòng 148-176

Console logs cho thấy lỗi accessibility: `DialogContent requires a DialogTitle` và `Missing Description`. Preview dialog tại dòng 148 thiếu `DialogDescription`.

**Fix**: Thêm `<DialogDescription>` (hoặc `VisuallyHidden` wrapper) vào cả reject dialog và preview dialog.

---

## 8. `GoalWizard` quá lớn — 978 dòng trong 1 file

**File**: `src/components/agents/GoalWizard.tsx` — 978 lines

Component này chứa tất cả 5 steps wizard, constants, handlers trong 1 file. Khó maintain và debug.

**Đề xuất** (không urgent): Tách thành các sub-components: `ObjectiveStep`, `StrategyStep`, `ChannelStep`, `AutomationStep`, `ConfirmStep`.

---

## Tóm tắt mức độ ưu tiên

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Bug đếm pipeline/user sai | **Cao** — dữ liệu sai |
| 2 | Thiếu limit pipeline query | **Cao** — silent data loss |
| 3 | Thiếu limit approvals query | **Trung bình** |
| 4 | Monitor thiếu filter/pagination | **Trung bình** — UX |
| 5 | Performance hook thiếu org filter | **Trung bình** — security |
| 6 | Retry logic không nhất quán | **Thấp** — functional nhưng chưa clean |
| 7 | Thiếu DialogDescription | **Thấp** — accessibility |
| 8 | GoalWizard quá lớn | **Thấp** — maintenance |

## Đề xuất

Fix ngay **#1, #2, #3** (bugs/data issues). Sau đó **#4, #5** (UX + security). Các items còn lại là technical debt có thể xử lý dần.

