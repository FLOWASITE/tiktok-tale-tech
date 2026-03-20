

# Sửa lỗi: Brand colors không xuất hiện trong colorLayout và fullPrompt

## Vấn đề gốc

Trong `generate-carousel/index.ts`, `brandColorDirective` chỉ yêu cầu AI dùng brand colors trong `fullPrompt` nhưng **không ép vào `colorLayout`**. AI tự chọn "Deep blue (#0A2540), electric teal (#00D4FF)" cho `colorLayout`, rồi `fullPrompt` cũng bị ảnh hưởng theo.

Dòng 481-486 hiện tại chỉ nói "accent colors chủ đạo" — quá mềm, AI vẫn tự ý chọn màu khác.

## Giải pháp — 1 file: `supabase/functions/generate-carousel/index.ts`

### 1. Tăng cường `brandColorDirective` (dòng ~478-487)

Thêm quy tắc bắt buộc cho `colorLayout`:

- `colorLayout` **PHẢI bắt đầu bằng** brand colors hex codes
- `fullPrompt` **PHẢI dùng** brand palette làm **color palette chính** (không chỉ accent)
- Thêm ví dụ cụ thể: nếu brand color là `#FF6B35`, thì `colorLayout` phải là `"Brand orange (#FF6B35), warm cream (#FFF5E6). High contrast."` — không được tự chọn Deep blue hay electric teal

### 2. Cập nhật schema description cho `colorLayout` (dòng ~845)

Thay description từ "Màu sắc và bố cục" thành "Màu sắc (PHẢI dùng brand palette) và bố cục"

### 3. Bổ sung vào phần format 7 thành phần (dòng ~635)

Thêm ghi chú tại `[4] colorLayout`: "PHẢI sử dụng brand colors làm màu chủ đạo. Không tự chọn màu khác."

## Kết quả mong đợi

- `colorLayout` sẽ hiển thị đúng mã hex brand (VD: `#FF6B35` thay vì `#0A2540`)
- `fullPrompt` sẽ tham chiếu brand palette thay vì tự chọn deep blue/teal
- Ảnh sinh ra sẽ phản ánh đúng màu thương hiệu từ gốc

