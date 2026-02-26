
## Cải thiện UI cho bước Content trong Pipeline

### Vấn đề hiện tại

Khi bước "Nội dung" (Content Agent) đang chạy (~20-35s), người dùng chỉ thấy:
- Một pill nhỏ với icon spinner quay liên tục, không thay đổi
- Không có thông tin gì về tiến trình bên trong (đang gọi API nào, đã xong bao nhiêu %)
- Cảm giác "bị đứng" vì không có phản hồi trực quan nào

### Giải pháp: Sub-progress cho Content Node

#### 1. Backend: Emit sub-step events từ Content Node

**File:** `supabase/functions/_shared/graph/nodes/content-node.ts`

Thêm callback `onProgress` vào Content Node để emit các sub-step:

- **Sub-step 1**: "Chuẩn bị nội dung..." (khi bắt đầu)
- **Sub-step 2**: "Đang tạo nội dung cho Facebook, Instagram, TikTok..." (khi gọi tool)
- **Sub-step 3**: "Đang hoàn thiện..." (khi tool trả kết quả, trước khi return)

**File:** `supabase/functions/_shared/graph/graph-engine.ts`

Truyền `onProgress` callback vào Content Node factory, emit SSE event type `node_progress` với data `{ node: 'content', subStep: string, progress: number }`.

#### 2. Frontend: Hiển thị sub-progress trong AgentPipelineBar

**File:** `src/hooks/useChatStreaming.ts`

Xử lý SSE event `node_progress`: cập nhật `progressSteps` với thông tin `subLabel` cho step đang active.

**File:** `src/components/topic/chatbot/AgentPipelineBar.tsx`

Khi step `content` đang `active`:
- Hiển thị sub-label động bên dưới pill (ví dụ: "Đang tạo cho 3 kênh...")
- Thêm mini progress bar bên trong pill cho desktop
- Tooltip hiển thị chi tiết sub-step hiện tại

**File:** `src/components/topic/chatbot/ChatThinkingIndicator.tsx`

Cập nhật ProgressStep interface thêm `subLabel?: string` và `progress?: number` (0-100).
Hiển thị sub-label trong thinking indicator khi content step active.

### Chi tiết kỹ thuật

#### ProgressStep interface mở rộng

```typescript
export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  duration?: number;
  subLabel?: string;     // "Đang tạo cho Facebook, Instagram..."
  progress?: number;     // 0-100
}
```

#### SSE Event mới: `node_progress`

```typescript
// Backend emit
onEvent({ type: 'node_progress', data: { node: 'content', subStep: 'generating_channels', label: 'Đang tạo nội dung cho 3 kênh...', progress: 50 } });
```

#### AgentPipelineBar -- Active pill với sub-progress

Desktop: Pill active cho Content sẽ hiển thị animated text phía dưới thay vì chỉ spinner:

```text
[spinner] Nội dung
          Đang tạo cho 3 kênh...
```

Mobile: Mini progress bar bên trong circle sẽ animate từ 0% -> 100% theo sub-steps.

#### Fallback: Animated progress estimation

Nếu backend chưa emit `node_progress` (fast-path không gọi LLM), frontend sẽ tự estimate progress dựa trên thời gian elapsed:
- 0-5s: "Chuẩn bị nội dung..." (33%)
- 5-15s: "Đang tạo nội dung..." (66%)  
- 15s+: "Đang hoàn thiện..." (90%)

Cách này đảm bảo luôn có animation dù backend chưa gửi event.

### Trình tự triển khai

1. Mở rộng `ProgressStep` interface trong `ChatThinkingIndicator.tsx`
2. Cập nhật `content-node.ts` -- thêm onProgress callback và emit sub-steps
3. Cập nhật `graph-engine.ts` -- truyền onProgress và emit SSE `node_progress`
4. Cập nhật `useChatStreaming.ts` -- xử lý `node_progress` event + fallback timer
5. Cập nhật `AgentPipelineBar.tsx` -- hiển thị sub-label và mini progress cho active pill
6. Cập nhật `ChatThinkingIndicator.tsx` -- hiển thị sub-label trong thinking bubble
