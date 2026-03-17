

# Hoàn thiện Gallery — Các cải tiến còn lại

## Vấn đề phát hiện từ screenshot
1. **Source filter dropdown trống** — dropdown đầu tiên trong filter bar không hiển thị text "Tất cả nguồn"
2. **Stats cards thiếu icon đa dạng** — cả 3 card dùng style giống nhau, chưa phân biệt rõ
3. **Chưa có empty state khi filter không có kết quả** — khác với empty state "chưa có ảnh nào"
4. **Thiếu thông tin chi tiết khi hover** — tooltip hiển thị tên đầy đủ (title bị truncate)
5. **Bulk mode UX** — toolbar chỉ hiện khi đã chọn ảnh, nên hiện ngay khi bật bulk mode

## Thay đổi

### 1. Fix source filter dropdown (`CarouselGalleryView.tsx`)
- Dropdown đầu tiên trong filter bar hiện blank — do `sourceFilter` value là `'all'` nhưng Select không render đúng. Sửa bằng cách đảm bảo SelectValue hiển thị text tương ứng.

### 2. Cải thiện filter UX
- Thêm nút "Reset filter" khi có bất kỳ filter nào active
- Hiển thị empty state riêng khi filter không có kết quả (khác với khi chưa có ảnh)
- Khi search, highlight text match trong title

### 3. Cải thiện image card
- Thêm `title` attribute / Tooltip cho tên bị truncate
- Hiển thị kích thước ảnh (nếu có) hoặc thời gian tương đối ("2 ngày trước")
- Hover effect mượt hơn với scale + shadow

### 4. Bulk mode toolbar luôn hiện khi bật
- Hiện toolbar ngay khi `bulkMode = true` (không đợi chọn ảnh)
- Disable nút Download/Delete khi chưa chọn ảnh nào

### 5. Gallery page stats cải thiện
- Thêm % breakdown cho mỗi nguồn
- Animate số khi load xong

| File | Thay đổi |
|------|----------|
| `CarouselGalleryView.tsx` | Fix source filter, reset filters, empty filter state, bulk toolbar, hover tooltip, relative time |
| `Gallery.tsx` | Animate stats, % breakdown |

