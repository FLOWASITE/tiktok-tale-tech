

# Sửa lỗi nhiễm chéo ảnh carousel — Race condition giữa 2 effects

## Nguyên nhân gốc

Hai `useEffect` riêng biệt (clear + sync) chạy trong **cùng một render cycle** khi `carousel.id` thay đổi, gây race condition:

```text
Render khi carousel.id thay đổi:
  loadingImages = false (giá trị CŨ, chưa update)
  savedImages = [ảnh Carousel A] (giá trị CŨ, chưa clear)
  
  Effect 1 chạy: setImages([])          ← clear đúng
  Effect 2 chạy: loadingImages=false → true
                  savedImages.length > 0 → true (VẪN ảnh cũ!)
                  → setImages([ảnh Carousel A]) ← ghi đè lại!
  
  React batch cả 2 setState → ảnh cũ THẮNG
```

Effect 2 không biết `savedImages` thuộc carousel nào — nó chỉ thấy `loadingImages=false` + có data → sync ngay.

## Giải pháp

Gộp 2 effects thành 1 effect duy nhất, dùng `useRef` để phát hiện carousel vừa chuyển và **bỏ qua sync trong render đó**:

### `src/components/CarouselViewer.tsx`

Thay thế 2 `useEffect` (line 230-250) bằng 1 effect:

```typescript
const prevCarouselIdRef = useRef<string | null>(null);

useEffect(() => {
  // Detect carousel switch → clear and bail out (sync on next render)
  if (carousel?.id !== prevCarouselIdRef.current) {
    setImages([]);
    setSyncedCarouselId(null);
    prevCarouselIdRef.current = carousel?.id || null;
    return;
  }

  // Only sync after loading completes for the NEW carousel
  if (!loadingImages && carousel?.id && syncedCarouselId !== carousel.id) {
    if (savedImages.length > 0) {
      const mapped = savedImages.map(img => ({
        slideNumber: img.slide_number,
        imageUrl: img.image_url,
        generatedAt: img.created_at,
      }));
      setImages(mapped);
    } else {
      setImages([]);
    }
    setSyncedCarouselId(carousel.id);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loadingImages, savedImages, carousel?.id, syncedCarouselId]);
```

Khi `carousel.id` thay đổi:
1. Render 1: ref khác → clear + return (không sync)
2. `useCarouselImages` reset → `loadingImages=true` 
3. Fetch xong → `loadingImages=false`, `savedImages=[ảnh mới]`
4. Render N: ref giống → sync ảnh mới đúng carousel

| File | Thay đổi |
|------|----------|
| `CarouselViewer.tsx` | Gộp 2 effects thành 1, thêm `prevCarouselIdRef` chống race condition |

Sửa 1 file, ~20 dòng thay đổi.

