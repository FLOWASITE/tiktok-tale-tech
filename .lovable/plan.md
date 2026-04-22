

# Fix ảnh không có text/footer/logo khi đăng từ Telegram

## Nguyên nhân thực sự (đã verify trong code)

Resolver `channel-publisher/resolve-social-payload.ts` (lines 111-127) parse `channel_images[channelKey]` **chỉ khi nó là array** (`Array.isArray(imgs)`).

Nhưng thực tế trong DB (verify từ `agent-pipeline/index.ts:258`, `generate-brand-image/index.ts:897-902`, `agent-creator-v2/index.ts:230-236`, `SocialPostCard.tsx:76`), shape là **single object**:

```js
channel_images = {
  facebook: { url: "https://...image-with-logo-footer.jpg", ... },
  instagram: { url: "...", ... }
}
```

→ `Array.isArray({url:...})` = false → `mediaUrls` không được inject → `publish-facebook` chỉ nhận `content` text → đăng bài text-only, **không có ảnh** (mà ảnh chính là cái chứa logo + footer + text overlay đã render sẵn từ `generate-brand-image`).

User nói "ảnh không có text/footer/logo" — thực ra là **không có ảnh nào cả**, post chỉ có text. Cảm giác như "ảnh trống không logo" vì FB hiển thị link preview hoặc nothing.

Thêm: **test cũ pass nhưng sai shape** — mock dùng array `[{url:...}, "url2"]` thay vì object `{url:...}` như production. Test không bắt được lỗi này.

## Fix

### 1. `supabase/functions/channel-publisher/resolve-social-payload.ts`

Mở rộng parser cho **3 shape** (production + legacy + bulletproof):

```ts
const imgs = channelImages[socialMap.channelKey];
const urls: string[] = [];

if (Array.isArray(imgs)) {
  // legacy array
  for (const it of imgs) {
    const u = typeof it === 'string' ? it : it?.url || it?.image_url;
    if (typeof u === 'string' && u.trim()) urls.push(u);
  }
} else if (imgs && typeof imgs === 'object') {
  // production: single object {url, ...}
  const u = (imgs as any).url || (imgs as any).image_url;
  if (typeof u === 'string' && u.trim()) urls.push(u);
} else if (typeof imgs === 'string' && imgs.trim()) {
  urls.push(imgs);
}

if (urls.length > 0) {
  finalPayload.mediaUrls = urls;
  if (!finalPayload.mediaUrl) finalPayload.mediaUrl = urls[0];
}
```

### 2. `supabase/functions/channel-publisher/__tests__/resolve-social-payload.test.ts`

Sửa test mock cho đúng production shape + thêm 2 cases regression:

| Test | channel_images shape | Expected mediaUrls |
|---|---|---|
| Existing 8 platforms | đổi sang `{[ck]: {url: '...jpg'}}` (object) | `['...jpg']` |
| **NEW** Legacy array shape | `{[ck]: [{url:'a'}, 'b']}` | `['a','b']` |
| **NEW** String shape | `{[ck]: 'https://x.jpg'}` | `['https://x.jpg']` |
| **NEW** Empty/missing image | `{[ck]: null}` hoặc `{}` | `mediaUrls` undefined (không inject) |

### 3. Verify chuỗi dữ liệu (không sửa, chỉ confirm)

- `generate-brand-image` tạo ảnh đã có logo + footer + text overlay → upload → save URL vào `channel_images[channel].url` ✓
- `publish-facebook` nhận `mediaUrls` → đăng `single photo` với `caption=content` (lines 82-105) ✓
- Sau fix, Telegram flow sẽ pass `mediaUrls=[<branded-image-url>]` xuống publish-facebook → FB post có cả ảnh (đã render logo+footer+text) lẫn caption text ✓

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/channel-publisher/resolve-social-payload.ts` | Hỗ trợ 3 shape của `channel_images[channel]`: object `{url}` (production), array (legacy), string. |
| `supabase/functions/channel-publisher/__tests__/resolve-social-payload.test.ts` | Sửa mock sang object shape; thêm tests cho array+string+empty. |

## Sau fix
Redeploy `channel-publisher` → Telegram "🚀 Đăng ngay" cho FB/IG/LinkedIn/Threads/Twitter/Zalo/GBP sẽ kèm ảnh branded (có logo, footer, text overlay).

## Rủi ro
Rất thấp. Chỉ mở rộng parser (more permissive), không thay đổi schema/auth/forward. Tests mới đảm bảo cover cả 3 shape.

