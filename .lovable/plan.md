

## Chuyển TikTok sang FILE_UPLOAD thay vì PULL_FROM_URL

### Vấn đề
- `PULL_FROM_URL` yêu cầu domain ảnh phải được verify trên TikTok Developer Portal
- `media.flowa.one` trỏ qua Namecheap không có Cloudflare proxy nên không auto SSL → TikTok không fetch được ảnh → bài bị drop
- Không dùng Cloudflare nên giải pháp Cloudflare Worker không khả thi

### Giải pháp: Chuyển sang FILE_UPLOAD
Thay vì để TikTok tự pull ảnh từ URL (cần domain verify + SSL), edge function sẽ **tải ảnh từ Supabase Storage rồi upload trực tiếp lên TikTok**. Cách này **không cần verify domain** gì cả.

### Luồng mới

```text
Supabase Storage → Edge Function (fetch ảnh) → TikTok Upload API → TikTok Publish API
```

Thay vì:
```text
Edge Function → gửi URL cho TikTok → TikTok tự fetch (cần domain verify + SSL)
```

### Thay đổi code

**File:** `supabase/functions/publish-tiktok/index.ts`

1. **Thêm hàm `uploadImageToTikTok`**: Fetch ảnh từ Supabase Storage, rồi PUT lên TikTok's upload endpoint
2. **Sửa `publishPhotoPost`**: 
   - Gọi TikTok `/v2/post/publish/content/init/` với `source: "FILE_UPLOAD"` thay vì `PULL_FROM_URL`
   - TikTok trả về `upload_url` cho mỗi ảnh
   - Fetch từng ảnh từ Supabase Storage → PUT bytes lên `upload_url`
   - Gọi TikTok `/v2/post/publish/status/fetch/` để xác nhận
3. **Xóa**: `rewriteImageUrlForTikTok`, `PROXY_BASE_URL`, `SUPABASE_STORAGE_DOMAIN` (không cần proxy nữa)

### Lợi ích
- Không cần verify domain trên TikTok
- Không cần `media.flowa.one`, Cloudflare Worker, hay SSL setup
- Hoạt động ngay với mọi nhà cung cấp DNS (Namecheap, GoDaddy, v.v.)
- Ảnh được upload trực tiếp → đáng tin cậy hơn PULL_FROM_URL

### Lưu ý kỹ thuật
- TikTok giới hạn mỗi ảnh tối đa 20MB
- Cần upload tuần tự (hoặc song song) tất cả ảnh trước khi gọi publish
- Edge function có thể cần thêm thời gian xử lý (download + upload), nhưng vẫn nằm trong giới hạn timeout

