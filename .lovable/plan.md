

## Vấn đề

Hiện tại UI chat chỉ hiển thị **danh sách topics gợi ý** (TopicSuggestionsCard) mà không có phần **nổi bật riêng** cho topic đã được chọn. Có 2 nguyên nhân:

1. **Lỗi matching sau Refinement**: Sau khi Research Agent refine topic, tên topic mới (refined) khác với tên gốc trong danh sách `suggestedTopics`. Code ở `graph-engine.ts` so sánh `u.bestTopic` với danh sách nhưng không tìm thấy match, nên `best_topic` rơi về topic đầu tiên -- người dùng không phân biệt được.

2. **UI thiếu phần hiển thị rõ ràng**: `TopicSuggestionsCard` chỉ dùng một ngôi sao nhỏ và viền nhạt để đánh dấu topic được chọn, rất dễ bỏ qua.

## Kế hoạch sửa

### 1. Thêm "Selected Topic Banner" vào TopicSuggestionsCard
- File: `src/components/topic/chatbot/TopicSuggestionsCard.tsx`
- Thêm một banner nổi bật ở đầu card khi có `selectedTopic`, hiển thị rõ ràng: icon Star + "Topic được chọn: [tên topic]" với background primary, font bold
- Nếu `selectedTopic` khác với tất cả topic trong danh sách (trường hợp refined), vẫn hiển thị banner riêng phía trên danh sách

### 2. Truyền refined topic đúng từ backend
- File: `supabase/functions/_shared/graph/graph-engine.ts`
- Khi emit `topic_suggestions`, dùng trực tiếp `u.bestTopic` thay vì cố match với danh sách `normalizedTopics`. Nếu `u.bestTopic` không khớp danh sách (do đã refined), vẫn gửi nguyên giá trị refined về frontend

### 3. Hiển thị refined variants (nếu có)
- File: `src/components/topic/chatbot/types.ts` -- thêm `refinedVariants?: { topic: string; angle: string }[]` vào `ChatMessage`
- File: `supabase/functions/_shared/graph/graph-engine.ts` -- emit `refinedVariants` trong event `topic_suggestions`
- File: `src/hooks/useChatStreaming.ts` -- đọc `parsed.data.refined_variants` và lưu vào message
- File: `src/components/topic/chatbot/TopicSuggestionsCard.tsx` -- hiển thị các biến thể refined dưới banner topic được chọn (optional, collapsible)

### Chi tiết kỹ thuật

**graph-engine.ts** (line ~738):
```typescript
// Trước: cố match refined name với raw list → fail
const normalizedBestTopic = normalizedTopics.find(...)?.topic || normalizedTopics[0]?.topic;

// Sau: dùng trực tiếp bestTopic từ research node (đã refined)
const normalizedBestTopic = u.bestTopic || normalizedTopics[0]?.topic || undefined;
```

Thêm `refined_variants` vào event data:
```typescript
data: {
  topics: normalizedTopics,
  best_topic: normalizedBestTopic,
  refined_variants: u.researchData?.refinedVariants || [],
}
```

**TopicSuggestionsCard.tsx** -- thêm banner:
```tsx
{selectedTopic && (
  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/15 border border-primary/30">
    <Star className="w-4 h-4 text-primary fill-primary" />
    <div>
      <p className="text-[10px] text-primary/70 font-medium">Topic duoc chon</p>
      <p className="text-sm font-semibold text-primary">{selectedTopic}</p>
    </div>
  </div>
)}
```

**Tác động**: 4 file frontend + 1 file backend. Không ảnh hưởng logic Content Agent hay Blackboard.
