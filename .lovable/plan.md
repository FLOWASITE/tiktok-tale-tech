

## Bước tiếp theo: Gắn Worker Route cho media.flowa.one

### Tình trạng hiện tại
- DNS: CNAME `media` → `rllyipiyuptkibqinotz.supabase.co`, Proxy ON -- OK
- SSL: Full -- OK  
- Worker `muddy-mountain-3859`: Đã tạo nhưng chưa gắn Route
- Kết quả: Request tới `media.flowa.one` đi qua Cloudflare proxy nhưng KHÔNG qua Worker, gửi Host header sai tới Supabase → lỗi

### Bước cần làm trên Cloudflare (bạn thao tác)

**Bước 1: Vào Workers Routes**
1. Trên Cloudflare Dashboard, chọn domain `flowa.one` (sidebar trái)
2. Vào **Workers Routes** (trong menu bên trái, mục "Workers Routes")
3. Click **Add Route**

**Bước 2: Thêm Route**
- **Route**: `media.flowa.one/*`
- **Worker**: chọn `muddy-mountain-3859`
- **Zone**: `flowa.one` (tự động)
- Click **Save**

**Bước 3: Xác nhận Worker code rewrite Host header**
Worker code cần đảm bảo rewrite Host header. Code đúng:

```text
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "rllyipiyuptkibqinotz.supabase.co";
    const newHeaders = new Headers(request.headers);
    newHeaders.set("Host", "rllyipiyuptkibqinotz.supabase.co");
    return fetch(url.toString(), {
      method: request.method,
      headers: newHeaders,
    });
  }
};
```

**Bước 4: Test**
Mở trình duyệt, truy cập một URL ảnh thật, ví dụ:
`https://media.flowa.one/storage/v1/object/public/carousel-images/<tên-file>.jpg`
- Nếu ảnh hiện ra → thành công, thử đăng TikTok lại
- Nếu lỗi 52x hoặc không load → kiểm tra lại Worker code và Route

### Sau khi media.flowa.one hoạt động
Không cần sửa code Edge Function. Logic preflight và rewrite URL trong `publish-tiktok/index.ts` đã sẵn sàng. Chỉ cần thử đăng bài TikTok lại.

