

## Fix: Nút "Đăng ngay" không cập nhật sau khi publish thành công

### Nguyên nhân
Sau khi đăng bài thành công, `handlePublishSuccess` invalidate query `carousel-publishing-logs` nhưng có **race condition**: query refetch chưa hoàn tất → `publishedChannels` vẫn rỗng → button vẫn hiển thị "Đăng ngay" thay vì "Đăng lại" + badge "Đã đăng".

Ngoài ra, nếu RLS chặn đọc `content_publishing_logs` (do `performed_by = null`), query sẽ không trả về log vừa insert.

### Giải pháp
Thêm **local state** `localPublishedChannels` để cập nhật UI ngay lập tức khi publish thành công, không phụ thuộc vào query refetch.

### Thay đổi

**File: `src/components/CarouselViewer.tsx`**

1. Thêm state `localPublishedChannels` (Set):
   - Khởi tạo rỗng, merge với `publishedChannels` từ query
   - Khi `handlePublishSuccess` được gọi → thêm channel vào `localPublishedChannels` ngay lập tức
   
2. Tạo `effectivePublishedChannels` = union của `publishedChannels` (từ DB) + `localPublishedChannels` (local)

3. Dùng `effectivePublishedChannels` thay cho `publishedChannels` ở:
   - `channelStatus` prop của `DirectPublishButton`
   - Badge hiển thị "✓ Facebook"
   - Logic tính `newStatus` (published vs partially_published)

### Files thay đổi
- `src/components/CarouselViewer.tsx` — thêm local state để UI phản hồi tức thì

