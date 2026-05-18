# OAuth Provider Migration Checklist

Khi cutover từ `*.supabase.co` → `api.flowa.one`, **mọi OAuth provider** phải update redirect URI ở console của họ. Đây là khâu thủ công, không thể tự động.

## Redirect URI pattern

| Loại | URL cũ (Lovable Cloud) | URL mới (Self-host) |
|---|---|---|
| GoTrue native (Google/Apple/SAML) | `https://rllyipiyuptkibqinotz.supabase.co/auth/v1/callback` | `https://api.flowa.one/auth/v1/callback` |
| Custom OAuth edge function | `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/<platform>-oauth-callback` | `https://api.flowa.one/functions/v1/<platform>-oauth-callback` |
| Frontend callback page | `https://app.flowa.one/auth/<platform>/callback` | KHÔNG đổi (đã là custom domain) |

## Checklist 21 providers

| # | Provider | Console URL | Edge function callback | Bước |
|---|---|---|---|---|
| 1 | **Google** (login + Drive) | https://console.cloud.google.com/apis/credentials | `auth/v1/callback` | Update Authorized redirect URIs trong OAuth client |
| 2 | **Apple** (Sign in with Apple) | https://developer.apple.com/account/resources/identifiers | `auth/v1/callback` | Update Return URLs trong Services ID |
| 3 | **Facebook** (Login + Pages) | https://developers.facebook.com/apps/<app_id>/fb-login/settings | `functions/v1/facebook-oauth-callback` | Valid OAuth Redirect URIs |
| 4 | **Instagram Graph API** | Same FB App | `functions/v1/instagram-oauth-callback` | Add Instagram Basic Display product |
| 5 | **Threads** | https://developers.facebook.com/apps/<app_id>/use_cases/threads | `functions/v1/threads-oauth-callback` | Threads OAuth Redirect URI |
| 6 | **LinkedIn** | https://www.linkedin.com/developers/apps | `functions/v1/linkedin-oauth-callback` | Auth tab → Authorized redirect URLs |
| 7 | **X (Twitter)** | https://developer.x.com/en/portal/dashboard | `functions/v1/twitter-oauth-callback` | App settings → User authentication → Callback URI |
| 8 | **TikTok** | https://developers.tiktok.com/apps | `functions/v1/tiktok-oauth-callback` | Login Kit → Redirect URI |
| 9 | **Pinterest** | https://developers.pinterest.com/apps | `functions/v1/pinterest-oauth-callback` | App settings → Redirect URIs |
| 10 | **YouTube** | https://console.cloud.google.com/apis/credentials | `functions/v1/youtube-oauth-callback` | Same Google OAuth client thường |
| 11 | **Google Business Profile** | https://console.cloud.google.com/apis/credentials | `functions/v1/gbp-oauth-callback` | Same Google OAuth client |
| 12 | **Blogger** | https://console.cloud.google.com/apis/credentials | `functions/v1/blogger-oauth-callback` | Same Google OAuth client |
| 13 | **Zalo OA** | https://developers.zalo.me/apps | `functions/v1/zalo-oauth-callback` | OA Permissions → Callback URL |
| 14 | **Bluesky** | https://app.flowa.one/oauth/bluesky/client-metadata.json | DPoP confidential client | Update `redirect_uris` trong client-metadata.json (đã host trên flowa.one) |
| 15 | **WordPress.com** | https://developer.wordpress.com/apps | `functions/v1/wordpress-com-oauth-callback` | App settings → Redirect URLs |
| 16 | **Wix** | https://dev.wix.com/dc3/my-apps | `functions/v1/wix-oauth-callback` | OAuth → Redirect URLs |
| 17 | **Shopify** | https://partners.shopify.com/<id>/apps | `functions/v1/shopify-oauth-callback` | App setup → Allowed redirection URLs |
| 18 | **Google Search Console** | https://console.cloud.google.com/apis/credentials | `functions/v1/gsc-oauth-callback` | Same Google OAuth client |
| 19 | **Telegram Bot** (no OAuth) | https://t.me/BotFather | Webhook URL | `setWebhook` về `https://api.flowa.one/functions/v1/telegram-webhook` |
| 20 | **VNPay** (payment, không phải OAuth) | https://merchant.vnpay.vn | `functions/v1/vnpay-callback` | Update Return URL trong merchant config |
| 21 | **payOS** | https://my.payos.vn | `functions/v1/payos-webhook` | Webhook URL trong project config |

## Quy trình cutover OAuth (D10 trong plan gốc)

### Bước 1: Trước cutover (T-7 ngày)
- Tạo `api.flowa.one` subdomain → tạm trỏ về 1 IP test
- Phát hành SSL cert
- Deploy self-host stack ở chế độ "shadow" (chưa nhận traffic thật)
- Trên TỪNG console provider: **THÊM** redirect URI mới (giữ cả URL cũ) → đăng nhập song song được cả 2 nơi

### Bước 2: Cutover ngày (D13)
- Switch DNS `api.flowa.one` → self-host IP thật
- Test login từng provider
- Nếu lỗi: rollback DNS về cũ (vẫn còn record cũ trong console)

### Bước 3: Sau cutover ổn định (T+7 ngày)
- Trên TỪNG console: **XOÁ** redirect URI cũ (`*.supabase.co`)
- Disable Lovable Cloud project

## Lưu ý đặc biệt

- **Facebook/Instagram**: rate limit khi update App Settings, đợi ~5min mỗi lần save
- **TikTok**: phải gửi App Review nếu đổi domain redirect (mất 1-3 ngày)
- **Apple**: Return URL phải match Services ID; có cache 24h
- **Bluesky**: client-metadata.json đã ở `app.flowa.one/oauth/bluesky/client-metadata.json` → KHÔNG cần đổi vì frontend giữ nguyên domain
- **Telegram**: chỉ cần `setWebhook`, không có console
- **Zalo OA**: callback URL phải đăng ký review trước, không update tức thì
