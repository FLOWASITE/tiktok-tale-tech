

## Plan: Thêm Image Viewer/Lightbox xem ảnh sau khi tạo

### Vấn đề
Hiện tại ảnh đã tạo chỉ hiển thị nhỏ trong `ImageStreamingCard` (aspect-video ~200px). Muốn xem chi tiết phải hover → nhấn "Tải xuống" hoặc mở tab mới. Không có cách xem ảnh full-size trực tiếp trong app.

### Giải pháp: Image Lightbox Component + tích hợp vào streaming cards

#### 1. Tạo `src/components/ui/ImageLightbox.tsx` — Component xem ảnh full-screen
- Dialog overlay toàn màn hình (bg-black/90)
- Ảnh hiển thị `object-contain` max-w/max-h viewport
- Toolbar phía dưới: Download, Sửa nền, Tạo lại, Đóng
- Hiển thị channel label + aspect ratio badge
- Hỗ trợ điều hướng trái/phải khi có nhiều ảnh (nút ← → hoặc phím mũi tên)
- Pinch-to-zoom trên mobile (CSS touch-action)
- Nhấn ESC hoặc click ngoài để đóng

#### 2. Cập nhật `ImageStreamingCard.tsx` — Thêm nút "Xem" và click-to-open
- Thêm nút `Eye` ("Xem ảnh") vào hover overlay (cạnh Download, Sửa nền)
- Click vào ảnh (không phải hover buttons) cũng mở lightbox
- Truyền callback `onViewImage` lên parent

#### 3. Cập nhật `ImageStreamingGrid.tsx` — Quản lý lightbox state
- State: `viewingChannel: Channel | null`
- Render `ImageLightbox` với danh sách tất cả ảnh đã tạo
- Hỗ trợ navigate giữa các channel images
- Truyền `onViewImage` xuống mỗi `ImageStreamingCard`

### Thay đổi (3 files)
- **Tạo mới**: `src/components/ui/ImageLightbox.tsx`
- **Sửa**: `src/components/multichannel/streaming/ImageStreamingCard.tsx` — thêm onViewImage prop + click handler
- **Sửa**: `src/components/multichannel/streaming/ImageStreamingGrid.tsx` — lightbox state + render

