## Mục tiêu

Hiện tại nút **Cấu hình** ở card Google Sign-In mở tab Supabase Auth dashboard ra ngoài. User muốn UX y hệt card **Google Search Console**: click → mở dialog `SocialPlatformCredentialsDialog` ngay trong app để admin nhập **Client ID / Client Secret** + toggle Active, lưu vào `social_platform_settings` (mã hóa AES).

## Phạm vi thay đổi

### 1. Type & hooks
`src/hooks/useSocialPlatformSettings.ts`
- Thêm `'google_signin'` vào union type `SocialPlatform`.

### 2. Dialog help text
`src/components/admin/SocialPlatformCredentialsDialog.tsx`
- Thêm entry trong `PLATFORM_HELP`:
  - `url`: `https://console.cloud.google.com/apis/credentials`
  - `instructions`: hướng dẫn tạo OAuth Client (Web), copy redirect URI `https://rllyipiyuptkibqinotz.supabase.co/auth/v1/callback` vào Authorized redirect URIs, paste Client ID + Secret. Note thêm: sau khi lưu cần dán cùng cặp ID/Secret vào **Auth Providers → Google** trên Cloud dashboard để Auth thực sự dùng (vì Supabase Auth provider config nằm ở scope khác, không thể set qua API).

### 3. GoogleAuthSignInCard refactor
`src/components/admin/GoogleAuthSignInCard.tsx`
- Bỏ phần `<Popover>` "Hướng dẫn" + link external `CLOUD_AUTH_DASHBOARD` cho nút Cấu hình.
- Đọc `useSocialPlatformSettings()` → tìm `settings.find(s => s.platform === 'google_signin')` để biết `has_credentials`, `is_active`, `consumer_key` (masked).
- Render giống `renderPlatformCard` của AdminSocialSettings:
  - Badge `Đã cấu hình` / `Trống` (thay vì BYOK tĩnh) — vẫn giữ icon `KeyRound` nhỏ trong dialog header.
  - Info box hiển thị App / Key (•••• khi đã có) / Trạng thái — chỉ hiện khi `has_credentials`.
  - Khi chưa có: hiển thị 1 dòng note ngắn (Provider Google Cloud Console + redirect URI có nút Copy).
- Hàng action 3 nút **giống GSC card**:
  - `[Cấu hình / Chỉnh sửa]` → `setDialogOpen(true)` mở `SocialPlatformCredentialsDialog` với `platform="google_signin"`, `platformName="Google Sign-In"`.
  - `[⚡]` → mở `/auth` test login (giữ).
  - `[🗑]` → confirm + gọi `deleteMutation` (chỉ hiện khi đã cấu hình).
- Wire `onSave` → `saveMutation.mutateAsync(...)` từ `useSocialPlatformSettings`.

### 4. AdminSocialSettings (không bắt buộc)
- Hiện tại `GoogleAuthSignInCard` đứng riêng dưới section "Đăng nhập ứng dụng". Giữ nguyên vị trí, không cần đưa vào `PLATFORMS` array.

## Lưu ý kỹ thuật

- DB `social_platform_settings.platform` không có CHECK constraint, không cần migration. Edge function `manage-social-platform-settings` không whitelist platform → tự động chấp nhận `google_signin`.
- `consumer_key` / `consumer_secret` đã được edge function mã hóa AES-256-GCM trước khi lưu, đồng nhất với GSC.
- Vì Supabase Auth provider config (Client ID/Secret thực thi cho `signInWithOAuth('google')`) sống ở Auth dashboard và không có API public để set từ frontend, dialog phải kèm callout: *"Sau khi lưu, dán cùng Client ID + Secret này vào Auth Providers → Google để áp dụng"* + nút mở dashboard. Đây là điểm khác biệt cố hữu so với GSC (GSC tự dùng credential trong DB cho edge function của nó).

## Out of scope

- Không tự động đẩy credential vào Supabase Auth provider config.
- Không đổi flow `signInWithOAuth` ở client.
- Không tạo migration.
