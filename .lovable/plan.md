
# Tích hợp Bluesky vào hệ thống Social

Bluesky sử dụng AT Protocol với xác thực qua App Password (tương tự Twitter manual credentials). Không cần OAuth callback — user nhập handle + app password trực tiếp.

## Tổng quan kỹ thuật

**Bluesky AT Protocol API:**
- Auth: `POST https://bsky.social/xrpc/com.atproto.server.createSession` (handle + app password -> JWT)
- Post: `POST https://bsky.social/xrpc/com.atproto.repo.createRecord` (app.bsky.feed.post)
- Upload image: `POST https://bsky.social/xrpc/com.atproto.repo.uploadBlob` (max 1MB/image, max 4 images)
- Token refresh: `POST /xrpc/com.atproto.server.refreshSession` (dùng refreshJwt)
- Giới hạn: 300 ký tự/post, tối đa 4 ảnh, hỗ trợ rich text (mentions, links, hashtags)

---

## Các bước triển khai

### 1. Database Migration
- Thêm cột `bluesky_content` (text) vào `multi_channel_contents`
- Không cần OAuth callback table — Bluesky dùng App Password lưu encrypted trong `social_connections.credentials`

### 2. Frontend - Type & UI Updates

**SocialPlatform type** (`useSocialConnections.ts`):
- Thêm `'bluesky'` vào union type `SocialPlatform`

**ChannelIcon** (`streaming/ChannelIcon.tsx`):
- Tạo `BlueskyIcon` SVG trong `SocialIcons.tsx` (butterfly logo)
- Đăng ký vào `channelConfig` với bgClass `bg-[#0085FF] text-white`

**BrandViewConnectionsTab** (`BrandViewConnectionsTab.tsx`):
- Thêm `bluesky` vào `PLATFORM_CONFIG` 
- Tạo dialog nhập Bluesky Handle + App Password (pattern giống Twitter manual setup)
- Thêm `bluesky` vào `PLATFORM_DIAG_MAP`

**ChannelSettingsEditor**:
- Thêm bluesky vào channel list, emoji/hashtag config
- Thêm prompt rules cho Bluesky (300 ký tự, casual/conversational tone)

### 3. Edge Functions

**`connect-social`** (update):
- Xử lý `platform: 'bluesky'` — nhận `handle` + `appPassword`
- Gọi `com.atproto.server.createSession` để verify credentials
- Lưu encrypted credentials (handle, appPassword, DID, accessJwt, refreshJwt) vào `social_connections`

**`publish-bluesky`** (mới):
- Tạo session via createSession
- Upload images (nếu có) via uploadBlob
- Parse rich text facets (URLs, mentions, hashtags) 
- Tạo post via createRecord với app.bsky.feed.post
- Lưu post URI + CID vào publishing_logs

**`test-bluesky-connection`** (mới):
- Verify handle + app password bằng createSession
- Trả về profile info (displayName, avatar)

**`refresh-bluesky-token`** (mới):
- Gọi refreshSession với refreshJwt
- Update credentials trong social_connections

**`social-diagnostics`** (update):
- Thêm `'bluesky'` vào `PLATFORM_NAMES`

**`channel-publisher/resolve-social-payload`** (update):
- Thêm entry `bluesky` vào `SOCIAL_RESOLVE_MAP`

### 4. Multichannel Generation

**`generate-multichannel`** (update):
- Thêm bluesky vào channel prompt rules (300 ký tự, casual, hashtag-light)
- Map `bluesky` -> `bluesky_content` column
- Lưu generated content vào `bluesky_content`

### 5. Các file UI cần cập nhật
- `MultiChannelViewer.tsx`, `MultiChannelPreviewDialog.tsx` — hiển thị bluesky content
- `ChannelImagesGallery.tsx` — gallery cho bluesky images
- `CalendarDayView.tsx` — hiển thị scheduled bluesky posts
- `ChannelSettingsEditor.tsx` — channel config
- `useCampaignChannelIntegration.ts` — channel status tracking

### 6. Supabase Config
- Thêm `publish-bluesky`, `test-bluesky-connection`, `refresh-bluesky-token` vào config.toml nếu cần verify_jwt = false

---

## Bluesky-specific Rules
- **300 ký tự** limit (không phải 280 như Twitter)
- **Rich text facets**: links và mentions cần byte-offset positions (không phải character offset)
- **4 images max**, mỗi ảnh <= 1MB
- **App Password** thay vì OAuth — user tạo tại bsky.app/settings/app-passwords
- **DID** (Decentralized Identifier) là user ID chính, không phải handle
