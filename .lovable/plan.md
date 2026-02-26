

# Rà soát & Hoàn thiện Sprint 1, 2, 3

Sau khi kiểm tra toàn bộ code, phát hiện **5 vấn đề** cần hoàn thiện:

---

## 1. Circuit Breaker: `getStats()` gọi async nhưng không await (Bug)

**File:** `supabase/functions/_shared/circuit-breaker.ts` (dòng 296-315)

`getState(model)` đã được chuyển sang async (trả về Promise), nhưng `getStats()` vẫn là hàm sync gọi nó mà không `await`. Kết quả: trả về Promise thay vì state object thực tế.

**Fix:** Chuyển `getStats()` sang `async` và `await getState()`.

---

## 2. Circuit Breaker: `resetCircuit()`/`resetAllCircuits()` không xoá Redis (Thiếu)

**File:** `supabase/functions/_shared/circuit-breaker.ts` (dòng 320-333)

Hai hàm reset chỉ xoá in-memory state mà không xoá Redis. Nếu một instance khác đọc từ Redis, state cũ vẫn còn.

**Fix:** Thêm logic xoá Redis key (`flowa:cb:*`) trong cả hai hàm reset. Chuyển sang async.

---

## 3. Logger: `saveMetrics()` không lưu `spanId`/`parentSpanId` (Thiếu)

**File:** `supabase/functions/_shared/logger.ts` (dòng 268-309)

Interface `AIMetrics` đã có `spanId` và `parentSpanId` (Sprint 2), nhưng `saveMetrics()` không insert chúng vào DB. Distributed tracing thiếu persistence.

**Fix:** Thêm `span_id` và `parent_span_id` vào object insert trong `saveMetrics()`.

---

## 4. ContentFeedback chưa được tích hợp vào Chat UI (Thiếu)

**File:** `src/components/chat/ContentFeedback.tsx` -- đã tạo nhưng chưa được import/render ở đâu.

Component feedback (thumbs up/down + tags) đã hoàn chỉnh nhưng không có file nào import nó. Cần tích hợp vào component hiển thị tin nhắn assistant.

**Fix:** Tìm component render chat messages (nơi hiển thị assistant bubble) và thêm `<ContentFeedback>` dưới mỗi assistant message có `generatedContent` hoặc `reviewScores`.

---

## 5. Governor Revision Loop không có re-review (Thiếu quan trọng)

**File:** `supabase/functions/_shared/graph/nodes/governor-node.ts`

Plan yêu cầu "Sau revision: gọi lại Reviewer, kiểm tra score mới" và "Thêm conditional edge từ Governor quay về Content/Reviewer khi needs_revision". Hiện tại Governor trả về `generatedContent` đã revision nhưng **không loop back** Reviewer để re-score -- nội dung đã revision không được đánh giá lại chất lượng.

**Fix:** 
- Thêm conditional edge trong `graph-engine.ts`: khi Governor trả về `exitReason: 'revised_full'` hoặc `'revised_soft'`, route lại về `reviewer` node
- Reviewer re-score, rồi quay lại Governor kiểm tra score mới
- Governor đã có logic `revisionRound >= MAX_REVISION_ROUNDS` để thoát loop, nên không lo infinite loop

---

## Chi tiết kỹ thuật

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `circuit-breaker.ts` | Fix `getStats()` async + `resetCircuit()`/`resetAllCircuits()` xoá Redis |
| `logger.ts` | Thêm `span_id`, `parent_span_id` vào `saveMetrics()` insert |
| `graph-engine.ts` | Thêm conditional edge: governor -> reviewer khi `exitReason` chứa `'revised'` |
| Chat message component | Import + render `ContentFeedback` dưới assistant messages |

### Lưu ý
- Tất cả fix đều nhỏ, không thay đổi kiến trúc
- Governor revision loop là fix quan trọng nhất vì ảnh hưởng đến quality gate
- ContentFeedback cần xác định đúng component chat message đang render để tích hợp

