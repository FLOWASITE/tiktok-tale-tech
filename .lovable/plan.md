Kết quả kiểm tra: backend đang gọi Facebook `me/accounts` thành công nhưng Facebook chỉ trả về 1 Page trong phiên hiện tại. Vì vậy vấn đề không nằm ở UI picker; Facebook chỉ trả về các Page đã được cấp quyền cho app. Tham số hiện tại dùng `auth_type=reauthorize` chưa đúng cho case xin lại/quyền bổ sung Page; tài liệu Facebook dùng `auth_type=rerequest`. Cần sửa flow để buộc Facebook mở lại màn hình chọn quyền/Page đúng cách, và thêm cơ chế reset quyền nếu Facebook vẫn cache danh sách Page.

Plan triển khai:

1. Sửa OAuth URL cho Facebook
- Trong `connect-social`, đổi `auth_type=reauthorize` thành `auth_type=rerequest`.
- Thêm `config_id` nếu hệ thống đang lưu Facebook Login Configuration ID trong settings/env; nếu chưa có thì vẫn chạy bằng `scope` hiện tại.
- Thêm `force_reselect_pages=true` vào `state` khi người dùng bấm “Thêm Fanpage khác” để callback biết đây là flow thêm Page.

2. Thêm backend function reset quyền Facebook app
- Tạo function `facebook-reset-app-permissions`.
- Function dùng user token Facebook hiện có để gọi endpoint revoke app authorization (`DELETE /me/permissions`).
- Sau khi reset, lần OAuth kế tiếp Facebook sẽ coi như kết nối lần đầu và hiển thị lại đầy đủ màn hình chọn Page.
- Chỉ cho phép user owner/member của brand gọi function; không expose token ra client.

3. Cải thiện picker Page
- Trong `FacebookCallback.tsx`, nếu Facebook trả về toàn Page đã kết nối, hiển thị 2 lựa chọn rõ ràng:
  - “Cấp quyền thêm Page” → mở lại OAuth với `auth_type=rerequest`.
  - “Reset quyền Facebook rồi chọn lại” → gọi function reset quyền, sau đó tự mở lại OAuth.
- Hiển thị thông tin debug ngắn: “Facebook hiện chỉ cấp quyền cho X Page” để tránh hiểu nhầm là app lọc mất Page.

4. Cải thiện polling ở tab kết nối
- Khi popup đóng mà chưa thêm Page mới, refetch ngay và hiện toast hướng dẫn dùng nút reset quyền thay vì chỉ báo chung chung.
- Đảm bảo route quay lại đúng tab `connections` sau callback.

5. Kiểm chứng sau sửa
- Kiểm tra logs `facebook-oauth-callback`: số `Found N Pages` phải tăng sau khi user reset/cấp quyền lại.
- Kiểm tra bảng `facebook_oauth_sessions.pages_count` và `social_connections` để xác nhận các Page mới được insert theo `platform_user_id` khác nhau.

Các file dự kiến chỉnh:
- `supabase/functions/connect-social/index.ts`
- `supabase/functions/facebook-oauth-callback/index.ts`
- `supabase/functions/facebook-reset-app-permissions/index.ts` mới
- `src/pages/FacebookCallback.tsx`
- `src/components/brand/BrandViewConnectionsTab.tsx`

Không cần migration database mới.