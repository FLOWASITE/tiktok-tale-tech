# Kế hoạch phát triển kênh WordPress

## Bối cảnh
Hiện tại WordPress đang **gộp chung trong channel generic `website`** (cùng với Wix, Shopify, NukeViet, custom API). User chọn "Website/Blog" → backend mới phân nhánh theo `integrationType`. Blogger vừa được tách thành kênh riêng (orange branding, content mapping, image pipeline, direct publish). Chúng ta sẽ áp dụng **đúng pattern Blogger** cho WordPress để:
- Người dùng thấy "WordPress" như 1 kênh độc lập (logo + màu xanh WP #21759b).
- Có nút "Đăng WordPress" riêng, mockup preview riêng.
- Kết nối WordPress per-brand qua Application Password.
- AI sinh nội dung long-form đúng chuẩn WordPress (headings, blocks, featured image, categories/tags, SEO meta).

## Mục tiêu
1. WordPress = first-class channel `wordpress` (giống `blogger`, `website`).
2. Hỗ trợ WordPress.com (OAuth qua connector) **và** self-hosted WordPress (Application Password).
3. Pipeline: Generate → Preview/Mockup → Direct Publish → Track status.
4. Tags, Categories, Featured Image, Excerpt, SEO (Yoast/Rank Math meta nếu có).

---

## Phạm vi & các bước thực hiện

### Bước 1 — Channel registry & UI core
- `src/types/multichannel.ts`: thêm `'wordpress'` vào union `Channel` + entry trong `CHANNEL_CONFIGS` (label "WordPress", icon `Globe`/SVG WP, color blue-wp, category `text`).
- `src/utils/channelColors.ts`, `src/config/channelImageConfig.ts`, `src/components/ui/channel-icon.tsx`: đăng ký màu (#21759b), icon SVG WordPress (thay vì emoji).
- `getContentForChannel`: map `'wordpress'` → `website_content` (long-form), giống Blogger.
- Cập nhật `BrandViewChannelsTab`, `ChannelGroupView`, `ExpandChannelsDialog`, `MultiChannelStats`, `MultiChannelCard`, `ImageChannelPicker`, `ContentMockupToggle`: render WordPress riêng, không gộp với "website".

### Bước 2 — Generation pipeline
- `supabase/functions/generate-multichannel/index.ts`:
  - `expandWordpressToWebsite()` tương tự Blogger: nếu user chọn `wordpress` → internally gọi long-form `website` generator nhưng vẫn lưu key `wordpress` vào `selected_channels` & `channel_statuses`.
  - Token budget WordPress = website (1500-2500 tokens), giữ markdown (H2/H3, lists, blockquote).
  - Sinh kèm: `excerpt` (150-160 ký tự), `tags[]` (5-8), `category` gợi ý, `seo_title`, `seo_description`, `slug`.
- `src/components/MultiChannelCreate.tsx`: thêm `wordpress` vào danh sách channel có image hero (1200x675, ratio blog).

### Bước 3 — Mockup & Viewer
- `MultiChannelViewer.tsx`: label "WordPress" + WP color, dùng `website_content`, fallback `seoData.content`, hiển thị tags/categories.
- `ChannelMockupFrame.tsx`: thêm variant `wordpress` (header logo WP + featured image + H1 + body markdown render + tags chips + author/date), khác biệt với mockup Blogger (orange) và website generic.
- `ContentAnalyticsPanel.tsx`: cho phép xem SEO score / GEO score riêng cho WordPress.

### Bước 4 — Connection (per-brand)
**Hai luồng song song:**

**A. Self-hosted WordPress (Application Password)** — luồng chính cho VN:
- Tạo edge function mới `connect-wordpress` (tách từ `connect-website`):
  - Input: `siteUrl`, `username`, `applicationPassword`, `brandTemplateId`.
  - Test qua `GET {siteUrl}/wp-json/wp/v2/users/me?context=edit`.
  - Lưu `social_connections` với `platform='wordpress'`, encrypted password, `metadata: { site_url, username, wp_version, capabilities }`.
- UI: thêm card "WordPress" trong `BrandViewConnectionsTab` + `SocialConnectionsManager` với form (Site URL, Username, App Password + link hướng dẫn tạo Application Password).

**B. WordPress.com (OAuth)** — optional, dùng connector có sẵn:
- Đã có connector `wordpress_com` (uses gateway). Wrap qua `standard_connectors` flow nếu user chọn "WordPress.com".
- Edge function `wordpress-oauth-callback` (tương tự `blogger-oauth-callback`) lưu connection per-brand, derive `organization_id` từ `brand_templates`.

### Bước 5 — Publishing
- Tạo `supabase/functions/publish-wordpress/index.ts` (tách logic WordPress khỏi `publish-website`):
  - Self-hosted: `POST {site}/wp-json/wp/v2/posts` với Basic Auth (decrypt App Password).
  - WordPress.com: `POST https://connector-gateway.lovable.dev/wordpress_com/...` qua gateway.
  - Upload featured image: `POST /wp-json/wp/v2/media` → set `featured_media`.
  - Map: `title`=seo_title, `content`=markdown→HTML, `excerpt`, `status`='publish'|'draft', `tags`, `categories`, `slug`, `meta` (Yoast keys nếu phát hiện plugin).
  - Strip SEO metadata block trước khi gửi (giống Blogger).
- `src/components/social/DirectPublishButton.tsx` & `useDirectPublish.ts`:
  - Thêm case `'wordpress'`: route tới `publish-wordpress`.
  - Pre-check connection theo brand → nếu chưa kết nối, toast error + link tới Connections tab.
- `channel-publisher/index.ts`: ưu tiên `channel_images.wordpress` → `featured_image_url` → `channel_images.website`. Update `channel_statuses.wordpress='published'`.

### Bước 6 — Database migration
- Backfill `social_connections` hiện có (`platform='website'`, `metadata.integration_type='wordpress'`) → tách thành rows mới `platform='wordpress'`, giữ nguyên `organization_id` & `brand_template_id`.
- Thêm vào `multi_channel_contents.channel_statuses` JSON support key `wordpress` (no schema change cần thiết, JSON tự do).
- Migration thêm RLS check (đã có cho social_connections theo organization).

### Bước 7 — Admin & Settings
- `AdminSocialSettings.tsx`: thêm WordPress vào danh sách platform credentials (cho admin set OAuth client của WordPress.com BYOK nếu cần).
- `SocialPlatformCredentialsDialog.tsx`: form WordPress.com OAuth (client_id/secret) — optional, fallback dùng managed connector.

### Bước 8 — Testing & QA
- Test self-hosted: 1 site WordPress demo, tạo App Password, connect → publish bài có ảnh + tags.
- Test WordPress.com: dùng connector workspace.
- Test multi-brand isolation: brand A connect, brand B không thấy connection của A.
- Kiểm tra mockup preview đúng style WP (không lẫn Blogger orange).

---

## Chi tiết kỹ thuật

### Files mới
```
supabase/functions/connect-wordpress/index.ts
supabase/functions/publish-wordpress/index.ts
supabase/functions/test-wordpress-connection/index.ts
supabase/functions/wordpress-oauth-callback/index.ts          (cho WordPress.com)
supabase/functions/refresh-wordpress-token/index.ts           (cho WordPress.com)
src/pages/WordPressCallback.tsx                               (OAuth landing)
supabase/migrations/<timestamp>_split_wordpress_channel.sql   (backfill)
```

### Files sửa
```
src/types/multichannel.ts                       (+ 'wordpress' channel)
src/utils/channelColors.ts                      (+ WP blue #21759b)
src/config/channelImageConfig.ts                (+ wordpress 1200x675)
src/components/ui/channel-icon.tsx              (+ SVG WordPress logo)
src/components/MultiChannelViewer.tsx           (label + content mapping)
src/components/preview/ChannelMockupFrame.tsx   (mockup variant wordpress)
src/components/viewer/ContentMockupToggle.tsx   (enable SEO panel cho WP)
src/components/brand/BrandViewChannelsTab.tsx
src/components/brand/BrandViewConnectionsTab.tsx (form WP connection)
src/components/multichannel/ChannelGroupView.tsx
src/components/multichannel/ExpandChannelsDialog.tsx
src/components/multichannel/ExpandChannelsStreamingDialog.tsx
src/components/multichannel/ImageChannelPicker.tsx
src/components/social/DirectPublishButton.tsx
src/components/social/SocialConnectionsManager.tsx
src/hooks/useDirectPublish.ts
src/hooks/useSocialConnections.ts
src/pages/MultiChannelCreate.tsx                (image gen channels)
src/pages/AdminSocialSettings.tsx               (WP credentials)
src/app/routes.tsx                              (+ /auth/wordpress/callback)
supabase/functions/generate-multichannel/index.ts (expandWordpressToWebsite + persist key)
supabase/functions/channel-publisher/index.ts   (route wordpress + image fallback)
supabase/config.toml                            (verify_jwt=false cho oauth callback)
```

### Schema cascade tái sử dụng
```
Industry Memory → Brand Voice → Channel(WordPress: long-form, markdown, SEO) → Defaults
```

### Mockup khác biệt 3 channel long-form
| Channel  | Màu chính | Header preview        | Đặc điểm                     |
|----------|-----------|-----------------------|------------------------------|
| website  | gray      | URL bar generic       | Generic blog                 |
| blogger  | #f57c00   | Logo Blogger          | Orange branding              |
| wordpress| #21759b   | Logo WordPress + WP UI| Tags chips + categories meta |

---

## Câu hỏi xác nhận trước khi build
1. Ưu tiên **self-hosted WordPress (Application Password)** trước, hay làm song song cả **WordPress.com OAuth**?
2. Có cần hỗ trợ **Yoast SEO / Rank Math** meta fields ngay đợt 1 không, hay để phase 2?
3. Featured image: dùng lại `channel_images.website` hay generate riêng cho WordPress (1200x675 chuẩn blog)?

Sau khi user approve, mình sẽ thực thi tuần tự Bước 1 → Bước 8, mỗi bước commit riêng để Lovable Cloud auto-deploy edge functions.
