## Mục tiêu
Tích hợp **Shopify Public App OAuth** để mỗi merchant connect store của họ vào Flowa. Lưu access token đã mã hóa AES-256-GCM. Use case: **auto-publish blog do Flowa generate vào Shopify Online Store > Blog**, scope `read_content + write_content`.

Pattern theo blueprint **Blogger OAuth** (đã production) — không phải `shopify--enable` (cái đó là 1 store cố định cho project owner, không phù hợp multi-tenant SaaS).

## Bạn cần chuẩn bị trước (out-of-band)
1. Đăng ký **Shopify Partners account**: https://partners.shopify.com
2. Tạo **Public App** trong Partners dashboard:
   - **App URL**: `https://app.flowa.one/connections`
   - **Allowed redirection URL**: `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/shopify-oauth-callback`
   - **Scopes**: `read_content`, `write_content`, `read_products` (cho preview SEO meta)
   - **Embedded app**: TẮT (Flowa không nhúng vào Shopify Admin)
3. Lấy **Client ID** và **Client Secret** → dán vào secrets khi tôi yêu cầu
4. Tạo **Development store** miễn phí trong Partners để test trước

## Kiến trúc

```text
User clicks "Kết nối Shopify" trong BrandViewConnectionsTab
        │
        ▼
[shopify-oauth-start]  ← FE truyền shop domain (vd: mystore.myshopify.com)
   • validate shop domain regex
   • build authorize URL với state=base64({userId, brandTemplateId, orgId, nonce})
   • redirect → https://{shop}/admin/oauth/authorize?...
        │
        ▼
   Merchant approve scopes trên Shopify
        │
        ▼
[shopify-oauth-callback]  ← Shopify redirect về với code + hmac
   • verify HMAC (HMAC-SHA256 với client_secret)
   • verify shop domain hợp lệ (*.myshopify.com)
   • exchange code → access_token (POST /admin/oauth/access_token)
   • fetch shop info (GET /admin/api/2025-01/shop.json) → tên, email, locale
   • encrypt access_token (AES-256-GCM qua _shared/crypto.ts)
   • upsert social_connections (platform='shopify')
   • register webhooks: app/uninstalled (để auto-cleanup connection)
   • redirect → https://app.flowa.one/connections?shopify=success
        │
        ▼
[publish-shopify-blog]  ← gọi từ Multi-channel publish flow
   • decrypt token, fetch blogs list, pick default blog
   • POST /admin/api/2025-01/blogs/{blog_id}/articles.json
     { title, body_html (markdown→html via remark), tags, image, published }
   • lưu published_url vào publishing_logs
        │
        ▼
[shopify-app-uninstalled-webhook]  ← public, verify_jwt=false
   • verify HMAC header X-Shopify-Hmac-Sha256
   • soft-delete social_connection (is_active=false)
```

## Phase 1 — OAuth flow + connect (1 ngày)

### Files mới
- `supabase/functions/shopify-oauth-start/index.ts` — build authorize URL, lưu state vào `oauth_pending_states`
- `supabase/functions/shopify-oauth-callback/index.ts` — verify HMAC, exchange code, encrypt token, upsert connection
- `supabase/functions/_shared/shopify.ts` — helpers: `verifyHmac()`, `validateShopDomain()`, `shopifyFetch(shop, token, path)`, `getDefaultBlog()`
- `src/pages/ShopifyCallback.tsx` — landing page sau OAuth success/error (giống `BloggerCallback.tsx`)

### Files chỉnh
- `supabase/config.toml` → thêm `[functions.shopify-oauth-callback] verify_jwt = false`, tương tự cho webhook
- `src/hooks/useSocialConnections.ts` → thêm `'shopify'` vào type `SocialPlatform`
- `src/hooks/useSocialPlatformSettings.ts` → tương tự
- `src/components/multichannel/streaming/ChannelIcon.tsx` → thêm entry `shopify` với `ShopifyIcon` (SVG mới trong `SocialIcons.tsx`, màu `#96BF48`)
- `src/components/icons/SocialIcons.tsx` → export `ShopifyIcon` (SVG bag-with-S)
- `src/components/brand/BrandViewConnectionsTab.tsx` → thêm card "Shopify" với input shop domain + button "Kết nối"
- `src/App.tsx` → thêm route `/auth/shopify/callback` → `<ShopifyCallback />`

### Secrets cần (sẽ yêu cầu sau khi bạn confirm)
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`

### Database
Tận dụng tables hiện có — KHÔNG cần migration:
- `social_connections` (đã có `metadata JSONB`) → lưu `{ shop_domain, shop_name, shop_email, locale, scope, default_blog_id }`
- `oauth_pending_states` (đã dùng cho Bluesky) → lưu state nonce 15 phút
- `social_platform_settings` (đã dùng cho FB/Google) → option lưu Client ID/Secret nếu muốn admin config qua UI

## Phase 2 — Publish blog (4-6h)

### Files mới
- `supabase/functions/publish-shopify-blog/index.ts` — convert markdown → HTML, upload featured image, POST article
- `src/components/multichannel/preview/ShopifyBlogMockup.tsx` — mockup theme Dawn của Shopify (header + article body + tags)

### Files chỉnh
- `supabase/functions/publish-multi-channel/index.ts` (hoặc router publish chung) → route channel `shopify_blog` → `publish-shopify-blog`
- `src/utils/channelColors.ts` + `src/types/publishing.ts` → đăng ký channel `shopify_blog`
- `src/components/multichannel/MockupRenderer.tsx` (hoặc tương đương) → switch case → `ShopifyBlogMockup`

### Markdown→HTML
Dùng pipeline có sẵn trong `_shared/markdown-to-html.ts` (Blogger đã dùng). Shopify chấp nhận HTML chuẩn trong field `body_html`. Strip SEO frontmatter giống Blogger.

## Phase 3 — Resilience + lifecycle (3-4h)

### Files mới
- `supabase/functions/shopify-app-uninstalled-webhook/index.ts` — verify HMAC, soft-delete connection
- `supabase/functions/test-shopify-connection/index.ts` — ping `/admin/api/2025-01/shop.json` để verify token còn valid (dùng cho ReconnectBanner)

### Files chỉnh
- `supabase/functions/_shared/social-token-refresh-cron.ts` (nếu có) → thêm Shopify path. **Lưu ý**: Shopify Admin API access token **không expire** (offline access), nên không cần refresh cron — chỉ cần test-connection định kỳ + handle 401 → mark `last_error` + show ReconnectBanner.
- `src/components/social/ReconnectBanner.tsx` → đã generic, chỉ cần thêm label cho `shopify`
- Webhook subscribe trong `shopify-oauth-callback` sau khi exchange token thành công.

## UI/UX (theo Soft Luxury + Connection UI Specs)

```text
┌─ Connections Tab ──────────────────────────────────┐
│  [ChannelIcon shopify]  Shopify                     │
│  ─────────────────────────────────────────          │
│  Trạng thái: [✓ Đã kết nối]  mystore.myshopify.com │
│  Blog mặc định: News                                │
│  Hết hạn: Không có (offline token)                  │
│  [Đăng bài thử]  [Đổi blog]  [Ngắt kết nối]        │
└─────────────────────────────────────────────────────┘

Khi chưa kết nối:
┌──────────────────────────────────────────┐
│  Shop domain: [mystore.myshopify.com  ]  │
│              [ Kết nối Shopify → ]       │
└──────────────────────────────────────────┘
```

## Bảo mật (bắt buộc)
1. **HMAC verification** ở callback + webhook (constant-time compare) — Shopify gửi `hmac` query param và `X-Shopify-Hmac-Sha256` header
2. **Shop domain validation**: regex `^[a-z0-9][a-z0-9-]*\.myshopify\.com$`, reject mọi domain khác
3. **State nonce**: random 24 bytes, lưu trong `oauth_pending_states`, TTL 15 phút, single-use
4. **Token encryption**: AES-256-GCM qua `_shared/crypto.ts` (đã production cho Bluesky/Facebook)
5. **Scope verification**: sau exchange, check `scope` field trong response = scope đã request, nếu thiếu → reject
6. **RLS**: `social_connections` đã có RLS theo `organization_id` + `brand_template_id`
7. **GDPR webhooks** (Shopify yêu cầu cho App Store, optional Phase 3.5): `customers/data_request`, `customers/redact`, `shop/redact` — chỉ cần endpoint trả 200 nếu chưa có data

## Memory
Tạo `mem://integrations/social/shopify-oauth-vn.md` ghi:
- Public App OAuth pattern, HMAC verify
- Token offline (no refresh)
- Webhook app/uninstalled cleanup
- Scopes: `read_content + write_content + read_products`

## Estimate
| Phase | Effort | Output |
|---|---|---|
| 1. OAuth + Connect | 1 ngày | Merchant connect được store, token encrypted, hiện trong Connections tab |
| 2. Publish blog | 4-6h | Generate blog xong → 1-click publish vào Shopify, lấy được published_url |
| 3. Lifecycle + webhook | 3-4h | App uninstall auto-cleanup, ReconnectBanner khi token revoked |
| **Total** | **~2 ngày** | Production-ready Shopify blog publishing |

## Out of scope (có thể làm sau)
- Sync products vào Flowa để generate caption (cần `read_products` extended + UI Product Picker)
- Customer/order analytics dashboard
- Auto-publish image-based content vào Shopify Pages (không phải Blog)
- App Store submission (cần GDPR webhooks + privacy policy page)

## Bắt đầu Phase 1?
Sau khi bạn confirm, tôi sẽ:
1. Yêu cầu 2 secrets `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`
2. Code đầy đủ Phase 1 trong 1 turn
3. Hướng dẫn bạn test với development store
