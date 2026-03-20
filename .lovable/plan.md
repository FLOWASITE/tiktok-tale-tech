

# Tối ưu tải ảnh trên Carousel Card Grid

## Vấn đề
Card đang dùng thẻ `<img>` thuần với `loading="lazy"` — không có skeleton placeholder, không fade-in, không preload. Khi ảnh vừa tạo xong, grid trống trơn cho đến khi ảnh tải xong, tạo cảm giác chậm.

## Giải pháp

### 1. `src/components/CarouselCard.tsx` — Dùng `OptimizedImage` thay `<img>`
- Thay tất cả thẻ `<img>` trong phần Image Grid (line 140-191) bằng component `OptimizedImage` đã có sẵn
- `OptimizedImage` cung cấp: skeleton loading, fade-in animation, error fallback, async decoding
- Giữ nguyên tất cả className, rounded corners, hover effects

### 2. `src/hooks/useCarouselCardImages.ts` — Thêm realtime subscription + cache thông minh
- Thêm Supabase realtime subscription lắng nghe `carousel_images` INSERT events
- Khi có ảnh mới được tạo → cập nhật `imageMap` ngay lập tức thay vì đợi refetch
- Merge incremental updates vào state hiện tại thay vì replace toàn bộ
- Giữ data cũ khi `carouselIds` thay đổi (tránh flash trống)

### 3. `src/components/CarouselCard.tsx` — Preload ảnh đầu tiên
- Truyền `preloadSrc` cho ảnh thứ 2 trong grid (ảnh đầu tiên preload ảnh kế tiếp)

## Tóm tắt
- Sửa 2 file
- `CarouselCard.tsx`: thay `<img>` → `OptimizedImage` (~6 chỗ), thêm import
- `useCarouselCardImages.ts`: thêm realtime subscription + incremental update (~20 dòng)

