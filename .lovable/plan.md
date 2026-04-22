
# Tối ưu prompt Telegram để bài viết bớt rập khuôn và có “giọng viết” rõ hơn

## Mục tiêu
Cải thiện luồng chat trực tiếp trên Telegram để khi user nói “tạo bài viết”, hệ thống không còn đẻ ra nội dung na ná nhau, không lặp kiểu hook “90%…”, và có thêm một lớp định hướng rõ về **mục tiêu/giọng viết** như:

- Bán hàng
- Xây thương hiệu
- Tăng tương tác
- Chia sẻ giá trị
- Kéo khách (tạo lead)

## Vấn đề đã xác định trong code hiện tại

### 1) Telegram single-post đang gọi `generate-multichannel` quá “trần”
Trong `supabase/functions/telegram-webhook/index.ts`, hàm `handleGenerateSingle()` hiện chỉ gửi:
- `topic`
- `channels`
- `organizationId`
- `brandTemplateId`
- `userId`
- `qualityMode`
- `agentMode`
- `useTopicAsTitle`
- `skipCache`

Nhưng **không truyền**:
- `contentGoal`
- `contentAngle`
- `contentRole`

Kết quả là downstream phải tự default, nên output dễ bị đồng dạng.

### 2) Intent classifier chưa hiểu “giọng viết/mục tiêu bài”
`supabase/functions/_shared/telegram-intent.ts` hiện chỉ phân loại:
- `generate_single`
- `generate_campaign`
- `status`
- `help`
- `chitchat`

Với `generate_single`, nó mới trích:
- `prompt`
- `channel`

Chưa có trường nào cho:
- mục tiêu bài viết
- tone/mode mong muốn
- style viết theo intent kinh doanh

### 3) Help/onboarding chưa dạy user cách ra lệnh tốt hơn
`helpText()` trong `telegram-webhook/index.ts` mới dạy user kiểu:
- “viết 1 bài Facebook về...”
- “campaign 2 tuần...”

Chưa gợi ý user có thể nói:
- “viết theo hướng bán hàng”
- “theo kiểu xây thương hiệu”
- “mục tiêu tăng tương tác”
- “viết để kéo lead”

## Cách triển khai

## 1) Thêm lớp “writing goal” cho Telegram single-post
Mở rộng intent/result cho Telegram để `generate_single` có thể mang thêm metadata:

- `writing_goal`: một trong
  - `sales`
  - `branding`
  - `engagement`
  - `value`
  - `lead`

Không sửa DB, chỉ bổ sung dữ liệu điều hướng trong edge flow.

### Mapping đề xuất
Để tận dụng pipeline sẵn có của `generate-multichannel`, map sang chiến lược hiện hữu:

- `sales` → `contentGoal: "conversion"` + `contentRole: "harvest"` + `contentAngle: "promotional"`
- `branding` → `contentGoal: "awareness"` + `contentRole: "seed"` + `contentAngle: "storytelling"`
- `engagement` → `contentGoal: "engagement"` + `contentRole: "sprout"` + `contentAngle: "qa_faq"`
- `value` → `contentGoal: "education"` + `contentRole: "sprout"` + `contentAngle: "educational"`
- `lead` → `contentGoal: "conversion"` + `contentRole: "harvest"` + `contentAngle: "social_proof"` hoặc `promotional`

Mục tiêu là **không viết logic generate mới**, chỉ bơm đúng tham số vào pipeline đã có.

## 2) Nâng cấp prompt của intent classifier
Trong `supabase/functions/_shared/telegram-intent.ts`:

### Bổ sung rule nhận diện
Classifier cần hiểu các cụm như:
- “viết theo kiểu bán hàng”
- “theo hướng xây thương hiệu”
- “để tăng tương tác”
- “chia sẻ giá trị”
- “để kéo khách / lấy lead”

### Mở rộng tool schema
Với `generate_single`, cho phép trả thêm:
- `writing_goal`

### Rule ưu tiên
- Nếu user nói rõ mục tiêu viết → phải trích đúng `writing_goal`
- Nếu user không nói → để trống, sau đó webhook tự fallback hợp lý
- Không đổi intent chỉ vì có `writing_goal`; đây là metadata đi kèm `generate_single`

## 3) Thêm heuristic fallback ở `handleGenerateSingle()`
Trong `supabase/functions/telegram-webhook/index.ts`:

### Nhận thêm `writingGoal`
Mở rộng `handleGenerateSingle()` để nhận:
- `writingGoal?: "sales" | "branding" | "engagement" | "value" | "lead"`

### Fallback khi classifier không trích được
Nếu AI không trả `writing_goal`, thêm một lớp fallback nhẹ từ raw text:
- có “bán”, “chốt đơn”, “mua ngay”, “ưu đãi” → `sales`
- có “thương hiệu”, “nhận diện”, “ghi nhớ” → `branding`
- có “comment”, “tương tác”, “thảo luận” → `engagement`
- có “kiến thức”, “giá trị”, “chia sẻ”, “tips” → `value`
- có “lead”, “đăng ký”, “inbox”, “để lại thông tin” → `lead`

### Truyền xuống `generate-multichannel`
Khi gọi function, bổ sung:
- `contentGoal`
- `contentRole`
- `contentAngle`

Đây là thay đổi quan trọng nhất để output bớt generic.

## 4) Giảm pattern lặp kiểu “90%...”
Không cần đụng shared global prompt. Chỉ cần siết trong Telegram flow:

### Ở bước tạo topic AI (`suggestTopicFromAI`) hoặc trước khi generate
Bổ sung chỉ dẫn riêng cho Telegram single-post:
- tránh mở bài theo công thức số liệu sáo mòn lặp lại
- không mặc định dùng pattern “90% người…”
- ưu tiên đa dạng hook:
  - câu hỏi
  - insight trái chiều
  - tình huống thực tế
  - before/after
  - lỗi thường gặp
  - checklist ngắn
  - góc nhìn chuyên gia
  - mini story

### Mục tiêu
Không cấm tuyệt đối hook số liệu, nhưng **không cho dùng mặc định lặp đi lặp lại**.

## 5) Cập nhật help text để user biết cách ra lệnh mới
Trong `helpText()` của `telegram-webhook/index.ts`, thêm ví dụ rõ:

- “Viết 1 bài Facebook về serum mới theo hướng bán hàng”
- “Tạo caption Instagram xây thương hiệu cho spa”
- “Viết bài tăng tương tác cho fanpage”
- “Viết bài chia sẻ giá trị về chăm sóc da”
- “Tạo bài kéo khách để lấy lead cho gói trị nám”

Mục tiêu là dạy user cách điều khiển output bằng câu tự nhiên, không cần form.

## 6) Logging chẩn đoán để đánh giá prompt mới
Thêm log gọn trong Telegram webhook:
- `writing_goal`
- mapped `contentGoal`
- mapped `contentRole`
- mapped `contentAngle`

Giúp debug nhanh khi user nói “em đã chọn bán hàng mà bài vẫn thiên branding”.

## Files cần sửa
- `supabase/functions/_shared/telegram-intent.ts`
- `supabase/functions/telegram-webhook/index.ts`

## Không cần sửa
- DB schema
- frontend card/UI
- `generate-multichannel` core logic
- shared `_shared/content-agent.ts` và các prompt dùng toàn hệ thống

## Kết quả mong muốn sau khi xong
Khi user chat Telegram kiểu:
- “Viết 1 bài Facebook bán hàng cho serum trị mụn”
- “Tạo bài Instagram theo hướng xây thương hiệu”
- “Viết post tăng tương tác cho spa”
- “Viết bài chia sẻ giá trị về chống nắng”
- “Tạo bài kéo khách để lấy lead”

thì bot sẽ:
1. hiểu đúng mục tiêu bài viết
2. map sang strategy phù hợp
3. tạo nội dung khác nhau rõ rệt theo intent
4. giảm đáng kể tình trạng bài nào cũng cùng một khung và cùng pattern “90%...”

## QA sau implement

### Case 1 — Bán hàng
Input:
`Viết 1 bài Facebook bán hàng cho serum trị mụn`

Kỳ vọng:
- có CTA rõ hơn
- thiên chuyển đổi
- không viết kiểu giáo dục chung chung

### Case 2 — Xây thương hiệu
Input:
`Tạo 1 caption Instagram xây thương hiệu cho spa`

Kỳ vọng:
- tone mềm hơn
- tăng nhận diện/thấu cảm
- không push chốt sale quá sớm

### Case 3 — Tăng tương tác
Input:
`Viết bài Facebook tăng tương tác về thói quen skincare sai lầm`

Kỳ vọng:
- có câu hỏi/kêu gọi bình luận
- mở bài kích thích thảo luận
- không quá quảng cáo

### Case 4 — Chia sẻ giá trị
Input:
`Viết bài chia sẻ giá trị về cách chọn serum cho da nhạy cảm`

Kỳ vọng:
- thiên kiến thức
- có cấu trúc hữu ích
- giọng chuyên gia, ít bán hàng

### Case 5 — Kéo khách / lead
Input:
`Tạo bài kéo khách cho liệu trình trị nám, mục tiêu lấy lead`

Kỳ vọng:
- CTA tạo inbox/đăng ký/tư vấn
- vẫn hợp lý, không spam
- khác rõ với mode “sales” thuần

### Case 6 — Không chỉ định mục tiêu
Input:
`Viết 1 bài Facebook về serum mới`

Kỳ vọng:
- vẫn generate được bình thường
- fallback hợp lý
- không lỗi nếu thiếu `writing_goal`

### Case 7 — Chống lặp hook
Tạo 5 bài liên tiếp với 5 prompt khác nhau trên Telegram.

Kỳ vọng:
- không bị bài nào cũng mở bằng pattern “90%…”
- hook đa dạng hơn giữa các bài
