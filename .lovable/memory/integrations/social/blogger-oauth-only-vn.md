---
name: Blogger OAuth-only Connection
description: Blogger phải kết nối qua Google OAuth (connect-social → blogger-oauth-callback), KHÔNG dùng API Key qua connect-website
type: constraint
---

Blogger luôn dùng OAuth 2.0 Google, scope `https://www.googleapis.com/auth/blogger`, share credentials với `google_business` nếu thiếu config riêng.

**Flow đúng:**
1. UI bấm "Kết nối Blogger" → `BrandViewConnectionsTab.handleConnect('blogger')` → rơi vào nhánh OAuth chung (line 276+).
2. `connect-social` (case `platform === 'blogger'`, line 917) trả `{ requiresOAuth: true, oauthUrl }`.
3. Popup → Google consent → `blogger-oauth-callback` lưu `social_connections` với `platform='blogger'` + access/refresh token + `metadata.blogs[]` + `selected_blog_id`.
4. `publish-blogger` query `eq('platform','blogger')` và POST qua Blogger API v3 với `selected_blog_id`.

**Forbidden:**
- KHÔNG cho Blogger vào `connect-website` (dialog Website). API Key Google chỉ đọc public, không thể publish.
- Không thêm option `<option value="blogger">` vào select `integrationType` của Website dialog.

**Why:** Trước đây UI mở Website dialog với `integrationType='blogger'` + Google API Key → lưu `platform='website'` → `publish-blogger` không thấy → publish luôn fail dù UI hiển thị "đã kết nối".
