

# Hiển thị tất cả ảnh trên Carousel Card

## Hiện tại
- Hook `useCarouselCardImages` chỉ lưu `thumbnailUrl` (ảnh đầu tiên) + `imageCount`
- Card hiển thị 1 ảnh duy nhất với badge đếm số ảnh

## Giải pháp: Layout dạng grid ảnh nhỏ

Thay vì 1 ảnh lớn, hiển thị **grid tất cả ảnh** trên card. Nếu có nhiều ảnh sẽ dùng layout grid linh hoạt:
- 1 ảnh: full width
- 2 ảnh: 2 cột
- 3 ảnh: 1 lớn + 2 nhỏ
- 4+ ảnh: 1 lớn + 2 nhỏ + badge "+N"

```text
┌─────────────────┐  ┌────────┬────────┐  ┌────────┬───────┐
│                 │  │        │        │  │        │  img2 │
│    1 ảnh        │  │  img1  │  img2  │  │  img1  ├───────┤
│    full         │  │        │        │  │        │  img3 │
│                 │  │        │        │  │        ├───────┤
└─────────────────┘  └────────┴────────┘  └────────┘  +2   │
     1 image            2 images              4+ images
```

### Thay đổi

| File | Nội dung |
|------|----------|
| `src/hooks/useCarouselCardImages.ts` | Trả về mảng `imageUrls: string[]` thay vì chỉ `thumbnailUrl` |
| `src/components/CarouselCard.tsx` | Thay section thumbnail bằng grid layout hiển thị nhiều ảnh |
| `src/pages/Carousel.tsx` | Truyền `imageUrls` thay vì `thumbnailUrl` + `imageCount` |

Sửa 3 file, ~60 dòng thay đổi.

