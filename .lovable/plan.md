

## Sửa lỗi: Instagram credentials không hợp lệ

### Nguyên nhân gốc

Từ screenshot của bạn, có 2 loại ID khác nhau:
- **Facebook App ID**: `708527221627170` (ở header, từ Settings > Basic)
- **Instagram App ID**: `1352418765877758` (ID riêng của Instagram Product)

Hiện tại UI label ghi "Instagram App ID" → bạn nhập `1352418765877758`. Nhưng test function gọi `graph.facebook.com/v24.0/${appId}` — API này yêu cầu **Facebook App ID**, không phải Instagram App ID.

Tương tự, **App Secret** cũng cần lấy từ Settings > Basic của Facebook App, không phải "Khóa bí mật của ứng dụng trên Instagram".

### Sửa chữa

#### 1. `SocialPlatformCredentialsDialog.tsx` — Sửa label và hướng dẫn
- Label: "Instagram App ID" → **"Facebook App ID"**
- Label: "Instagram App Secret" → **"Facebook App Secret"**
- Instructions: Đổi thành "Meta for Developers → Settings → Basic → App ID & App Secret. App phải thêm Instagram Product."
- Thêm note nhỏ: "Dùng App ID từ Settings > Basic, KHÔNG dùng Instagram App ID"

#### 2. Re-enter credentials
- Sau khi sửa UI, bạn cần nhập lại đúng Facebook App ID (`708527221627170`) và Facebook App Secret (từ Settings > Basic)

### File cần sửa
- `src/components/admin/SocialPlatformCredentialsDialog.tsx` — sửa label + instructions cho Instagram

