

# Preview Tab → Social Mockup chuẩn Facebook/TikTok

## Vấn đề hiện tại
Tab Preview hiển thị các ô CSS nhỏ (CarouselLayoutPreview) — không thực tế, không giống giao diện thật của Facebook hay TikTok.

## Giải pháp
Thay `CarouselLayoutPreview` bằng mockup social thực tế sử dụng `ChannelMockupFrame` (đã có sẵn cho Facebook và TikTok). Hiển thị carousel như một bài đăng thật trên nền tảng tương ứng.

### File: `src/components/CarouselViewer.tsx`

**1. Thay nội dung TabsContent "preview"** (dòng ~730-761)

Thay `CarouselLayoutPreview` bằng:
- Dùng `ChannelMockupFrame` với `channel` = `carousel.platform` (facebook hoặc tiktok)
- `content` = `carousel.caption_suggestion` (caption đã tạo)
- `brandName` = `carousel.brand_name`
- `channelImage` = ảnh đầu tiên đã generate (nếu có) — lấy từ `generatedImages[0]?.imageUrl`
- Nếu chưa có caption, hiển thị placeholder text từ topic

**2. Hiển thị carousel images trong mockup**
- Nếu có nhiều ảnh, hiển thị gallery/swiper nhỏ bên dưới mockup để xem qua các slide
- Mockup chính hiển thị ảnh slide đang chọn

**3. Giữ lại SeamlessConsistencyCard và nút "Tạo ảnh"**
- SeamlessConsistencyCard vẫn hiển thị bên dưới mockup (cho seamless style)
- Nút "Hài lòng? Tạo ảnh ngay" vẫn giữ nguyên

**4. Import thay đổi**
- Thêm import `ChannelMockupFrame` từ `@/components/preview/ChannelMockupFrame`
- Có thể bỏ import `CarouselLayoutPreview` nếu không dùng ở nơi khác (kiểm tra trước)

### Cấu trúc UI mới cho tab Preview:

```text
┌─────────────────────────┐
│   [Facebook/TikTok      │
│    Mockup Frame]        │
│    - Brand avatar       │
│    - Caption text       │
│    - Ảnh carousel       │
│    - Like/Comment/Share │
└─────────────────────────┘
│  ◄ Slide 1/5 thumbnails ►│  ← chọn ảnh hiển thị
├─────────────────────────┤
│  [SeamlessCard] (nếu có)│
├─────────────────────────┤
│  [Tạo ảnh ngay] button  │
└─────────────────────────┘
```

### Thay đổi tổng hợp

| Vị trí | Thay đổi |
|--------|----------|
| Import | Thêm `ChannelMockupFrame` |
| TabsContent "preview" | Thay `CarouselLayoutPreview` → `ChannelMockupFrame` + slide selector |
| State | Thêm `previewSlideIndex` để chọn slide hiển thị trong mockup |

Chỉ sửa 1 file: `src/components/CarouselViewer.tsx`

