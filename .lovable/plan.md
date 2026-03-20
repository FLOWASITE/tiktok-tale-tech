

# Bổ sung thêm nền tảng Social cho Carousel

## Các nền tảng thêm mới
- **Instagram** — carousel phổ biến nhất (tỷ lệ 4:5)
- **LinkedIn** — carousel dạng document/slide (tỷ lệ 1:1 hoặc 4:5)

## Thay đổi cần thực hiện

### 1. Database Migration
Thêm giá trị mới vào enum `carousel_platform`:
```sql
ALTER TYPE public.carousel_platform ADD VALUE 'instagram';
ALTER TYPE public.carousel_platform ADD VALUE 'linkedin';
```

### 2. `src/types/carousel.ts`
- Mở rộng `Platform` type: `'facebook' | 'tiktok' | 'instagram' | 'linkedin'`
- Thêm vào `PLATFORM_OPTIONS` với label tiếng Việt

### 3. `src/components/carousel/PlatformSelector.tsx`
- Thêm icon cho Instagram (lucide `Instagram`) và LinkedIn (lucide `Linkedin`)
- Thêm màu sắc cho mỗi nền tảng mới (Instagram: gradient tím-hồng, LinkedIn: xanh sky)
- Đổi grid từ `grid-cols-2` sang `grid-cols-4` (hoặc `grid-cols-2 sm:grid-cols-4`)

### 4. `src/components/CarouselViewer.tsx`
- Cập nhật `platformLabels` thêm instagram, linkedin
- Cập nhật mockup channel mapping: `carousel.platform` → `ChannelMockupFrame` channel (instagram, linkedin đã có sẵn mockup trong `ChannelMockupFrame`)

### 5. `src/components/CarouselCard.tsx`
- Cập nhật `platformLabels` record thêm instagram, linkedin với icon tương ứng

### 6. `src/components/CarouselListView.tsx`
- Cập nhật `platformLabels` và `platformColors` thêm 2 nền tảng mới

### 7. `supabase/functions/generate-carousel/index.ts`
- Mở rộng prompt hệ thống để hỗ trợ Instagram và LinkedIn (thay ternary `facebook ? "Facebook" : "TikTok"` bằng mapping object)
- Điều chỉnh aspect ratio guidance theo nền tảng (Instagram: 4:5, LinkedIn: 1:1)

### 8. `src/pages/Carousel.tsx` (nếu có filter theo platform)
- Cập nhật filter options thêm instagram, linkedin

## Tổng hợp

| File | Thay đổi |
|------|----------|
| DB Migration | Thêm `instagram`, `linkedin` vào enum `carousel_platform` |
| `types/carousel.ts` | Mở rộng `Platform` type + `PLATFORM_OPTIONS` |
| `PlatformSelector.tsx` | Thêm icon, màu, grid 4 cột |
| `CarouselViewer.tsx` | Cập nhật labels + mockup channel mapping |
| `CarouselCard.tsx` | Cập nhật `platformLabels` |
| `CarouselListView.tsx` | Cập nhật labels + colors |
| `generate-carousel/index.ts` | Mở rộng prompt cho Instagram/LinkedIn |
| `Carousel.tsx` | Cập nhật filter options |

Sửa 7 file + 1 migration.

