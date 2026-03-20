

# Hoàn thiện Preview Tab cho Carousel

## Vấn đề hiện tại
1. **Không có empty state** — khi chưa có ảnh, mockup hiển thị trống (không có `channelImage`)
2. **Facebook mockup hiển thị ảnh đơn** — carousel là bài đăng nhiều ảnh, cần hiển thị dạng carousel swipeable thay vì 1 ảnh
3. **TikTok mockup dùng aspect-ratio 9:16** — không phù hợp với carousel (TikTok carousel là dạng slide ngang)
4. **Caption bị cắt trên TikTok mockup** (line-clamp-2) — cần hiển thị đầy đủ hơn
5. **Thiếu carousel indicator dots** trên Facebook mockup
6. **Thiếu slide counter** (1/5) trên mockup

## Giải pháp

### File: `src/components/CarouselViewer.tsx`

**1. Tích hợp carousel swipe vào mockup**
- Thay vì truyền 1 `channelImage`, truyền toàn bộ danh sách ảnh
- Tích hợp swipe trực tiếp trong preview (left/right arrows overlay trên ảnh trong mockup)
- Hiển thị indicator dots (● ○ ○ ○ ○) bên dưới ảnh

**2. Empty state khi chưa có ảnh**
- Hiển thị placeholder slides với số thứ tự (Slide 1, Slide 2...) dùng gradient background
- Kèm text "Tạo ảnh để xem preview đầy đủ"

**3. Carousel counter overlay**
- Hiển thị badge "1/5" góc trên phải ảnh trong mockup

### File: `src/components/preview/ChannelMockupFrame.tsx`

**4. Mở rộng props hỗ trợ multiple images**
- Thêm prop `channelImages?: string[]` (danh sách ảnh carousel)
- FacebookMockup: thay section ảnh đơn bằng carousel slider với dots + counter
- TikTokMockup: chuyển sang layout carousel (aspect 4:5 thay vì 9:16) khi có nhiều ảnh

### File: `src/components/CarouselViewer.tsx` (Preview tab)

**5. Truyền data mới**
```tsx
<ChannelMockupFrame
  channel={carousel.platform === 'tiktok' ? 'tiktok' : 'facebook'}
  content={carousel.caption_suggestion || `📌 ${carousel.topic}`}
  brandName={carousel.brand_name || 'Brand'}
  channelImages={generatedImages.map(img => img.imageUrl)}
/>
```

**6. Bỏ slide selector thumbnails bên ngoài** — vì navigation đã tích hợp trong mockup

**7. Giữ nguyên** SeamlessConsistencyCard và nút "Tạo ảnh ngay"

## Cấu trúc UI mới

```text
┌──────────────────────────┐
│  [Facebook Mockup]       │
│   Brand ✓  · 2 giờ · 🌐 │
│   Caption text...        │
│  ┌────────────────────┐  │
│  │◄  [Slide Image] ►  │  │
│  │            1/5     │  │
│  └────────────────────┘  │
│     ● ○ ○ ○ ○            │
│  👍 1,2K  💬89  ↗️34     │
│  Thích  Bình luận  Chia sẻ│
└──────────────────────────┘
│  [SeamlessCard] (nếu có) │
│  [Tạo ảnh ngay] button   │
└──────────────────────────┘
```

## Tổng hợp

| File | Thay đổi |
|------|----------|
| `ChannelMockupFrame.tsx` | Thêm prop `channelImages`, carousel slider cho Facebook + TikTok mockup |
| `CarouselViewer.tsx` | Truyền `channelImages`, bỏ slide selector ngoài, thêm empty state |

Sửa 2 file.

