

# Tối ưu load ảnh — Sửa lỗi ảnh chủ đề khác hiển thị sai

## Nguyên nhân

Có 2 bug gây ra hiện tượng ảnh "chủ đề cũ" hiện trong "chủ đề mới":

```text
Mở Carousel A → savedImages = [ảnh A1, A2, A3]
                 generatedImages = [ảnh A1, A2, A3] (synced)
                 
Chuyển sang Carousel B →
  useCarouselImages bắt đầu fetch... (loading = true)
  ❌ savedImages VẪN = [ảnh A1, A2, A3] (chưa clear)
  ❌ generatedImages VẪN = [ảnh A1, A2, A3] (không bao giờ clear)
  → User thấy ảnh Carousel A trong Carousel B
```

**Bug 1**: `useCarouselImages` không reset `images = []` khi `carouselId` thay đổi.  
**Bug 2**: `useImageGeneration` không có cơ chế clear khi carousel thay đổi — sync effect chỉ ghi đè khi có data mới, không clear khi `savedImages` rỗng.

## Giải pháp

### 1. `src/hooks/useCarouselImages.ts` — Clear images khi carouselId thay đổi
- Thêm `useEffect` reset `setImages([])` khi `carouselId` thay đổi, trước khi fetch mới chạy.

### 2. `src/components/CarouselViewer.tsx` — Clear generatedImages khi carousel thay đổi
- Thêm `useEffect` gọi `setImages([])` (từ `useImageGeneration`) + reset `syncedCarouselId` khi `carousel.id` thay đổi.
- Xử lý case `savedImages.length === 0` (carousel chưa có ảnh) — cũng phải clear `generatedImages`.

| File | Thay đổi |
|------|----------|
| `useCarouselImages.ts` | Reset images state khi carouselId thay đổi |
| `CarouselViewer.tsx` | Clear generatedImages + syncedCarouselId khi carousel thay đổi |

Sửa 2 file, thay đổi nhỏ (~10 dòng).

