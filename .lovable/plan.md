

# Bổ sung Gallery trên trang Carousel

## Vấn đề
Hiện tại ảnh tạo bởi Carousel được upload vào storage bucket `carousel-images` (262 ảnh) nhưng không có giao diện tổng hợp để xem lại tất cả. Mỗi carousel chỉ xem ảnh khi mở CarouselViewer.

## Giải pháp
Thêm tab "Gallery" trên trang Carousel, hiển thị tất cả ảnh đã tạo từ storage bucket, nhóm theo carousel, hỗ trợ xem/tải/xóa.

### 1. Tạo hook `useCarouselGallery.ts`
- Query `storage.objects` qua Supabase Storage API: `supabase.storage.from('carousel-images').list()`
- Liệt kê tất cả thư mục (carousel IDs) → list files trong mỗi thư mục
- Lọc bỏ thư mục `social/` (thuộc multichannel, không phải carousel)
- Map với bảng `carousels` để lấy tên carousel
- Trả về danh sách images kèm metadata (carousel title, created_at, public URL)

### 2. Tạo component `CarouselGalleryView.tsx`
- Grid layout responsive: 2 cột mobile, 3-4 cột desktop
- Mỗi ảnh hiện thumbnail + carousel name + ngày tạo
- Hỗ trợ: xem phóng to (lightbox), tải về, xóa
- Filter theo carousel
- Tích hợp `ImageLightbox` có sẵn

### 3. Cập nhật `Carousel.tsx` (trang chính)
- Thêm toggle chuyển giữa chế độ "Danh sách Carousel" và "Gallery ảnh"
- Nút Gallery kế bên nút viewMode hiện có trong `CarouselHeroSection`

### 4. Cập nhật `CarouselHeroSection.tsx`
- Thêm nút "Gallery" icon vào thanh toolbar

| File | Thay đổi |
|------|----------|
| `src/hooks/useCarouselGallery.ts` | Mới — hook fetch ảnh từ storage |
| `src/components/carousel/CarouselGalleryView.tsx` | Mới — grid gallery component |
| `src/pages/Carousel.tsx` | Thêm gallery mode toggle và render |
| `src/components/carousel/CarouselHeroSection.tsx` | Thêm nút Gallery |

