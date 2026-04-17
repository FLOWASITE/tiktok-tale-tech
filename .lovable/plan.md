
## Mục tiêu
User muốn **kết nối Google Business Profile** (Google Maps/GBP) để có thể đăng bài tự động lên locations của họ.

## Hiện trạng (đã check)
Code đã có sẵn khá đầy đủ:
- `src/pages/GoogleBusinessCallback.tsx` — handler callback OAuth
- `supabase/functions/publish-google-business/index.ts` — đăng bài
- `supabase/functions/test-google-business-connection/index.ts` — test token
- `channel-publisher` đã route `google-business` → `publish-google-business`

Còn **thiếu / cần verify**:
1. Edge function `auth-gateway` có nhánh `platform: 'google-business'` xử lý OAuth code → token chưa? (callback đã gọi nó)
2. Có nút "Kết nối Google Business" trong UI `/connections` chưa?
3. Có function `refresh-google-business-token` chưa? (test function đang gọi nó)
4. Secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` đã có chưa? (BYOK theo memory `google-oauth-config-vn`)

## Plan

### 1. Audit & bổ sung Edge Functions
- Đọc `auth-gateway/index.ts` → nếu thiếu nhánh `google-business`, thêm: exchange code lấy `access_token` + `refresh_token`, fetch account info, mã hóa AES-256 và lưu vào `social_connections` với `platform = 'google_maps'`.
- Tạo `refresh-google-business-token/index.ts` nếu chưa có.
- Fix bug nhỏ trong `test-google-business-connection`: biến `supabaseUrl` chưa khai báo.

### 2. UI nút Connect ở trang Connections
- Trong `src/pages/Connections.tsx` (hoặc component danh sách kết nối) thêm card **Google Business Profile**:
  - Button "Kết nối" → mở popup OAuth Google với `redirect_uri = ${origin}/auth/google-business/callback`, scope: `https://www.googleapis.com/auth/business.manage` + `openid email`.
  - Hiển thị trạng thái: chưa kết nối / đã kết nối (kèm location list) / cần re-auth.
- Thêm route `/auth/google-business/callback` → `GoogleBusinessCallback` trong `src/app/routes.tsx` nếu chưa có.

### 3. Secrets
Hỏi user: dùng **OAuth Google managed sẵn** của Flowa hay **BYOK** (Client ID/Secret riêng)?
- Nếu BYOK → dùng `add_secret` xin `GOOGLE_BUSINESS_CLIENT_ID` + `GOOGLE_BUSINESS_CLIENT_SECRET` (Google Business Profile API yêu cầu app riêng được approved bởi Google — recommend BYOK).
- Setup hướng dẫn: enable Google Business Profile API + Account Management API trong Google Cloud Console, thêm redirect URI.

### 4. Verify end-to-end
- Click "Kết nối" → redirect Google → consent → quay về callback → thấy "Kết nối thành công" → list locations hiển thị → test post 1 bài.

## Files dự kiến sửa / tạo
- `supabase/functions/auth-gateway/index.ts` (thêm nhánh google-business)
- `supabase/functions/refresh-google-business-token/index.ts` (mới, nếu thiếu)
- `supabase/functions/test-google-business-connection/index.ts` (fix `supabaseUrl`)
- `src/pages/Connections.tsx` (thêm card + nút)
- `src/app/routes.tsx` (đảm bảo route callback)

## Câu hỏi cần user xác nhận trước khi code
1. **Google Cloud credentials**: dùng app Google của Flowa (managed) hay app riêng của bạn (BYOK — bắt buộc nếu Flowa chưa được Google approve cho `business.manage` scope)?
2. Bạn đã có **Google Business Profile** đã verify location chưa? (nếu chưa, OAuth sẽ thành công nhưng không có location để đăng bài)
