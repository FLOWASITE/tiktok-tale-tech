

## Đồng bộ trạng thái Carousel với việc đăng bài Social

### Vấn đề hiện tại
1. **DirectPublishButton** trong CarouselViewer **không truyền `onPublishSuccess`** → sau khi đăng bài thành công, carousel status vẫn giữ nguyên (draft/approved), không tự động chuyển sang `published`
2. **Chỉ hardcode channel "facebook"** — không hỗ trợ chọn kênh khác (Instagram, TikTok, etc.)
3. **Không có logic `partially_published`** — multichannel có cơ chế này nhưng carousel thì không
4. **Không log publishing** vào `content_publishing_logs` cho carousel

### Kế hoạch

**1. Thêm `onPublishSuccess` callback vào CarouselViewer**
- Sau khi DirectPublishButton publish thành công → tự động cập nhật `carousels.status` sang `published` trong DB
- Gọi `onCarouselUpdate` để UI phản ánh trạng thái mới
- File: `src/components/CarouselViewer.tsx`

**2. Hỗ trợ chọn nhiều kênh social để đăng**
- Thay vì hardcode `channel="facebook"`, hiển thị danh sách kênh dựa trên `carousel.platform` và các social connections đã kết nối
- Thêm nút đăng cho từng kênh có kết nối (Facebook, Instagram, etc.)
- File: `src/components/CarouselViewer.tsx`

**3. Hiển thị trạng thái đăng bài per-channel**
- Thêm query `content_publishing_logs` để kiểm tra carousel đã đăng ở kênh nào
- Hiển thị badge "Đã đăng" bên cạnh từng kênh đã publish thành công
- Tái sử dụng `StatusTimeline` hoặc badge tương tự multichannel
- File: `src/components/CarouselViewer.tsx`

**4. Ghi log publishing cho carousel**
- Khi publish thành công, đảm bảo `content_publishing_logs` có record với `content_id = carousel.id`
- Kiểm tra edge function `channel-publisher` đã hỗ trợ content_type carousel chưa, nếu chưa thì bổ sung

### Files thay đổi
- **Sửa**: `src/components/CarouselViewer.tsx` — thêm onPublishSuccess, multi-channel publish buttons, status display
- **Sửa**: `src/types/carousel.ts` — nếu cần thêm type `partially_published` vào CarouselStatus
- **Có thể sửa**: `supabase/functions/channel-publisher/index.ts` — đảm bảo hỗ trợ carousel content type

### Không cần migration
Bảng `content_publishing_logs` đã tồn tại và hỗ trợ bất kỳ `content_id` nào.

