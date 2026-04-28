## Vấn đề

Logs xác nhận:
- `facebook-reset-app-permissions` chạy OK (200) nhưng KHÔNG thực sự revoke app ở Facebook.
- Sau khi reset + reconnect → Facebook vẫn trả về `Found 1 Pages`.

**Root cause:** Reset function hiện tại gọi `DELETE /{page_id}/permissions` với **page access token**. Endpoint này không revoke app authorization ở user level — chỉ ảnh hưởng page đơn lẻ (mà page đó đã được cấp rồi nên vô tác dụng). Để Facebook hiện lại full Page picker, phải revoke ở **user level** với **user access token**.

User token đã có sẵn trong `facebook_oauth_sessions.encrypted_user_token` nhưng reset function không dùng.

## Kế hoạch sửa

### 1. Sửa `facebook-reset-app-permissions` dùng user token
- Query `facebook_oauth_sessions` mới nhất theo `user_id + brand_template_id` để lấy `encrypted_user_token`.
- Decrypt ra user access token thật.
- Gọi `DELETE https://graph.facebook.com/v21.0/me/permissions?access_token={USER_TOKEN}` → revoke toàn bộ app authorization của user.
- Sau khi revoke OK: deactivate tất cả `social_connections` Facebook của brand + xóa `facebook_oauth_sessions` cũ để tránh dùng lại token đã revoke.
- Trả về `success: true, revoked: true`.

### 2. Fallback khi không có user token còn hợp lệ
- Nếu không tìm thấy session hoặc decrypt fail hoặc Facebook trả lỗi (token hết hạn) → trả về `revoked: false` kèm hướng dẫn rõ ràng:
  - Mở https://www.facebook.com/settings?tab=business_tools
  - Tìm app "Flowa" → Remove
  - Quay lại bấm "Kết nối Facebook"
- UI hiện link clickable thẳng tới trang đó.

### 3. Cải thiện UI ở `FacebookCallback.tsx`
- Khi bấm nút "Reset quyền & chọn lại":
  - Nếu `revoked: true` → toast success + tự động mở lại OAuth ngay (không cần user bấm thêm).
  - Nếu `revoked: false` → show modal/alert có link trực tiếp tới Facebook Business Tools settings, kèm nút "Tôi đã remove, kết nối lại".
- Hiển thị thêm cảnh báo: "Nếu vẫn chỉ thấy 1 Page, có thể tài khoản Facebook của bạn chỉ là admin của 1 Page đó. Kiểm tra tại facebook.com/pages."

### 4. Thêm log debug
- Log số Pages tài khoản FB thực sự quản lý (gọi `me/accounts?limit=100` trong reset function trước khi revoke) để confirm user thực sự có nhiều Page hay chỉ 1.

## Files thay đổi
- `supabase/functions/facebook-reset-app-permissions/index.ts` — viết lại logic dùng user token
- `src/pages/FacebookCallback.tsx` — auto-reconnect sau revoke + link Business Tools
- Không cần migration

## Kỳ vọng sau fix
- Bấm "Reset quyền" → Facebook thực sự forget app authorization.
- OAuth lần kế tiếp hiện full Page picker với tất cả Page mà user là admin.
- Nếu user thật sự chỉ có 1 Page → log sẽ confirm rõ và UI báo đúng nguyên nhân thay vì để user nghi ngờ app bị bug.