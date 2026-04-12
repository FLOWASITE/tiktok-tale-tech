

# Thêm hỗ trợ Blogger, Wix, Shopify Blog

## Tổng quan
Mở rộng hệ thống kết nối website hiện tại (đang chỉ hỗ trợ WordPress, Custom API, Webhook, Manual) để thêm 3 nền tảng blog phổ biến: **Blogger (Google)**, **Wix**, và **Shopify Blog**.

## Kiến trúc hiện tại
- UI: `BrandViewConnectionsTab.tsx` có dropdown `integrationType` với 4 options
- Backend: `connect-website` edge function lưu connection, `publish-website` edge function xử lý publish theo `integrationType`
- Tất cả dùng chung platform `website` trong `social_connections` table

## Thay đổi

### 1. UI — Thêm 3 options vào dropdown integrationType
Thêm `blogger`, `wix`, `shopify_blog` vào select dropdown. Mỗi nền tảng có form fields riêng:

- **Blogger**: Blog URL + API Key (Google API Key với Blogger API v3 enabled)
- **Wix**: Site URL + API Key (Wix REST API key)
- **Shopify Blog**: Store URL (mystore.myshopify.com) + Admin API Access Token

### 2. Edge Function `connect-website` — Thêm validation cho 3 nền tảng
- **Blogger**: Test `GET https://www.googleapis.com/blogger/v3/blogs/byurl?url={blogUrl}&key={apiKey}`
- **Wix**: Test `GET https://www.wixapis.com/blog/v3/posts?paging.limit=1` với Authorization header
- **Shopify Blog**: Test `GET https://{store}/admin/api/2024-01/blogs.json` với X-Shopify-Access-Token header

### 3. Edge Function `publish-website` — Thêm 3 publish handlers

- **Blogger**: `POST https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts` — cần OAuth hoặc API key. Sẽ dùng OAuth2 service account hoặc API key approach.
- **Wix**: `POST https://www.wixapis.com/blog/v3/draft-posts` → sau đó publish draft
- **Shopify Blog**: `POST https://{store}/admin/api/2024-01/blogs/{blogId}/articles.json` với access token

### 4. UI form fields cho từng nền tảng

```text
Blogger:
  - Blog URL (bắt buộc)
  - Google API Key (bắt buộc)

Wix:
  - Site URL (bắt buộc)
  - API Key (bắt buộc)

Shopify Blog:
  - Store URL (bắt buộc, vd: mystore.myshopify.com)
  - Admin API Access Token (bắt buộc)
```

## Files thay đổi
- **Edit**: `src/components/brand/BrandViewConnectionsTab.tsx` — thêm 3 options + conditional form fields
- **Edit**: `supabase/functions/connect-website/index.ts` — thêm validation logic cho 3 nền tảng
- **Edit**: `supabase/functions/publish-website/index.ts` — thêm 3 publish handlers
- **Edit**: `supabase/functions/test-website-credentials/index.ts` — thêm test logic cho 3 nền tảng

