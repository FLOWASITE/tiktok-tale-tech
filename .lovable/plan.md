
Mình đã kiểm tra logs + code và chốt được nguyên nhân thực tế.

**Do I know what the issue is?** Có.

## Chẩn đoán ngắn gọn

- `connect-social` chạy OK và tạo OAuth URL thành công.
- `x-oauth-callback` đổi `code -> access_token` thành công (`status 200`).
- Lỗi xảy ra ở bước gọi `GET /2/users/me` với response:
  - `reason: "client-not-enrolled"`
  - `title: "Client Forbidden"`
  - `required_enrollment: "Appropriate Level of API Access"`
- Vì callback fail ở bước lấy profile nên **không insert** được `social_connections`, UI poll mãi trả `[]`.

## Kế hoạch xử lý

### 1) Sửa thông báo lỗi cho đúng bản chất (không chỉ “chưa gắn Project”)
**File:** `supabase/functions/x-oauth-callback/index.ts`, `src/pages/XCallback.tsx`

- Đổi mapping `client-not-enrolled` từ message cứng hiện tại thành message trung tính:
  - “App X chưa đủ quyền truy cập API v2 (Project/API Access/Credentials mismatch)”
- Đưa thêm `required_enrollment` + `client_id` (nếu có) vào hint an toàn để debug.
- UI callback hiển thị checklist rõ ràng:
  1. App phải nằm trong Project
  2. Project phải có API access phù hợp
  3. `X_CLIENT_ID/X_CLIENT_SECRET` phải đúng app đã attach Project

### 2) Bỏ điểm nghẽn “bắt buộc users/me” trong callback
**File:** `supabase/functions/x-oauth-callback/index.ts`

- Sau khi token exchange thành công:
  - Thử gọi `/2/users/me` như hiện tại.
  - Nếu `/users/me` bị `client-not-enrolled`, **vẫn lưu connection ở chế độ limited** thay vì fail toàn bộ flow.
- Lưu metadata:
  - `oauth2_pkce: true`
  - `profile_status: "unavailable"`
  - `oauth_warning_code: "client-not-enrolled"`
- Redirect về frontend với `success=true` + `warning` để user không bị kẹt ở màn hình lỗi nếu token đã cấp thành công.

### 3) Cập nhật test connection để không fail cứng trong case limited
**File:** `supabase/functions/test-twitter-connection/index.ts`

- Với OAuth2 connection:
  - Nếu `/users/me` trả `client-not-enrolled`, trả kết quả `success` kèm `warning` (không 500).
  - Vẫn cập nhật `last_verified_at` + `last_error` phù hợp để UI phản ánh trạng thái “kết nối hạn chế”.

### 4) Cải thiện UX trong tab kết nối
**File:** `src/components/brand/BrandViewConnectionsTab.tsx`

- Khi callback trả về `warning`, hiển thị badge/notice “Kết nối hạn chế”.
- Khi popup đóng mà chưa có profile đầy đủ, show toast hướng dẫn hành động thay vì im lặng.

## Kết quả mong đợi

- User không còn bị kẹt ở lỗi đỏ ngay sau OAuth nếu token đã cấp thành công.
- Error message chính xác hơn (không gây hiểu nhầm “chưa gắn Project” trong mọi trường hợp).
- Luồng kết nối có tính chịu lỗi tốt hơn và dễ debug hơn.
- Nếu phía X còn chặn API tier, hệ thống vẫn báo rõ và không fail mù.

## Files sẽ chỉnh

- `supabase/functions/x-oauth-callback/index.ts`
- `supabase/functions/test-twitter-connection/index.ts`
- `src/pages/XCallback.tsx`
- `src/components/brand/BrandViewConnectionsTab.tsx`
