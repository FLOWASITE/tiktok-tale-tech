

## Đánh giá UI hiện tại

Sau khi rà soát code, UI carousel hiện tại **đã khá ổn** và tương thích với các chức năng vừa triển khai. Cụ thể:

- **Inline edit** (SlidePromptCard): UI edit/save/cancel đã hoàn chỉnh, có double-click, Ctrl+Enter, responsive
- **Drag & reorder** (SortableSlideCard): Drag handle hiện khi hover, hoạt động tốt
- **Swipe preview** (GeneratedImagesGallery): Embla carousel + thumbnail strip + grid fallback + ZIP download
- **Persistent images**: Load từ DB, sync vào state đúng

### Vấn đề nhỏ cần refactor

| Vấn đề | Chi tiết |
|---|---|
| **Gallery hiển thị trùng lặp** | Có cả carousel swipe preview LẪN grid bên dưới — thừa, nên giữ 1 trong 2 hoặc cho grid làm thumbnail thay vì hiển thị song song |
| **Thumbnail strip không sync scroll** | `selectedIndex` chỉ update khi nhấn prev/next, không listen `emblaApi.on('select')` → vuốt bằng tay sẽ không highlight đúng thumbnail |
| **Drag handle trên mobile** | `opacity-0 group-hover` không hoạt động trên touch → mobile user không thấy drag handle. Cần hiện mặc định hoặc dùng long-press |
| **Tab "Ảnh" count không realtime** | Hiển thị `generatedImages.length` nhưng khi vừa generate xong từ tab Slides, count có thể chưa cập nhật ngay |

### Kế hoạch refactor

1. **Dọn gallery**: Bỏ grid fallback trùng lặp, giữ carousel swipe + thumbnail strip là đủ
2. **Fix thumbnail sync**: Thêm `emblaApi.on('select', ...)` để `selectedIndex` luôn đúng khi vuốt
3. **Fix drag handle mobile**: Thêm `opacity-100` trên mobile (touch devices) thay vì chỉ hover
4. **Minor**: Đảm bảo tab count cập nhật realtime

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/GeneratedImagesGallery.tsx` | Bỏ grid trùng, fix embla onSelect sync |
| `src/components/SortableSlideCard.tsx` | Fix drag handle visibility trên mobile |

Scope nhỏ, ước tính 1 lần triển khai.

