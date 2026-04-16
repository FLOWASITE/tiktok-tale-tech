

## TikTok: Bài đăng "thành công" nhưng không hiển thị

### Nguyên nhân gốc

TikTok API trả về `publish_id` với status `ok` nhưng đây chỉ là bước **khởi tạo** (init). TikTok sau đó tải ảnh từ URL bất đồng bộ. Nếu TikTok không fetch được ảnh, bài sẽ bị drop âm thầm mà không báo lỗi.

**Vấn đề cốt lõi**: Khi Cloudflare proxy `media.flowa.one` → `rllyipiyuptkibqinotz.supabase.co`, request đến Supabase với `Host: media.flowa.one`. Supabase không nhận diện host này nên trả về 404/error. TikTok không tải được ảnh → bài bị hủy.

### Giải pháp: 2 thay đổi

**1. Cloudflare Worker để rewrite Host header**

Tạo Worker trên Cloudflare (miễn phí) gắn vào route `media.flowa.one/*`:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "rllyipiyuptkibqinotz.supabase.co";
    return fetch(url.toString(), {
      headers: { ...Object.fromEntries(request.headers), Host: url.hostname },
      method: request.method,
    });
  }
};
```

Bạn cần làm trên Cloudflare Dashboard:
- Workers & Pages → Create Worker → paste code trên
- Workers Routes → thêm route `media.flowa.one/*` → chọn Worker vừa tạo

**2. Thêm publish status check vào edge function**

Sau khi nhận `publish_id`, gọi TikTok Status API để xác nhận bài thực sự được xử lý. Cập nhật `publish-tiktok/index.ts`:

- Thêm hàm `checkPublishStatus(accessToken, publishId)` gọi `POST /v2/post/publish/status/fetch/`
- Sau khi nhận `publish_id`, poll status 2-3 lần (mỗi lần cách 3 giây) để phát hiện lỗi sớm
- Log kết quả status để debug

### Thứ tự thực hiện

1. **Bạn**: Tạo Cloudflare Worker + gắn route `media.flowa.one/*` (theo hướng dẫn trên)
2. **Bạn**: Test thử truy cập `https://media.flowa.one/storage/v1/object/public/carousel-images/...` xem ảnh có load không
3. **Lovable**: Thêm status check vào `publish-tiktok` edge function

