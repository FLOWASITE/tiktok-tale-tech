

# Thêm nút "Tạo lại" cho từng slide lỗi trong CarouselGenerationTracker

## Vấn đề
Khi một slide tạo ảnh thất bại (status = `error`), người dùng không có cách nào tạo lại riêng slide đó ngay trong Tracker. Phải đợi toàn bộ hoàn tất rồi vào Viewer mới retry được.

## Giải pháp

### File: `src/components/carousel/CarouselGenerationTracker.tsx`

1. **Tách `attemptGenerateSlide` ra khỏi `runImageGeneration`** — chuyển thành một hàm riêng (hoặc dùng `useCallback`) để có thể gọi lại từ UI khi user click retry.

2. **Thêm state `retryingSlide`** (`number | null`) để track slide nào đang được retry thủ công.

3. **Thêm hàm `handleRetrySlide(index)`** — gọi lại logic tạo ảnh cho 1 slide cụ thể (reuse logic đã có trong `attemptGenerateSlide`), cập nhật status tương ứng.

4. **Cập nhật slide grid UI** (line ~532-554) — khi `status === 'error'` và `imageGenDone === true`, hiển thị nút nhỏ "Tạo lại" (icon `RefreshCw`) bên cạnh text "Slide X". Nút này gọi `handleRetrySlide(i)`.

```text
Trước (error state):
┌─────────────────┐
│ ⚠ Slide 3       │
└─────────────────┘

Sau (error state + retry button):
┌─────────────────────────┐
│ ⚠ Slide 3  [↻ Tạo lại] │
└─────────────────────────┘
```

5. **Disable nút retry** khi đang có slide khác đang generating hoặc retrying (`retryingSlide !== null`).

### Thay đổi cụ thể

- Thêm `retryingSlide` state
- Extract `attemptGenerateSlide` logic thành stable ref/callback
- Trong slide grid: nếu `status === 'error' && imageGenDone`, render `<Button>` với icon `RefreshCw`, onClick → `handleRetrySlide(i)`
- Khi retry thành công, cập nhật `slideStatuses[i]` → `'done'`, cập nhật `successCount`/`errorCount`

Chỉ sửa 1 file duy nhất.

