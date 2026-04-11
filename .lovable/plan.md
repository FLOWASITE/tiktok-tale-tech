

# Fix Continuation Resume: Backend Không Đọc continuationToken

## Vấn đề phát hiện

Frontend (`useChatStreaming.ts`) đã implement đầy đủ:
- Nhận SSE event `continuation_required` với token
- Hiển thị "⏳ Đang hoàn thiện..." cho user
- Auto-fire request thứ 2 gửi `continuationToken` về `chat-topics`
- Append nội dung từ resume stream

Nhưng backend `chat-topics/index.ts` (line 37) chỉ destructure:
```typescript
const { messages, brandTemplateId, contentGoal, organizationId, userId, forceWebSearch } = await req.json();
```
→ `continuationToken` bị bỏ qua hoàn toàn. Request resume chạy lại workflow mới từ đầu.

Checkpoint được save (bảng `workflow_checkpoints`) nhưng không bao giờ được load lại.

## Giải pháp

### 1) `supabase/functions/chat-topics/index.ts` — Thêm continuation path

Đọc `continuationToken` từ request body. Nếu có:
- Gọi `validateCheckpoint()` kiểm tra token hợp lệ + chưa stale
- Load checkpoint state với `loadCheckpoint()`
- Gọi `runOrchestrator()` với state từ checkpoint (skip các node đã hoàn thành)
- Mark checkpoint completed sau khi finish

Nếu không có token → chạy flow bình thường như hiện tại (zero change).

```typescript
// Thêm vào destructure
const { messages, brandTemplateId, contentGoal, organizationId, 
        userId, forceWebSearch, continuationToken } = await req.json();

// Trước STEP 1, check continuation
if (continuationToken) {
  // Validate & resume from checkpoint
  const validation = await validateCheckpoint(supabase, continuationToken);
  if (validation.valid && validation.checkpoint) {
    // Resume graph from checkpoint state
    // Skip to orchestrator with restored state
    // Stream remaining results
    // Mark checkpoint completed
  }
  // If invalid, fall through to fresh run
}
```

### 2) `supabase/functions/_shared/graph/graph-engine.ts` — Support resumed state

Hiện `executeGraph()` luôn bắt đầu từ node không có dependency. Cần thêm logic:
- Nhận `completedNodes: Set<string>` từ checkpoint
- Skip các node đã completed
- Resume từ node tiếp theo trong DAG

### 3) `supabase/functions/_shared/graph/checkpoint.ts` — Nhỏ

Hàm `loadCheckpoint` hiện query theo `session_id`. Cần thêm load trực tiếp theo `checkpoint_id` (đã có trong `validateCheckpoint`, chỉ cần export rõ hơn).

## Files thay đổi
- `supabase/functions/chat-topics/index.ts` — Thêm continuation detection + resume path
- `supabase/functions/_shared/graph/graph-engine.ts` — Thêm `completedNodes` parameter cho `executeGraph`
- `supabase/functions/_shared/graph/checkpoint.ts` — Minor export cleanup

## Không thay đổi
- Frontend (`useChatStreaming.ts`) — đã hoạt động đúng
- Schema DB — `workflow_checkpoints` đã đủ cột
- UX flow — user đã thấy "Đang hoàn thiện..." rồi nhận kết quả nối tiếp

## Kết quả
- Continuation token thực sự resume từ checkpoint thay vì chạy lại từ đầu
- Giảm ~50% thời gian cho long-running workflows bị timeout
- Checkpoint data không còn bị lãng phí
- Zero impact khi không có continuation (path mặc định giữ nguyên)

