

## Chuyển Form Tạo Carousel từ SlidePanel sang Full-Page View

### Vấn đề hiện tại
Form tạo mới Carousel đang hiển thị trong `SlidePanel` (sheet trượt từ bên phải), chiếm ít không gian và cảm giác bị "nhốt" trong panel nhỏ.

### Giải pháp
Chuyển sang hiển thị full-page trong main content area (giữa Sidebar và Header) bằng cách dùng **conditional rendering**: khi `formSheetOpen = true`, ẩn danh sách carousel và hiển thị form chiếm toàn bộ vùng content, với nút quay lại.

### Thay đổi

**File: `src/pages/Carousel.tsx`**

1. **Xóa `SlidePanel` wrapper** — Loại bỏ hoàn toàn `<SlidePanel>` bao quanh `<CarouselForm>`
2. **Conditional rendering** — Khi `formSheetOpen = true`:
   - Ẩn Hero Section, Filters, Grid/List carousels
   - Hiển thị full-width form layout với:
     - Header bar: nút "← Quay lại" + tiêu đề "Tạo Carousel mới" + icon
     - Form content căn giữa với `max-w-2xl mx-auto` để dễ đọc
     - Padding và spacing thoáng hơn
3. **Khi `formSheetOpen = false`** — Hiển thị layout danh sách carousel như bình thường
4. **Cập nhật `handleGenerateCarousel`** — Đã có `setFormSheetOpen(false)` khi submit, giữ nguyên logic

### Layout mới khi tạo carousel

```text
┌──────────────────────────────────────────────┐
│ Sidebar │  Header (sticky)                   │
│         │────────────────────────────────────│
│         │  ← Quay lại    Tạo Carousel mới   │
│         │────────────────────────────────────│
│         │                                    │
│         │      ┌─── max-w-2xl ───┐           │
│         │      │  ① Chủ đề       │           │
│         │      │  ② Phong cách   │           │
│         │      │  ③ Thiết kế     │           │
│         │      │  ④ Cài đặt      │           │
│         │      │  [Buttons]      │           │
│         │      └─────────────────┘           │
│         │                                    │
└──────────────────────────────────────────────┘
```

### Ảnh hưởng
- Không thay đổi logic generate hay navigation
- `SlidePanel` import có thể xóa nếu không dùng elsewhere
- Prefill từ Topics Hub vẫn hoạt động (set `formSheetOpen = true`)

