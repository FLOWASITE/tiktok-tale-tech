

## Đổi tên và nâng cấp nút "Đã tạo" thành "Kho chủ đề"

### Thay đổi

**1. Đổi label nút trigger**
- "Đã tạo" → **"Kho chủ đề"** — ý nghĩa hơn, bao quát cả topic đã dùng và chưa dùng
- Đổi icon từ `History` sang `Archive` hoặc `FolderOpen` cho phù hợp ngữ nghĩa

**2. Tăng khả năng nhận diện (focus)**
- Thêm count badge nhỏ (số lượng topic) ngay trên nút, ví dụ: `Kho chủ đề (15)`
- Đổi variant từ `outline` sang style nổi bật hơn: border gradient nhẹ hoặc background primary/10
- Tăng kích thước nút từ `h-4/h-5` lên `h-5/h-6` để dễ bấm hơn
- Thêm hiệu ứng pulse nhẹ khi có topic mới chưa xem

**3. Cập nhật header popover**
- "Chủ đề đã tạo" → **"Kho chủ đề của bạn"**

### File thay đổi
- `src/components/TopicSuggestionPanel.tsx` — dòng 277-285 (trigger button) và dòng 291 (header)

### Chi tiết kỹ thuật
- Thay `History` icon → `FolderOpen` từ lucide-react
- Thêm `allCount` vào label nút: `Kho chủ đề (${allCount})`
- CSS: `bg-primary/10 border-primary/30 text-primary hover:bg-primary/20` cho nút nổi bật
- Tăng size: `h-5 xs:h-6 text-[10px] xs:text-[11px]`

