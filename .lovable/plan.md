<final-text>1. Tôi đã kiểm tra trực tiếp preview: popover “Đã tạo” hiện ra bình thường, có header, filter, list và link sang Kho Ý tưởng. Vậy lỗi không nằm ở UI render, mà nằm ở luồng dữ liệu.

2. Gốc lỗi hiện tại:
- Route đang dùng là `MultiChannelFormWizard`, không phải `MultiChannelForm` cũ.
- Click vào topic gợi ý hiện chỉ `set topic text`, chưa tạo hoặc gắn `topic_history` tương ứng.
- `topicHistoryId` trong `MultiChannelCreate` chỉ lấy từ `location.state`, không được cập nhật khi user chọn topic ngay trong wizard.
- Vì thiếu `topicHistoryId`, đoạn `createLink(...)` sau khi generate xong không chạy đúng row, nên status trong “Đã tạo” không chuyển sang `created`.
- Ngoài ra `autoSaveSuggestions` đã có sẵn trong `useTopicAI` nhưng chưa được gọi, nên các chủ đề AI đang show ra cũng chưa được đẩy vào lịch sử để popover phản ánh ngay.

3. Kế hoạch sửa:
- Trong `src/hooks/useTopicHistory.ts`, thêm helper kiểu `ensureSelectedTopic(...)`: tìm row topic theo org/topic/format; nếu đã có thì update sang `selected`, nếu chưa có thì insert mới với status `selected`, rồi trả về `topicHistoryId`.
- Trong `src/hooks/ai/useTopicAI.ts`, gọi luôn `autoSaveSuggestions(...)` sau khi fetch suggestions thành công để các topic đang hiển thị cũng xuất hiện trong “Đã tạo/Kho Ý tưởng” với trạng thái `draft`.
- Trong `src/components/TopicSuggestionPanel.tsx`:
  - click topic gợi ý -> gọi helper ở trên để lấy `topicHistoryId`, rồi trả cả `topic` + `topicHistoryId` lên parent
  - click item trong popover history -> dùng chính `item.id`, update `selected`, rồi trả cả `topic` + `topicHistoryId`
- Trong `src/components/topic/TopicIdeaHub.tsx`, đổi callback `onSelect` để forward thêm `topicHistoryId`.
- Trong `src/components/multichannel/MultiChannelFormWizard.tsx`, nhận `topicHistoryId` từ TopicIdeaHub và đẩy ngược lên parent/page state.
- Trong `src/pages/MultiChannelCreate.tsx`, cập nhật state `topicHistoryId` khi user chọn topic; lúc generate xong thì `createLink(...)` hiện có sẽ tự đánh dấu row đó thành `created`.
- Thêm logic clear `topicHistoryId` khi user gõ topic tay khác hẳn topic đã chọn, tránh link nhầm row cũ.

4. File sẽ đụng:
- `src/hooks/useTopicHistory.ts`
- `src/hooks/ai/useTopicAI.ts`
- `src/components/TopicSuggestionPanel.tsx`
- `src/components/topic/TopicIdeaHub.tsx`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/pages/MultiChannelCreate.tsx`
- Và các caller dùng chung signature để không vỡ type: `MultiChannelFormStepper.tsx`, `ScriptFormStepper.tsx`, `CarouselForm.tsx`, `MultiChannelForm.tsx` nếu còn nằm trong build

5. QA bắt buộc sau khi sửa:
- Vào `/multichannel/new`
- Xác nhận các topic AI vừa hiển thị cũng xuất hiện trong popover “Đã tạo”
- Click 1 topic gợi ý -> topic điền vào ô nhập, row tương ứng thành `selected`
- Generate xong -> đúng row đó chuyển sang `created`
- Click 1 item ngay trong popover -> generate xong vẫn update đúng row, không tạo duplicate sai org/brand
- Nếu insert/update không chạy, kiểm tra và sửa luôn RLS cho `topic_history` và `topic_content_links`</final-text>