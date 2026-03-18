

# Rà soát & Sửa lỗi Kết nối Facebook Fanpage

## Vấn đề phát hiện

### 1. `facebook-oauth-callback` dùng mã hóa cũ (Critical)
File `supabase/functions/facebook-oauth-callback/index.ts` (line 111-112) sử dụng hàm `decrypt()` local (AES-256-CBC) trong khi Admin đã lưu credentials bằng `_shared/crypto.ts` (AES-256-GCM). Kết quả: callback sẽ **không giải mã được** App ID/Secret → lỗi khi exchange OAuth code.

### 2. `FRONTEND_URL` fallback sai (Critical)
Cả `facebook-oauth-callback`, `threads-oauth-callback` đều fallback về `https://preview--flowa-one.lovable.app` — đây là URL cũ, không đúng với project hiện tại (`tiktok-tale-tech.lovable.app` hoặc preview URL mới). Sau khi OAuth xong, user sẽ bị redirect về trang sai → mất kết nối.

Trong khi `zalo-oauth-callback` và `google-business-oauth-callback` đã dùng pattern đúng: `supabaseUrl.replace('.supabase.co', '.lovableproject.com')`.

### 3. Chưa có secret `FRONTEND_URL`
Không có `FRONTEND_URL` trong danh sách secrets → luôn dùng fallback.

## Kế hoạch sửa

### File 1: `supabase/functions/facebook-oauth-callback/index.ts`
- **Import** `decrypt` từ `../_shared/crypto.ts` (GCM) thay vì dùng hàm local
- **Thêm fallback** CBC legacy giống pattern đã dùng ở `connect-social/index.ts`
- **Sửa tất cả `FRONTEND_URL` fallback** từ hardcoded URL sang pattern dynamic: `supabaseUrl.replace('.supabase.co', '.lovableproject.com')`
- **Xóa** hàm local `decrypt()` và `encrypt()` không còn cần

### File 2: `supabase/functions/threads-oauth-callback/index.ts`
- **Sửa `FRONTEND_URL` fallback** tương tự — từ hardcoded sang dynamic pattern

### Không thay đổi
- `connect-social/index.ts` — đã fix ở message trước
- `zalo-oauth-callback`, `google-business-oauth-callback` — đã dùng pattern đúng
- Frontend callback pages — hoạt động bình thường
- Database / RLS — không thay đổi

