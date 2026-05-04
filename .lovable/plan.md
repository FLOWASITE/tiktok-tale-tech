## Vấn đề

Hiện tại Blogger có **2 luồng kết nối song song mâu thuẫn**, dẫn đến UI kết nối "không đúng":

### Luồng A — OAuth chuẩn (đã có, hoạt động đúng)
- `blogger-oauth-callback` lưu vào `social_connections` với `platform='blogger'`, có `access_token` + `refresh_token` Google + danh sách `blogs[]` + `selected_blog_id`.
- `publish-blogger` query `eq('platform','blogger')` và dùng `selected_blog_id` để đăng bài qua Blogger API v3.
- DB hiện có **1 connection Blogger OAuth** đang active (TAF), khớp pattern này.

### Luồng B — Form "Website / API Key" (sai, đang dùng trong UI)
- `BrandViewConnectionsTab.tsx` (line 254-267): khi user bấm Blogger, mở dialog Website với `integrationType='blogger'`, yêu cầu nhập **Google API Key** (line 1637-1642).
- Submit → gọi `connect-website` (line 378), function này lưu vào `social_connections` với **`platform='website'`** (line 188), không phải `blogger`, và chỉ có `apiKey` (read-only key) — **không có OAuth token**, không thể đăng bài.
- Hậu quả:
  1. Connection tạo ra `publish-blogger` không bao giờ thấy (vì query `eq('platform','blogger')`).
  2. Google Blogger API yêu cầu OAuth để POST bài; API key chỉ đọc public — về mặt nguyên tắc không thể publish.
  3. UI hiển thị "đã kết nối Blogger" nhưng publish luôn fail.

### Thiếu sót
- Không có function `blogger-oauth-start` để khởi tạo OAuth từ frontend; OAuth callback đã có nhưng UI không gọi được start flow → connection OAuth hiện tại chắc chỉ tạo được qua đường vòng (có thể qua Google Business OAuth hoặc init trực tiếp).

## Giải pháp

Loại bỏ hoàn toàn nhánh "Blogger qua API Key", chuyển Blogger sang OAuth-only giống Google Business / WordPress.com.

### 1. Tạo edge function `blogger-oauth-start`
- Đọc `social_platform_settings` cho `platform='blogger'` (fallback `google_business`) để lấy `client_id`.
- Build Google OAuth URL với scope `https://www.googleapis.com/auth/blogger`, `access_type=offline`, `prompt=consent`, `redirect_uri = SUPABASE_URL/functions/v1/blogger-oauth-callback`.
- `state` = base64(JSON `{ brandTemplateId, organizationId, userId, frontendOrigin }`).
- Trả `{ authUrl }` để frontend mở popup.
- Khai báo `verify_jwt = false` (gọi từ browser) nhưng vẫn validate JWT trong code để lấy `userId`.

### 2. Sửa `BrandViewConnectionsTab.tsx`
- Bỏ block line 253-267 (Blogger dùng Website dialog).
- Thêm Blogger vào nhánh OAuth platforms (line 276+) — popup → `blogger-oauth-start` → Google consent → callback redirect về `/auth/blogger/callback`.
- Bỏ option `<option value="blogger">Blogger (Google)</option>` (line 1417) khỏi Website dialog.
- Bỏ block input "Google API Key" của Blogger (line 1637-1642).
- Cập nhật type `integrationType` (line 222) bỏ `'blogger'`.
- Bỏ `'blogger'` khỏi check line 375.

### 3. Sửa `connect-website/index.ts`
- Bỏ branch `integrationType === 'blogger'` (line 95-107) và type union (line 18) — Blogger không còn đi qua đây.

### 4. Backfill / migration nhẹ
- Query data: nếu có connection cũ `platform='website'` + `metadata->>'integration_type'='blogger'` → đánh dấu inactive (DB hiện không có, nhưng để defensive).
- Không xoá tự động — chỉ disable, kèm note `metadata.deprecated_reason`.

### 5. Đảm bảo `social_platform_settings` có row Blogger
- Kiểm tra: nếu chưa có `platform='blogger'`, hướng dẫn admin hoặc fallback sang `google_business` credentials (callback đã làm sẵn).
- Thêm note vào `AdminSocialSettings.tsx` rằng Blogger reuse Google OAuth credentials.

## Kết quả mong đợi

- User bấm "Kết nối Blogger" trên BrandView → popup Google → chọn account → consent scope `blogger` → tự động về app, connection lưu đúng `platform='blogger'` với OAuth token.
- `publish-blogger` query thành công → đăng bài thật → trả `postUrl` → `channel-publisher` lưu vào cột `blogger_post_url` (đã có từ migration trước).
- Connection Blogger TAF hiện tại không bị ảnh hưởng (đã đúng schema).

## Technical details

**Files cần sửa**
- `supabase/functions/blogger-oauth-start/index.ts` (mới)
- `supabase/config.toml` — thêm `[functions.blogger-oauth-start] verify_jwt = false`
- `supabase/functions/connect-website/index.ts` — bỏ nhánh blogger
- `src/components/brand/BrandViewConnectionsTab.tsx` — chuyển Blogger sang OAuth flow
- `src/components/social/SocialConnectionsManager.tsx` — đồng bộ nếu component này cũng dùng API key flow cho Blogger (cần kiểm tra khi build)
- `src/pages/BloggerCallback.tsx` — xác nhận đã handle `success=true` redirect (đã có theo OAuth callback hiện tại)

**Không cần migration DB** — schema `social_connections` đã hỗ trợ đúng. Chỉ optional cleanup row `platform='website' integration_type='blogger'` (DB hiện không có row nào loại này).

**Câu hỏi**: cần tôi hỗ trợ thêm flow "đổi blog" (multi-blog under 1 Google account, lưu trong `metadata.blogs[]`) khi user có nhiều Blogger blog không? Mặc định plan trên auto-pick `blogs[0]`.
