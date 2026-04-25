## Vấn đề
`MediaRetentionNotice` đã có nhưng chỉ xuất hiện ở 2 nơi sâu trong UI:
- Dialog `MultiChannelViewer` (sau khi mở 1 content)
- Dialog `CarouselViewer` (sau khi mở 1 carousel)

Hệ quả: ở các trang list (`/multi-channel`, `/carousel`, `/gallery`, `/script-new`...), trong panel sinh ảnh/video inline, và trong toast sau khi tạo media — user **không hề thấy** policy. Ngoài ra notice là dismissable vĩnh viễn qua `localStorage` → 1 lần đóng là biến mất mãi.

## Mục tiêu
Đảm bảo user gặp thông báo "Ảnh & video tự xóa sau 7 ngày, tải về nếu muốn giữ" ở **đúng thời điểm họ tạo/xem media**, không cần mở dialog mới thấy.

## Thay đổi đề xuất

### 1. Thêm notice ở các trang list & hub media
Hiển thị banner `MediaRetentionNotice` (variant `banner`) ở header của các trang sau:
- `src/pages/MultiChannel.tsx` — list nội dung đa kênh
- `src/pages/Carousel.tsx` — list carousel
- `src/pages/Gallery.tsx` — thư viện ảnh tổng
- `src/pages/ScriptNew.tsx` — workspace script + video

Mỗi trang dùng `storageKey` riêng (vd. `media-retention-gallery`) để dismiss độc lập.

### 2. Thêm inline notice trong panel sinh ảnh/video
Dùng variant `inline` (1 dòng nhỏ, không dismissable) ngay dưới nút "Tạo ảnh"/"Tạo video":
- `src/components/multichannel/SimpleImageGenerator.tsx`
- `src/components/multichannel/UnifiedImageGenerator.tsx`
- `src/components/script/VideoGeneratorPanel.tsx`
- `src/components/script/VideoGallery.tsx`

Vì là inline footnote chứ không phải banner, không cho dismiss → luôn nhắc user mỗi lần thao tác.

### 3. Thêm dòng nhắc trong toast khi tạo media thành công
Bổ sung 1 dòng `description` ngắn vào toast success của các flow:
- Tạo ảnh đa kênh
- Tạo carousel images batch
- Tạo video

Ví dụ: `toast({ title: "Đã tạo ảnh", description: "Tự xóa sau 7 ngày — tải về nếu cần giữ." })`

### 4. Cập nhật `MediaRetentionNotice` cho variant inline rõ hơn
Hiện `variant="inline"` đã tồn tại nhưng chỉ hiện khi chưa dismissed. Tách logic: variant `inline` **bỏ qua** `localStorage`, luôn render (vì là footnote nhỏ, không cần dismiss). Variant `banner` giữ nguyên cơ chế dismiss.

## Files sẽ chỉnh sửa
- `src/components/MediaRetentionNotice.tsx` — inline luôn render, banner giữ dismiss
- `src/pages/MultiChannel.tsx`, `src/pages/Carousel.tsx`, `src/pages/Gallery.tsx`, `src/pages/ScriptNew.tsx` — thêm banner ở header
- `src/components/multichannel/SimpleImageGenerator.tsx`, `UnifiedImageGenerator.tsx` — thêm inline notice
- `src/components/script/VideoGeneratorPanel.tsx`, `VideoGallery.tsx` — thêm inline notice
- Toast success trong các hook tạo ảnh/video (xác định cụ thể khi implement)

## Không thay đổi
- Edge function `cleanup-old-media` và cron schedule — đang chạy ổn.
- Logic dismiss của banner ở 2 dialog viewer hiện có.
