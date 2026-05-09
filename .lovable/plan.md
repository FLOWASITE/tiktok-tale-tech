## Vấn đề

Trên card Google Search Console, nút ⚡ thực sự gọi edge function `test-gsc-credentials` để validate Client ID/Secret và toast kết quả.

Trên card Google Sign-In hiện tại, nút ⚡ chỉ là `<a href="/auth">` mở tab login — không phải "test kết nối" đúng nghĩa, không hiển thị loading, không báo thành công/thất bại.

## Mục tiêu

Đồng bộ hành vi nút ⚡ trên `GoogleAuthSignInCard` với GSC card: bấm vào → validate credentials đã lưu → toast OK/Lỗi, có spinner loading.

## Thay đổi

### 1. Tạo edge function `test-google-signin-credentials`
File: `supabase/functions/test-google-signin-credentials/index.ts`

Copy pattern từ `test-gsc-credentials`:
- Đọc row `social_platform_settings` với `platform='google_signin'`
- Decrypt `consumer_key` + `consumer_secret`
- Validate format: client_id phải kết thúc `.apps.googleusercontent.com`, secret length ≥ 10
- Ping `https://accounts.google.com/.well-known/openid-configuration` để chắc Google reachable
- (Bonus) Gọi `https://oauth2.googleapis.com/token` với `grant_type=refresh_token` + dummy token để phân biệt:
  - Google trả `invalid_client` → credentials sai → fail
  - Google trả `invalid_grant` → credentials đúng (chỉ refresh token bogus) → success
- Trả `{ success, message, details: { client_id_prefix } }`

Không cần sửa `social-diagnostics` (gọi trực tiếp function này từ frontend cho gọn, giống cách GSC test gọi qua `social-diagnostics` nếu cần — nhưng GSC card hiện gọi trực tiếp `social-diagnostics` với `platform='google_search_console'`. Để parity tốt nhất, thêm `'google_signin'` vào `PLATFORM_NAMES` trong `social-diagnostics/index.ts` và route → `test-google-signin-credentials`).

### 2. Cập nhật `social-diagnostics/index.ts`
- Thêm `'google_signin'` vào `PLATFORM_NAMES`
- Trong `resolveFunctionName`: nếu `platform === 'google_signin'` → return `test-google-signin-${action.replace('test-', '')}` (chỉ hỗ trợ `test-credentials` cho giai đoạn này)

### 3. Cập nhật `src/components/admin/GoogleAuthSignInCard.tsx`
- Thêm state `testing: boolean`
- Thêm hàm `handleTest()` gọi `supabase.functions.invoke('social-diagnostics', { body: { action: 'test-credentials', platform: 'google_signin' } })`, toast success/error theo `data.success`
- Thay `<Button asChild><a href="/auth">…<Zap/></a></Button>` thành `<Button onClick={handleTest} disabled={testing}>` hiển thị `<Loader2 animate-spin>` khi `testing`, ngược lại `<Zap>`. `title="Test kết nối"`
- Bỏ import `Zap` nguyên mẫu? Giữ nguyên + thêm `Loader2` từ lucide-react

(Nút mở `/auth` để test login UX không nằm trong phạm vi yêu cầu — user chỉ nói "nút test kết nối". Giữ pattern y hệt GSC: chỉ 3 nút Cấu hình / Test / Xóa.)

## Out of scope
- Không tự động đẩy creds vào Supabase Auth provider config (vẫn cần admin paste tay vào Lovable Cloud → Auth Providers → Google).
- Không thêm test-connection level (cần OAuth refresh token thật của user — không có ở admin global level).
