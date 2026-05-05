## Nguyên nhân

Nút **Test** trong Admin Social Settings gọi `social-diagnostics` với `platform='google_search_console'`, nhưng router trong `supabase/functions/social-diagnostics/index.ts` không có `google_search_console` trong `PLATFORM_NAMES` → trả lỗi `Invalid action/platform`.

Ngoài ra chưa có edge function chuyên dụng để test credentials GSC.

## Cách sửa

### 1. `supabase/functions/social-diagnostics/index.ts`
- Thêm `'google_search_console'` vào `PLATFORM_NAMES`.
- Map đặc biệt: platform `google_search_console` → function `test-gsc-credentials` / `test-gsc-connection` (vì naming có dấu gạch dưới, không đồng nhất pattern `test-<platform>-<action>`).

### 2. Tạo `supabase/functions/test-gsc-credentials/index.ts`
- Đọc `social_platform_settings` row `platform='google_search_console'`, decrypt `consumer_key` (Client ID) + `consumer_secret` (Client Secret).
- Validate format Client ID (kết thúc `.apps.googleusercontent.com`, length > 30) và Client Secret (length > 10).
- Gọi `https://oauth2.googleapis.com/tokeninfo` hoặc kiểm tra bằng cách dựng URL OAuth + ping endpoint discovery `https://accounts.google.com/.well-known/openid-configuration` để xác nhận Google reachable.
- Trả `{ success: true, message: "Client ID/Secret hợp lệ. Sẵn sàng OAuth.", details: { client_id_prefix, redirect_uri } }` hoặc `{ success: false, error }`.
- Không log full secret, chỉ prefix 8 ký tự + length.

### 3. Tạo `supabase/functions/test-gsc-connection/index.ts` (cho nút "Test" sau khi user đã connect 1 site)
- Lấy 1 `gsc_connections` còn `is_active`, refresh access token nếu hết hạn (qua `_shared/gsc-credentials.ts`), gọi `GET /webmasters/v3/sites` để confirm còn quyền.
- Trả `{ success, sites_count, last_synced_at }`.

### 4. `supabase/config.toml`
- Đăng ký 2 function mới với `verify_jwt = false` (cùng pattern các `test-*` khác).

## Kết quả mong đợi
- Bấm Test trong Admin → toast xanh "Client ID/Secret hợp lệ" thay vì lỗi đỏ.
- Hỗ trợ cả test pre-OAuth (credentials) và post-OAuth (live connection).
