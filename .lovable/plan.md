

## Vấn đề: Memo comparison trong VirtualizedMessageList bỏ qua selectedTopic

### Nguyên nhân gốc

Trong `VirtualizedMessageList.tsx` (dòng 92-100), component `MessageRow` sử dụng `React.memo` với custom comparison chỉ kiểm tra 6 field:
- `message.id`
- `message.content` 
- `isAnimating`
- `isHighlighted`
- `isLoading`
- `searchQuery`

Khi SSE event `topic_suggestions` cập nhật message với `selectedTopic`, `selectedTopicReason`, `suggestedTopics`, `refinedVariants` -- memo comparison vẫn trả về `true` (vì id và content không đổi), nên component **không re-render** và text "Chủ đề được chọn" + "Lý do" không hiển thị.

### Giải pháp

Sửa memo comparison trong `VirtualizedMessageList.tsx` để thêm kiểm tra các field mới:

```typescript
// File: src/components/topic/chatbot/VirtualizedMessageList.tsx (line 92-101)
(prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.selectedTopic === nextProps.message.selectedTopic &&
    prevProps.message.selectedTopicReason === nextProps.message.selectedTopicReason &&
    prevProps.message.reviewScores === nextProps.message.reviewScores &&
    prevProps.isAnimating === nextProps.isAnimating &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.searchQuery === nextProps.searchQuery
  );
}
```

### Tác động
- 1 file: `src/components/topic/chatbot/VirtualizedMessageList.tsx`
- Thêm 3 dòng vào memo comparison
- Không ảnh hưởng performance đáng kể (so sánh string/reference)

