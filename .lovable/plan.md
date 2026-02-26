

## Khắc phục Content Node bị chậm và đứng

### Nguyên nhân gốc (đã xác nhận)

File `content-node.ts` **chưa được tối ưu** dù kế hoạch đã được duyệt trước đó. Hiện tại vẫn chạy **4 bước nối tiếp**:

```text
LLM #1 (chọn tool)     ~10s
  Core Content API      ~15s
  Multichannel API      ~20s
LLM #2 (tổng hợp)       ~8s
─────────────────────────────
Tổng                   ~53s  (timeout Edge Function = 55s)
```

### Giải pháp: Loại bỏ 2 lần gọi LLM thừa

**File:** `supabase/functions/_shared/graph/nodes/content-node.ts`

#### Thay đổi 1: Bỏ LLM call #1 khi đã có topic/plan

Khi `state.bestTopic` hoặc `state.contentPlan` tồn tại (tức Research/Strategy đã chạy), gọi thẳng `executeToolCall('generate_multichannel', ...)` mà không cần hỏi LLM chọn tool.

Chỉ giữ LLM call #1 cho trường hợp chat đơn giản (không có pipeline context).

#### Thay đổi 2: Bỏ LLM call #2 (tổng hợp kết quả)

Dùng trực tiếp kết quả từ tool (`contentResult.result`) làm `generatedContent` thay vì gọi thêm 1 lần LLM để "summarize".

#### Logic mới (pseudo-code):

```text
IF state.bestTopic OR state.contentPlan:
  // Fast path: gọi thẳng tool, bỏ qua cả 2 LLM calls
  topic = state.bestTopic || extractFromPlan(state.contentPlan)
  result = executeToolCall('generate_multichannel', { topic, channels, ... })
  return { generatedContent: JSON.stringify(result) }
ELSE:
  // Fallback: giữ LLM call #1 để quyết định tool (chat tự do)
  // Vẫn bỏ LLM call #2
  aiResult = callAI({ tools, toolChoice: 'required' })
  result = executeToolCall(aiResult.tool_name, aiResult.args)
  return { generatedContent: JSON.stringify(result) }
```

### Kết quả kỳ vọng

```text
TRƯỚC: ~53s (4 bước sequential) → thường timeout
SAU:   ~35s (2 bước: Core + Multichannel) → an toàn trong budget
```

### Trình tự triển khai

1. Sửa `content-node.ts`: thêm fast-path khi có `bestTopic`/`contentPlan`, gọi thẳng tool
2. Loại bỏ follow-up LLM call (dòng 116-134) cho cả 2 path
3. Giữ nguyên cache logic và error handling hiện tại

