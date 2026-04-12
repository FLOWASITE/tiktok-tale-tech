

# Fix: Status không cập nhật sau khi đăng bài lên social

## Nguyên nhân gốc

Có **2 vấn đề**:

1. **Backend**: Các function `publish-twitter`, `publish-facebook`, `publish-zalo` **không cập nhật** `multi_channel_contents.status` và `channel_statuses` sau khi đăng thành công. Chỉ có `publish-blog` thực hiện logic này (dòng 114-143). Vì vậy master status vẫn giữ nguyên "approved" (Đã duyệt).

2. **Frontend**: `DirectPublishButton` trong `MultiChannelViewer` **không truyền `onPublishSuccess`** callback → sau khi đăng thành công, UI không refetch data để hiển thị status mới. Và button "Đăng ngay" luôn hiển thị bất kể kênh đã đăng hay chưa.

## Giải pháp

### A. Backend: Thêm logic cập nhật master status vào `channel-publisher/index.ts`

Thay vì sửa từng function riêng lẻ (twitter, facebook, zalo...), thêm logic cập nhật status **tập trung** tại `channel-publisher` sau khi nhận response thành công từ platform function. Logic giống hệt `publish-blog` (dòng 114-143):

1. Nếu response thành công + có `contentId` → query `multi_channel_contents` lấy `selected_channels` và `channel_statuses`
2. Đánh dấu channel hiện tại = `'published'` trong `channel_statuses`
3. Kiểm tra tất cả selected channels đã published chưa → set `'published'` hoặc `'partially_published'`
4. Update `multi_channel_contents`

### B. Frontend: Truyền `onPublishSuccess` + ẩn button khi đã đăng

1. **`MultiChannelViewer.tsx`**: Truyền `onPublishSuccess` callback vào `DirectPublishButton` để refetch content data sau khi đăng
2. **`DirectPublishButton.tsx`**: Kiểm tra `channel_statuses[channel] === 'published'` → hiển thị badge "Đã đăng" thay vì button "Đăng ngay". Hoặc đổi button thành "Đăng lại" nếu đã đăng.

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/channel-publisher/index.ts` | Thêm logic update master status sau khi publish thành công |
| `supabase/functions/publish-blog/index.ts` | Xóa logic update status (đã chuyển lên channel-publisher) |
| `src/components/MultiChannelViewer.tsx` | Truyền `onPublishSuccess` vào DirectPublishButton |
| `src/components/social/DirectPublishButton.tsx` | Nhận thêm prop `channelStatus`, hiển thị "Đã đăng" / "Đăng lại" thay vì luôn "Đăng ngay" |

### Deploy
- Redeploy: `channel-publisher`, `publish-blog`

