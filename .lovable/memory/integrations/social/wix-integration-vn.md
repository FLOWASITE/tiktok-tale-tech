---
name: Wix Integration (Phase 1-3 + Multichannel)
description: Full Wix integration — API Key BYOK + OAuth 2.0 + auto-refresh cron + WixMockup + long-form channel độc lập trong multichannel (cột wix_content riêng)
type: feature
---

**Phase 1 (BYOK):** `connect-website`, `publish-website`, `test-website-credentials` hỗ trợ Wix qua API Key + Site ID + Account ID. Verify qua `https://www.wixapis.com/site-list/v2/sites/query`. Publish dùng Ricos rich content, upload media qua `generate-upload-url`.

**Phase 2 (OAuth):** 3 edge functions:
- `wix-oauth-start` — đọc App ID/Secret từ `social_platform_settings` (admin), fallback env
- `wix-oauth-callback` — exchange code → token (AES-256-GCM encrypt), upsert `social_connections` với `metadata.integration_type='wix_oauth'`
- `refresh-wix-token` — compare-and-swap lock pattern (`metadata.refresh_lock_until`) tránh race khi publish nhiều ảnh, TTL 4 phút

UI: `src/pages/WixCallback.tsx` + route `/auth/wix/callback`. Admin nhập App ID/Secret tại `AdminSocialSettings`.

**Phase 3 (Cron + Mockup):**
- `refresh-all-wix-tokens` — cron `*/30 * * * *`, scan `wix_oauth` connections, refresh nếu sắp hết hạn
- `WixMockup.tsx` — Editor X/Wix Studio look. Wired vào `ChannelMockupFrame` (case 'wix').

**Phase 4 (Multichannel — long-form channel độc lập):**
- DB: `multi_channel_contents` + 4 cột `wix_content`, `wix_post_id`, `wix_post_url`, `wix_seo_data` (migration `2026-05-04`)
- `Channel` type + `CHANNELS` array có `wix` (label 'Wix Blog', category 'text', 800-1500 từ, Ricos format)
- `channel_settings`, `channelImageConfig` (16:9 hero), `channelColors`, `MultiChannelViewer/Stats/ListView/Form/PublishingQueue/...` đều thêm entry `wix` (clone từ shopify pattern)
- Generate-multichannel + channel-publisher đã có nhánh wix qua auto-clone shopify
- Publish flow: dùng `publish-website` với nhánh `wix_oauth` đã sẵn sàng (Ricos format)

**Wix App config:** Redirect URL `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/wix-oauth-callback`, scopes Blog + Media (+ Stores optional).
