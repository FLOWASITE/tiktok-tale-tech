<final-text>## Sửa việc gợi ý topic lệch Mục tiêu nội dung và lệch Brand

### Mình đã rà code và thấy nguyên nhân thực tế
- `contentGoal` đã được truyền xuống và prompt hiện đã có phần `MỤC TIÊU NỘI DUNG BẮT BUỘC`, nên lỗi không còn nằm ở việc thiếu prop.
- Tuy nhiên prompt vẫn chưa có “khóa Brand” đủ mạnh: brand context đang ở dạng mô tả, chưa có rule bắt buộc kiểu “chỉ được tạo topic xoay quanh sản phẩm/pain points/content pillars của Brand”.
- Kết quả AI hiện được parse và dùng gần như nguyên trạng, chưa có bước lọc lại theo Brand + Goal. Nếu model drift, topic sai vẫn lọt qua và được lưu vào Kho.
- Ở form đa kênh, gợi ý có thể auto-fetch ngay sau khi load draft, trước khi `brandTemplateId` mặc định được set xong, nên request đầu tiên có thể chạy thiếu Brand context và sinh ra topic generic.
- Dữ liệu web search đang thiên về ngành chung, nên dễ kéo AI sang topic “đúng ngành nhưng không đúng Brand”.

### Phạm vi sửa
1. `src/components/MultiChannelForm.tsx`
- Chỉ bật auto-fetch topic suggestions khi đã có `brandTemplateId`.
- Nếu chưa chọn Brand, không gọi AI; hiển thị trạng thái chờ/chọn Brand thay vì gợi ý generic.
- Khi đổi Brand, ép fetch lại đúng ngữ cảnh Brand mới.

2. `supabase/functions/topic-ai/index.ts`
- Thêm section `MANDATORY BRAND ALIGNMENT` đứng trước cả phần content goal:
  - Topics phải bám `brand_name`, `UVP`, `content_pillars`, `products/services`, `persona pain points/desires`.
  - Cấm topic chỉ “đúng ngành” nhưng không gắn được với Brand offering.
  - Cấm topic trend chung chung nếu không thể nối về sản phẩm/dịch vụ/góc chuyên môn của Brand.
- Làm rõ ma trận Goal × Funnel × Topic type:
  - education: how-to, giải thích, tips, TOFU/MOFU
  - awareness: brand story, values, behind-the-scenes
  - engagement: câu hỏi, tranh luận nhẹ, community/trend
  - expertise: phân tích, case study, framework, insights
  - conversion: comparison, testimonial, objection handling, offer, BOFU
- Bổ sung ví dụ đúng/sai cho cả “đúng Goal” và “đúng Brand”.

3. `supabase/functions/topic-ai/index.ts`
- Thêm bước hậu kiểm sau khi AI trả về:
  - Chấm/lọc từng topic theo tín hiệu Brand thực (pillar, product/service, persona pain point/desire, evergreen theme).
  - Kiểm tra fit với Goal đã chọn (funnelStage, topicType, ngôn ngữ CTA/story/how-to...).
  - Không tin hoàn toàn vào `scores.brandFit` do model tự chấm; dùng heuristic server-side để loại topic lệch.
- Nếu sau lọc còn quá ít topic hợp lệ, tự re-prompt 1 lần với danh sách lý do bị loại để bù đủ số lượng.

4. `supabase/functions/_shared/topic-utils.ts`
- Giảm ảnh hưởng của web search ngành chung:
  - Web insights chỉ là dữ liệu tham khảo, không được override Brand rules.
  - Làm query/context đầu vào brand-aware hơn bằng cách ưu tiên pain points / offerings / audience của Brand thay vì chỉ tên ngành chung.

### Kết quả mong đợi
- Đổi từ “Giáo dục” sang “Chuyển đổi” sẽ thấy khác rõ về funnel và kiểu topic.
- Cùng một ngành nhưng khác Brand vẫn ra bộ topic khác nhau.
- Topic generic kiểu “trend ngành chung” sẽ bị loại nếu không nối được về Brand.
- Các topic được lưu vào Kho sau đó cũng sạch hơn vì chỉ lưu topic đã qua lọc.

### Chi tiết kỹ thuật
- Không cần đổi database.
- File chính sẽ sửa:
  - `src/components/MultiChannelForm.tsx`
  - `supabase/functions/topic-ai/index.ts`
  - `supabase/functions/_shared/topic-utils.ts`
- Có thể tận dụng thêm các prompt utility sẵn có để tăng độ chặt cho brand/persona scoring, nhưng trọng tâm là:
  1) chặn fetch khi chưa có Brand,
  2) khóa Brand mạnh trong prompt,
  3) validate kết quả ở server trước khi trả về.

### QA sau khi làm
- Test cùng 1 Brand với 3 goal: Education / Awareness / Conversion.
- Refresh nhiều lần để chắc topic mới vẫn bám Brand, không drift sang topic ngành chung.
- Đổi sang Brand khác trong cùng ngành để chắc suggestions đổi theo Brand chứ không chỉ theo ngành.</final-text>