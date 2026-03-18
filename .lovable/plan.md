

# Fix chip quick-action cho nội dung đa kênh — truyền category context vào suggestion fetch

## Vấn đề
Khi click chip (Viral tuần này, Theo trend...) trong form đa kênh, `refreshSuggestions()` được gọi nhưng KHÔNG truyền category context. API `topic-ai` nhận cùng params (contentGoal, brandTemplateId) → trả về kết quả cached giống hệt → user thấy suggestions không đổi.

## Giải pháp

### 1. `src/hooks/ai/useTopicAI.ts`
- Thêm param `categoryHint?: string` vào `fetchSuggestions` và `refreshSuggestions`
- Truyền `categoryHint` vào body request gọi edge function `topic-ai`
- Khi có `categoryHint`, thay đổi cache key để tránh trả về kết quả cũ

### 2. `src/hooks/useEnhancedTopicSuggestions.ts`
- Cập nhật return type để expose `refresh(categoryHint?)` với param mới

### 3. `src/components/topic/TopicIdeaHub.tsx`
- Cập nhật `onCategoryRefresh` type thành `(category: string) => void` (đã có)
- Không cần thay đổi thêm

### 4. `src/components/multichannel/MultiChannelFormWizard.tsx` & `MultiChannelFormStepper.tsx`
- Cập nhật handler `onCategoryRefresh` để gọi `refreshSuggestions(category)` thay vì `refreshSuggestions()`

### 5. `supabase/functions/topic-ai/index.ts`
- Nhận `categoryHint` từ body request
- Inject category context vào prompt AI (ví dụ: "Hãy gợi ý các chủ đề theo hướng Viral tuần này")
- Đảm bảo `forceRefresh: true` khi có `categoryHint` để bypass cache

### Luồng sau khi fix
```text
Click chip "Viral tuần này"
  → chip hiện spinner + highlight
  → gọi refreshSuggestions("Viral tuần này")
  → fetchSuggestions(true, "Viral tuần này")
  → topic-ai API nhận categoryHint, inject vào prompt
  → AI trả về suggestions liên quan đến viral
  → suggestions panel cập nhật với kết quả mới
  → spinner tắt
```

### File sửa
- `src/hooks/ai/useTopicAI.ts` — thêm categoryHint param
- `src/hooks/useEnhancedTopicSuggestions.ts` — forward param
- `src/components/multichannel/MultiChannelFormWizard.tsx` — truyền category
- `src/components/multichannel/MultiChannelFormStepper.tsx` — truyền category
- `supabase/functions/topic-ai/index.ts` — nhận và sử dụng categoryHint trong prompt

