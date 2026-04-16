

## Cập nhật publish-tiktok: Rewrite URL ảnh sang media.flowa.one

### Bối cảnh
- Cloudflare đã setup: `media.flowa.one` → CNAME → `rllyipiyuptkibqinotz.supabase.co` (Proxied, có SSL)
- TikTok TXT record đã có trên Cloudflare DNS
- Code hiện tại gửi URL Supabase Storage trực tiếp → TikTok reject vì domain chưa verify

### Thay đổi code

**File: `supabase/functions/publish-tiktok/index.ts`**

Thêm hàm rewrite URL và áp dụng trước khi gửi cho TikTok:

```typescript
const SUPABASE_STORAGE_HOST = "rllyipiyuptkibqinotz.supabase.co";
const MEDIA_PROXY_HOST = "media.flowa.one";

function rewriteImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === SUPABASE_STORAGE_HOST) {
      parsed.hostname = MEDIA_PROXY_HOST;
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch { /* keep original */ }
  return url;
}
```

Trong `publishPhotoPost`, rewrite URLs trước khi đưa vào `photo_images`:
```typescript
const rewrittenUrls = imageUrls.map(rewriteImageUrl);
// source_info.photo_images = rewrittenUrls
```

Cập nhật error message cho `url_ownership_unverified` để nhắc verify `media.flowa.one` thay vì Supabase domain.

### Checklist trước khi deploy
- ✋ **Bạn cần xác nhận**: Domain `media.flowa.one` đã được verify thành công trên TikTok Developer Portal chưa? (URL Properties → Status: Verified)
- Nếu chưa verify, code sẽ vẫn bị lỗi `url_ownership_unverified` dù URL đã rewrite đúng

### Deploy
- Redeploy edge function `publish-tiktok`

