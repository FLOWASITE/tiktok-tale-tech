

## Chuyển "Kiểm soát AI" thành Bước 2 trong SimpleImageGenerator

### Hiện trạng
Trong `SimpleImageGenerator.tsx`, phần `setupFields` có 3 bước:
- **Bước 1** (line 556-570): Chọn kênh
- **Bước 2** (line 572-637): Xem trước & Tạo ảnh (gồm V3 suggestions, keywords, settings summary, nút Tạo)
- **Bước 3** (line 639-692): Tùy chỉnh nâng cao (ImageAdvancedOptions — chứa cả phần chọn promptMode)

### Thay đổi

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**

Sắp xếp lại `setupFields` thành 3 bước mới:

| Bước | Nội dung |
|------|----------|
| **1** | Chọn kênh (giữ nguyên) |
| **2** | Kiểm soát AI — trích phần chọn `promptMode` từ ImageAdvancedOptions ra thành UI riêng: 3 card chọn mode (Để AI lo / Giữ Brand / Toàn quyền) + hint text tương tự như đã làm ở MultiChannelFormWizard Step 5 |
| **3** | Xem trước & Tạo ảnh — gộp V3 suggestions, keywords preview, settings summary, nút Tạo ảnh, và phần Tùy chỉnh nâng cao (ImageAdvancedOptions nhưng ẩn phần promptMode selector vì đã chọn ở Bước 2) |

### Chi tiết kỹ thuật

1. **Bước 2 mới** — Tạo UI inline (không cần component mới) với 3 card chọn mode:
   - Reuse logic tương tự `MultiChannelFormWizard` Step 5: icon `Sparkles`/`Shield`/`SlidersHorizontal`, mô tả ngắn, border highlight khi selected
   - Hiện summary box nhỏ cho biết mode đang chọn ảnh hưởng gì

2. **Bước 3 mới** — Gộp nội dung Bước 2 + 3 cũ:
   - V3 suggestions, keywords, settings summary, nút Tạo ảnh
   - ImageAdvancedOptions (ẩn phần prompt mode selector bên trong — cần thêm prop `hidePromptModeSelector` vào `ImageAdvancedOptions`)

3. **ImageAdvancedOptions.tsx** — Thêm prop `hidePromptModeSelector?: boolean` để ẩn phần chọn mode khi đã chọn ở Bước 2

### Phạm vi
- 2 file: `SimpleImageGenerator.tsx` (layout), `ImageAdvancedOptions.tsx` (thêm 1 prop)
- Không thay đổi logic generate hay state management

