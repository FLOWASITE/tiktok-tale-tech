

# Di chuyển "Kiểu ảnh: Có text" vào phần tùy chọn nâng cao

## Thay đổi

Hiện tại, "Kiểu ảnh" (Ảnh nền / Có text) chiếm một bước riêng (Step 2) ngay trên form chính. Thay đổi này sẽ:

1. **Bỏ Step 2 "Kiểu ảnh" khỏi form chính** - Xóa block grid 2 nút "Ảnh nền" / "Có text" (dòng 426-455)
2. **Mặc định là `background_only`** - Giữ nguyên default hiện tại
3. **Chuyển tùy chọn "Có text" vào `ImageAdvancedOptions`** - Thêm một toggle/switch "Thêm text lên ảnh" trong phần Advanced Options
4. **Khi bật "Có text" trong Advanced**: Hiển thị các trường text input (shared/per-channel), text position, typography style ngay bên dưới toggle đó trong Advanced Options

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/SimpleImageGenerator.tsx` | Xóa Step 2 "Kiểu ảnh" khỏi form chính, di chuyển text input section vào trước khi truyền xuống `ImageAdvancedOptions` |
| `src/components/multichannel/ImageAdvancedOptions.tsx` | Thêm toggle "Thêm text lên ảnh" + hiển thị text input fields khi bật |

## Chi tiết kỹ thuật

**SimpleImageGenerator.tsx:**
- Xóa dòng 426-455 (block "Kiểu ảnh")
- Xóa dòng 457-554 (text input block) khỏi form chính
- Truyền thêm props vào `ImageAdvancedOptions`: `imageContentType`, `onImageContentTypeChange`, `useSharedText`, `onUseSharedTextChange`, `textToInclude`, `onTextToIncludeChange`, `textsPerChannel`, `onTextsPerChannelChange`, `selectedChannels` (đã có), `hookMessages` (đã có)

**ImageAdvancedOptions.tsx:**
- Thêm section mới: Switch/Toggle "Thêm text lên ảnh"
- Khi bật: hiển thị các text input controls (shared/per-channel toggle, textarea, "Use Hook" button, "AI Optimize" button)
- Đặt section này sau Logo options, trước Negative Prompt

## Kết quả

Form chính sẽ gọn hơn: chỉ còn Channel picker -> V3 Style Preview -> CTA Button. Tùy chọn text overlay nằm trong Advanced Options cho người dùng muốn tùy chỉnh sâu.
