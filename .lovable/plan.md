

## Loại bỏ nút "Dùng Hook" và "AI Tối ưu" khỏi phần text trên ảnh

### Mục tiêu
Text trên ảnh sẽ được AI xử lý tự động khi tạo ảnh, không cần người dùng bấm thêm nút nào. Giao diện chỉ còn ô nhập text đơn giản.

### Thay đổi

**File: `src/components/multichannel/ImageAdvancedOptions.tsx`**

1. **Phần "Chung" (shared text)** — Xóa dải nút "Dùng Hook" + "AI Tối ưu", chỉ giữ lại label "Text trên ảnh" và textarea
2. **Phần "Theo kênh" (per-channel text)** — Xóa nút "Dùng Hook" ở mỗi tab kênh, chỉ giữ label và textarea

**File: `src/components/multichannel/ImageAdvancedOptions.tsx` (props cleanup)**
- Loại bỏ props `fillHookText`, `isOptimizingText`, `onOptimizeText` khỏi interface vì không còn dùng
- Loại bỏ import `Hash`, `Wand2`, `Loader2` nếu không dùng ở chỗ khác

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**
- Loại bỏ truyền props `fillHookText`, `isOptimizingText`, `onOptimizeText` vào ImageAdvancedOptions
- Có thể giữ lại logic auto-fill text từ hook (useEffect) để textarea vẫn được điền sẵn text tốt nhất

### Kết quả
- Giao diện gọn hơn: chỉ còn textarea để nhập/sửa text
- Text vẫn được tự động điền sẵn khi mở form (nhờ useEffect hiện có)
- AI xử lý text trong quá trình tạo ảnh, không cần bước tối ưu riêng

