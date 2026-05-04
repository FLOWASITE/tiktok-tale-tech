---
name: Wix Integration (Phase 1-3)
description: Full Wix integration — API Key BYOK + OAuth 2.0 (App ID/Secret từ admin) + auto-refresh cron 30min + WixMockup riêng (Editor X look)
type: feature
---

**Phase 1 (BYOK):** `connect-website`, `publish-website`, `test-website-credentials` hỗ trợ Wix qua API Key + Site ID + Account ID. UI ở `BrandViewConnectionsTab.tsx`. Verify qua `https://www.wixapis.com/site-list/v2/sites/query`. Publish dùng Ricos rich content, upload media qua `generate-upload-url`.

**Phase 2 (OAuth):** 3 edge functions:
- `wix-oauth-start` — đọc App ID/Secret từ `social_platform_settings` (admin), fallback env
- `wix-oauth-callback` — exchange code → token (AES-256-GCM encrypt), upsert `social_connections` với `metadata.integration_type='wix_oauth'`
- `refresh-wix-token` — compare-and-swap lock pattern (`metadata.refresh_lock_until`) tránh race khi publish nhiều ảnh, TTL 4 phút (Wix access token ~5 min)

UI: `src/pages/WixCallback.tsx` + route `/auth/wix/callback`. Admin nhập App ID/Secret tại `AdminSocialSettings` → `SocialPlatformCredentialsDialog` (platform='wix').

**Phase 3 (Cron + Mockup):**
- `refresh-all-wix-tokens` — cron `*/30 * * * *`, scan `social_connections` WHERE `platform='website' AND metadata.integration_type='wix_oauth'`, refresh nếu `token_expires_at <= now() + 10min`
- `WixMockup.tsx` — Editor X/Wix Studio look: full-bleed hero ảnh với title overlay, top nav minimal (Home/About/Blog/Shop/Contact), Subscribe CTA card, footer "Powered by Wix" + `{site}.wixsite.com`. Wired vào `ChannelMockupFrame` (case 'wix') — pass `channel='wix'` từ ContentMockupToggle khi cần.

**Wix App config:** Redirect URL `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/wix-oauth-callback`, scopes Blog + Media (+ Stores optional).
