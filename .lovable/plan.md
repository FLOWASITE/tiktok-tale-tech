
## Vấn đề

Khi bấm Kết nối Pinterest từ Brand, Pinterest trả về trang lỗi:
> **400 — Rất tiếc! Chúng tôi không thể tìm thấy ứng dụng đó.**

Đây **không phải lỗi code**. Đây là lỗi từ phía Pinterest OAuth server với 1 trong 3 nguyên nhân sau (theo thứ tự xác suất):

### Nguyên nhân #1 — App ID sai hoặc App chưa "Live" (90% case)
Code đang gửi đúng URL chuẩn:
```
https://www.pinterest.com/oauth/?client_id=<APP_ID>&redirect_uri=...&response_type=code&scope=...&code_challenge=...
```
Pinterest báo "không tìm thấy ứng dụng" = **client_id không tồn tại trên Pinterest** hoặc **app đang ở trạng thái Trial/chưa approved cho production users**.

### Nguyên nhân #2 — Redirect URI chưa whitelist
Code dùng redirect URI:
```
https://rllyipiyuptkibqinotz.supabase.co/functions/v1/pinterest-oauth-callback
```
URI này **bắt buộc phải được khai báo chính xác** trong Pinterest App settings → Redirect URIs.

### Nguyên nhân #3 — App ID đã nhập vào Admin nhưng decrypt sai
Có khả năng credentials lưu trong `social_platform_settings` bị encrypt với key cũ → decrypt ra giá trị rác → Pinterest không nhận ra.

---

## Kế hoạch xử lý

### Bước 1 — Verify config hiện tại (chuyển sang default mode để query DB)
- Query `social_platform_settings WHERE platform='pinterest'` để xem App ID đang lưu là gì
- Test decrypt App ID từ `consumer_key` để chắc giá trị decode ra hợp lệ (Pinterest App ID thường là số 13-19 chữ số)
- Log ra App ID thực tế đang gửi cho Pinterest

### Bước 2 — Cải thiện UX báo lỗi trong `connect-social`
Hiện tại code chỉ redirect thẳng tới Pinterest. Khi Pinterest từ chối, user thấy trang Pinterest 400 chứ không có hướng dẫn. Sẽ:

1. **Pre-validate App ID** trước khi build OAuth URL:
   - Check App ID là số (Pinterest IDs là numeric string)
   - Nếu không hợp lệ → trả lỗi rõ ràng kèm hướng dẫn vào Admin

2. **Thêm log chi tiết** trong `connect-social` (Pinterest branch):
   - Log App ID prefix (4 ký tự đầu) để verify mà không leak
   - Log full redirect URI

3. **Thêm helper text** trong UI Brand Connections cho Pinterest:
   - Nếu chưa kết nối được → hiện tooltip "Yêu cầu admin cấu hình App ID + thêm redirect URI: `<URL>` vào Pinterest Developer Portal"

### Bước 3 — Thêm "Copy Redirect URI" button trong Admin Pinterest Settings
Trong `SocialPlatformCredentialsDialog` cho Pinterest, hiện sẵn Redirect URI và nút copy để admin paste vào Pinterest Developer Portal:
```
https://rllyipiyuptkibqinotz.supabase.co/functions/v1/pinterest-oauth-callback
```

### Bước 4 — Hướng dẫn user (cần làm thủ công trên Pinterest Developer Portal)

```text
1. Vào https://developers.pinterest.com/apps/
2. Chọn App của bạn (hoặc tạo mới nếu chưa có)
3. Tab "Configuration":
   - Redirect URIs → Add → paste:
     https://rllyipiyuptkibqinotz.supabase.co/functions/v1/pinterest-oauth-callback
   - Scopes cần bật: boards:read, boards:write, pins:read, pins:write, user_accounts:read
4. Tab "Review status":
   - Nếu app đang "Trial mode" → chỉ owner mới login được
   - Nếu cần user khác login → submit "Standard access" review
5. Copy App ID + App Secret → vào Flowa Admin → Social Platforms → Pinterest → paste
6. Save → bấm "Test credentials" để verify
```

---

## Files sẽ sửa (Phase implement)

```text
supabase/functions/connect-social/index.ts    — Pre-validate App ID + log chi tiết
src/components/admin/
  SocialPlatformCredentialsDialog.tsx         — Hiện Redirect URI + nút Copy cho Pinterest
src/components/brand/
  BrandViewConnectionsTab.tsx                 — Helper text khi connect Pinterest fail
```

Không thêm migration, không thêm edge function mới.

---

## Câu hỏi cho bạn trước khi implement

1. Bạn đã nhập App ID + Secret vào **Admin → Social Platforms → Pinterest** chưa? (Nếu chưa → đó là root cause, chỉ cần nhập)
2. Trong Pinterest Developer Portal, app của bạn đã add đúng Redirect URI ở trên chưa?
3. App đang ở status **Trial** hay **Standard**? (Trial chỉ owner login được)

Nếu cả 3 đều OK mà vẫn lỗi → mình sẽ chuyển sang default mode để query DB và debug giá trị App ID thực tế đang gửi đi.
