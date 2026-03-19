

# Giải pháp: Retry tự động cho slide lỗi trong Tracker

## Vấn đề
Khi tạo ảnh tuần tự, nếu 1 slide bị lỗi (timeout, rate limit, API fail), hệ thống đánh dấu "error" và bỏ qua — không thử lại. Kết quả: thường chỉ tạo được 1-2 slide.

## Giải pháp
Thêm **retry logic** vào vòng lặp tạo ảnh trong `CarouselGenerationTracker.tsx`:

1. **Retry ngay tại chỗ**: Mỗi slide được thử tối đa **3 lần** trước khi đánh dấu error
2. **Delay tăng dần**: Lần 1 chờ 3s, lần 2 chờ 6s (exponential backoff) — tránh rate limit
3. **Retry pass cuối**: Sau khi chạy hết tất cả slides, quét lại các slide bị error và thử lại 1 lần nữa
4. **Tăng delay giữa slides**: Từ 1.5s lên 2.5s để giảm áp lực rate limit

## Thay đổi cụ thể

### File: `src/components/carousel/CarouselGenerationTracker.tsx`

Sửa hàm `runImageGeneration`:

```text
Vòng lặp hiện tại:
  for slide in slides:
    generateImage(slide)
    if fail → mark error
    delay 1.5s

Vòng lặp mới:
  for slide in slides:
    for attempt in 1..3:
      generateImage(slide)
      if success → break
      else → delay 3s * attempt (backoff)
    if still fail → mark error
    delay 2.5s
  
  // Retry pass: quét lại slides error
  for slide in errorSlides:
    delay 5s
    generateImage(slide)
    if success → mark done
```

### Không thay đổi
- Edge functions (backend) — giữ nguyên
- `useImageGeneration` hook — giữ nguyên
- `invokeWithTimeout` — giữ nguyên (150s đã đủ)

