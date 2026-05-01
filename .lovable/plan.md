
# Bluesky OAuth 2.0 — Confidential Client (thay App Password)

## Bối cảnh ngắn

- Bluesky **chưa khai tử** App Password về mặt kỹ thuật, nhưng đã chuyển sang OAuth 2.0 (atproto profile) làm chuẩn chính thức cho 3rd-party. App Password là legacy, lỗi auth khó debug, không có scope rõ ràng.
- Atproto OAuth ≠ OAuth thường: **không có dev portal**, `client_id` = URL trỏ tới `client-metadata.json` tự host. Bắt buộc PKCE + PAR + DPoP. Confidential client phải có ES256 keypair + JWKS endpoint.
- Hiện tại codebase dùng `com.atproto.server.createSession` với handle + App Password, lưu encrypted vào `social_connections.access_token` / `refresh_token` (xem `connect-social/index.ts:1122-1205` và `publish-bluesky/index.ts:349-360`).

Quyết định đã chốt: **Confidential client**, **bỏ App Password hoàn toàn**, host metadata trên **app.flowa.one**.

## Mục tiêu

1. User connect Bluesky bằng cách click "Kết nối Bluesky" → nhập handle (vd `flowa.bsky.social`) → redirect sang trang OAuth của PDS user → consent → callback về app → connection lưu thành công.
2. Mỗi lần publish: tự refresh access token, tự xử lý DPoP nonce, ký request đúng chuẩn atproto.
3. Toàn bộ App Password code path bị xoá (UI + edge function branch + decrypt logic).

## Kiến trúc

```text
Browser                 app.flowa.one              User's PDS (bsky.social/...)
  |                          |                              |
  |-- click Connect -------->|                              |
  |                          |-- resolve handle → PDS ----->|
  |                          |-- fetch /.well-known/oauth-* |
  |                          |-- POST /par (PKCE + DPoP) -->|
  |<-- 302 to authz URL -----|<--------- request_uri -------|
  |---------------------------- consent UI -----------------|
  |<-- redirect /oauth/bluesky/callback?code=... -----------|
  |-- forward code to edge --|                              |
  |                          |-- POST /token (DPoP+JWT) --->|
  |                          |<------- access+refresh ------|
  |                          |-- store encrypted in DB      |
```

## Các thành phần phải tạo / đổi

### 1. Static metadata + JWKS (host trên app.flowa.one)

Thêm 2 file trong `public/` (Vite serve as static):

- `public/oauth/bluesky/client-metadata.json` — public client metadata document
- `public/oauth/bluesky/jwks.json` — chỉ chứa **public key** ES256 (private key giữ trong Supabase secret)

`client-metadata.json` sẽ có:

```json
{
  "client_id": "https://app.flowa.one/oauth/bluesky/client-metadata.json",
  "client_name": "Flowa",
  "client_uri": "https://app.flowa.one",
  "logo_uri": "https://app.flowa.one/logo.png",
  "tos_uri": "https://flowa.one/terms",
  "policy_uri": "https://flowa.one/privacy",
  "application_type": "web",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "redirect_uris": ["https://app.flowa.one/oauth/bluesky/callback"],
  "token_endpoint_auth_method": "private_key_jwt",
  "token_endpoint_auth_signing_alg": "ES256",
  "dpop_bound_access_tokens": true,
  "jwks_uri": "https://app.flowa.one/oauth/bluesky/jwks.json"
}
```

Scope `transition:generic` cần thiết để post (Bluesky vẫn đang dùng scope chuyển tiếp này).

### 2. Sinh keypair (one-time setup)

Script local chạy 1 lần để sinh ES256 keypair → output:
- `jwks.json` (public, commit vào repo)
- `private_jwk.json` (paste vào Supabase secret `BLUESKY_OAUTH_PRIVATE_JWK`)

Tôi sẽ tạo `scripts/generate-bluesky-jwk.ts` chạy bằng `bun`. Sau khi user paste secret xong, deploy.

### 3. Secrets cần add

- `BLUESKY_OAUTH_PRIVATE_JWK` — JSON string của private JWK (P-256, có `kid`)
- `BLUESKY_CLIENT_ID` — `https://app.flowa.one/oauth/bluesky/client-metadata.json` (config thuần, không bí mật, có thể hardcode nhưng để secret cho dễ swap khi đổi domain)

### 4. Edge function `bluesky-oauth-start` (mới, public, verify_jwt=false nhưng check session từ frontend)

Input: `{ handle, brandTemplateId, organizationId }` + JWT user trong header.

Flow:
1. Resolve handle → DID → PDS hostname (qua `https://plc.directory/<did>` hoặc HTTP `.well-known/atproto-did`).
2. Fetch `https://<pds>/.well-known/oauth-protected-resource` → lấy `authorization_servers[0]`.
3. Fetch `<authz>/.well-known/oauth-authorization-server` → lấy PAR + token + authz endpoints.
4. Sinh PKCE verifier + state + DPoP keypair (per-session, lưu tạm trong `oauth_pending_states` table).
5. POST PAR với client assertion JWT (ký bằng private key) + DPoP proof. Xử lý `use_dpop_nonce` retry.
6. Trả `{ authorization_url }` cho frontend redirect.

### 5. Edge function `bluesky-oauth-callback` (mới)

Route browser: app gọi `/oauth/bluesky/callback?code=...&state=...&iss=...` → page React forward sang edge function.

Flow:
1. Lookup state trong `oauth_pending_states`, lấy verifier + DPoP key + PDS info.
2. POST token với client assertion + PKCE verifier + DPoP proof.
3. Verify `sub` (DID) match handle ban đầu.
4. Fetch profile (`app.bsky.actor.getProfile`) qua DPoP-bound access token.
5. Encrypt refresh token + DPoP private key (JWK JSON) + access token, lưu vào `social_connections`:
   - `access_token` = encrypted access JWT
   - `refresh_token` = encrypted refresh token
   - `metadata` = `{ did, pds_url, authz_url, dpop_jwk: <encrypted>, dpop_nonce }`
6. Xoá row trong `oauth_pending_states`.

### 6. Bảng mới: `oauth_pending_states`

```sql
create table public.oauth_pending_states (
  state text primary key,
  user_id uuid not null,
  platform text not null,
  brand_template_id uuid,
  organization_id uuid,
  pkce_verifier text not null,
  dpop_private_jwk jsonb not null,
  pds_url text not null,
  authz_url text not null,
  token_endpoint text not null,
  handle text,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
-- RLS: owner only; auto-cleanup cron xoá expired.
```

### 7. Sửa `publish-bluesky/index.ts`

Thay `createSession(handle, appPassword)` bằng:
- Đọc `metadata.dpop_jwk`, decrypt → import lại CryptoKey.
- Dùng access token đã lưu; nếu 401 hoặc token sắp hết hạn → gọi refresh endpoint với DPoP + client assertion → cập nhật DB.
- Mọi request tới PDS phải kèm `Authorization: DPoP <token>` + header `DPoP: <proof JWT>` (có `ath` = SHA-256 access token).
- Quản lý `DPoP-Nonce` từ response, persist vào metadata.

Tách logic này ra `_shared/bluesky-oauth.ts` để `publish-bluesky` + future test function tái dùng.

### 8. Edge function `refresh-bluesky-token` (mới)

Tương tự `refresh-twitter-token`. Hook vào pg_cron 30-phút như các social khác (xem memory `automated-token-refresh-system-vn`).

### 9. Xoá hoàn toàn App Password

- `connect-social/index.ts`: xoá branch `if (platform === 'bluesky')` (line 1122-1205).
- Xoá `bluesky` khỏi `supportedPlatforms` array nếu connect-social không còn handle nó (giờ Bluesky đi qua function riêng).
- `BrandViewConnectionsTab.tsx`: xoá `blueskyForm` state + dialog form (line 217, 1656-1710), thay bằng button "Kết nối Bluesky" duy nhất → gọi `bluesky-oauth-start` → redirect.
- `test-bluesky-connection`: refactor để dùng access token + DPoP, hoặc xoá nếu không cần.

### 10. Frontend route `/oauth/bluesky/callback`

Thêm page `src/pages/BlueskyOAuthCallback.tsx`:
- Đọc `code`, `state`, `iss` từ query.
- Gọi `bluesky-oauth-callback` edge function với JWT user.
- Hiển thị spinner → success/fail → redirect về brand connections tab.

Đăng ký trong `src/app/routes.tsx`.

## Migrations

1. `create table oauth_pending_states` + RLS.
2. Cron job cleanup expired states (mỗi giờ).
3. (Optional) Thêm cột `metadata` JSONB nếu chưa có trên `social_connections` (chắc đã có — verify trước).

## Phụ thuộc & risks

- **Lovable preview (lovable.app) không test được** OAuth flow vì Bluesky bắt redirect_uri phải khớp metadata, mà metadata khoá vào `app.flowa.one`. Test phải làm trên production custom domain.
- **DPoP + client assertion JWT**: phải dùng `jose` qua esm.sh (`https://esm.sh/jose@5`) trong edge function — không có lib chuẩn của atproto cho Deno.
- **Connection cũ** (đang dùng App Password): vì user chọn "loại bỏ hoàn toàn", các connection bluesky hiện có sẽ bị **broken**. Plan này sẽ thêm 1 migration đánh `is_active=false` cho mọi `social_connections` platform=`bluesky` đã tạo trước migration, và force user re-connect bằng OAuth.

## Thứ tự thực hiện

1. Tạo script `scripts/generate-bluesky-jwk.ts` + chạy → user paste private JWK vào secret.
2. Add secret `BLUESKY_OAUTH_PRIVATE_JWK`.
3. Tạo `public/oauth/bluesky/client-metadata.json` + `jwks.json`.
4. Migration: `oauth_pending_states` + deactivate legacy bluesky connections.
5. Tạo `_shared/bluesky-oauth.ts` (DPoP, PAR, token, refresh helpers).
6. Tạo edge function `bluesky-oauth-start` + `bluesky-oauth-callback` + `refresh-bluesky-token`.
7. Refactor `publish-bluesky` + `test-bluesky-connection` dùng OAuth.
8. Frontend: trang callback + nút connect mới + xoá form App Password.
9. Xoá branch bluesky trong `connect-social`.
10. Test trên `https://app.flowa.one` (production).

## Câu hỏi xác nhận trước khi build

Bạn có domain `app.flowa.one` đã active và DNS trỏ đúng chưa (cần để Bluesky fetch được metadata)? Nếu chưa, phải xử lý DNS trước. Còn không, mình bắt đầu step 1 ngay sau approve.
