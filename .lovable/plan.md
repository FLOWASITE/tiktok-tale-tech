## Lỗi
`Could not find the 'expires_at' column of 'social_connections' in the schema cache`

Cột thực tế trên `social_connections` là **`token_expires_at`**, nhưng 2 edge function Bluesky đang viết/đọc `expires_at`.

## Sửa

**1. `supabase/functions/bluesky-oauth-callback/index.ts`**
- Line 137: `expires_at:` → `token_expires_at:` (lúc upsert `connectionData`)

**2. `supabase/functions/refresh-bluesky-token/index.ts`**
- Line 52: `expires_at:` → `token_expires_at:` (update sau refresh)
- Line 94: `.lt("expires_at", cutoff)` → `.lt("token_expires_at", cutoff)` (query token sắp hết hạn)

(Line 65 trong callback đọc `pending.expires_at` từ bảng `oauth_pending_states` — bảng đó có cột `expires_at` thật, giữ nguyên.)

Không cần migration. Sau khi sửa, OAuth callback sẽ insert thành công và kết nối Bluesky hoàn tất.