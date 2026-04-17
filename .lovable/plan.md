<final-text>
## Kết luận
Backend hiện **đã sinh mô tả dài đúng yêu cầu**. Dữ liệu cache mới của `topic-ai` đang dùng key `topic-suggestions-v10-long` và `reasoning` thực tế đang ở khoảng **641–710 ký tự**.

Vì vậy, vấn đề bạn thấy “vẫn ngắn” là ở **UI hiển thị**, không phải ở AI generation.

Trong màn hình hiện tại:
- phần viền đỏ trong ảnh là **title/topic**, không phải `reasoning`;
- chip chủ đề đang bị cắt ngắn;
- popup hover quá hẹp để đọc đoạn 300+ ký tự;
- khi chọn gợi ý, form chỉ điền **`topic`** vào ô nhập, còn **`reasoning`** không được giữ lại để hiển thị;
- bộ đếm `0/300` là **độ dài ô nhập chủ đề**, không phải độ dài mô tả AI.

## Plan

### 1. Sửa UI hiển thị gợi ý chủ đề
Thay vì chỉ dựa vào tooltip hover, thêm một vùng preview rõ ràng ngay trong bước “Chủ đề” để hiển thị:
- tiêu đề đầy đủ,
- mô tả `reasoning` đầy đủ,
- điểm số chính.

Tooltip vẫn giữ để xem nhanh, nhưng nội dung dài sẽ có chỗ hiển thị ổn định.

### 2. Giữ lại đầy đủ dữ liệu của suggestion khi user chọn
Hiện tại click vào suggestion chỉ truyền `suggestion.topic`.

Tôi sẽ đổi luồng chọn để giữ cả:
- `topic`
- `reasoning`
- `scores`
- metadata liên quan

Sau đó hiển thị một block kiểu:
- “Lý do AI gợi ý chủ đề này”
- “Giải thích chi tiết”

ngay dưới ô nhập chủ đề, để bạn luôn thấy đoạn 300+ ký tự sau khi chọn.

### 3. Làm rõ UX để tránh hiểu nhầm
Điều chỉnh label/helper text để phân biệt:
- **Ô chủ đề** = tiêu đề ngắn để tạo nội dung
- **Mô tả AI** = phần giải thích dài 300+ ký tự

Đồng thời đổi wording quanh counter `0/300` để không gây hiểu nhầm rằng đây là số ký tự của mô tả AI.

### 4. Giữ nguyên backend prompt hiện tại
Không tiếp tục chỉnh prompt của `topic-ai` nữa ở vòng này, vì logs/cache đã xác nhận backend trả về đủ dài rồi. Tập trung sửa đúng chỗ là UI + state flow.

## Chi tiết kỹ thuật
- `supabase/functions/topic-ai/index.ts`: không cần sửa thêm cho case này.
- `src/components/TopicSuggestionPanel.tsx`:
  - đang truncate title;
  - tooltip đang `max-w-xs`, không phù hợp cho reasoning dài;
  - click handler chỉ gửi `suggestion.topic`.
- `src/components/multichannel/MultiChannelFormWizard.tsx`:
  - hiện chỉ set `formData.topic`;
  - cần lưu selected suggestion metadata và render preview reasoning.
- `src/components/multichannel/MultiChannelFormStepper.tsx`:
  - nên đồng bộ cùng cách xử lý để tránh lệch behavior giữa các biến thể UI.

## Result sau khi làm
- Bạn sẽ thấy **đúng đoạn mô tả dài 300+ ký tự** ngay trên màn hình bước Chủ đề.
- Sau khi chọn suggestion, phần mô tả dài **không bị mất** nữa.
- Không cần nghi ngờ backend nữa; vấn đề sẽ được xử lý đúng ở phần hiển thị và tương tác.
</final-text>