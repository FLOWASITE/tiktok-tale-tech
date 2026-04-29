# Hỗ trợ WordPress.com + cảnh báo rõ ràng cho user

## Vấn đề
User đang dùng `dichvukiemtoantaf.wordpress.com` — đây là **WordPress.com** (hosted bởi Automattic), KHÔNG phải WordPress self-hosted.

WordPress.com Free/Personal/Premium plan **không cho dùng Application Passwords** — tính năng này chỉ có ở:
- Business plan ($25/tháng) trở lên
- Hoặc WordPress self-hosted (cài trên hosting riêng)

Vì vậy user mở `/wp-admin/profile.php` không thấy mục "Application Passwords" → flow hiện tại đứng im.

## Giải pháp 2 phần

### Phần 1 — Cải thiện UX dialog hiện tại (làm ngay, không cần backend mới)

Sửa `WordPressConnectDialog.tsx` để **detect WordPress.com URL ngay khi user nhập** và hiển thị cảnh báo:

- Khi URL match `*.wordpress.com` → hiện banner vàng:
  > ⚠️ **Bạn đang dùng WordPress.com (hosted).**
  > Application Passwords chỉ có ở plan **Business** trở lên hoặc WordPress self-hosted.
  > 
  > **3 lựa chọn:**
  > 1. Nâng cấp WordPress.com lên Business plan để bật Application Passwords
  > 2. Kết nối qua **OAuth WordPress.com** (đang phát triển — coming soon)
  > 3. Dùng WordPress self-hosted (cài WordPress trên hosting riêng như Hostinger, Bluehost…)

- Update step 2 instructions: nói rõ phần này CHỈ áp dụng self-hosted; với WordPress.com Business, hướng dẫn tìm ở `Users → Profile → Application Passwords` trong wp-admin cổ điển (`/wp-admin/profile.php?classic-editor`).

- Khi backend trả `code: 'rest_api_unavailable'` HOẶC URL chứa `.wordpress.com` mà test fail 401 → hiện gợi ý cụ thể thay vì error chung chung.

### Phần 2 — (Tuỳ chọn) Thêm OAuth WordPress.com

Nếu user xác nhận muốn hỗ trợ WordPress.com Free/Personal:

1. Đăng ký Flowa app tại https://developer.wordpress.com/apps/ → lấy `client_id`, `client_secret`
2. Thêm secrets `WORDPRESSCOM_CLIENT_ID` + `WORDPRESSCOM_CLIENT_SECRET`
3. Tạo edge function `wordpress-oauth-callback` (tương tự `blogger-oauth-callback`)
4. Update `WordPressConnectDialog`: thêm tab "WordPress.com" vs "Self-hosted"
5. WordPress.com publish dùng REST API `https://public-api.wordpress.com/wp/v2/sites/{site}/posts` với Bearer token

→ Phần này **tốn 1-2 ngày dev + cần Flowa đăng ký developer app**, nên hỏi user trước khi làm.

## Files cần sửa (Phần 1)

- `src/components/brand/WordPressConnectDialog.tsx`
  - Thêm `isWordPressCom = /\.wordpress\.com$/i.test(hostname)` 
  - Hiển thị banner cảnh báo khi detect
  - Thêm link tới hướng dẫn nâng cấp Business plan
  - Sửa step 2 instructions cho rõ self-hosted vs .com

## Đề xuất

**Làm Phần 1 ngay** (10 phút) để user không bị stuck. Sau đó hỏi user có muốn làm Phần 2 (OAuth WordPress.com) không.