## Mục tiêu
Bổ sung **Shopify Blog** như long-form channel thứ 4 (cùng Website, Blogger, WordPress) cho hệ thống "đăng nội dung đa kênh", để user có thể chọn Shopify khi generate + publish trực tiếp lên Shopify Blog.

Hiện trạng:
- ✅ OAuth Shopify, `publish-shopify-blog`, `test-shopify-connection`, `test-shopify-credentials` đã có
- ✅ `social_connections` đã hỗ trợ platform `shopify`
- ❌ Shopify CHƯA xuất hiện trong picker channel multichannel
- ❌ `generate-multichannel` chưa sinh `shopify_content`
- ❌ `channel-publisher` chưa route `shopify` → `publish-shopify-blog`
- ❌ Chưa có cột `shopify_content / shopify_post_url / shopify_post_id` trong `multi_channel_contents`

## Phạm vi (5 việc)

### 1. Migration DB — thêm 3 cột long-form Shopify
- `multi_channel_contents.shopify_content text`
- `multi_channel_contents.shopify_post_url text`
- `multi_channel_contents.shopify_post_id text`
- `shopify_seo_data jsonb` (parity với blogger/wordpress)

### 2. Generate-multichannel — Shopify như long-form channel
- Thêm `'shopify'` vào `LONG_FORM_CHANNELS` / `SELECT` columns / mapping `channel → column` (`shopify: 'shopify_content'`)
- Prompt rule: 800–1500 từ, e-commerce friendly, HTML-ready (Shopify blog dùng HTML), CTA hướng product, có featured image cue, KHÁC Website/Blogger/WordPress (tone: thương mại + storytelling sản phẩm)
- Strip SEO meta giống `wpEx.stripped` pattern, save `shopify_content` + `shopify_seo_data`

### 3. Channel-publisher routing
- Thêm `shopify: 'publish-shopify-blog'` vào `PLATFORM_FUNCTION_MAP`
- Thêm `shopify: { url: 'shopify_post_url', id: 'shopify_post_id' }` vào `URL_COLUMN_MAP`
- Thêm `shopify: 'shopify'` vào `ACTION_TO_CHANNEL`

### 4. Frontend — UI picker + types
- `src/types/multichannel.ts`:
  - Thêm `'shopify'` vào ChannelKey union (sau `wordpress`)
  - Thêm `shopify_content / shopify_post_url / shopify_post_id / shopify_seo_data` vào interface
  - Thêm entry vào `CHANNEL_OPTIONS`: `{ value: 'shopify', label: 'Shopify Blog', icon: 'ShoppingBag', color: 'shopify', category: 'text', description: 'Bài Shopify Blog 800-1500 từ, e-commerce, HTML-ready, CTA product' }`
- `src/utils/channelColors.ts`: thêm `shopify: { ... color #96bf48 ... }`
- `src/components/multichannel/ChannelGroupView.tsx`: thêm `shopify` vào danh sách text channels (dòng 64) — KHÔNG map về `'website'` (Shopify là channel độc lập, theo memory `longform-channel-separation-vn`)
- `ChannelIcon.tsx`: đã có entry `shopify` (line 130) — verify dùng `ShoppingBag` icon

### 5. Mockup + Direct publish
- `src/components/multichannel/` — nếu có `WebsiteMockup/BloggerMockup/WordPressMockup` thì tạo `ShopifyMockup` hiển thị giống storefront blog post (header shop name + blog post layout). Routing qua `channelToMockupType`
- `useDirectPublish.ts`: Shopify dùng `blogData` payload (đã có sẵn pattern `articleData/blogData`) → `channel-publisher` action `'shopify'` với `{ connectionId, content, title, tags, featuredImageUrl, ...blogData }`. Không cần code mới, chỉ verify payload mapping.

## Technical notes

**Channel separation rule (memory):** Shopify là channel long-form ĐỘC LẬP, không collapse vào `website`. Mỗi channel có cột DB riêng + prompt riêng + length riêng — giống Blogger/WordPress đã tách trước đây.

**Prompt differentiation:** để AI không sinh trùng giữa 4 long-form channels:
- Website: corporate SEO 1000-2000 từ
- Blogger: casual storytelling 500-900 từ
- WordPress: in-depth expert 1200-2200 từ
- **Shopify: e-commerce product story 800-1500 từ, HTML-ready, mỗi đoạn ≤80 từ, CTA "Shop now / Khám phá BST", featured image suggestion**

**Publish payload:** `publish-shopify-blog` đã nhận `{ connectionId, content, title, tags, featuredImageUrl, blogId, isDraft, summary, author }` → channel-publisher chỉ cần forward, không cần shape lại.

**Memory update sau implement:** cập nhật `mem://features/multichannel/longform-channel-separation-vn` từ "3 long-form" → "4 long-form (Website/Blogger/WordPress/Shopify)".

## Files sẽ thay đổi
- `supabase/migrations/<new>.sql` (3 cột)
- `supabase/functions/generate-multichannel/index.ts` (mapping + prompt)
- `supabase/functions/channel-publisher/index.ts` (3 maps)
- `src/types/multichannel.ts`
- `src/utils/channelColors.ts`
- `src/components/multichannel/ChannelGroupView.tsx`
- (optional) `src/components/multichannel/ShopifyMockup.tsx` + routing

## Out of scope
- Sync products / collections (chỉ Blog post)
- Shopify storefront customization
- Multi-blog selection UI (auto-pick first blog đã có sẵn fallback)
