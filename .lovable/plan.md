

## Tạo 2 endpoint cho Meta App: Deauthorize Callback và Data Deletion Request

### Bối cảnh
Meta yêu cầu mọi App phải cung cấp 2 URL:
1. **Deauthorize Callback URL** — Meta gọi khi user thu hồi quyền app
2. **Data Deletion Request URL** — Meta gọi khi user yêu cầu xóa dữ liệu

Hiện tại project chưa có 2 endpoint này.

### Kế hoạch

**Tạo 1 edge function duy nhất** `instagram-webhooks` xử lý cả 2 loại request:

- **POST `/instagram-webhooks?type=deauthorize`**
  - Nhận signed request từ Meta
  - Xác thực chữ ký HMAC-SHA256 bằng App Secret
  - Xóa/vô hiệu hóa social connection của user trong DB (`social_connections`)
  - Trả về `{ success: true }`

- **POST `/instagram-webhooks?type=data-deletion`**
  - Nhận signed request từ Meta
  - Xác thực chữ ký
  - Xóa dữ liệu liên quan đến user trong DB
  - Trả về JSON với `url` (trang xác nhận) và `confirmation_code` theo yêu cầu của Meta

**Sau khi deploy**, bạn sẽ điền vào Meta Dashboard:
- URL gọi lại để thu hồi quyền: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/instagram-webhooks?type=deauthorize`
- URL yêu cầu xóa dữ liệu: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/instagram-webhooks?type=data-deletion`

### File thay đổi
- **Tạo mới**: `supabase/functions/instagram-webhooks/index.ts`
- Không cần migration database

