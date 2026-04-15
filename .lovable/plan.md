

## Hoàn thiện tích hợp Instagram

Hiện tại Instagram đã có OAuth flow và edge function publish, nhưng có nhiều lỗi ngăn hệ thống hoạt động end-to-end. Dưới đây là các vấn đề và cách sửa:

### Vấn đề phát hiện

1. **Frontend chặn publish**: `useDirectPublish.ts` → `publishToInstagram` là stub hiện toast "Chưa hỗ trợ" thay vì route qua `channel-publisher`
2. **OAuth callback thiếu biến**: `instagram-oauth-callback/index.ts` dòng 90 dùng `supabaseUrl` nhưng chưa khai báo
3. **Thiếu `platform_user_id`**: OAuth callback lưu `instagram_user_id` vào `metadata` nhưng không set `platform_user_id` → publish function đọc `connection.platform_user_id` = null → lỗi
4. **Token không mã hóa**: OAuth callback lưu `access_token` dạng plaintext, nhưng publish function gọi `decryptCredential()` → lỗi giải mã
5. **Duplicate import**: `publish-instagram/index.ts` dòng 2-3 import `decryptCredential` 2 lần
6. **Thiếu token refresh**: Instagram long-lived token hết hạn sau 60 ngày, chưa có auto-refresh

### Sửa chữa

#### 1. `src/hooks/useDirectPublish.ts` — Kích hoạt publish Instagram
- Thay stub `publishToInstagram` bằng logic route qua `channel-publisher` giống Facebook

#### 2. `supabase/functions/instagram-oauth-callback/index.ts` — Sửa 3 lỗi
- Thêm `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;` trước dòng 90
- Thêm `platform_user_id: String(instagramUserId)` vào `connectionData`
- Mã hóa access token trước khi lưu: `encrypt(longLivedToken, encryptionKey)`

#### 3. `supabase/functions/publish-instagram/index.ts` — Xóa duplicate import
- Xóa dòng 3 (duplicate `import { decryptCredential }`)

#### 4. Token refresh — Thêm Instagram vào cron job
- Tạo hoặc cập nhật edge function refresh token để hỗ trợ Instagram
- Instagram refresh endpoint: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={token}`
- Chạy mỗi 30 ngày (trước khi token 60 ngày hết hạn)

### File cần sửa
- `src/hooks/useDirectPublish.ts` — bỏ stub, route qua channel-publisher
- `supabase/functions/instagram-oauth-callback/index.ts` — sửa supabaseUrl, platform_user_id, encrypt token
- `supabase/functions/publish-instagram/index.ts` — xóa duplicate import
- Tạo/cập nhật edge function auto-refresh cho Instagram token

