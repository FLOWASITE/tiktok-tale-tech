
## Vấn đề đã xác định
Lỗi “không tìm thấy cấu hình” của Google Business là do hệ thống đang dùng **3 tên platform khác nhau** cho cùng một tích hợp:

- Admin settings lưu credentials dưới key: `google_business`
- Diagnostic/test gọi bằng key: `google-business`
- OAuth callback / refresh / một phần publish logic lại đọc hoặc lưu bằng: `google_maps`

Vì vậy:
- Trang `/admin/social-settings` lưu xong vẫn test ra “Không tìm thấy cấu hình cho google-business”
- Nút kết nối có thể qua bước đầu nhưng callback/refresh lại tiếp tục lệch key
- Bảng `social_connections` hiện còn có nguy cơ không đồng bộ với type/platform phía frontend

## Bằng chứng từ code
- `src/pages/AdminSocialSettings.tsx` dùng `platform: 'google_business'`
- `supabase/functions/connect-social/index.ts` đọc credentials bằng `getGlobalPlatformCredentials(..., 'google_business', ...)`
- `supabase/functions/test-google-business-credentials/index.ts` query `.eq('platform', platform)` và diagnostics đang truyền `google-business`
- `supabase/functions/google-business-oauth-callback/index.ts` lại query settings bằng `.eq('platform', 'google_maps')`
- `supabase/functions/refresh-google-business-token/index.ts` cũng query settings bằng `google_maps`
- Migration hiện tại của `social_connections.platform` chỉ cho phép `google_business`, không phải `google_maps`

## Plan sửa
### 1. Chuẩn hóa identifier
Dùng **một key duy nhất cho credentials + social connections** là:
- `google_business`

Chỉ giữ `google_maps` cho:
- tên channel nội dung đa kênh nếu hệ thống nội dung hiện đang dùng vậy
- label hiển thị “Google Maps / Google Business” nếu cần

### 2. Sửa các edge functions Google Business
Cập nhật toàn bộ luồng Google Business để nhất quán:
- `supabase/functions/test-google-business-credentials/index.ts`
  - map input `google-business` -> `google_business` trước khi query DB
- `supabase/functions/google-business-oauth-callback/index.ts`
  - đọc credentials từ `social_platform_settings.platform = 'google_business'`
  - lưu connection với `social_connections.platform = 'google_business'`
- `supabase/functions/refresh-google-business-token/index.ts`
  - đọc connection bằng `platform = 'google_business'`
  - đọc settings bằng `platform = 'google_business'`
- `supabase/functions/test-google-business-connection/index.ts`
  - đọc connection bằng `platform = 'google_business'`
- `supabase/functions/publish-google-business/index.ts`
  - đọc connection bằng `platform = 'google_business'`
  - response cũng trả `platform: 'google_business'` để đồng bộ

### 3. Sửa frontend chỗ lookup connection
Hiện UI kết nối đang gọi `connect-social` với `google_business`, nhưng vài chỗ lookup/publish lại có thể đang giả định sai.
Cần rà và chỉnh:
- `src/hooks/useRetryPublish.ts`
  - channel `google_maps` phải map sang DB platform `google_business` như hiện tại, giữ nguyên nếu đúng
- `src/hooks/useSocialConnections.ts` và UI connections
  - bảo đảm các list/test/refetch đều dùng `google_business` khi query `social_connections`

### 4. Tương thích ngược dữ liệu cũ
Nếu database hiện đã có row cũ mang platform `google_maps`, thêm migration để chuyển:
- `social_platform_settings.platform = 'google_maps'` -> `google_business`
- `social_connections.platform = 'google_maps'` -> `google_business`

Kèm logic an toàn:
- chỉ update những row cũ sai key
- tránh tạo duplicate nếu đã tồn tại row `google_business`

### 5. Verify sau sửa
Kiểm tra lại 3 bước:
1. Trong `/admin/social-settings`, lưu Google Client ID/Secret
2. Bấm “Test credentials” -> không còn báo “không tìm thấy cấu hình”
3. Bấm “Kết nối Google Business” -> mở OAuth -> callback lưu connection thành công -> test connection/publish đọc đúng record

## Files dự kiến sửa
- `supabase/functions/test-google-business-credentials/index.ts`
- `supabase/functions/google-business-oauth-callback/index.ts`
- `supabase/functions/refresh-google-business-token/index.ts`
- `supabase/functions/test-google-business-connection/index.ts`
- `supabase/functions/publish-google-business/index.ts`
- có thể thêm 1 migration để migrate dữ liệu cũ `google_maps` -> `google_business`

## Kết quả mong đợi
- Admin lưu cấu hình xong là test được ngay
- OAuth callback không còn báo thiếu cấu hình
- Connection, refresh token, test connection, publish đều dùng chung một platform key nhất quán
- Không còn lỗi “Báo không tìm thấy cấu hình cho GG Business”
