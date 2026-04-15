## ĐÃ HOÀN THÀNH: Liên kết topicHistoryId khi chọn topic gợi ý

### Vấn đề
Click vào topic gợi ý chỉ set text, không tạo/gắn `topic_history` row → `topicHistoryId` luôn undefined → `createLink()` sau generate không hoạt động → popover "Đã tạo" không cập nhật status.

### Giải pháp đã implement
1. **`useTopicHistory.ts`**: Thêm `ensureSelectedTopic(topic)` — tìm hoặc tạo row trong `topic_history`, trả về ID.
2. **`TopicSuggestionPanel.tsx`**: Click suggestion chip → gọi `ensureSelectedTopic` → trả `topicHistoryId` qua `onSelect`. Click history item → trả `item.id`.
3. **`TopicIdeaHub.tsx`**: Cập nhật signature `onSelect(topic, topicHistoryId?)`.
4. **`MultiChannelFormWizard.tsx`**: Thêm prop `onTopicHistoryIdChange`, forward từ TopicIdeaHub.
5. **`MultiChannelCreate.tsx`**: Nhận `topicHistoryId` qua callback, cập nhật state → `createLink()` hoạt động đúng sau generate.
