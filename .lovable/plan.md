

# Fix: Topic được chọn từ Research Agent chưa hiển thị trên Chat UI

## Nguyên nhân gốc

Có **2 vấn đề** khiến topics từ `discover_topics` không hiển thị:

### Vấn đề 1: Research Agent trả về JSON → bị bỏ qua
Trong `supervisor-loop.ts` (dòng 293-312 và 446-465), khi emit `agent_step_result`, hệ thống kiểm tra:

```text
if content starts with '{' or '[' → skip (isJson = true)
```

Research Agent khi gọi `discover_topics` trả về nội dung có cấu trúc (JSON tool results). Nếu Research Agent chỉ trả lại JSON từ tool, nội dung bị skip hoàn toàn, **không gửi về frontend**.

### Vấn đề 2: `buildFinalContent` ưu tiên Content Agent
Hàm `buildFinalContent` (dòng 704-729) luôn ưu tiên output của `content-agent`. Kết quả của Research Agent (danh sách topics gợi ý) bị ghi đè bởi nội dung từ Content Agent, nên user **chỉ thấy nội dung cuối cùng**, không thấy topics nào đã được chọn.

## Giải pháp

### 1. Emit `topic_suggestions` event mới từ Supervisor

**File**: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

Sau khi Research Agent hoàn thành (dòng ~424-430), kiểm tra Blackboard có `suggested_topics` không. Nếu có, emit một SSE event mới `topic_suggestions` về frontend:

```text
if (agentName === 'research-agent' && result.success) {
  const suggestedTopics = await blackboard.read('suggested_topics');
  if (suggestedTopics) {
    options.onEvent?.({
      type: 'topic_suggestions',
      data: { topics: suggestedTopics, best_topic: await blackboard.read('best_topic') }
    });
  }
}
```

Tương tự cho multi-step workflow (dòng ~273-276).

### 2. Frontend nhận và hiển thị topics

**File**: `src/hooks/useChatStreaming.ts`

Thêm handler cho event `topic_suggestions`:
- Lưu topics vào state tạm
- Khi render message cuối cùng, chèn phần "Topics được chọn" vào đầu nội dung

### 3. Render Topics Card trong Chat Bubble

**File**: `src/components/topic/chatbot/ChatMessageBubble.tsx`

Thêm component hiển thị danh sách topics kèm điểm số, category khi message có `suggestedTopics` data. Hiển thị dạng card nhỏ gọn với:
- Topic name + score
- Category badge
- Highlight topic được chọn (best_topic)

### 4. Cập nhật ChatMessage type

**File**: `src/components/topic/chatbot/types.ts`

Thêm field mới vào `ChatMessage`:

```text
suggestedTopics?: {
  topic: string;
  category: string;
  score: number | null;
  reasoning: string | null;
}[];
selectedTopic?: string;
```

## Thay đổi chi tiết theo file

| File | Thay đổi |
|------|----------|
| `types.ts` | Thêm `suggestedTopics` và `selectedTopic` vào `ChatMessage` |
| `supervisor-loop.ts` | Emit `topic_suggestions` event sau khi research-agent hoàn thành (2 noi: linear + multi-step) |
| `useChatStreaming.ts` | Parse event `topic_suggestions`, lưu vào pending state, gắn vào message khi tạo/update |
| `ChatMessageBubble.tsx` | Render `TopicSuggestionsCard` khi message có `suggestedTopics` |

## Luồng hoạt động sau fix

```text
User: "Tạo nội dung Facebook"
  → Intent: complex_workflow (auto-upgrade)
  → Research Agent: gọi discover_topics
  → Blackboard: suggested_topics = [{topic: "...", score: 85}, ...]
  → Supervisor emit SSE: {type: "topic_suggestions", data: {topics: [...], best_topic: "..."}}
  → Frontend nhận: lưu topics vào pending state
  → Content Agent tạo nội dung dựa trên best_topic
  → Final message hiển thị:
      [Topics Card: 5 topics với scores, best_topic highlighted]
      [Nội dung Facebook đã tạo]
```

