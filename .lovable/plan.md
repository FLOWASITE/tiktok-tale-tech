

# Fix: Research Agent chọn 1 topic duy nhất, truyền cho Content Agent và hiển thị trên Chat UI

## Vấn đề hiện tại

Qua phân tích code, có 3 vấn đề:

1. **Research Agent không chọn rõ ràng 1 topic**: `buildTopicSuggestionsPayload` lấy `best_topic` từ tool result, nhưng tool `discover_topics` trả về danh sách topics mà KHÔNG có field `best_topic`. Fallback chỉ lấy `topics[0]` -- không phải topic tốt nhất.

2. **Research Agent output là JSON -> bị skip trên UI**: Supervisor kiểm tra `content.startsWith('{')` rồi skip `agent_step_result`. Research Agent thường trả về JSON từ tool results, nên output của nó KHÔNG BAO GIỜ hiển thị trên chat.

3. **Topic card có thể không hiển thị**: Event `topic_suggestions` được emit ĐÚNG, frontend nhận và lưu vào `pendingSuggestedTopics`. Nhưng nếu timing sai (message chưa tạo hoặc đã tạo trước khi event đến), card sẽ không render.

## Giải pháp

### 1. Research Agent tự chọn best_topic (Backend)

**File**: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

Cập nhật `buildTopicSuggestionsPayload` để chọn topic có **score cao nhất** thay vì lấy `topics[0]`:

```text
// Hiện tại: best_topic = discoverTool.result.best_topic ?? topics[0]?.topic
// Sau fix: Sắp xếp theo score, chọn topic có score cao nhất
const sortedTopics = [...topics].sort((a, b) => (b.score || 0) - (a.score || 0));
const bestTopic = sortedTopics[0]?.topic;
```

### 2. Research Agent prompt yêu cầu chọn 1 topic

**File**: `supabase/functions/_shared/agents/research-agent.ts`

Thêm quy tắc vào system prompt:

```text
## QUY TẮC QUAN TRỌNG
- Sau khi gọi discover_topics, PHẢI chọn 1 topic tốt nhất dựa trên score + brand alignment
- Trả về text summary (KHÔNG trả JSON thuần) với format:
  **Topic được chọn**: [tên topic]
  **Lý do**: [giải thích ngắn]
  **Các topic khác**: [danh sách]
```

Điều này đảm bảo Research Agent trả về **text content** (không phải JSON), giúp `agent_step_result` được emit thành công.

### 3. Đảm bảo topic card luôn hiển thị (Frontend)

**File**: `src/hooks/useChatStreaming.ts`

Thêm logic: Khi stream kết thúc (`done = true`), nếu `pendingSuggestedTopics` chưa được gắn vào message, gọi `onMessageUpdate` một lần cuối để đảm bảo topics luôn hiển thị:

```text
// Sau vòng while (done)
if (messageCreated && (pendingSuggestedTopics || pendingSelectedTopic)) {
  onMessageUpdate(assistantId, {
    suggestedTopics: pendingSuggestedTopics,
    selectedTopic: pendingSelectedTopic,
  });
}
```

### 4. TopicSuggestionsCard cho phép click chọn topic (Frontend - Bonus)

**File**: `src/components/topic/chatbot/TopicSuggestionsCard.tsx`

Thêm prop `onSelect` để user có thể click chọn topic khác nếu muốn:

```text
interface TopicSuggestionsCardProps {
  topics: SuggestedTopic[];
  selectedTopic?: string;
  onSelect?: (topic: string) => void;  // NEW
}
```

## Thay đổi chi tiết

| File | Thay đổi |
|------|----------|
| `supervisor-loop.ts` | `buildTopicSuggestionsPayload`: chọn topic theo score cao nhất |
| `research-agent.ts` | System prompt: yêu cầu trả text summary, chọn 1 best topic |
| `useChatStreaming.ts` | Đảm bảo `suggestedTopics` được gắn vào message khi stream kết thúc |
| `TopicSuggestionsCard.tsx` | Thêm `onSelect` callback cho phép click chọn topic |

## Luồng sau fix

```text
User: "Tạo nội dung Facebook"

Research Agent:
  -> discover_topics -> 5 topics (có score)
  -> Chọn topic score cao nhất (VD: score=92)
  -> Trả về TEXT (không JSON):
     "**Topic được chọn**: Quyết toán thuế TNCN 2026 (score: 92)
      **Lý do**: Trending cao, phù hợp thời điểm..."

Supervisor:
  -> buildTopicSuggestionsPayload: sort by score, best = score cao nhất
  -> Emit SSE: topic_suggestions {topics: [...], best_topic: "Quyết toán thuế TNCN 2026"}
  -> Write blackboard: best_topic = "Quyết toán thuế TNCN 2026"
  -> agent_step_result: content là TEXT -> emit OK (không bị skip)

Content Agent:
  -> Đọc blackboard: best_topic = "Quyết toán thuế TNCN 2026"
  -> Gọi generate_multichannel(topic="Quyết toán thuế TNCN 2026")

Chat UI:
  -> [TopicSuggestionsCard] hiển thị 5 topics, highlight best_topic
  -> [Content] hiển thị nội dung đa kênh
```
