

# Thêm Callback URL vào UI cấu hình Facebook

## Mục tiêu
Hiển thị **OAuth Callback URL** ngay trong giao diện cấu hình Facebook (và các nền tảng Meta khác) để admin dễ dàng copy và paste vào Meta Developer Console, không cần phải hỏi hay tìm trong code.

## Thay đổi

### File: `src/components/admin/SocialPlatformCredentialsDialog.tsx`

1. **Thêm section "Callback URL"** trong form dialog, ngay sau phần help link, chỉ hiển thị cho các nền tảng dùng OAuth (facebook, instagram, threads, linkedin, zalo_oa, google_business — không hiển thị cho twitter và website).

2. **Logic tạo URL**: Lấy `VITE_SUPABASE_URL` từ env, ghép với path tương ứng mỗi platform:
   - `facebook` → `/functions/v1/facebook-oauth-callback`
   - `instagram` → `/functions/v1/instagram-oauth-callback`  
   - `threads` → `/functions/v1/threads-oauth-callback`
   - `linkedin` → `/functions/v1/linkedin-oauth-callback`
   - `zalo_oa` → `/functions/v1/zalo-oauth-callback`
   - `google_business` → `/functions/v1/google-business-oauth-callback`

3. **UI**: Một text field read-only chứa URL + nút Copy (dùng icon `Copy`/`Check` tương tự `CopyButton` pattern đã có). Kèm label hướng dẫn ngắn: *"Dán URL này vào Valid OAuth Redirect URIs trên Developer Console"*.

### Không thay đổi
- Không thay đổi edge functions hay backend logic.
- Không thay đổi file nào khác.

