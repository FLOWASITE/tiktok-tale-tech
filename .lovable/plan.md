
# Cập nhật footer overlay để tự wrap theo ratio và né logo/mép

## Mục tiêu
Nâng `footer` trong `overlay-text-canvas` để:

- tự chọn giữa:
  - `2 hàng` cho khung vuông / portrait vừa
  - `vertical compact` cho khung hẹp / footer dài / logo chiếm chỗ
- không đè lên logo ở các vị trí đáy
- không chạm mép trái/phải
- vẫn giữ pipeline hiện tại: AI render phần chính, canvas render footer

## Hiện trạng đã xác nhận
Có 2 điểm đang làm footer dễ vỡ:

1. `SimpleImageGenerator.tsx`
- đang luôn gửi `footerOverlay.layout = 'simple'`
- chưa có hint nào cho wrap mode theo ratio

2. `supabase/functions/overlay-text-canvas/index.ts`
- footer hiện render bằng 1 thanh ngang:
  - `display: flex`
  - `justifyContent: center`
  - `gap: 16`
  - không có `flexWrap`
  - không có mode `two-row` hay `vertical compact`
- safe-area mới chỉ tăng `paddingLeft/paddingRight` theo `logoMeta.position === bottom-left/right`
- chưa có logic:
  - đo mật độ footer theo ratio
  - đổi layout khi khung là `1:1`, `4:5`, `9:16`
  - tăng đáy an toàn khi logo ở `bottom-center`

## Cách triển khai

### 1) Thêm footer ratio profile trong `overlay-text-canvas`
Trong `supabase/functions/overlay-text-canvas/index.ts`, tạo helper chuyên cho footer, ví dụ:

- `getFooterLayoutProfile(imageWidth, imageHeight, footerItems, logoMeta)`

Profile nên trả về:
- `mode`: `'single-row' | 'two-row' | 'vertical-compact'`
- `fontSize`
- `itemGap`
- `rowGap`
- `paddingX`
- `paddingY`
- `maxItemWidth`
- `justifyContent`
- `alignItems`
- `allowWrap`
- `minBottomClearance`

Rule gợi ý:
- `16:9`:
  - ưu tiên `single-row`
  - nếu text dài hoặc có 4 items thì chuyển `two-row`
- `1:1`:
  - mặc định `two-row`
  - nếu item dài + logo ở đáy thì `vertical-compact`
- `4:5`:
  - ưu tiên `two-row`
  - nếu address/email dài thì `vertical-compact`
- `9:16`:
  - ưu tiên `vertical-compact`
  - chỉ dùng `two-row` khi footer ngắn

### 2) Tính “footer crowding” thay vì chỉ nhìn ratio
Ngoài ratio, thêm heuristic theo độ dài thực tế:

- tổng số ký tự footer
- item dài nhất
- số item
- có `address` dài hay không
- logo ở vùng đáy hay không

Ví dụ:
- `totalChars > ngưỡng`
- hoặc `longestItem > ngưỡng`
- hoặc `logo.position` nằm ở `bottom-*`
thì footer phải hạ từ `single-row` xuống `two-row` hoặc `vertical-compact`.

Điều này giúp cùng là `4:5` nhưng footer ngắn vẫn 2 hàng đẹp, footer dài thì tự chuyển dọc gọn.

### 3) Sửa safe-area cho logo ở toàn bộ vùng đáy
Hiện tại footer chỉ né `bottom-left` và `bottom-right`.

Cần mở rộng:
- `bottom-left` → tăng `paddingLeft`
- `bottom-right` → tăng `paddingRight`
- `bottom-center` → tăng:
  - `paddingBottom` hoặc `minHeight`
  - khoảng cách nội dung footer với vùng giữa đáy
  - nếu cần, ép mode `two-row` / `vertical-compact`

Với `bottom-center`, không nên chỉ tăng CTA phía trên; footer cũng phải biết vùng giữa đáy đang bị logo chiếm.

### 4) Refactor render footer từ “1 hàng cứng” sang “adaptive block”
Đổi block footer hiện tại thành container thích ứng:

#### Mode A — single-row
Dùng cho:
- `16:9`
- footer ngắn
- logo không chiếm quá nhiều không gian đáy

Behavior:
- 1 hàng ngang
- item spacing nhỏ hơn hiện tại
- mỗi item có `maxWidth`
- text wrap nội bộ nếu cần

#### Mode B — two-row
Dùng cho:
- `1:1`, `4:5`
- hoặc footer trung bình/dài

Behavior:
- `flexWrap: 'wrap'`
- item rộng khoảng `45%` hoặc theo tính toán profile
- canh giữa
- row gap nhỏ
- address dài có thể chiếm full width nếu cần

#### Mode C — vertical-compact
Dùng cho:
- `9:16`
- footer dài
- logo ở vùng đáy
- contact-heavy layout

Behavior:
- `flexDirection: 'column'`
- `alignItems: 'flex-start'` hoặc `'center'` tùy ratio
- mỗi item là một dòng riêng
- font nhỏ hơn một nấc
- spacing dọc chặt hơn nhưng vẫn rõ ràng

### 5) Chuẩn hóa thứ tự và ưu tiên item footer
Để footer compact hơn, chuẩn hóa thứ tự hiển thị:
- phone
- website
- email
- address

Nếu cần chế độ compact:
- address xuống dòng cuối
- address có thể dùng width lớn hơn / full width
- item quan trọng giữ ở dòng đầu

Điều này giảm nguy cơ một address dài làm vỡ toàn bộ footer.

### 6) Cập nhật typing để hỗ trợ footer mode rõ ràng
Trong `src/hooks/useAutoImageGeneration.ts`:
- mở rộng `footerOverlay` typing để cho phép metadata nhẹ nếu cần, ví dụ:
  - `footerMode?: 'auto' | 'single-row' | 'two-row' | 'vertical-compact'`

Trong `SimpleImageGenerator.tsx`:
- giữ mặc định `footerMode: 'auto'`
- vẫn để backend renderer tự quyết theo `imageWidth/imageHeight + logoMeta + footer text`

Nếu không muốn tăng schema nhiều, có thể không truyền field mới và để function tự suy hoàn toàn. Nhưng tốt nhất nên thêm `auto` để contract rõ ràng.

### 7) Giữ tương thích ngược
Không đổi behavior của:
- simple text overlay cũ
- structured overlay khác ngoài footer
- manual image pipeline hiện tại

Chỉ thay phần render `elements.footer`:
- input cũ vẫn dùng được
- nếu client chưa truyền mode mới thì mặc định `auto`

## Files cần sửa
- `supabase/functions/overlay-text-canvas/index.ts`
  - chính: adaptive footer layout, crowding heuristics, logo-safe handling
- `src/hooks/useAutoImageGeneration.ts`
  - typing cho footer overlay nếu thêm `footerMode`
- `src/components/multichannel/SimpleImageGenerator.tsx`
  - truyền `footerMode: 'auto'` trong `footerOverlay`

## QA bắt buộc sau khi implement

### Ratio 16:9
- footer 2–3 item ngắn → 1 hàng
- footer 4 item hoặc có address → tự xuống 2 hàng
- logo `bottom-right` không đè website/email

### Ratio 1:1
- footer mặc định 2 hàng ổn định
- không chạm mép trái/phải
- logo `bottom-left/right` không cắn vào item đầu/cuối

### Ratio 4:5
- footer contact-heavy → 2 hàng hoặc vertical compact
- address dài không làm tràn ngang
- CTA phía trên không đè footer

### Ratio 9:16
- footer dài → vertical compact
- giữ readable, không bị ép 1 hàng
- logo `bottom-center` không chồng lên footer

### Regression
- brand không có footer → skip bình thường
- footer chỉ 1 item → không bị render quá cao
- layout mới như `testimonial_card`, `timeline_steps`, `contact_card` vẫn render sạch

## Kết quả mong muốn
Sau khi cập nhật:

- footer tự thích nghi đúng theo `1:1`, `4:5`, `16:9`, `9:16`
- footer dài sẽ tự xuống `2 hàng` hoặc `vertical compact`
- logo ở vùng đáy không còn đè footer
- footer không chạm mép và giữ được độ đọc tốt trên các layout social mới
