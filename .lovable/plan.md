## Root cause

Banner "Cần kết nối lại — App Password không hợp lệ hoặc đã bị thu hồi" là do **`test-bluesky-connection` edge function** (legacy) — nó vẫn coi Bluesky như App Password flow.

Connection thực tế trong DB **đã là OAuth 2.0 hợp lệ** (`is_active=true`, `metadata.dpop_jwk_encrypted` tồn tại, `oauth_version=2`, vừa tạo lúc 15:28). Nhưng khi UI gọi test connection, function này:

1. Decrypt `access_token` như "handle" và `refresh_token` như "App Password" (sai — giờ là OAuth tokens đã mã hoá khác cấu trúc).
2. Gọi `com.atproto.server.createSession` → trả 401.
3. Update DB: `last_error = 'App Password invalid or revoked'`.

UI đọc `connection.last_error` → hiển thị banner đỏ dù connection vẫn dùng được để publish.

## Plan: viết lại `test-bluesky-connection` cho OAuth

**File:** `supabase/functions/test-bluesky-connection/index.ts` (rewrite hoàn toàn)

### Logic mới

1. **Fetch connection**, kiểm tra `metadata.oauth_version === 2` và `metadata.dpop_jwk_encrypted` tồn tại.
   - Nếu **thiếu** (legacy App Password connection còn sót) → return `needs_reauth: true` với message rõ ràng:  
     `"Kết nối Bluesky cũ (App Password) không còn được hỗ trợ. Vui lòng ngắt và kết nối lại bằng OAuth."` + set `last_error` đúng câu này.
   - Nếu **đủ metadata** → tiếp tục.

2. **PDS health check** (giữ nguyên).

3. **Validate OAuth token** bằng cách gọi `app.bsky.actor.getProfile?actor={did}` với DPoP-bound bearer token. Tận dụng helper sẵn có trong `_shared` (cùng pattern mà `publish-bluesky` đang dùng — import `dpopFetch` hoặc tương tự). Nếu helper chưa export ra, gọi inline:
   - Decrypt `access_token` (JWT thực sự) + `dpop_jwk_encrypted`.
   - Build DPoP proof JWT, gửi request có `Authorization: DPoP <token>` + `DPoP: <proof>`.
   - Handle nonce retry (1 lần) khi PDS trả `use_dpop_nonce`.

4. **Phân loại response:**
   - `200` → success, clear `last_error: null`, update `last_verified_at`, refresh `platform_username`/`avatar`.
   - `401`/`invalid_token` → thử **silent refresh** qua `refresh-bluesky-token` (đã có). Nếu refresh OK → re-test 1 lần. Nếu vẫn fail → `needs_reauth: true`, message: `"Phiên đăng nhập Bluesky đã hết hạn. Vui lòng kết nối lại."`
   - `429` → transient (giữ logic cũ).
   - Khác → generic error, KHÔNG set `last_error` cho lỗi transient.

### Bonus UX trong frontend (nhỏ)

**File:** `src/components/social/SocialConnectionsManager.tsx` (lines 330–360)

- Khi `connection.last_error` chứa từ "App Password" và platform là `bluesky` nhưng `metadata.dpop_jwk_encrypted` tồn tại → hide banner (treat as stale error). Đây là defense-in-depth phòng case có record cũ chưa được clear.
- Đổi badge "Đã kết nối" thành màu vàng + nhãn "Cần xác minh lại" khi có `last_error` + `needs_reauth` flag.

### Migration cleanup (1-liner)

**New migration:** clear `last_error` cho các connection Bluesky OAuth hợp lệ hiện có để banner biến mất ngay:

```sql
UPDATE public.social_connections
SET last_error = NULL
WHERE platform = 'bluesky'
  AND is_active = true
  AND metadata ? 'dpop_jwk_encrypted'
  AND last_error LIKE '%App Password%';
```

## Out of scope

- Không refactor `publish-bluesky` (đã OAuth-aware).
- Không xoá function `connect-social` Bluesky branch (đã trả error đúng cho App Password legacy).

Sau khi áp dụng: bấm "Test connection" lại → banner sẽ biến mất, connection sẽ verify đúng qua OAuth+DPoP.