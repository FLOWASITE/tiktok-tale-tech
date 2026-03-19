

# Fix: Mini Tracker mất khi xem Carousel card

## Nguyên nhân gốc

`selectedCarousel` state được **dùng chung** cho cả 2 mục đích:
1. **Tracker**: `carousel={selectedCarousel}` — carousel đang được generate
2. **Viewer**: `carousel={selectedCarousel}` — carousel user click xem

Khi user minimize tracker rồi click xem 1 carousel card khác, `handleViewCarousel` gọi `setSelectedCarousel(clickedCarousel)` → **ghi đè** carousel đang generate → `CarouselGenerationTracker` nhận carousel mới (đã có ảnh) → generation logic kết thúc/crash → tracker biến mất.

## Giải pháp

Tách state thành 2 biến riêng biệt:

### File: `src/pages/Carousel.tsx`

1. **Thêm state mới** `trackerCarousel` riêng cho tracker:
```typescript
const [trackerCarousel, setTrackerCarousel] = useState<Carousel | null>(null);
```

2. **Cập nhật `handleGenerateCarousel`**: khi auto-generate, set `trackerCarousel` thay vì `selectedCarousel`:
```typescript
if (formData.autoGenerateImages) {
  setTrackerCarousel(newCarousel);  // tracker dùng riêng
}
```

3. **Cập nhật tất cả `CarouselGenerationTracker`** references: truyền `carousel={trackerCarousel}` thay vì `carousel={selectedCarousel}`

4. **Cập nhật `onViewResults` callback**: khi tracker xong, copy `trackerCarousel` sang `selectedCarousel` để mở viewer:
```typescript
onViewResults={(carousel) => {
  setTrackerMode(false);
  setTrackerMinimized(false);
  setTrackerCarousel(null);
  setSelectedCarousel(carousel);
  setViewerOpen(true);
}}
```

5. **`handleViewCarousel` không bị ảnh hưởng**: vẫn dùng `selectedCarousel` cho viewer, tracker vẫn chạy với `trackerCarousel` riêng.

## Kết quả

- Minimize tracker → click xem carousel khác → tracker vẫn chạy nền bình thường
- Hai luồng state hoàn toàn độc lập, không ghi đè nhau

