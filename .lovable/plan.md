

# Hoàn thiện Form Post lên Facebook

## Vấn đề hiện tại

1. **Response mapping sai**: `useDirectPublish` đọc `response.data.data?.postId` nhưng `publish-facebook` trả về `response.data.postId` (không nested trong `data`)
2. **Thiếu tracking**: Facebook không log vào `publish_attempts`, `content_publishing_logs`, không cập nhật `last_error` khi thất bại — trong khi Twitter đã có đầy đủ
3. **Không hỗ trợ link URL từ UI**: Edge function hỗ trợ `linkUrl` nhưng UI không có input
4. **Không chỉnh sửa nội dung trước khi đăng**: Dialog xác nhận chỉ hiển thị preview, không cho edit
5. **Không có trạng thái thành công**: Dialog đóng ngay sau khi đăng, không hiện kết quả + link bài viết

---

## Giải pháp

### 1. Sửa `publish-facebook/index.ts` — Đồng bộ response format & tracking

- Wrap response trong `data: { postId, postUrl }` giống Twitter
- Thêm log `publish_attempts` (insert trước khi gọi API, update sau khi thành công/thất bại)
- Thêm log `content_publishing_logs` khi thành công
- Cập nhật `last_used_at` trên `social_connections`
- Cập nhật `last_error` khi thất bại
- Cập nhật `content_schedules` nếu có `scheduleId`

### 2. Sửa `useDirectPublish.ts` — Thêm `linkUrl` vào PublishOptions

- Thêm field `linkUrl?: string` vào `PublishOptions`
- Pass `linkUrl` vào body khi gọi edge function

### 3. Nâng cấp `DirectPublishButton.tsx` — UI hoàn chỉnh

- **Editable content**: Thêm state `editableContent`, user có thể chỉnh sửa nội dung ngay trong dialog trước khi đăng
- **Link URL input**: Thêm input nhập URL (hiển thị khi platform là Facebook)
- **Trạng thái thành công**: Sau khi đăng xong, dialog chuyển sang màn hình "Thành công" với link bài viết (nút "Xem bài đăng" mở tab mới)
- **Character count cho Facebook**: Hiện số ký tự (warning khi > 63,206 chars — giới hạn Facebook)

---

## File cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-facebook/index.ts` | Đồng bộ response format, thêm tracking logs |
| `src/hooks/useDirectPublish.ts` | Thêm `linkUrl` vào options |
| `src/components/social/DirectPublishButton.tsx` | Editable content, link URL input, success state |

