## Lỗi
`social-diagnostics` báo `Invalid action/platform: test-credentials/blogger` vì:
1. **`PLATFORM_NAMES`** trong `supabase/functions/social-diagnostics/index.ts` thiếu `'blogger'` → mọi request test Blogger đều bị reject ngay tại router.
2. Không có function **`test-blogger-credentials`** (chỉ có `test-blogger-connection`). Khi UI Admin Social Settings bấm "Test credentials" cho Blogger sẽ fail kể cả sau khi thêm vào allowlist.

## Sửa

### 1. `supabase/functions/social-diagnostics/index.ts`
Thêm `'blogger'` vào `PLATFORM_NAMES`:
```ts
const PLATFORM_NAMES = [
  'facebook', 'instagram', 'linkedin', 'threads',
  'tiktok', 'twitter', 'zalo', 'google-business', 'website', 'blogger',
];
```

### 2. Tạo `supabase/functions/test-blogger-credentials/index.ts`
Theo pattern của `test-google-business-credentials`: nhận `consumerKey` + `consumerSecret` (Google OAuth Client ID/Secret), validate format (Client ID phải có dạng `*.apps.googleusercontent.com`), trả về `{ success, message }`. Không gọi Google API thực vì credentials chỉ verify được qua OAuth flow.

### 3. `supabase/config.toml`
Thêm entry `verify_jwt = false` cho `test-blogger-credentials` (giống `test-google-business-credentials`).

## Files
- Edit: `supabase/functions/social-diagnostics/index.ts`
- Create: `supabase/functions/test-blogger-credentials/index.ts`
- Edit: `supabase/config.toml`