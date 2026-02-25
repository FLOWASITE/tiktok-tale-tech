

## Kế hoạch: Streaming kết quả realtime từng bước Agent

### Vấn đề hiện tại

Hiện tại, backend (supervisor-loop) chạy xong TẤT CẢ agents rồi mới stream nội dung cuối cùng (finalContent) dưới dạng `content_chunk`. Trong quá trình chạy, frontend chỉ thấy pipeline bar chuyển trạng thái nhưng **không thấy kết quả gì** cho đến khi tất cả hoàn thành.

### Giải pháp

Thêm event SSE mới `agent_step_result` từ backend, stream nội dung của từng agent ngay khi hoàn thành. Frontend hiển thị từng phần kết quả realtime trong chat bubble, và sau khi tất cả agents xong, hiển thị nội dung tổng hợp cuối cùng.

---

### Chi tiết kỹ thuật

#### 1. Backend: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

Sau mỗi agent hoàn thành thành công, emit thêm event `agent_step_result` chứa nội dung đầy đủ:

```text
// Sau khi agent chạy xong (cả multi-step và linear workflow):
options.onEvent?.({
  type: 'agent_step_result',
  data: {
    agent: agentName,
    agent_name: AGENT_DISPLAY_NAMES[agentName],
    content: result.content,        // Nội dung đầy đủ
    success: result.success,
    duration_ms: result.durationMs,
    step_index: stepIndex,
    is_final: false,                // Chưa phải bước cuối
  },
});
```

Thay đổi ở 2 vị trí:
- **Multi-step workflow** (line ~279): sau `tool_result` event, thêm `agent_step_result`
- **Linear workflow** (line ~408): sau `tool_result` event, thêm `agent_step_result`

Lọc: Chỉ emit khi `result.success === true` và `result.content` không rỗng, không phải JSON (reviewer).

#### 2. Frontend: `src/hooks/useChatStreaming.ts`

Thêm handler cho event `agent_step_result`:

- Khi nhận được event này, append nội dung vào `assistantContent` với header agent name
- Format: `\n\n### [icon] Agent Name\n\n[content]\n\n`
- Tạo hoặc update message bubble ngay lập tức (giống logic `content_chunk`)
- Track `stepContents[]` để biết có bao nhiêu bước đã hiển thị

Khi nhận `content_chunk` (nội dung tổng hợp cuối):
- Nếu đã có step results, **thay thế** toàn bộ nội dung bằng final consolidated content
- Điều này đảm bảo kết quả cuối cùng là bản tổng hợp sạch, không lặp

Logic cụ thể:
```text
if (parsed.type === 'agent_step_result' && parsed.data?.content) {
  const agentName = parsed.data.agent_name || parsed.data.agent;
  const stepHeader = `\n\n---\n\n**${agentName}** *(${(parsed.data.duration_ms/1000).toFixed(1)}s)*\n\n`;
  assistantContent += stepHeader + parsed.data.content;
  hasStepResults = true;
  
  // Create or update message (same logic as content_chunk)
  if (!messageCreated) { ... onMessageCreate(...) }
  else { ... onMessageUpdate(...) }
}

// Trong content_chunk handler:
if (hasStepResults && !finalContentStarted) {
  // Final content replaces step-by-step content
  assistantContent = '';
  finalContentStarted = true;
}
assistantContent += chunk;
```

#### 3. Không cần thay đổi UI components

- `ChatMessageBubble` đã hỗ trợ markdown rendering (react-markdown)
- `SimpleMessageList` đã auto-scroll khi content update
- `AgentPipelineBar` tiếp tục hoạt động song song

---

### Luồng hoạt động sau khi sửa

```text
User gửi tin nhắn
  ↓
[Pipeline Bar: Research active]
  ↓
Research Agent xong → SSE agent_step_result → Chat hiện:
  "**Research Agent** *(2.1s)*
   Tìm thấy 5 xu hướng Tết 2026..."
  ↓
[Pipeline Bar: Strategy active]
  ↓
Strategy Agent xong → SSE agent_step_result → Chat append:
  "**Strategy Agent** *(1.8s)*
   Đề xuất kế hoạch 3 bài viết..."
  ↓
[Pipeline Bar: Content active]
  ↓
Content Agent xong → SSE agent_step_result → Chat append:
  "**Content Agent** *(3.2s)*
   [Nội dung bài viết đầy đủ]"
  ↓
Supervisor tổng hợp → SSE content_chunk → Chat thay bằng nội dung cuối cùng
```

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/_shared/supervisor/supervisor-loop.ts` | Emit `agent_step_result` event sau mỗi agent thành công |
| `src/hooks/useChatStreaming.ts` | Parse `agent_step_result`, hiển thị realtime, replace khi có final content |

### Edge Cases

- Agent thất bại: không emit `agent_step_result`, chỉ emit `tool_result` với `success: false`
- Reviewer agent: content là JSON scores, không hiển thị dạng text → lọc bỏ
- Image agent: content là summary text → hiển thị bình thường
- Single agent workflow: chỉ có 1 step result, final content giống hệt → không thay thế

