

## Cập nhật PROXY_BASE_URL cho TikTok Image Proxy

Vì bạn đã hoàn tất DNS cho `media.flowa.one` và xác minh domain trên TikTok Developer Portal, chỉ cần thay 1 dòng code và deploy lại.

### Thay đổi

**File:** `supabase/functions/publish-tiktok/index.ts` (dòng 107)

```
// Trước:
const PROXY_BASE_URL = "https://app.flowa.one/api/tiktok-media";

// Sau:
const PROXY_BASE_URL = "https://media.flowa.one/functions/v1/tiktok-image-proxy";
```

### Deploy
- Redeploy `publish-tiktok`

### Kết quả
Khi đăng ảnh TikTok, URL ảnh sẽ được rewrite từ:
`https://rllyipiyuptkibqinotz.supabase.co/storage/v1/object/public/...`
thành:
`https://media.flowa.one/functions/v1/tiktok-image-proxy?url=<encoded_url>`

TikTok sẽ pull ảnh từ domain `media.flowa.one` đã xác minh → không còn lỗi `url_ownership_unverified`.

