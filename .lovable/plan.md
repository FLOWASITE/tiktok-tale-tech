

# Fix: Slide 1 bị tạo lại 4 lần

## Nguyên nhân gốc

Bug nằm ở **retry pass** (dòng 246-265) trong `CarouselGenerationTracker.tsx`.

Sau khi main loop tạo ảnh xong tất cả slides thành công, code cố đọc trạng thái hiện tại bằng trick:
```typescript
let currentStatuses: SlideStatus[] = [];
setSlideStatuses(prev => { currentStatuses = [...prev]; return prev; });
// currentStatuses vẫn = [] tại đây!
```

**Vấn đề**: `setSlideStatuses` trong React 18 là async/batched. Callback chưa chạy ngay lập tức, nên `currentStatuses` vẫn là mảng rỗng `[]` khi đọc ở dòng tiếp theo. Kết quả: `retryIndices` dựa trên mảng rỗng hoặc dữ liệu cũ từ closure `slideStatuses`.

Thêm vào đó, biến `slideStatuses` tại dòng 247 là giá trị **closure cũ** (mảng ban đầu toàn `'pending'`), không phải trạng thái hiện tại.

**Kết quả thực tế** (từ network data):
- Slide 1 v1: main pass (14:59:52)
- Slide 2 v1: main pass (15:01:26) -- OK
- Slide 1 v2, v3, v4: retry pass chạy sai (15:01:28, 33, 38) -- retry 3 lần cho slide đã thành công

## Giải pháp

Dùng **local variable** (không phải React state) để track kết quả trong `runImageGeneration`, tránh phụ thuộc vào React state batching.

### File: `src/components/carousel/CarouselGenerationTracker.tsx`

Thay đổi trong `runImageGeneration`:

1. Tạo mảng local `const localStatuses: SlideStatus[] = Array(carousel.slides_content.length).fill('pending')` ở đầu hàm
2. Trong `attemptGenerateSlide`, cập nhật cả `setSlideStatuses` (cho UI) và `localStatuses[i]` (cho logic)
3. Retry pass đọc từ `localStatuses` thay vì trick `setSlideStatuses`:
```typescript
const retryIndices = localStatuses
  .map((s, idx) => s === 'error' ? idx : -1)
  .filter(idx => idx >= 0);
```
4. Xóa trick `setSlideStatuses(prev => { currentStatuses = [...prev]; return prev; })` và biến `errorIndices` cũ

Thay đổi nhỏ, chỉ ảnh hưởng logic bên trong `runImageGeneration`. UI hiển thị không thay đổi.

