

## Kế hoạch: Fix streaming kết quả realtime từng Agent

### Phân tích vấn đề

Sau khi kiểm tra kỹ code và logs, tôi phát hiện **3 vấn đề chính** khiến kết quả realtime không hiển thị:

#### Vấn đề 1: Thiếu debug logging
Backend emit `agent_step_result` nhưng không có `console.log` nào xác nhận event được gửi hay bị filter. Không thể verify từ logs.

#### Vấn đề 2: Filter quá chặt  
Dòng 442 trong `supervisor-loop.ts`:
```text
if (result.success && result.content && !result.content.startsWith('[') && agentName !== 'reviewer-agent')
```
Nếu content-agent trả về content bắt đầu bằng `[` (ví dụ markdown list), nó bị filter bỏ trước khi đến JSON check.

#### Vấn đề 3: Content bị thay thế ngay lập tức
Với intent `generate`, luồng hoạt động là:
1. Content-agent chạy xong (75 giây) → emit `agent_step_result`
2. Reviewer-agent chạy (4 giây)
3. `buildFinalContent()` trả về content GIỐNG HỆT content-agent
4. `content_chunk` events gửi ngay sau → frontend XÓA step results và thay bằng final content

Kết quả: step result hiện thoáng qua rồi bị xóa ngay, hoặc SSE events xếp hàng chặt nhau trong buffer nên frontend xử lý tất cả cùng lúc trong 1 render cycle → user không thấy gì.

---

### Giải pháp

#### 1. Backend: Thêm debug logging + sửa filter (`supervisor-loop.ts`)

Thêm `console.log` trước và sau khi emit `agent_step_result` ở CẢ 2 vị trí (multi-step line ~292 và linear line ~442):

```text
console.log(`[Supervisor] agent_step_result check: agent=${agentName}, success=${result.success}, contentLength=${result.content?.length || 0}, contentStart="${result.content?.slice(0,50)}"`);
```

Sửa filter: bỏ `!result.content.startsWith('[')` thừa (đã có JSON check bên dưới). Chỉ giữ JSON check chính xác hơn:

```text
if (result.success && result.content && agentName !== 'reviewer-agent') {
  const trimmed = result.content.trim();
  const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                 (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (!isJson) {
    console.log(`[Supervisor] Emitting agent_step_result for ${agentName}, ${result.content.length} chars`);
    options.onEvent?.({ type: 'agent_step_result', data: { ... } });
  }
}
```

#### 2. Frontend: Không thay thế step results (`useChatStreaming.ts`)

Thay đổi logic `content_chunk` handler: nếu đã có step results, KHÔNG xóa chúng. Thay vào đó, bỏ qua `content_chunk` vì nội dung đã được hiển thị qua `agent_step_result`.

Lý do: `buildFinalContent()` trả về chính xác content-agent output, tức GIỐNG HỆT nội dung đã hiển thị qua step result. Xóa rồi hiện lại gây nhấp nháy và mất realtime effect.

```text
// Thay đổi logic content_chunk:
if (parsed.type === 'content_chunk' && parsed.data?.chunk) {
  // Nếu đã có step results, skip content_chunk (tránh duplicate)
  if (hasStepResults) {
    continue;  // Bỏ qua, nội dung đã hiển thị qua agent_step_result
  }
  // Chỉ xử lý content_chunk khi KHÔNG có step results (single agent mode)
  assistantContent += parsed.data.chunk;
  ...
}
```

#### 3. Deploy lại edge function

Sau khi sửa backend, deploy lại `chat-topics` để đảm bảo code mới được áp dụng.

---

### Luồng hoạt động sau khi sửa

```text
User: "Tạo content cho hôm nay"
  ↓
[Intent: generate → content-agent → reviewer-agent]
  ↓
Content Agent chạy (75 giây)
  ↓
Content Agent xong → agent_step_result → Chat hiện:
  "---
   **Content Agent** *(75.2s)*
   
   [Nội dung đầy đủ về bài viết]"
  ↓
Reviewer Agent chạy (4 giây) → filtered (reviewer)
  ↓
content_chunk events → SKIPPED (đã có step results)
  ↓
[DONE] → Kết quả giữ nguyên, không nhấp nháy
```

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/_shared/supervisor/supervisor-loop.ts` | Thêm debug logging, sửa filter bỏ `startsWith('[')` thừa (2 vị trí) |
| `src/hooks/useChatStreaming.ts` | Skip `content_chunk` khi đã có `agent_step_result` thay vì xóa + thay thế |

### Edge Cases
- Single agent (không có supervisor): không có `agent_step_result`, `content_chunk` hoạt động bình thường
- Multi-step workflow: nhiều `agent_step_result` nối tiếp, `content_chunk` bị skip → OK
- Image agent: content là text summary → hiển thị bình thường
- Content bắt đầu bằng `[`: vẫn hiển thị nhờ bỏ filter `startsWith('[')` thừa

