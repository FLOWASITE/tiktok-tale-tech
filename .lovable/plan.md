

# Fix: Facebook OAuth Callback chưa deploy code mới

## Nguyên nhân gốc

Từ log Edge Function, code **cũ** vẫn đang chạy (line 17, 97, 98 — khớp với phiên bản cũ dùng `decrypt()` local CBC). Code mới đã được sửa trong file nhưng **chưa được deploy lên server**.

Cụ thể:
- Credentials (App ID/Secret) được mã hóa bằng **AES-256-GCM** (modern)
- Code đang chạy trên server chỉ có **AES-256-CBC** (legacy) → `Invalid initialization vector`
- Redirect URL vẫn hardcoded `preview--flowa-one.lovable.app` (cũ)

## Giải pháp

**Chỉ cần deploy lại edge function** `facebook-oauth-callback`. Code đã đúng rồi (có hybrid GCM+CBC decrypt, có `getFrontendUrl()` dynamic). Không cần sửa code.

Sau khi deploy, flow sẽ hoạt động:
1. Decrypt GCM thành công → lấy App ID/Secret
2. Exchange OAuth code → lấy Page Access Token
3. Redirect về đúng domain hiện tại (không còn `preview--flowa-one`)

