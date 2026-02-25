

## Kế hoạch: Làm AgentPipelineBar hoạt động đúng

### Vấn đề gốc

`AgentPipelineBar` **không bao giờ hiển thị được lâu** vì:

1. `useChatStreaming.ts` dòng 604: reset `progressSteps: []` trong block `finally` khi streaming kết thúc
2. `TopicAIChatbot.tsx` dòng 292: chỉ render khi `progressSteps.length > 0`
3. Kết quả: bar hiện thoáng qua rồi biến mất ngay, user không thấy

### Giải pháp

Thêm state `lastPipelineSteps` trong `TopicAIChatbot.tsx` để lưu lại kết quả pipeline sau mỗi lần chạy. Bar sẽ hiển thị cả khi đang chạy (realtime) lẫn sau khi hoàn thành (persistent).

---

### Thay đổi cụ thể

#### 1. `src/components/topic/TopicAIChatbot.tsx`

- Thêm state `lastPipelineSteps` bằng `useState`
- Dùng `useEffect` theo dõi `streamingHook.progressSteps`: khi có steps mới (length > 0), cập nhật `lastPipelineSteps`
- Thay điều kiện render: dùng `lastPipelineSteps` thay vì chỉ `streamingHook.progressSteps`
- Ưu tiên hiển thị: khi đang streaming dùng `streamingHook.progressSteps` (realtime), khi xong dùng `lastPipelineSteps` (persistent)
- Truyền `lastPipelineSteps` xuống `AgentInsightsTab` thay vì `streamingHook.progressSteps`

```text
// Thêm state
const [lastPipelineSteps, setLastPipelineSteps] = useState<ProgressStep[]>([]);

// Theo dõi và lưu
useEffect(() => {
  if (streamingHook.progressSteps.length > 0) {
    setLastPipelineSteps(streamingHook.progressSteps);
  }
}, [streamingHook.progressSteps]);

// Tính steps hiển thị
const displayPipelineSteps = streamingHook.progressSteps.length > 0
  ? streamingHook.progressSteps   // realtime khi đang chạy
  : lastPipelineSteps;             // persistent sau khi xong

// Render bar: dùng displayPipelineSteps thay vì streamingHook.progressSteps
{uiHook.supervisorEnabled && displayPipelineSteps.length > 0 && (
  <AgentPipelineBar steps={displayPipelineSteps} />
)}
```

- Reset `lastPipelineSteps` về `[]` khi user bấm "Reset chat" (trong `handleReset`)

#### 2. Không cần sửa `useChatStreaming.ts`

Giữ nguyên logic reset `progressSteps: []` trong streaming hook -- đó là đúng vì streaming hook chỉ quản lý trạng thái streaming hiện tại. Việc persist thuộc về component cha.

#### 3. Không cần sửa `AgentPipelineBar.tsx`

Component đã hoàn chỉnh -- nhận steps và render đúng 3 trạng thái (pending/active/complete) với tooltip chi tiết.

---

### Kết quả sau khi sửa

- Khi supervisor bật và gửi tin nhắn: bar hiện realtime với trạng thái từng agent (pending xám, active pulse tím, complete checkmark xanh + thời gian)
- Khi streaming xong: bar vẫn giữ nguyên kết quả lần chạy cuối
- Hover vào pill: tooltip hiện chi tiết agent
- Reset chat: bar biến mất
- Tab Insights cũng nhận đúng `displayPipelineSteps`

