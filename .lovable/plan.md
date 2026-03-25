

# Fix: Thiếu Approval Records cho Pipelines ở Bước Duyệt

## Vấn đề
- 15/16 pipelines đang ở stage `approval` nhưng **không có record** trong bảng `agent_approvals`
- Nguyên nhân: Khi recovery re-fire quality → auto-advance tạo approval record bị drop im lặng do concurrency
- `recover_stuck` cũng bỏ qua stage `approval` (line 300), nên không thể tự sửa

## Giải pháp (2 phần)

### Phần 1: Backfill — Tạo approval records cho pipelines bị thiếu

Thêm action `backfill_approvals` vào `supabase/functions/agent-pipeline/index.ts`:
- Quét tất cả pipelines có `current_stage = 'approval'` mà **không có** `agent_approvals` record
- Tạo `agent_approvals` record với `status: 'pending'`, lấy `content_preview` từ `pipeline_state.stages.create.output` và `scores` từ `pipeline_state.stages.quality.output`
- Return số records đã tạo

### Phần 2: Safety net — Đảm bảo approval record luôn tồn tại

Trong phần `approval` stage handler (line ~815), khi kiểm tra `existingApproval` mà không tìm thấy (else branch), code đã tạo record mới. Tuy nhiên cần thêm error handling cho insert để log lỗi rõ ràng thay vì fail im lặng.

### Phần 3: UI — Thêm nút Backfill trên CampaignDashboard

Trong `CampaignDashboard.tsx`, thêm logic phát hiện pipelines ở approval mà thiếu record, hiển thị warning và nút "Tạo approval records" gọi action `backfill_approvals`.

### File changes

1. **`supabase/functions/agent-pipeline/index.ts`**:
   - Thêm action `backfill_approvals` (~30 dòng) trước unknown action response
   - Thêm error logging cho approval insert tại line ~1144 và ~837

2. **`src/components/agents/CampaignDashboard.tsx`**:
   - Thêm nút "Tạo approval records" khi phát hiện mismatch giữa pipelines ở approval và approval records

