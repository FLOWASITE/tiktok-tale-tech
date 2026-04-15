<final-text>
## Sửa lỗi Instagram OAuth đang bị sai mode tích hợp

### Do I know what the issue is?
Có.

### Vấn đề thực sự
Lỗi trong screenshot không còn là lỗi “credentials giải mã sai”, mà là lỗi **sai loại App ID/App Secret cho flow hiện tại**.

Code hiện tại đang dùng **Instagram Login flow**:
- `connect-social` mở `https://www.instagram.com/oauth/authorize`
- `instagram-oauth-callback` đổi code tại `api.instagram.com/oauth/access_token`
- token long-lived dùng `graph.instagram.com`

Nhưng UI/admin test hiện lại hướng dẫn nhập:
- **Facebook App ID / Facebook App Secret** từ `Settings > Basic`

Trong khi tài liệu Instagram Login yêu cầu:
- **Instagram App ID / Instagram App Secret**
- lấy từ `Instagram > API setup with Instagram login > Business login settings`

Vì vậy `client_id` đang gửi lên `www.instagram.com/oauth/authorize` là sai loại app ID, nên Instagram trả về:
- `Invalid platform app`

### Các lỗi phụ tôi thấy thêm
1. `instagram-oauth-callback` vẫn dùng crypto CBC tự viết, nhưng `manage-social-platform-settings` đang lưu credentials bằng shared crypto GCM  
   → sửa lỗi này để callback đọc được credentials đã lưu hiện tại.

2. Instagram OAuth chưa mang theo `frontendOrigin` như Facebook/Threads  
   → kết nối xong dễ redirect sai domain/preview.

3. `test-instagram-credentials` đang test theo logic của Facebook App (`graph.facebook.com/{appId}`)  
   → dễ báo sai dù credentials Instagram Login là đúng.

## Kế hoạch sửa

### 1) Chuẩn hóa lại toàn bộ Instagram sang đúng “Instagram Login”
Sửa các file admin/UI để người dùng nhập đúng loại credentials:
- `src/components/admin/SocialPlatformCredentialsDialog.tsx`
- `src/pages/AdminSocialSettings.tsx`

Cụ thể:
- Đổi label lại thành **Instagram App ID** / **Instagram App Secret**
- Đổi hướng dẫn sang:
  `Meta App Dashboard > Instagram > API setup with Instagram login > Business login settings`
- Thêm note rõ:
  - Không dùng Facebook App ID ở `Settings > Basic`
  - App phải là loại **Business**
  - Phải thêm **Instagram product**

### 2) Sửa OAuth request để khớp đúng flow Instagram
File:
- `supabase/functions/connect-social/index.ts`

Cụ thể:
- Giữ flow `www.instagram.com/oauth/authorize`
- Dùng đúng Instagram App ID đã lưu
- Thêm `frontendOrigin` vào `state` giống Facebook/Threads
- Giữ `brandTemplateId / organizationId / userId` để callback quay về đúng context
- Có thể thêm tham số phù hợp cho business login để tránh nhầm flow

### 3) Sửa callback Instagram để đọc credentials đúng và redirect đúng
File:
- `supabase/functions/instagram-oauth-callback/index.ts`

Cụ thể:
- Bỏ local CBC `encrypt/decrypt`
- Dùng shared helpers từ `../_shared/crypto.ts`
  - decrypt credentials admin bằng shared helper
  - encrypt long-lived token bằng shared helper
- Parse `frontendOrigin` từ `state`
- Redirect về đúng frontend origin được allowlist, không hardcode `SITE_URL` cho preview flow
- Giữ việc lưu:
  - `platform_user_id`
  - `platform_username`
  - `token_expires_at`

### 4) Sửa “Test credentials” để không báo sai nữa
File:
- `supabase/functions/test-instagram-credentials/index.ts`

Cụ thể:
- Bỏ thông điệp “hãy dùng Facebook App ID/App Secret”
- Đổi logic test để bám theo **Instagram Login setup**, không dùng rule của Facebook App nữa
- Trả lỗi đúng bản chất:
  - thiếu/sai Instagram App ID
  - thiếu/sai Instagram App Secret
  - chưa cấu hình Business login / redirect URI / Instagram product
- Frontend hiển thị lỗi mới theo wording đã sửa

### 5) Kiểm thử end-to-end sau khi sửa
Kiểm tra theo đúng flow thật:
1. Lưu lại credentials Instagram mới
2. Bấm “Test credentials” phải không còn hướng dẫn dùng Facebook App ID
3. Bấm “Kết nối Instagram” từ tab connections
4. Popup mở đúng trang Instagram login, không còn `Invalid platform app`
5. Callback quay lại đúng preview/domain hiện tại
6. `social_connections` có connection active
7. Publish 1 bài test có ảnh để xác nhận token lưu/đọc hoạt động

## File sẽ sửa
- `src/components/admin/SocialPlatformCredentialsDialog.tsx`
- `src/pages/AdminSocialSettings.tsx`
- `supabase/functions/connect-social/index.ts`
- `supabase/functions/instagram-oauth-callback/index.ts`
- `supabase/functions/test-instagram-credentials/index.ts`

## Ghi chú kỹ thuật
- Không cần migration database
- Đây là lỗi **logic tích hợp không đồng nhất**, không phải lỗi UI đơn lẻ
- Nếu chỉ sửa label mà không sửa callback/test function thì flow vẫn tiếp tục hỏng ở bước sau
</final-text>