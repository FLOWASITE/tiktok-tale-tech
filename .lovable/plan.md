## Vấn đề hiện tại

Khi user bấm **Connect WordPress** ở Brand → Connections, dialog mở ra là **dialog Website đa năng** với:
- Dropdown "Loại kết nối" hiển thị **9 lựchọn** (Flowa Blog, WordPress, NukeViet, Blogger, Wix, Shopify, Custom API, Webhook, Manual) → user phải scan và chọn lại dù vừa bấm WordPress
- Chỉ 1 dòng hint nhỏ "Tạo tại WordPress Admin → Users → Profile → Application Passwords" → user không biết Application Password là gì, tại sao cần, copy ở đâu
- Không có nút test riêng — phải submit mới biết sai
- Field placeholder `xxxx xxxx xxxx xxxx xxxx xxxx` dễ gây hiểu nhầm phải gõ nguyên dạng có space
- Không validate URL (thiếu `https://`, có dấu `/` cuối, có `/wp-admin` thừa…)

## Mục tiêu

Khi user bấm Connect WordPress, phải cảm thấy: "Tôi chỉ cần làm 3 việc rất rõ ràng".

## Giải pháp

### 1. Tách dialog WordPress riêng (`WordPressConnectDialog`)

Component mới `src/components/brand/WordPressConnectDialog.tsx` — không còn lẫn với 8 loại khác. Bố cục **3 bước có số thứ tự**:

```text
[1] Địa chỉ website WordPress
    [ https://yourblog.com                    ]
    Tự động chuẩn hoá: thêm https://, bỏ /wp-admin, bỏ / cuối

[2] Tạo Application Password (1 lần duy nhất)
    [ Mở trang tạo password ↗ ]   ← deep link tới {url}/wp-admin/profile.php#application-passwords
    Hướng dẫn 4 dòng có ảnh thumbnail mini (optional):
      • Đăng nhập admin WordPress của bạn
      • Cuộn xuống mục "Application Passwords"
      • Đặt tên là "Flowa" → bấm "Add New"
      • Copy chuỗi password 24 ký tự WordPress hiển thị

[3] Dán thông tin đăng nhập
    Username WordPress  [ admin              ]
    Application Password [ ••••••••••••     ] [👁]
    (tự động strip khoảng trắng khi paste)

    [ Kiểm tra kết nối ]   ← gọi test-wordpress-credentials, hiện ✓/✗ inline
    [ Huỷ ]  [ Lưu kết nối ] (disabled cho tới khi test pass)
```

### 2. UX details

- **Auto-normalize URL** ngay khi blur: `https://`, bỏ `/wp-admin`, `/wp-login.php`, trailing `/`.
- **Deep-link button** mở `{normalizedUrl}/wp-admin/profile.php#application-passwords` ở tab mới — đỡ user phải tự tìm.
- **Strip whitespace** khi paste Application Password (WordPress hiển thị có space cứ 4 ký tự, REST API yêu cầu không space — hoặc giữ nguyên đều OK, ta chuẩn hoá luôn).
- **Test trước khi Lưu**: bắt buộc bấm "Kiểm tra kết nối" để Lưu enable. Khi pass hiện badge `✓ Đã xác minh — site: <Site Title> · WP <version>` (extract từ response của test endpoint).
- **Error mapping** thân thiện:
  - 401 → "Sai username hoặc Application Password. Hãy tạo lại password mới."
  - 403 → "User không có quyền publish post. Cần Editor/Administrator."
  - 404/HTML response → "Không tìm thấy REST API. Site có bật permalinks không phải Plain?"
  - Timeout → "Site không phản hồi. Kiểm tra URL."
- **Không hỏi credentials cấp admin**: vẫn giữ nguyên (Application Password). Nói rõ ngay đầu dialog: *"Flowa KHÔNG cần mật khẩu admin. Application Password là mã riêng, có thể thu hồi bất cứ lúc nào."*

### 3. Routing

Trong `BrandViewConnectionsTab.tsx`:
- `handleConnect('wordpress')` → mở `WordPressConnectDialog` mới (state `wpDialogOpen`).
- Vẫn giữ dialog Website đa năng cho các loại khác (NukeViet, Blogger, Custom API, Webhook…).
- Sau khi save thành công → invalidate query `social-connections`, đóng dialog, toast "Đã kết nối WordPress: <site title>".

### 4. Backend (đã có sẵn, không thêm mới)

- `test-wordpress-credentials` edge function đã hỗ trợ Application Password. Bổ sung: trả thêm `siteTitle` và `wpVersion` (đọc từ `/wp-json/` root response) để hiển thị badge xác minh.
- `connect-social` đã accept platform `wordpress`. Reuse nguyên.

## Thay đổi file

| File | Thay đổi |
|---|---|
| `src/components/brand/WordPressConnectDialog.tsx` | **Mới** — dialog 3 bước chuyên cho WordPress |
| `src/components/brand/BrandViewConnectionsTab.tsx` | `handleConnect('wordpress')` route sang dialog mới; bỏ option `wordpress` khỏi dropdown của Website dialog đa năng |
| `supabase/functions/test-wordpress-credentials/index.ts` | Trả thêm `siteTitle`, `wpVersion` từ `/wp-json/` |

## Out of scope (có thể làm sau)

- OAuth tự động qua wordpress.com (chỉ dùng được cho WP.com hosted, không dùng được cho self-hosted).
- Auto-detect REST API endpoint nếu site dùng custom prefix.
- Multi-site WordPress Network.
