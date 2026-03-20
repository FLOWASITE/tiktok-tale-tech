

# Nâng cấp Facebook Carousel Mockup chuẩn hơn

## Vấn đề hiện tại

Facebook carousel mockup thiếu nhiều chi tiết quan trọng so với giao diện thật:

1. **Caption bị hiển thị toàn bộ** — Facebook thật chỉ hiển thị 3-4 dòng rồi có nút "Xem thêm"
2. **Carousel slider quá đơn giản** — Facebook thật có: card overlay với tiêu đề + mô tả bên dưới mỗi ảnh carousel, nút mũi tên lớn hơn, dots ở giữa ảnh
3. **Thiếu "Xem thêm" link** cho caption dài
4. **Thiếu card title/description** dưới mỗi ảnh carousel (Facebook carousel thật có 1 dải card bên dưới ảnh hiển thị headline + link)
5. **Reaction emoji thiếu thực tế** — có 4 emoji reactions nhưng thật thường chỉ hiện 3
6. **Không có "Sponsored" / "Được tài trợ" label** option

## Giải pháp

### File: `src/components/preview/ChannelMockupFrame.tsx`

**1. Facebook Carousel Card Overlay**

Thêm dải card bên dưới mỗi ảnh carousel giống Facebook thật:
```text
┌──────────────────────┐
│                      │
│    [Carousel Image]  │
│              1/5     │
│                      │
├──────────────────────┤
│ Slide headline here  │  ← Card overlay (bg xám nhạt)
│ brandname.com        │
│                      │
└──────────────────────┘
```

Truyền `slides_content` (headline từ mỗi slide) vào mockup để hiển thị tiêu đề card.

**2. Caption "Xem thêm" truncation**

- Giới hạn caption hiển thị 3 dòng (line-clamp-3)
- Thêm nút "Xem thêm" màu xám khi nội dung dài
- Click "Xem thêm" → mở rộng toàn bộ caption

**3. Nâng cấp CarouselImageSlider cho Facebook**

- Mũi tên navigation lớn hơn (w-9 h-9), luôn hiển thị (không chỉ hover)
- Dots chuyển vào bên trong ảnh (bottom, trên card overlay)
- Bỏ 1 emoji reaction (giữ 3: Like, Love, Haha)

**4. Truyền slide titles từ CarouselViewer**

Thêm prop `slidesTitles?: string[]` vào `ChannelMockupFrame` để hiển thị headline trên mỗi card.

### File: `src/components/CarouselViewer.tsx`

**5. Truyền slide titles vào mockup**

```tsx
<ChannelMockupFrame
  channel={...}
  content={carousel.caption_suggestion || ...}
  brandName={carousel.brand_name || 'Brand'}
  channelImages={generatedImages.map(img => img.imageUrl)}
  slideTitles={carousel.slides_content.map(s => 
    typeof s.textContent === 'string' ? s.textContent : s.textContent.headline
  )}
/>
```

## Tổng hợp

| File | Thay đổi |
|------|----------|
| `ChannelMockupFrame.tsx` | Thêm prop `slideTitles`, Facebook carousel card overlay, caption truncation + "Xem thêm", nâng cấp slider arrows/dots, giảm reactions về 3 |
| `CarouselViewer.tsx` | Truyền `slideTitles` từ `slides_content` vào mockup |

Sửa 2 file.

