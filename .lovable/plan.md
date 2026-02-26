

## Hiển thị kết quả chọn chủ đề dạng text (bỏ Card)

### Thay đổi

#### 1. Backend - Gửi lý do chọn topic qua SSE (`graph-engine.ts`)
- Thêm trường `best_topic_reason` vào event `topic_suggestions`, lấy từ `reasoning` của topic được chọn trong `normalizedTopics`

#### 2. Frontend - Bỏ TopicSuggestionsCard, hiển thị dạng text (`ChatMessageBubble.tsx`)
- Xóa phần render `TopicSuggestionsCard` (dòng 256-265)
- Thay bằng một đoạn text đơn giản hiển thị:
  - **Chủ đề được chọn**: tên topic (bold)
  - **Lý do**: reasoning text
- Styling nhẹ nhàng (không card), dùng markdown-style hoặc div đơn giản với icon nhỏ

#### 3. Types + Streaming (`types.ts`, `useChatStreaming.ts`)
- Thêm `selectedTopicReason?: string` vào `ChatMessage`
- Parse `best_topic_reason` từ SSE event và lưu vào message

#### 4. Giữ lại `TopicSuggestionsCard.tsx` file (không xóa) phòng dùng lại sau

### Kết quả hiển thị trên UI

```text
⭐ Chủ đề được chọn: "10 Xu hướng AI năm 2025 bạn không thể bỏ lỡ"
💡 Lý do: Phù hợp với ngành công nghệ, điểm trending cao (85/100), 
   dễ tạo nội dung đa kênh và thu hút engagement.
```

### Chi tiết kỹ thuật

**graph-engine.ts** (~line 739):
```typescript
const bestTopicReason = normalizedTopics.find(
  (t: any) => t.topic === normalizedBestTopic
)?.reasoning || normalizedTopics[0]?.reasoning || null;

data: {
  topics: normalizedTopics,
  best_topic: normalizedBestTopic,
  best_topic_reason: bestTopicReason,
  refined_variants: refinedVariants,
}
```

**useChatStreaming.ts** (~line 291):
```typescript
pendingSelectedTopic = parsed.data.best_topic || ...;
const pendingSelectedTopicReason = parsed.data.best_topic_reason || undefined;
// pass to onMessageUpdate
```

**ChatMessageBubble.tsx** - thay TopicSuggestionsCard:
```tsx
{message.selectedTopic && (
  <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
    <p className="text-sm font-medium flex items-center gap-1.5">
      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
      <span>Chủ đề được chọn:</span>
      <span className="text-primary">{message.selectedTopic}</span>
    </p>
    {message.selectedTopicReason && (
      <p className="text-xs text-muted-foreground flex items-start gap-1.5 pl-5">
        <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
        {message.selectedTopicReason}
      </p>
    )}
  </div>
)}
```

**Tac dong**: 4 file (1 backend + 3 frontend). Khong xoa TopicSuggestionsCard file.
