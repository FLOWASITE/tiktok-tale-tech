## Vấn đề hiện tại

Lỗi mới không còn là OAuth token nữa, mà là database constraint:

```text
new row for relation "social_connections" violates check constraint "social_connections_platform_check"
```

Mình đã kiểm tra constraint thực tế trong database. `social_connections_platform_check` hiện chỉ cho phép:

```text
twitter, facebook, instagram, linkedin, tiktok, threads, youtube,
zalo_oa, google_business, website, blogger, wordpress, wordpress_com, pinterest
```

Nhưng OAuth callback Bluesky đang insert:

```ts
platform: "bluesky"
```

Vì vậy database chặn row mới. Migration tạo Bluesky OAuth đã có logic dùng `platform = 'bluesky'`, nhưng chưa mở rộng check constraint để cho phép giá trị `bluesky`.

## Kế hoạch sửa

1. Tạo migration mới để cập nhật `social_connections_platform_check`
   - Drop constraint cũ.
   - Add lại constraint với đầy đủ platform hiện có, cộng thêm `bluesky`.
   - Không sửa migration cũ đã deploy.
   - Không thay đổi dữ liệu hiện tại.

2. Giữ nguyên code OAuth callback hiện tại
   - `supabase/functions/bluesky-oauth-callback/index.ts` đang ghi `platform: "bluesky"`, đúng với các phần publish/query khác.
   - `channel-publisher/resolve-social-payload.ts` cũng đang tìm `dbPlatform: 'bluesky'`, nên đổi code sang platform khác sẽ gây lỗi dây chuyền.

3. Kiểm tra nhanh sau migration
   - Query lại constraint để xác nhận `bluesky` đã nằm trong allowed list.
   - Không cần thêm cột mới, không cần sửa RLS.

## Migration dự kiến

```sql
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_platform_check;

ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform = ANY (ARRAY[
    'twitter'::text,
    'facebook'::text,
    'instagram'::text,
    'linkedin'::text,
    'tiktok'::text,
    'threads'::text,
    'youtube'::text,
    'zalo_oa'::text,
    'google_business'::text,
    'website'::text,
    'blogger'::text,
    'wordpress'::text,
    'wordpress_com'::text,
    'pinterest'::text,
    'bluesky'::text
  ]));
```

Sau khi áp dụng, kết nối Bluesky sẽ không còn bị database chặn bởi platform check constraint.