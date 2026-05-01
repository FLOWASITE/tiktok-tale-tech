## Vấn đề

Nút "Sắp ra mắt" hiện thay vì "Đăng ngay" cho Bluesky vì `isSupported` whitelist trong `DirectPublishButton.tsx` thiếu `'bluesky'`.

## Fix

**File:** `src/components/social/DirectPublishButton.tsx` — line 409

Thêm `'bluesky'` (và `'wordpress_com'` cho đầy đủ) vào danh sách `isSupported`:

```ts
const isSupported = [
  'twitter', 'facebook', 'instagram', 'linkedin', 'tiktok',
  'zalo_oa', 'website', 'google_business',
  'blogger', 'wordpress', 'wordpress_com',
  'bluesky',
].includes(platform);
```

Backend (`channel-publisher` → `publish-bluesky`), hook (`publishToBluesky`), channel mapping, switch case và OAuth đều đã sẵn sàng từ các bước trước. Đây chỉ là 1 dòng whitelist còn sót.

Sau khi fix: nút "Sắp ra mắt" → "Đăng ngay" cho Bluesky đã kết nối.