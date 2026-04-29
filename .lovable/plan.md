## Bối cảnh

Blogger **đã có khung sơ khai** trong codebase (option trong dropdown, branch `integrationType === 'blogger'` ở `connect-website` + `publish-website`), nhưng đang dùng **API Key** — điều này chỉ cho phép **đọc** (Blogger API v3 yêu cầu **OAuth 2.0** cho mọi thao tác POST/PUT/DELETE). Nói cách khác, flow publish hiện tại **không thể chạy thật** vì Google sẽ trả 401.

Cần nâng cấp Blogger thành **kênh độc lập** với OAuth đầy đủ (giống Google Business Profile đã có).

## Mục tiêu

Tách Blogger khỏi nhóm "website integrationType" và biến thành **kênh chính thức** trong hệ Brand Connections, có:
- OAuth 2.0 connect/disconnect
- Auto refresh token (`refresh-blogger-token` qua pg_cron 30 phút như các kênh social khác)
- Publish bài (title + HTML content + labels + featured image qua `<img>` inline)
- Hiển thị trong UI Brand Connections với badge 3-trạng thái + ChannelIcon SVG riêng
- Lưu credentials AES-GCM, isolation theo `brand_template_id`

## Kiến trúc

Tái sử dụng **đúng pattern Google Business Profile** vì cùng provider Google:

```text
Admin: social_platform_settings.platform='blogger' (consumer_key/secret = Google OAuth Client)
                    │
                    ▼
User Connect ──► connect-blogger (build authorize URL, scope: blogger)
                    │
                    ▼
Google ──► blogger-oauth-callback ──► social_connections (encrypted tokens, blog_id list trong metadata)
                    │
                    ▼
Publish ──► publish-blogger ──► Blogger API v3 với Bearer token
                    │
pg_cron 30' ──► refresh-blogger-token (auto refresh trước khi expire)
```

## Các file sẽ tạo / sửa

### 1. Database migration
- Thêm `'blogger'` vào CHECK constraint cột `platform` của `social_connections` và `social_platform_settings`
- Không cần bảng mới — tái dùng schema social_connections (access_token, refresh_token, expires_at, metadata jsonb chứa blog_id + blog_url + blog_name)

### 2. Edge Functions mới (`supabase/functions/`)
- **`connect-blogger/index.ts`** — sinh OAuth URL với `scope=https://www.googleapis.com/auth/blogger`, state chứa brandTemplateId/orgId/userId
- **`blogger-oauth-callback/index.ts`** — exchange code → token, gọi `blogger/v3/users/self/blogs` để lấy danh sách blog, lưu vào metadata, encrypt tokens
- **`publish-blogger/index.ts`** — POST `blogger/v3/blogs/{blogId}/posts` với Bearer token, body: `{kind, title, content (HTML), labels}`. Featured image: chèn `<img>` ở đầu content (Blogger không có separate field)
- **`refresh-blogger-token/index.ts`** — refresh khi token còn <10 phút
- **`test-blogger-connection/index.ts`** — gọi `users/self/blogs` để verify
- Cập nhật `supabase/config.toml`: `[functions.publish-blogger] verify_jwt = false` cho callback

### 3. Frontend
- **`src/components/icons/ChannelIcon.tsx`** — thêm icon SVG Blogger (chữ B cam logo)
- **`src/components/brand/BrandViewConnectionsTab.tsx`**:
  - Thêm card "Blogger" vào danh sách kênh chính (không còn nằm trong dropdown website)
  - Nút "Kết nối Blogger" → mở popup OAuth window → polling success
  - Hiển thị blog_name + blog_url sau khi connect, dropdown chọn blog nếu user có nhiều blog
  - Badge 3-state: chưa kết nối / đã kết nối / hết hạn
- **`src/hooks/social/useBloggerConnection.ts`** — connect/disconnect/test mutations
- Cập nhật `BrandViewConnectionsTab.tsx`: **giữ** option Blogger cũ trong dropdown website nhưng thêm cảnh báo "Đã chuyển thành kênh riêng, dùng card Blogger phía trên" + disabled (cho data cũ) — hoặc auto-migrate connections cũ sang platform mới

### 4. Channel medium classification
- Cập nhật `mem://architecture/multichannel/channel-medium-reclassification-vn` mapping: `blogger` → medium **text** (long-form, giống `website`/`blog`)
- `useChannelConfig` / `MULTICHANNEL_CHANNELS` (search trong `src/lib/`): thêm Blogger với character limit ~5000, tone "long-form-blog"

### 5. Publishing pipeline integration
- `channel-publisher` shared logic: thêm route Blogger
- Schedule/cron: `automated-publishing-cron` đã generic theo platform → chỉ cần platform='blogger' chạy được

### 6. Admin
- `src/pages/admin/SocialPlatformSettings.tsx` (hoặc tương tự): thêm form nhập Google OAuth Client ID/Secret cho Blogger (có thể **share chung Client với google_business** vì cùng project Google Cloud — admin chỉ cần bật scope blogger trong consent screen)

## Secrets cần
- Tái dùng `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` đã có (nếu admin đã setup Google Business). Nếu chưa, sẽ ask add_secret.
- Google Cloud Console: enable **Blogger API v3** + thêm scope `https://www.googleapis.com/auth/blogger` vào OAuth consent screen + thêm redirect URI `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/blogger-oauth-callback`

## Migration data cũ
Connections cũ với `integrationType='blogger'` (lưu API key) sẽ được **giữ nguyên** để không break, kèm flag `legacy=true` trong metadata. UI hiển thị badge "Cần kết nối lại qua OAuth" để user upgrade.

## Test checklist sau khi build
1. Admin nhập Google OAuth credentials → save thành công
2. User click "Kết nối Blogger" → popup Google → cấp quyền → callback → thấy blog list
3. Chọn blog → publish bài text test → kiểm tra bài lên đúng Blogger
4. Disconnect → token bị xóa, badge về "chưa kết nối"
5. Refresh token tự động sau 50 phút (test bằng cách set expires_at = now() + 5min)

## Câu hỏi xác nhận (trước khi implement)
1. **Share Google OAuth Client với Google Business hay tách riêng?** → Đề xuất share (đỡ admin setup 2 lần), miễn là consent screen đã thêm scope blogger.
2. **Multi-blog support**: 1 user có thể có nhiều blog Blogger — cho phép chọn 1 blog mặc định khi connect, hay lưu hết và để chọn lúc publish? → Đề xuất lưu hết, dropdown chọn lúc publish.
3. **Featured image**: Blogger không có field riêng, sẽ chèn `<img>` đầu content. OK?
