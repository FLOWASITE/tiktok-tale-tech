

## Tối ưu tốc độ "Ý tưởng chủ đề" trong Nội dung đa kênh

### Nguyên nhân chậm

Luồng hiện tại khi cache miss:

```text
800ms debounce → Cache+Learning (DB) → Web search x2 (3-8s mỗi call) → AI LLM (5-15s) → Parse + Cache
```

Tổng: **10-25 giây**. User chỉ thấy 6 skeleton pills không có thông tin gì.

### Thay đổi

**1. Frontend: Loading phases thay skeleton (`TopicSuggestionPanel.tsx`)**

Thay 6 skeleton pills bằng loading card hiển thị giai đoạn xử lý theo thời gian:
- 0-2s: "🔍 Đang phân tích thương hiệu..."
- 2-5s: "📊 Đang tìm xu hướng ngành..."
- 5s+: "✨ Đang tạo ý tưởng..."

Dùng `useState` + `useEffect` với timer để chuyển phase tự động.

**2. Frontend: Giảm debounce (`useTopicAI.ts`)**

Giảm debounce từ 800ms xuống 300ms (line 909). Cache hit trả về gần như ngay lập tức nên debounce dài không cần thiết.

**3. Backend: Timeout web search giảm xuống 4s (`topic-utils.ts`)**

Giảm timeout cho `searchIndustryData` và `searchAudienceQuestions` từ 5s xuống 4s. Nếu web search chậm, bỏ qua gracefully — topic suggestions vẫn hoạt động nhờ AI LLM.

### File cần sửa
- `src/components/TopicSuggestionPanel.tsx` — loading phases UI
- `src/hooks/ai/useTopicAI.ts` — giảm debounce 800→300ms
- `supabase/functions/_shared/topic-utils.ts` — timeout 5s→4s

### Kết quả
- User thấy phản hồi ngay (loading phases thay skeleton)
- Giảm ~1.5s (debounce + timeout)
- Perceived performance tốt hơn nhiều nhờ progress indication

