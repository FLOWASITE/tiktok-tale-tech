Mình đã xác nhận lỗi hiện tại: kết nối WordPress.com đã lưu thành công, nhưng khi bấm Xác minh thì backend đang gửi chuỗi token đã mã hóa trực tiếp sang WordPress.com. Vì vậy WordPress.com trả `400 invalid_token`.

Kế hoạch sửa:

1. Sửa backend `test-wordpress-com-connection`
   - Trước khi gọi WordPress.com API, giải mã `access_token` bằng helper mã hóa chung đang dùng trong project.
   - Nếu token không giải mã được, trả lỗi tiếng Việt rõ ràng: cần kết nối lại WordPress.com.
   - Giữ logic lọc theo `connectionId`, `brandTemplateId`, `organizationId` như hiện tại.

2. Làm chặt response xác minh
   - Khi token hợp lệ, trả `success: true` cùng `data.username/name/site` để frontend toast hiển thị đúng tên tài khoản/site.
   - Khi WordPress.com trả lỗi `invalid_token`, vẫn trả thông báo thân thiện và gợi ý reconnect.

3. Kiểm tra lại luồng sau khi sửa
   - Gọi lại `social-diagnostics` với connection hiện tại để đảm bảo không còn gửi encrypted token.
   - Kiểm tra log function để xác nhận request tới WordPress.com thành công hoặc nếu token thật sự bị revoke thì lỗi sẽ là lỗi token thật, không phải lỗi do mã hóa.

Technical notes:
- File cần sửa chính: `supabase/functions/test-wordpress-com-connection/index.ts`.
- Dùng `decryptCredential` từ `supabase/functions/_shared/crypto.ts`, không tạo logic decrypt riêng.
- Không cần migration database cho lỗi này.
- Nếu muốn đăng bài lên WordPress.com sau đó, hiện tại còn một phần riêng cần bổ sung: `channel-publisher`/`publish-wordpress` mới support self-hosted `wordpress`, chưa route riêng cho `wordpress_com`. Plan này tập trung sửa lỗi Xác minh trước.