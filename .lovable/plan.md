
## Vấn đề
Badge counter `96/400 ký tự tiêu đề` ở góc dưới-phải textarea "Chủ đề / Ý tưởng" hiện gần như **vô hình** trên nền trắng. Trong ảnh user gửi chỉ còn vệt mờ (gạch đỏ).

Nguyên nhân: badge dùng `bg-background/90 backdrop-blur` + `variant="secondary"` → trên nền card trắng thì cả nền lẫn chữ đều xám nhạt, khó đọc.

## Plan sửa (1 file, 1 dòng)

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx` (~dòng 1142-1148)

Đổi style Badge cho counter:
- Bỏ `variant="secondary"` (xám-trên-xám).
- Dùng nền `bg-muted` đậm hơn + `text-foreground` để chữ đen rõ.
- Thêm `border border-border` để tách khỏi textarea.
- Giữ `pointer-events-none` và vị trí `absolute right-3 bottom-2`.

Kết quả: counter hiển thị rõ ràng như cũ, đọc được số ký tự ngay khi gõ.

## File sẽ sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — chỉ đổi className của Badge counter.
