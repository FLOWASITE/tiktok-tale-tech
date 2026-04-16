

## Hoàn thiện kết nối TikTok

### Hiện trạng
- `publish-tiktok` edge function đã có (đăng photo post qua Content Posting API v2)
- `channel-publisher` đã route đến `publish-tiktok`
- TikTok đã có trong type definitions, hooks
- **Thiếu**: OAuth flow kết nối, callback, token refresh, và UI đang đánh dấu "sắp ra mắt"

### Cần làm

**1. Thêm TikTok OAuth vào `connect-social` (supabase/functions/connect-social/index.ts)**
- Thêm block `if (platform === 'tiktok')` tương tự Facebook/Threads
- Lấy credentials từ `social_platform_settings` (TikTok Client Key/Secret)
- Tạo OAuth URL: `https://www.tiktok.com/v2/auth/authorize/` với scopes: `user.info.basic,video.publish,video.upload`
- Redirect URI: `{supabaseUrl}/functions/v1/tiktok-oauth-callback`
- State chứa brandTemplateId, organizationId, userId, frontendOrigin

**2. Tạo `tiktok-oauth-callback` edge function (supabase/functions/tiktok-oauth-callback/index.ts)**
- Nhận `code` và `state` từ TikTok redirect
- Exchange code → access_token + refresh_token qua `https://open.tiktokapis.com/v2/oauth/token/`
- Lấy user info qua `https://open.tiktokapis.com/v2/user/info/`
- Lưu connection vào `social_connections` (encrypt token, lưu refresh_token, token_expires_at)
- Redirect về frontend

**3. Thêm TikTok vào `auth-gateway` (supabase/functions/auth-gateway/index.ts)**
- Thêm `tiktok: 'tiktok-oauth-callback'` vào `PLATFORM_FUNCTION_MAP`

**4. Cập nhật `SocialConnectionsManager` (src/components/social/SocialConnectionsManager.tsx)**
- Đổi `available: false` → `true` cho TikTok
- Đổi description: "Đăng video (sắp ra mắt)" → "Đăng ảnh carousel"
- Thay emoji icon bằng SVG ChannelIcon (theo memory social-identity)

**5. Cập nhật `publish-tiktok` (supabase/functions/publish-tiktok/index.ts)**
- Sử dụng `decrypt` từ `_shared/crypto.ts` thay vì decrypt thủ công (đồng bộ với các platform khác)

**6. Thêm TikTok vào `supportedPlatforms` trong `connect-social` response (line 866)**

### Yêu cầu
- Admin cần cấu hình TikTok Client Key/Secret trong Admin Settings (`social_platform_settings`)
- TikTok Developer App cần được set redirect URI đúng

### Files thay đổi
- `supabase/functions/connect-social/index.ts` — thêm TikTok OAuth block
- `supabase/functions/tiktok-oauth-callback/index.ts` — tạo mới
- `supabase/functions/auth-gateway/index.ts` — thêm mapping
- `supabase/functions/publish-tiktok/index.ts` — chuẩn hóa decrypt
- `src/components/social/SocialConnectionsManager.tsx` — bật TikTok

