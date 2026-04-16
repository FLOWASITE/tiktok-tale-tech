
## Kiểm tra lỗi kết nối TikTok

### Kết luận nhanh
- Redirect URI đang chạy đúng: log cho thấy request đã vào `tiktok-oauth-callback`.
- Lỗi xảy ra ở bước đổi `code` sang token, không phải ở bước mở popup hay callback route.
- Có 2 vấn đề cùng lúc:
  1. `tiktok-oauth-callback` đang giải mã credentials sai format.
  2. Credentials TikTok hiện lưu trong Admin cũng đang không hợp lệ.

### Bằng chứng đã tìm thấy
- Log `tiktok-oauth-callback`: `Client key does not match authorization record`
- Log `test-tiktok-credentials`: `Client key or secret is incorrect`
- Trong code:
  - `manage-social-platform-settings` lưu credentials bằng shared AES-GCM trong `_shared/crypto.ts`
  - `connect-social` đọc credentials bằng helper có hỗ trợ GCM nên tạo OAuth URL đúng
  - Nhưng `tiktok-oauth-callback` lại dùng hàm `decryptCredential` tự viết, chỉ xử lý format cũ `iv:cipher`
  - Với format GCM hiện tại, callback đang trả về raw ciphertext thay vì Client Key/Secret thật, nên authorize dùng một key còn exchange lại gửi key sai

### Kế hoạch sửa
1. Chuẩn hóa TikTok callback theo đúng pattern đang dùng cho Instagram
- File: `supabase/functions/tiktok-oauth-callback/index.ts`
- Xóa hàm decrypt local
- Import shared `decryptCredential` từ `supabase/functions/_shared/crypto.ts`
- Giữ `redirect_uri` đồng nhất với `connect-social`
- Thêm redirect-origin validation giống Instagram để flow ổn định hơn

2. Sửa UI Admin để tránh nhập nhầm TikTok credentials
- File: `src/components/admin/SocialPlatformCredentialsDialog.tsx`
- Thêm TikTok vào `CALLBACK_URL_MAP` để Admin nhìn thấy đúng callback URL ngay trong dialog
- Đổi label TikTok thành `TikTok Client Key` / `TikTok Client Secret`
- Cập nhật help text: phải dùng đúng cặp key/secret của cùng một TikTok app

3. Cập nhật lại credentials TikTok đang lưu
- Hiện log test xác nhận secret/key trong Admin chưa đúng
- Sau khi sửa code, cần lưu lại Client Key + Client Secret thật từ TikTok Developer Portal
- Nếu vẫn dùng placeholder hoặc secret của app khác, flow sẽ tiếp tục fail dù code đã đúng

4. Kiểm thử lại end-to-end
- Test credentials trong Admin phải pass
- Bấm `Kết nối` ở tab Connections
- Xác nhận callback về `/auth/tiktok/callback?success=true`
- Xác nhận `social_connections` được insert/update và TikTok hiển thị trạng thái đã kết nối

### Files sẽ thay đổi
- `supabase/functions/tiktok-oauth-callback/index.ts`
- `src/components/admin/SocialPlatformCredentialsDialog.tsx`

### Không cần thay đổi
- Không cần migration database
- Không cần sửa RLS
- Không cần đổi Redirect URI hiện tại nếu đang dùng endpoint callback TikTok hiện có
