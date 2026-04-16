

## Giải pháp: Proxy ảnh qua domain đã xác minh cho TikTok

### Vấn đề
TikTok yêu cầu xác minh quyền sở hữu domain lưu trữ ảnh khi dùng `PULL_FROM_URL`. Ảnh hiện đang lưu trên `rllyipiyuptkibqinotz.supabase.co` — domain không thể xác minh. Photo posts **chỉ** hỗ trợ `PULL_FROM_URL`, không có `FILE_UPLOAD`.

### Giải pháp: 2 bước

**Bước 1 — Tạo Edge Function proxy ảnh (code)**

Tạo `supabase/functions/tiktok-image-proxy/index.ts`:
- Nhận param `?url=<supabase_storage_url>`
- Fetch ảnh từ Supabase Storage
- Trả về ảnh với đúng Content-Type
- Chỉ cho phép URL từ domain Supabase storage của project

URL proxy sẽ có dạng: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/tiktok-image-proxy?url=...`

Tuy nhiên, URL này vẫn dùng domain supabase.co. Cần redirect qua custom domain.

**Cách tiếp cận thực tế hơn:** Vì `app.flowa.one` là domain bạn sở hữu, bạn có thể:

1. Xác minh `app.flowa.one` trên TikTok Developer Portal (chọn **Domain** → DNS record)
2. Tạo edge function `tiktok-image-proxy` trả ảnh
3. Trong `publish-tiktok`, thay URL ảnh từ `rllyipiyuptkibqinotz.supabase.co/storage/...` thành `app.flowa.one/api/tiktok-image/...` (route qua proxy)

**Hoặc đơn giản hơn:** Vì Supabase Storage URLs là public, bạn chỉ cần setup một **redirect/proxy route** trên `app.flowa.one` để forward request tới Supabase Storage.

**Bước 2 — Cập nhật `publish-tiktok/index.ts`**

Trong `publishPhotoPost`, rewrite mỗi `imageUrl`:
```text
// Trước: https://rllyipiyuptkibqinotz.supabase.co/storage/v1/object/public/...
// Sau:   https://app.flowa.one/api/tiktok-media?url=<encoded_original_url>
```

### File thay đổi
1. **Tạo mới:** `supabase/functions/tiktok-image-proxy/index.ts` — Proxy fetch ảnh từ Supabase Storage, trả binary response
2. **Sửa:** `supabase/functions/publish-tiktok/index.ts` — Rewrite image URLs qua proxy domain
3. **Deploy:** cả 2 edge functions

### Bước bạn cần làm (thủ công)
1. Trên server `app.flowa.one`, thêm route `/api/tiktok-media` proxy tới edge function `tiktok-image-proxy`
2. Vào TikTok Developer Portal → App → URL Properties
3. Chọn **Domain** → nhập `app.flowa.one` → thêm DNS TXT record theo hướng dẫn
4. Hoàn tất xác minh

### Câu hỏi trước khi triển khai
Bạn có quyền thêm route mới trên `app.flowa.one` không? Nếu `app.flowa.one` đang trỏ thẳng tới Lovable preview thì chúng ta cần cách khác (vd: dùng Cloudflare Worker hoặc domain khác bạn kiểm soát DNS).

