

## Tiếp tục hoàn thiện kết nối TikTok

### Hiện trạng đã có
- OAuth flow trong `connect-social` (tạo URL authorization)
- `tiktok-oauth-callback` edge function (exchange code, lưu connection)
- `publish-tiktok` edge function (đăng photo carousel)
- `channel-publisher` đã route TikTok
- `auth-gateway` đã map TikTok
- UI `SocialConnectionsManager` đã bật TikTok (`available: true`)
- Frontend callback page `/auth/tiktok/callback`

### Còn thiếu

**1. Lưu TikTok Client Key/Secret vào `social_platform_settings`**
- Gọi `manage-social-platform-settings` edge function để insert record TikTok với Client Key (`sbaw2bivdy100779qu`) và Client Secret từ screenshot
- Credentials sẽ được mã hóa AES-256-GCM trước khi lưu

**2. Tạo `refresh-tiktok-token` edge function**
- TikTok access token hết hạn sau 24h, cần refresh
- Tạo `supabase/functions/refresh-tiktok-token/index.ts` theo pattern của `refresh-zalo-token`:
  - Nhận `connectionId`
  - Lấy refresh_token từ `social_connections`
  - Gọi `https://open.tiktokapis.com/v2/oauth/token/` với `grant_type: refresh_token`
  - Encrypt và lưu token mới
- Thêm TikTok vào `social-diagnostics` nếu cần

**3. Tạo `test-tiktok-connection` và `test-tiktok-credentials` edge functions**
- Theo pattern các platform khác (test connection validity, test credentials)

**4. Deploy & test**
- Deploy các edge functions mới
- Test OAuth flow end-to-end bằng `curl_edge_functions`

### Files thay đổi
- `supabase/functions/refresh-tiktok-token/index.ts` — tạo mới
- `supabase/functions/test-tiktok-connection/index.ts` — tạo mới  
- `supabase/functions/test-tiktok-credentials/index.ts` — tạo mới
- Gọi API để lưu credentials vào DB

