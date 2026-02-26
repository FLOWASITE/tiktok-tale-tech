
# Sprint 3: Triển khai 5 tính năng Q2/2026

## Tổng quan
Triển khai 5 task còn lại: Cache Key Improvements, Cross-session Memory Recency Decay, Topic Detection LLM Fallback, Frontend Error Recovery Matrix, và Multichannel Prioritization.

---

## Task 9: Cache Key Improvements

**Vấn đề:** Hash 16 chars dễ collision; prompt thay đổi nhưng cache cũ vẫn trả kết quả sai.

**Thay đổi:**

1. **`redis-cache.ts`** - Sửa `generateCacheKey()`:
   - Hiện tại hash đã là 32 chars (đã fix ở Sprint 1), cần thêm `promptVersion` parameter
   - Thêm tham số `promptVersion: string = 'v1'` vào signature
   - Include `promptVersion` vào payload trước khi hash: `JSON.stringify({ ...stateSubset, _pv: promptVersion })`
   - Format key: `flowa:cache:{brandId}:{nodeType}:{hash32}`

2. **Sửa các node dùng cache** (`content-node.ts`, `research-node.ts`, `strategy-node.ts`):
   - Truyền `promptVersion` khi gọi `generateCacheKey()`
   - Version lấy từ constant hoặc config

---

## Task 10: Cross-session Memory Recency Decay

**Vấn đề:** Context cũ từ session trước có thể gây nhiễu khi brand đã thay đổi strategy.

**Thay đổi:**

1. **Database migration** - Sửa RPC `match_blackboard_context`:
   - Thêm recency decay vào `priority_score`:
     - Entries > 30 ngày: trừ 0.1
     - Entries > 90 ngày: trừ 0.25
   - SQL: `- CASE WHEN ce.created_at < now() - interval '90 days' THEN 0.25 WHEN ce.created_at < now() - interval '30 days' THEN 0.1 ELSE 0 END`

---

## Task 11: Topic Detection LLM Fallback

**Vấn đề:** `hasExplicitTopic()` dùng pattern matching, miss nhiều case tự nhiên.

**Thay đổi:**

1. **`orchestrator.ts`** - Thêm `extracted_topic` vào `create_graph_plan` tool schema:
   - Thêm property `extracted_topic` (optional string) vào `CREATE_GRAPH_PLAN_TOOL.parameters.properties`
   - Trong `planWithLLM()`: extract `planArgs.extracted_topic` sau khi parse tool call
   - Return extracted topic trong `GraphPlan` (thêm field `extractedTopic?: string`)

2. **`graph-engine.ts`** - Sửa `runOrchestrator()`:
   - Nếu `plan.extractedTopic` có giá trị và `state.bestTopic` chưa có: gán `state.bestTopic = plan.extractedTopic`
   - Zero additional cost vì LLM đã được gọi cho planning

3. **`orchestrator.ts`** - Cập nhật types:
   - Thêm `extractedTopic?: string` vào `GraphPlan` interface
   - Thêm vào `validatePlan()`: extract `raw.extracted_topic`

---

## Task 12: Frontend Error Recovery Matrix

**Vấn đề:** Frontend thiếu xử lý structured cho SSE drop, critical node errors, timeout với partial result.

**Thay đổi:**

1. **`useChatStreaming.ts`** - Thêm Error Recovery Matrix:

   **SSE Connection Drop:**
   - Wrap `reader.read()` trong try-catch
   - Khi bắt được network error: auto-reconnect với exponential backoff (1s, 2s, 4s, max 3 lần)
   - Nếu có checkpoint/continuationToken: resume từ đó
   - Sau 3 lần fail: hiển thị message cụ thể + retry button

   **Critical Node Error:**
   - Khi nhận `node_error` cho node có `critical: true` (content, reviewer): hiển thị message cụ thể thay vì generic error
   - Message format: "Node [name] gặp lỗi: [error]. Bạn có muốn thử lại?"
   - Thêm `isRetryable` flag vào error message

   **Timeout với Partial Result:**
   - Khi stream kết thúc mà `assistantContent` có nội dung nhưng không có `final_response` hoặc `[DONE]`:
   - Hiển thị partial content + banner "Nội dung chưa hoàn chỉnh"
   - Thêm "Tiếp tục" button (trigger continuation nếu có token)

---

## Task 13: Multichannel Prioritization

**Vấn đề:** `generate_multichannel` tạo content cho 11 kênh không phân biệt ưu tiên; khi resource constrained thì không biết ưu tiên kênh nào.

**Thay đổi:**

1. **Database migration** - Thêm `primary_channels` vào `brand_templates`:
   - `ALTER TABLE brand_templates ADD COLUMN primary_channels TEXT[] DEFAULT '{}'::TEXT[];`
   - Max 3 channels, validate bằng trigger

2. **`generate-multichannel/index.ts`** - Sửa logic generation:
   - Đọc `primary_channels` từ brand template
   - Sắp xếp channels: primary trước, secondary sau
   - Khi timeout gần (elapsed > 40s trong streaming mode): skip secondary channels
   - Return metadata `{ primaryCompleted: true, secondarySkipped: ['channel1', ...] }`

---

## Chi tiết kỹ thuật

### Files thay đổi

| File | Loại | Mô tả |
|------|------|--------|
| `redis-cache.ts` | Sửa | Thêm `promptVersion` vào `generateCacheKey()` |
| `content-node.ts` | Sửa | Truyền promptVersion khi cache |
| `research-node.ts` | Sửa | Truyền promptVersion khi cache |
| `strategy-node.ts` | Sửa | Truyền promptVersion khi cache |
| `orchestrator.ts` | Sửa | Thêm `extracted_topic` vào tool schema + GraphPlan |
| `graph-engine.ts` | Sửa | Gán extractedTopic vào state.bestTopic |
| `useChatStreaming.ts` | Sửa | Error Recovery Matrix (reconnect, retry, partial) |
| `generate-multichannel/index.ts` | Sửa | Primary channels prioritization |
| Migration SQL | Mới | Recency decay cho RPC + primary_channels column |
| `.lovable/plan.md` | Sửa | Cập nhật Sprint 3 = COMPLETED |

### Database migrations
1. `CREATE OR REPLACE FUNCTION match_blackboard_context` - Thêm recency decay
2. `ALTER TABLE brand_templates ADD COLUMN primary_channels` + validation trigger
