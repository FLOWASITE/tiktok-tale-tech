

# Tích hợp X (Twitter) OAuth 2.0 PKCE

## Tổng quan

Hiện tại kết nối X yêu cầu user nhập Access Token thủ công. Chuyển sang OAuth 2.0 PKCE để user chỉ cần click "Kết nối" → đăng nhập X → tự động hoàn tất, giống luồng Facebook/Instagram đã có.

## Kiến trúc

```text
[UI: Nút Kết nối X] 
  → connect-social (trả oauthUrl)
  → User redirect đến x.com/i/oauth2/authorize
  → X redirect về Edge Function: x-oauth-callback
  → Đổi code lấy access_token + refresh_token
  → Lưu vào social_connections
  → Redirect về /auth/x/callback (frontend)
  → Hiển thị thành công, quay về Brand
```

## Bước 1: Thêm Secrets

Cần thêm 3 secrets vào project:
- `X_CLIENT_ID` = `TTFvOGtnVXF4ZUhicnF6NExiTGY6MTpjaQ`
- `X_CLIENT_SECRET` = `118RKezC52TIFaFCaV4t0mRnioWUvDZMgII6poAMOYhImuB4Rp`
- `X_CALLBACK_URL` = `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/x-oauth-callback`

## Bước 2: Tạo Edge Function `x-oauth-callback`

File: `supabase/functions/x-oauth-callback/index.ts`

- Nhận `code`, `state`, `code_verifier` từ query params
- Decode `state` → lấy `brandTemplateId`, `organizationId`, `userId`, `frontendOrigin`, `codeVerifier`
- Gọi `POST https://api.x.com/2/oauth2/token` với:
  - `grant_type=authorization_code`
  - `code`, `redirect_uri`, `client_id`, `code_verifier`
  - Basic Auth header (`X_CLIENT_ID:X_CLIENT_SECRET`)
- Nhận `access_token`, `refresh_token`, `expires_in`
- Gọi `GET https://api.x.com/2/users/me` để lấy username, name, profile_image_url
- Upsert vào `social_connections` (platform='twitter', access_token=bearer token, refresh_token=refresh token, token_expires_at, metadata={oauth2_pkce: true})
- Redirect về `{frontendOrigin}/auth/x/callback?success=true&username=...&brand_template_id=...`

Theo pattern của `facebook-oauth-callback` (allowed origins, state decode, redirect).

## Bước 3: Tạo Edge Function `refresh-x-token`

File: `supabase/functions/refresh-x-token/index.ts`

- Nhận `connectionId`
- Gọi `POST https://api.x.com/2/oauth2/token` với `grant_type=refresh_token`
- Cập nhật `access_token`, `refresh_token`, `token_expires_at` trong DB

## Bước 4: Cập nhật `connect-social` — branch Twitter

Sửa block `if (platform === 'twitter')` trong `connect-social/index.ts`:
- Nếu `accessToken` được cung cấp → giữ logic cũ (backward compatible, manual setup)
- Nếu KHÔNG có `accessToken` → tạo OAuth 2.0 URL:
  - Generate `code_verifier` + `code_challenge` (S256) trên server
  - Encode `code_verifier` vào `state` (base64)
  - Return `{ requiresOAuth: true, oauthUrl: "https://x.com/i/oauth2/authorize?..." }`
  - Scopes: `tweet.read tweet.write users.read offline.access`

## Bước 5: Cập nhật `publish-twitter` — hỗ trợ OAuth 2.0

Sửa `publish-twitter/index.ts`:
- Check `metadata.oauth2_pkce === true` trên connection
- Nếu OAuth 2.0: dùng Bearer token thay vì OAuth 1.0a signature
- Nếu token hết hạn: gọi `refresh-x-token` rồi retry
- Giữ nguyên logic OAuth 1.0a cũ cho connections không có oauth2_pkce

## Bước 6: Frontend — Callback page + UI updates

**Tạo `src/pages/XCallback.tsx`**
- Theo pattern `FacebookCallback.tsx`
- Đọc `success`, `error`, `username`, `brand_template_id` từ URL params
- Hiển thị trạng thái + auto redirect về brand page

**Cập nhật `src/app/routes.tsx`**
- Thêm `<Route path="/auth/x/callback" element={<XCallback />} />`

**Cập nhật `src/components/brand/BrandViewConnectionsTab.tsx`**
- Khi click "Kết nối X": gọi `connect()` KHÔNG truyền `accessToken`
- `connect-social` trả về `oauthUrl` → `window.open(oauthUrl)` (hoặc redirect)
- Xóa dialog nhập Access Token thủ công (hoặc giữ làm fallback)

**Cập nhật `src/components/admin/SocialPlatformCredentialsDialog.tsx`**
- Thêm `twitter: 'x-oauth-callback'` vào `CALLBACK_URL_MAP`

## Bước 7: Cập nhật `test-twitter-connection`

- Nếu connection dùng OAuth 2.0 (metadata.oauth2_pkce): test bằng Bearer token gọi `/2/users/me`
- Nếu OAuth 1.0a: giữ logic cũ

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/x-oauth-callback/index.ts` | **Mới** — OAuth 2.0 callback |
| `supabase/functions/refresh-x-token/index.ts` | **Mới** — Refresh token |
| `supabase/functions/connect-social/index.ts` | Thêm OAuth 2.0 PKCE flow cho Twitter |
| `supabase/functions/publish-twitter/index.ts` | Hỗ trợ Bearer token (OAuth 2.0) |
| `supabase/functions/test-twitter-connection/index.ts` | Test OAuth 2.0 connections |
| `src/pages/XCallback.tsx` | **Mới** — Callback page |
| `src/app/routes.tsx` | Thêm route `/auth/x/callback` |
| `src/components/brand/BrandViewConnectionsTab.tsx` | Click → OAuth redirect thay vì dialog nhập token |
| `src/components/admin/SocialPlatformCredentialsDialog.tsx` | Thêm callback URL cho Twitter |

## Lưu ý bảo mật

- `code_verifier` được generate trên server (Edge Function), encode vào `state` parameter → callback function decode lại. Không cần `sessionStorage`.
- Validate `frontendOrigin` bằng allowlist pattern (giống Facebook callback)
- `X_CLIENT_SECRET` chỉ dùng server-side, không expose ra frontend

