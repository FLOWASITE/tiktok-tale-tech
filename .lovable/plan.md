<final-text>## Sửa triệt để lỗi Kho chủ đề chưa lưu/cập nhật topic mới

### Mình đã xác định đúng nguyên nhân
- Backend tạo topic vẫn chạy, và Kho hiện đã lọc đúng theo Brand hiện tại.
- Vấn đề chính nằm ở frontend:
  1. `useTopicAI` có hàm `autoSaveSuggestions`, nhưng hiện không được gọi ở đâu nên nhiều topic mới chỉ hiện trên UI chứ chưa được lưu vào `topic_history`.
  2. `TopicSuggestionPanel` chỉ refetch Kho khi `suggestions.length` thay đổi. AI thường vẫn trả cùng 8 topic, nên refresh ra batch mới nhưng Kho không cập nhật.
  3. Logic chống trùng đang quá rộng: chỉ check theo `topic + organization`, chưa theo `brand_template_id / content_goal / format`, nên có thể chặn lưu sai cho Brand hiện tại.

### Phạm vi sửa
1. `src/hooks/ai/useTopicAI.ts`
- Gọi auto-save ngay sau khi fetch suggestions thành công.
- Chỉ lưu các topic thật sự mới trong đúng ngữ cảnh hiện tại.
- Reset `autoSavedTopicsRef` khi đổi `brandTemplateId`, `contentGoal`, hoặc `format`.
- Siết dedupe theo:
  - `organization_id`
  - `brand_template_id`
  - `content_goal`
  - `format`

2. `src/components/TopicSuggestionPanel.tsx`
- Bỏ trigger refresh theo `suggestions.length`.
- Đổi sang trigger theo nội dung batch topic mới hoặc theo tín hiệu save thành công, để cùng 8 topic nhưng khác nội dung vẫn refetch Kho.
- Giữ delay ngắn sau save để tránh refetch trước khi insert xong.

3. Đồng bộ tín hiệu save giữa hook và UI
- Nếu cần, truyền `autoSavedCount` xuống panel để chỉ refresh khi save thành công thật sự.
- Chỗ này có thể cần nối thêm qua các component đang bọc panel.

### Kết quả mong đợi
- Refresh ra topic mới thì Kho chủ đề cũng lưu và cập nhật ngay.
- Batch mới vẫn 8 topic nhưng khác nội dung thì Kho vẫn refetch đúng.
- Topic trùng text ở Brand khác không còn chặn lưu vào Brand hiện tại.
- Kho tiếp tục chỉ hiển thị topic của Brand đang chọn.

### Chi tiết kỹ thuật
- Không cần đổi database.
- File chắc chắn cần sửa:
  - `src/hooks/ai/useTopicAI.ts`
  - `src/components/TopicSuggestionPanel.tsx`
- Có thể cần sửa thêm nếu truyền tín hiệu save xuống UI:
  - `src/components/MultiChannelForm.tsx`
  - `src/components/topic/TopicIdeaHub.tsx`
  - các form khác dùng cùng panel để fix đồng bộ toàn app

### QA sau khi làm
- Vào `/multichannel/new`, chọn 1 Brand.
- Ghi lại số topic hiện có trong Kho.
- Refresh 2-3 lần để sinh batch mới, kể cả khi mỗi batch vẫn cùng số lượng.
- Kiểm tra Kho tăng thêm đúng các topic mới vừa sinh.
- Đổi sang Brand khác trong cùng workspace để chắc dedupe không chặn chéo Brand.
- Quay lại Brand cũ và xác nhận Kho chỉ hiện topic của Brand đó.</final-text>