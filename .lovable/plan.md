

# Facebook Webhooks — Nhận engagement realtime cho bài đăng

## Tổng quan

Thêm endpoint nhận Facebook Webhooks để khi user tương tác (comment, react, share) trên bài đã đăng qua Flowa, hệ thống tự động cập nhật metrics. Cần thêm scope `pages_manage_metadata` vào OAuth flow.

## Thay đổi

### 1. Database — Bảng `social_post_engagements`
Tạo bảng lưu engagement data từ webhook:

```sql
CREATE TABLE public.social_post_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  brand_template_id UUID REFERENCES brand_templates(id),
  connection_id UUID REFERENCES social_connections(id),
  platform TEXT NOT NULL DEFAULT 'facebook',
  post_id TEXT NOT NULL,
  event

<lov-plan>

# Facebook Webhooks — Nhận engagement realtime cho bài đăng

## Tổng quan

Thêm endpoint nhận Facebook Webhooks để khi user tương tác (comment, react, share) trên bài đã đăng qua Flowa, hệ thống tự động cập nhật metrics. Cần thêm scope `pages_manage_metadata` vào OAuth flow.

## Thay đổi

### 1. Database — Bảng `social_post_engagements`
Lưu engagement events từ webhook:
- `post_id`, `platform`, `event_type` (comment, reaction, share), `event_data` (jsonb), `sender_id`, `sender_name`
- FK tới `social_connections`, `organization_id`, `brand_template_id`
- RLS: org members có thể đọc, chỉ service role ghi

### 2. Edge Function `facebook-webhook` (mới)
- **GET**: Xử lý Facebook Webhook Verification (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **POST**: Nhận webhook events từ Facebook (feed changes: comments, reactions, shares)
- Parse payload, match `page_id` → `social_connections` → lưu vào `social_post_engagements`
- Cần secret `FACEBOOK_WEBHOOK_VERIFY_TOKEN` (token tự tạo để Facebook xác thực)

### 3. Cập nhật OAuth scopes
- **`connect-social/index.ts`**: Thêm `pages_manage_metadata` vào scope string (dòng 570)
- **`facebook-oauth-callback/index.ts`**: Cập nhật scopes array (dòng 236) để phản ánh permission mới
- Sau khi thêm scope, cần subscribe page tới webhook qua Graph API trong callback

### 4. Subscribe Page tới Webhook (trong `facebook-oauth-callback`)
Sau khi lưu connection, gọi Graph API để subscribe page:
```
POST /{page_id}/subscribed_apps?subscribed_fields=feed&access_token={page_token}
```

### 5. Config
- `supabase/config.toml`: Thêm `[functions.facebook-webhook]` với `verify_jwt = false` (Facebook gọi trực tiếp)

### File thay đổi
| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo bảng `social_post_engagements` + RLS |
| `supabase/functions/facebook-webhook/index.ts` | **Mới** — nhận & xử lý webhook |
| `supabase/functions/connect-social/index.ts` | Thêm `pages_manage_metadata` vào scope |
| `supabase/functions/facebook-oauth-callback/index.ts` | Thêm scope + subscribe page tới webhook |

### Lưu ý
- User cần **kết nối lại Facebook** sau khi deploy để cấp thêm permission `pages_manage_metadata`
- Cần cấu hình Webhook URL trên Facebook Developer Console: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/facebook-webhook`
- Cần tạo secret `FACEBOOK_WEBHOOK_VERIFY_TOKEN` trước khi deploy

