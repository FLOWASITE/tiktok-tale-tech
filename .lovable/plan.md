

# Sửa lỗi "Đăng Website thất bại: Unauthorized" trên Telegram

## Nguyên nhân (đã verify trong code)

`telegram-webhook` (line 4324-4335) khi user bấm **"🚀 Đăng ngay"** cho channel `website` gọi `channel-publisher` chỉ với:
```ts
body: { action: "website", contentId, content_id: contentId, channel: "website" }
```
`channel-publisher` forward sang `publish-website`. Nhưng `publish-website` (line 54-82):

1. **Auth fail** → đọc `Authorization: Bearer <service_role_key>`, gọi `supabase.auth.getUser(token)`. Service-role JWT không có `sub` claim → trả `Unauthorized` (đúng error user thấy: `❌ Đăng Website thất bại: Unauthorized`).
2. **Payload thiếu** → kể cả nếu auth pass, `publish-website` yêu cầu `connectionId`, `title`, `content` (line 80-82). `channel-publisher` chỉ forward `{contentId, channel}` → sẽ fail validation.

So sánh: flow web `useDirectPublish.publishToBlog` gửi đầy đủ `connectionId, title, content, excerpt, slug, mediaUrls, …` từ frontend. Telegram không có frontend này → cần resolve dữ liệu **server-side** trước khi gọi `publish-website`.

## Fix

### 1. `supabase/functions/publish-website/index.ts` — chấp nhận internal call

Thêm bypass auth cho service-role giống `publish-facebook` (line 179-182):

```ts
const token = authHeader.replace('Bearer ', '');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const isInternalCall = !!serviceRoleKey && token === serviceRoleKey;

if (!isInternalCall) {
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw new Error('Unauthorized');
}
```

Tương tự apply cho các publisher khác mà Telegram gọi nhưng chưa có internal-call bypass: `publish-blog`, `publish-threads`, `publish-zalo`, `publish-google-business`. (Đây là gốc rễ chung — Telegram → channel-publisher → publish-* dùng service role.)

### 2. `supabase/functions/channel-publisher/index.ts` — resolve content + connection cho website/blog khi payload thiếu

Khi action ∈ `{website, blog, flowa_blog}` và body thiếu `connectionId`/`title`/`content`, channel-publisher tự load từ DB:

```ts
if (['website', 'blog', 'flowa_blog'].includes(action) && contentId && !payload.connectionId) {
  const supabase = getServiceClient();

  // Load multi_channel_contents
  const { data: mcc } = await supabase
    .from('multi_channel_contents')
    .select('title, website_content, organization_id, brand_template_id, featured_image_url, seo_data')
    .eq('id', contentId)
    .maybeSingle();

  if (!mcc?.website_content) {
    return new Response(JSON.stringify({
      success: false, error: 'Content not found or missing website body',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Resolve active website connection (filter by brand if available)
  let connQuery = supabase
    .from('social_connections')
    .select('id')
    .eq('platform', 'website')
    .eq('is_active', true)
    .eq('organization_id', mcc.organization_id);
  if (mcc.brand_template_id) connQuery = connQuery.eq('brand_template_id', mcc.brand_template_id);
  const { data: conn } = await connQuery.maybeSingle();

  if (!conn?.id) {
    return new Response(JSON.stringify({
      success: false, error: 'Chưa kết nối website cho brand này',
      errorCode: 'NO_CONNECTION',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Inject required fields
  finalPayload = {
    ...finalPayload,
    connectionId: conn.id,
    title: mcc.title,
    content: mcc.website_content,
    featuredImageUrl: mcc.featured_image_url ?? undefined,
    seoData: mcc.seo_data ?? undefined,
    status: 'publish',
  };
}
```

→ Telegram chỉ cần truyền `{action, contentId, channel}` như hiện tại; channel-publisher tự "fatten" payload trước khi forward.

### 3. (Nice-to-have) `telegram-webhook` line 4360 — mở rộng `pubIsTokenExpiredError`

Khi `publish-website` trả `NO_CONNECTION` (chưa kết nối), Telegram nên show nút "Kết nối website" → deeplink `app.flowa.one/connections?platform=website&brand=<id>` thay vì error generic. Update:

```ts
if (pubIsTokenExpiredError(errMsg) || /no_connection|chưa kết nối/i.test(errMsg)) { ... }
```

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/publish-website/index.ts` | Bypass `getUser()` khi token === SERVICE_ROLE_KEY (internal call từ channel-publisher). |
| `supabase/functions/publish-blog/index.ts` | Bypass tương tự. |
| `supabase/functions/publish-threads/index.ts` | Bypass tương tự. |
| `supabase/functions/publish-zalo/index.ts` | Bypass tương tự. |
| `supabase/functions/publish-google-business/index.ts` | Bypass tương tự. |
| `supabase/functions/channel-publisher/index.ts` | Khi action ∈ {website,blog,flowa_blog} và payload thiếu, query `multi_channel_contents` + `social_connections` để bổ sung `connectionId/title/content/featuredImageUrl/seoData`. Trả `NO_CONNECTION` khi chưa có connection. |
| `supabase/functions/telegram-webhook/index.ts` | Mở rộng nhận diện `NO_CONNECTION` để hiện CTA "Kết nối lại" cho channel `website`. |

## Test sau khi fix

1. Trên Telegram → tạo bài Website nhanh → bấm "🚀 Đăng ngay" → bài lên đúng WordPress (hoặc trả lỗi NO_CONNECTION + nút kết nối nếu chưa).
2. Manual web flow `useDirectPublish.publishToBlog` không bị ảnh hưởng (vẫn truyền đầy đủ payload, không trigger nhánh resolve).
3. Mini App Telegram (`PostsTab`, `QuickPostTab`) cũng hết lỗi vì cùng pattern `{action, contentId, channel}`.

## Ngoài phạm vi

- Không refactor toàn bộ publishers thành "internal-call aware" cùng lúc — chỉ 5 publisher Telegram đang dùng.
- Không thay đổi flow OAuth website / WordPress credentials.
- Không sửa logic backlink sequential publishing.

## Rủi ro

Thấp. Bypass chỉ active khi token === SERVICE_ROLE_KEY (chỉ edge function trong cùng Supabase project mới có key này — không thể spoof từ client). Resolve fallback trong channel-publisher chỉ chạy khi `connectionId` thiếu → không phá flow web hiện tại.

