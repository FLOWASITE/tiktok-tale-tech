## Mục tiêu
Tích hợp **Pinterest** thành kênh xuất bản đầy đủ trong Flowa: OAuth (Flowa app chung), AI generate content riêng cho Pinterest, publish 3 dạng Pin (Image / Video / Carousel-Idea Pin), và hook vào Agent System cho luồng tự động.

## Phạm vi (đã chốt)
- **Loại Pin**: Image Pin, Video Pin, Carousel/Idea Pin (multi-image)
- **OAuth**: Flowa cung cấp App chung (BYOK mặc định), user chỉ bấm Connect
- **Agent**: Full integration — channel `pinterest` xuất hiện trong generate-multichannel + agent-creator-v2 + auto-publish khi approved

## Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────────┐
│  UI: Connections page → "Kết nối Pinterest" → OAuth popup       │
└────────────────────┬────────────────────────────────────────────┘
                     │ click
                     ▼
   pinterest-oauth-init  ──►  Pinterest OAuth (api.pinterest.com)
                                        │
                                        ▼
                       pinterest-oauth-callback (lưu token + boards)
                                        │
                                        ▼
              social_connections (encrypted access+refresh token)
                                        │
   ┌────────────────────────────────────┼────────────────────────────────┐
   ▼                                    ▼                                ▼
generate-multichannel          agent-creator-v2                 publish-pinterest
(channel='pinterest')          (auto pipeline)               (image/video/carousel)
                                                                       │
                                                                       ▼
                                                          publishing_logs + status
```

## Các thành phần cần xây

### 1. Database (1 migration)
- Mở rộng enum/check `social_connections.platform` thêm `'pinterest'`
- Mở rộng `social_platform_settings.platform` thêm `'pinterest'` (cho admin BYOK Client ID/Secret)
- Thêm `'pinterest'` vào hệ thống channel của `multi_channel_contents` (kiểm tra column `selected_channels` và check-constraints)
- RLS đã sẵn theo pattern `organization_id` — không cần policy mới

### 2. Edge Functions mới (8 functions)
| Function | Mục đích |
|---|---|
| `pinterest-oauth-init` | Tạo state, redirect URL → Pinterest authorize endpoint |
| `pinterest-oauth-callback` | Đổi code → access+refresh token, fetch user + boards, lưu encrypted vào `social_connections` |
| `refresh-pinterest-token` | Refresh access token (Pinterest token sống 30 ngày, refresh sống 1 năm) — tích hợp pg_cron 30 phút (đã có sẵn) |
| `test-pinterest-credentials` | Admin test Client ID/Secret trước khi save |
| `test-pinterest-connection` | User test connection sau OAuth |
| `pinterest-list-boards` | Lấy danh sách board cho user chọn khi publish |
| `publish-pinterest` | Publish 1 trong 3 loại Pin (image/video/carousel) — multipart upload + polling cho video |
| `pinterest-image-proxy` | Proxy ảnh từ Supabase Storage → public URL ổn định cho Pinterest fetch (giống `tiktok-image-proxy`) |

### 3. Shared utilities
- Cập nhật `_shared/channel-config.ts` (hoặc tương đương): thêm `pinterest` với:
  - `mediaType: 'image' | 'video' | 'carousel'`
  - `maxTitle: 100`, `maxDescription: 500`, `maxLink: 2048`
  - `imageRatio: '2:3 hoặc 1:1'`, `minWidth: 1000`
- Cập nhật `_shared/instruction-standardization`: prompt template Pinterest (tone visual-discovery, keyword-rich, có CTA, hashtag tối ưu SEO)
- Bổ sung `_shared/encryption` cho field `board_id` mặc định trong metadata

### 4. Frontend (UI)
- **`Connections.tsx`**: thêm card "Pinterest" với 3-state badge (chưa kết nối / đang chờ / đã kết nối) — pattern giống Connection UI Specs hiện có
- **`SocialPlatformCredentialsDialog.tsx`** (admin): thêm tab Pinterest cho Client ID/Secret + nút Test
- **`useSocialPlatformSettings.ts`**: mở rộng type `SocialPlatform` thêm `'pinterest'`
- **`PinterestCallback.tsx`** (page): xử lý callback URL `/pinterest-callback` giống `TikTokCallback.tsx`
- **`MultiChannelViewer.tsx`** `channelConfig`: thêm entry `pinterest` (icon SVG ChannelIcon, màu đỏ Pinterest #E60023)
- **`MultiChannelForm.tsx`**: cho phép tick `pinterest` khi tạo content
- **Publish dialog**: thêm step chọn Board + dạng Pin (image/video/carousel) trước khi xuất bản
- **`channelColors.ts` + `iconMapper.ts`**: thêm Pinterest icon + brand color

### 5. Agent System integration
- `_shared/graph/orchestrator.ts`: thêm `pinterest` vào danh sách channel hợp lệ (đã có mention text — convert thành node thực)
- `agent-creator-v2`: detect channel `pinterest` → generate Pin content (title visual-first, description SEO keyword, hashtag) qua AI với prompt template chuyên biệt
- `agent-publisher`: route `pinterest` → invoke `publish-pinterest`
- `CampaignChannelStatus.tsx`, `CampaignPlanReview.tsx`, `GoalWizard.tsx`: enable Pinterest trong UI agent flow

### 6. AI Generation cho Pinterest
- Prompt mới trong `_shared/prompts/pinterest.ts`:
  - Title: 40-100 ký tự, hook visual + keyword search
  - Description: 100-500 ký tự, keyword-rich, có CTA
  - Hashtag: 3-7 tag relevant
  - Suggest 1 board phù hợp từ danh sách user có
- Token budget: 1.5K context (theo Dynamic Token Budget standard) — Pinterest text ngắn

### 7. Quota & Pricing
- Pinterest publish tính 1 unit "Nội dung" (theo Pricing v2 Units)
- Image generation cho Pin tính 1 unit "Ảnh"
- Video generation tính 1 unit "Video"
- Cập nhật `_shared/quota-units.ts` với `pinterest: 'noi_dung'`

## Pinterest API specifics (cần handle)

```text
Base URL:        https://api.pinterest.com/v5
Auth:            OAuth 2.0 + PKCE (BẮT BUỘC từ 2024)
Scopes cần:      boards:read, boards:write, pins:read, pins:write, user_accounts:read
Token lifetime:  access_token = 30 ngày, refresh_token = 365 ngày
Redirect URI:    HTTPS only (Pinterest reject http) — dùng app.flowa.one/pinterest-callback
Rate limit:      1000 req/giờ/user
```

**Image Pin**: POST `/pins` với `media_source.source_type='image_url'` + `image_url` công khai. Cần proxy nếu ảnh lưu Supabase Storage.

**Video Pin**: 2 bước — đăng ký media (`POST /media`) → upload binary lên S3 presigned URL → poll `GET /media/{id}` cho đến `status='succeeded'` → tạo Pin với `media_id`.

**Carousel/Idea Pin**: POST `/pins` với `media_source.source_type='multiple_image_urls'` (tối đa 5 ảnh). Idea Pin (`pin_format='STORY'`) hỗ trợ nhiều page hơn nhưng API hạn chế hơn — MVP ta dùng multi-image carousel trước.

## Setup yêu cầu user

1. Bạn đăng ký 1 Pinterest App tại https://developers.pinterest.com/apps/ (free, ~5 phút)
2. Lấy `Client ID` + `Client Secret`
3. Set Redirect URI: `https://app.flowa.one/pinterest-callback`
4. Mình sẽ thêm 2 secret: `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` (Flowa-wide BYOK)

## Phasing (đề xuất)

**Phase 1 — Connection foundation** (1 commit lớn)
- DB migration + 8 edge functions backbone (chưa cần publish video)
- UI Connection card + OAuth popup
- Test connect/disconnect/refresh hoạt động

**Phase 2 — Image Pin publish + Multichannel**
- `publish-pinterest` cho image
- Channel `pinterest` trong MultiChannelForm/Viewer
- AI prompt Pinterest trong generate-multichannel
- Publish thủ công từ MultiChannelViewer

**Phase 3 — Carousel + Video**
- Multi-image publish
- Video upload + polling pipeline
- Image proxy cho Storage URLs

**Phase 4 — Agent flow**
- Agent-creator-v2 + agent-publisher route
- Goal Wizard / Campaign UI enable Pinterest
- Auto-publish on approval

## Rủi ro & lưu ý

- **PKCE bắt buộc**: phải tạo `code_verifier` (random 43-128 char) lưu vào `pinterest_oauth_sessions` table tạm (TTL 10 phút), gửi `code_challenge` lên Pinterest — pattern giống Facebook session hiện có
- **HTTPS callback**: chỉ chạy được trên domain production hoặc preview lovable.app, không test được trên localhost
- **Image hosting**: Pinterest fetch ảnh từ URL public — Supabase Storage bucket cần public hoặc qua `pinterest-image-proxy`
- **Video processing trễ**: video upload mất 30s-5 phút, cần background polling như TikTok — dùng Background Persistence pattern đã có
- **Business account khuyến nghị**: Pinterest API hoạt động tốt nhất với Business account, không phải personal — note rõ trong UI khi user kết nối

## Bạn cần làm
1. Tạo Pinterest Developer App (mình sẽ guide chi tiết khi bắt đầu Phase 1)
2. Approve plan này — mình sẽ implement Phase 1 trước, sau đó từng phase cần bạn nghiệm thu trước khi qua phase tiếp