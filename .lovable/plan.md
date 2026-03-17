

# Nâng cấp Gallery: Quản lý ảnh toàn bộ app

## Hiện trạng
- Gallery hiện chỉ query từ bảng `carousel_images` (0 ảnh)
- Bảng `channel_image_history` chứa 195 ảnh từ 8 kênh: facebook, instagram, linkedin, threads, tiktok, twitter, website, x
- Cần gộp cả 2 nguồn vào 1 gallery thống nhất

## Thay đổi

### 1. Cập nhật hook `useCarouselGallery.ts` → `useAppGallery.ts`
- Fetch song song từ cả 2 bảng: `carousel_images` (join `carousels.title`) và `channel_image_history` (join `multi_channel_contents.title`)
- Normalize thành interface chung `GalleryImage` với thêm trường `source: 'carousel' | 'multichannel'` và `channel`
- Filter hỗ trợ theo **nguồn** (Carousel / Multichannel / Tất cả) và theo **channel** cụ thể (facebook, tiktok, ...)
- Delete dispatch đúng bảng dựa trên `source`

### 2. Cập nhật `CarouselGalleryView.tsx`
- Import hook mới `useAppGallery`
- Thêm filter bar: Source selector (Tất cả / Carousel / Multichannel) + Channel selector (tiktok, facebook, ...)
- Badge hiển thị channel icon/label trên mỗi thumbnail
- Info line hiển thị: tên content + channel + ngày tạo
- Download filename dựa theo source + channel

### 3. Không thay đổi `Carousel.tsx` và `CarouselHeroSection.tsx`
Giữ nguyên nút toggle Gallery đã có.

| File | Thay đổi |
|------|----------|
| `src/hooks/useCarouselGallery.ts` | Rename + mở rộng fetch cả 2 bảng, thêm filter source/channel |
| `src/components/carousel/CarouselGalleryView.tsx` | Cập nhật UI filter + hiển thị channel badge |

