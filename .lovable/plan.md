
## Vấn đề
Ảnh user gửi: `accounts.google.com bị chặn` với `ERR_BLOCKED_BY_RESPONSE` khi popup OAuth Google mở ra.

## Nguyên nhân
Đây **KHÔNG phải lỗi code** trong project. Đây là lỗi phía Google chặn request OAuth. Có 3 nguyên nhân chính:

### 1. Cấu hình Google Cloud Console chưa đúng (khả năng cao nhất)
- **Redirect URI chưa được whitelist** trong OAuth Client của Google Cloud Console
- URI cần thêm: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/google-business-oauth-callback`
- Nếu thiếu hoặc sai → Google sẽ từ chối kết nối ngay từ đầu

### 2. OAuth Consent Screen chưa cấu hình
- App đang ở **Testing mode** nhưng email user chưa được thêm vào **Test users**
- Hoặc chưa publish app, hoặc chưa thêm scope `business.manage`

### 3. Client ID/Secret sai hoặc thuộc project Google Cloud khác
- Credentials nhập trong `/admin/social-settings` không khớp với OAuth Client thật trên Google Cloud
- Project Google Cloud chưa enable **Google Business Profile API** + **My Business Account Management API**

## Cần user xác nhận trước khi tiếp tục

Vui lòng kiểm tra trên [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services:

1. **Credentials → OAuth 2.0 Client IDs → [Client của bạn] → Authorized redirect URIs** có đúng URI sau chưa?
   ```
   https://rllyipiyuptkibqinotz.supabase.co/functions/v1/google-business-oauth-callback
   ```

2. **OAuth consent screen** → Publishing status:
   - Nếu "Testing" → email Google bạn dùng đã có trong "Test users" chưa?
   - Scopes có chứa `https://www.googleapis.com/auth/business.manage` chưa?

3. **Enabled APIs**: đã bật cả 2 API sau chưa?
   - Google Business Profile API
   - My Business Account Management API

4. Client ID/Secret nhập trong Flowa có đúng từ project Google Cloud có cấu hình ở (1)(2)(3) không?

## Sau khi user xác nhận
- Nếu cấu hình thiếu → user tự bổ sung trên Google Cloud Console (không cần đụng code)
- Nếu mọi cấu hình đều đúng nhưng vẫn lỗi → mới cần debug code (kiểm tra URL `authUrl` mà `connect-social` đang generate, xem có truyền sai `client_id` hay `redirect_uri` encoding sai không)

**Không có file nào cần sửa cho đến khi xác định rõ nguyên nhân.**
