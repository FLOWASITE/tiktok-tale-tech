

# Tạo Proxy Route cho Zalo OA Callback qua domain `app.flowa.one`

## Vấn đề

Zalo yêu cầu **Official Account Callback URL** phải nằm trên domain đã xác thực (`app.flowa.one`), nhưng Edge Function callback hiện tại nằm trên `rllyipiyuptkibqinotz.supabase.co`. Cần tạo route proxy để Zalo redirect về `app.flowa.one`, sau đó forward sang Edge Function.

## Giải pháp

### Luồng hoạt động mới

```text
Zalo OAuth → app.flowa.one/api/zalo/callback?code=...&state=...
         → Frontend route bắt params
         → Gọi Edge Function zalo-oauth-callback (POST)
         → Redirect về /auth/zalo/callback?success=true
```

### Bước 1: Tạo page proxy `src/pages/ZaloOAuthProxy.tsx`

- Route: `/api/zalo/callback`
- Nhận `code` + `state` từ query params (Zalo redirect GET)
- Gọi Edge Function `zalo-oauth-callback` qua POST với `{ code, state }`
- Xử lý response: redirect về `/auth/zalo/callback` với kết quả

### Bước 2: Thêm route trong `src/app/routes.tsx`

- Thêm `<Route path="/api/zalo/callback" element={<ZaloOAuthProxy />} />`

### Bước 3: Cập nhật `connect-social` redirect URI

- Thay `${supabaseUrl}/functions/v1/zalo-oauth-callback` → logic chọn redirect URI:
  - Nếu `frontendOrigin` chứa `flowa.one` → dùng `https://app.flowa.one/api/zalo/callback`
  - Fallback: giữ nguyên Edge Function URL cho dev/preview

### Bước 4: Cập nhật `zalo-oauth-callback` Edge Function

- Thêm hỗ trợ nhận request POST (từ proxy page) bên cạnh GET (redirect trực tiếp)
- POST body: `{ code, state }` → xử lý như cũ → trả JSON thay vì redirect 302

## Callback URL cho Zalo Developer Portal

Sau khi hoàn tất, URL cần cấu hình trên Zalo:
```
https://app.flowa.one/api/zalo/callback
```

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/ZaloOAuthProxy.tsx` | Tạo mới — proxy page nhận GET từ Zalo, gọi Edge Function |
| `src/app/routes.tsx` | Thêm route `/api/zalo/callback` |
| `supabase/functions/connect-social/index.ts` | Đổi redirect URI sang `app.flowa.one` cho production |
| `supabase/functions/zalo-oauth-callback/index.ts` | Thêm xử lý POST request từ proxy |

