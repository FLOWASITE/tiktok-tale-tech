

## Xử lý lại Header CarouselViewer

### Vấn đề
Từ screenshot: Header bị chật, các nút publish (Facebook "Đăng lại", Instagram "Đăng ngay", LinkedIn icon, etc.) + nút download/copy xếp cùng hàng với title → tràn, khó đọc trên mobile (707px viewport).

### Giải pháp: Tách header thành 3 rows rõ ràng

**File: `src/components/CarouselViewer.tsx` (lines 788-919)**

**Row 1** — Title + Status (giữ nguyên, bỏ action buttons ra)
```
[Title truncated...] [StatusSelector dropdown]
[Topic subtitle]
```

**Row 2** — Publish buttons (dòng riêng, scroll ngang nếu nhiều)
```
[FB Đăng lại] [IG Đăng ngay] [LinkedIn Đăng ngay] [TikTok] ...
```
- Wrap trong `div` có `overflow-x-auto flex gap-1.5`
- Chỉ hiện khi có `generatedImages.length > 0`

**Row 3** — Badges + utility buttons (download, copy, performance)
```
[Facebook] [6 slides] [✓ Facebook] [ⓘ Chi tiết]  ──  [📊] [⬇] [📋]
```
- Badges bên trái, utility icons bên phải

### Chi tiết thay đổi

1. Di chuyển `DirectPublishButton` ra khỏi row 1 (lines 806-839) → row 2 mới
2. Di chuyển `TopicPerformanceUpdater`, `Download`, `Copy` buttons → row 3 (cùng dòng badges)
3. Row 2 thêm `overflow-x-auto whitespace-nowrap` để scroll ngang khi có 4-5 channels
4. Row 1 chỉ còn title + status selector → gọn gàng

### Files thay đổi
- `src/components/CarouselViewer.tsx` — restructure header layout (lines 788-919)

