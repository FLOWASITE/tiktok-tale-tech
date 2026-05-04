# Thêm Social Medium

Medium là blogging platform long-form, story-first. Triển khai như channel độc lập song song với Website/Blogger/WordPress/Shopify/Wix.

## 1. Database (migration)

Thêm cột vào `multi_channel_contents`:
- `medium_content text`
- `medium_post_id text`
- `medium_post_url text`
- `medium_seo_data jsonb`

Thêm vào `social_connections.platform` enum value `medium` (nếu là enum) hoặc chỉ allow string.

## 2. Types & Channel Registry

- `src/types/multichannel.ts`:
  - Thêm `'medium'` vào `Channel` union
  - Thêm vào `CHANNEL_TO_COLUMN_MAP`: `medium: 'medium_content'`
  - Thêm token budget `medium: 1500`
  - Thêm vào `MULTI_CHANNEL_CONTENT_COLUMNS` allowlist (`medium_content`, `medium_seo_data`)
  - Thêm entry vào `CHANNELS` array: `{ value: 'medium', label: 'Medium', icon: 'BookOpen', color: 'emerald', category: 'longform', description: 'Bài Medium 1000-1800 từ, story-first, voice cá nhân/expert, không HTML, dùng Markdown thuần, kết bằng claps CTA' }`
- `src/types/channelSettings.ts`:
  - Thêm DEFAULT_CHANNEL_SETTINGS.medium (1000-1800 words, story tone)
  - Thêm channel meta label "Medium"
- `src/hooks/useChannelModelConfig.ts` ALL_CHANNELS: thêm `{ id: 'medium', name: 'Medium', icon: 'medium' }`
- `src/hooks/useEntryMode.ts` LONG_FORM_CHANNELS: thêm `'medium'`
- `src/hooks/useBacklinks.ts` LONGFORM set: thêm `'medium'`
- `src/hooks/useSocialConnections.ts` + `useSocialPlatformSettings.ts` SocialPlatform union: thêm `'medium'`

## 3. Icon

- `src/components/icons/SocialIcons.tsx`: thêm `MediumIcon` (SVG chữ "M" trong vòng tròn, brand color #000)
- Map vào tất cả channel icon registries:
  - `src/components/admin/ai/AIChannelModelConfig.tsx` CHANNEL_ICONS
  - `src/components/brand/BrandViewChannelsTab.tsx` channelIcons + channelLabels
  - `src/components/ChannelSettingsEditor.tsx` channelIcons + override defaults

## 4. AI Generation (edge function)

`supabase/functions/generate-multichannel/index.ts`:
- Thêm `medium` vào `channelDescriptions`/`channelDescs`: "Bài Medium 1000-1800 từ, story-first, voice cá nhân/expert, opening hook strong, sub-headers H2 (##) ngắn, paragraph 2-3 câu thoáng, KHÔNG HTML, kết bằng CTA claps/follow + 2-3 internal links"
- Mở rộng `select` re-read thêm `medium_content, medium_seo_data`
- SEO meta extraction: thêm block xử lý `mediumRaw` giống `wxRaw`, lưu `medium_content` + `medium_seo_data`

## 5. Mockup

- Tạo `src/components/multichannel/mockups/MediumMockup.tsx` (Medium reading layout: serif font, narrow column 680px, byline + read time + claps button)
- `src/utils/channelToMockupType.ts`: route `medium` → `MediumMockup`
- Frontend `ChannelGroupView.ALL_CHANNELS`: thêm `medium`

## 6. Publishing

- Tạo edge function `publish-medium/index.ts`:
  - Dùng Medium Integration Token (deprecated nhưng vẫn live cho personal accounts) HOẶC OAuth (Medium đã ngừng OAuth public 2018, hiện chỉ Integration Token)
  - POST `https://api.medium.com/v1/users/{userId}/posts` với title/contentFormat=markdown/content/tags/publishStatus
  - Lưu `medium_post_id` + `medium_post_url`
- `supabase/config.toml`: thêm `[functions.publish-medium]` (giữ verify_jwt mặc định)
- Frontend `useDirectPublish.ts`: thêm action route cho `medium`

## 7. Connection UI

- `BrandViewConnectionsTab.tsx`: thêm card Medium với dialog nhập **Integration Token** (Medium → Settings → Security & apps → Integration tokens) + auto-fetch user_id qua `GET /v1/me`
- `SocialPlatformCredentialsDialog.tsx` (admin): thêm `medium` mapping
- `READ_ONLY_PLATFORMS` không thêm (cho phép publish)

## 8. Helper notes

- Medium không hỗ trợ schedule API → publishStatus chỉ có `public/draft/unlisted`. Schedule sẽ chạy ở cron Flowa rồi publish ngay
- Tag tối đa 5
- Markdown native support → tận dụng output từ generate-multichannel không cần HTML conversion

## Câu hỏi xác nhận trước khi build

1. Connection method: dùng **Medium Integration Token** (đơn giản, user paste token) hay skip publish chỉ generate content?
2. Có cần publish-to-Publication (org Medium) không hay chỉ user profile?
