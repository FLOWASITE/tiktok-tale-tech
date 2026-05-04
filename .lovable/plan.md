## Vấn đề

3/4 publisher long-form đã trả `postUrl` từ API thật, nhưng channel-publisher chỉ dùng URL đó để gửi Telegram — **không lưu xuống DB**:

| Publisher | Trả `postUrl` | Nguồn |
|---|---|---|
| `publish-blogger` | ✅ | `postData.url` (Blogger API) |
| `publish-wordpress` | ✅ | `post.link` (self-hosted) hoặc `post.URL` (.com) |
| `publish-website` | ✅ | `result.link \|\| result.url` (WP/Wix/Shopify/NukeViet) |
| `publish-blog` | ✅ | `/blog/${slug}` (internal flowa.vn) |

`multi_channel_contents` chỉ có `bluesky_post_url` + `pinterest_post_url`. `publish_attempts` có sẵn `external_post_url` & `external_post_id` nhưng channel-publisher chưa insert record nào.

→ Hệ quả: 1 bài website đã publish, URL = trống ⇒ Internal Links không bao giờ có link để chèn.

## Mục tiêu

Sau mỗi lần publish thành công, **lưu cả URL và post ID** thực tế vào 2 nơi:
1. Cột mới trên `multi_channel_contents` (1 URL "mới nhất" mỗi kênh — dùng cho UI và Internal Links)
2. Bảng `publish_attempts` (lịch sử đầy đủ — dùng cho audit/replay)

## Thay đổi DB (migration)

Thêm vào `multi_channel_contents`:

```sql
ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS website_post_url   text,
  ADD COLUMN IF NOT EXISTS website_post_id    text,
  ADD COLUMN IF NOT EXISTS blogger_post_url   text,
  ADD COLUMN IF NOT EXISTS blogger_post_id    text,
  ADD COLUMN IF NOT EXISTS wordpress_post_url text,
  ADD COLUMN IF NOT EXISTS wordpress_post_id  text,
  ADD COLUMN IF NOT EXISTS flowa_blog_post_url text,
  ADD COLUMN IF NOT EXISTS flowa_blog_post_id  text;

CREATE INDEX IF NOT EXISTS idx_mcc_has_published_url
  ON public.multi_channel_contents (organization_id)
  WHERE website_post_url IS NOT NULL
     OR blogger_post_url IS NOT NULL
     OR wordpress_post_url IS NOT NULL
     OR flowa_blog_post_url IS NOT NULL;
```

(Pinterest/Bluesky đã có cột riêng nên giữ nguyên.)

## Thay đổi code

### `supabase/functions/channel-publisher/index.ts`

Trong block `if (isSuccess)` (~line 270), bổ sung 2 việc:

**1. Map action → cặp cột URL/ID** rồi update `multi_channel_contents`:

```ts
const URL_COLUMN_MAP: Record<string, { url: string; id: string }> = {
  website:     { url: 'website_post_url',    id: 'website_post_id' },
  blogger:     { url: 'blogger_post_url',    id: 'blogger_post_id' },
  wordpress:   { url: 'wordpress_post_url',  id: 'wordpress_post_id' },
  blog:        { url: 'flowa_blog_post_url', id: 'flowa_blog_post_id' },
  flowa_blog:  { url: 'flowa_blog_post_url', id: 'flowa_blog_post_id' },
  pinterest:   { url: 'pinterest_post_url',  id: 'pinterest_post_id' },
  bluesky:     { url: 'bluesky_post_url',    id: 'bluesky_post_id' },
};

const postUrl = (parsedResponse?.postUrl as string) || (parsedResponse?.data as any)?.postUrl;
const postId  = (parsedResponse?.postId  as string) || (parsedResponse?.data as any)?.postId;

const cols = URL_COLUMN_MAP[action];
if (cols && (postUrl || postId)) {
  const patch: Record<string, unknown> = { status: newStatus, channel_statuses };
  if (postUrl) patch[cols.url] = postUrl;
  if (postId)  patch[cols.id]  = postId;
  await supabase.from('multi_channel_contents').update(patch).eq('id', contentId);
}
```

**2. Insert `publish_attempts` (success + failure)** — phục vụ audit:

```ts
await supabase.from('publish_attempts').insert({
  content_id: contentId,
  organization_id: contentRow?.organization_id,
  connection_id: finalPayload.connectionId ?? null,
  platform: action,
  channel: ACTION_TO_CHANNEL[action] ?? action,
  status: isSuccess ? 'success' : 'failed',
  external_post_id: postId ?? null,
  external_post_url: postUrl ?? null,
  error_message: isSuccess ? null : (parsedResponse?.error as string) ?? `HTTP ${response.status}`,
  response_payload: parsedResponse,
  completed_at: new Date().toISOString(),
});
```

### `publish-blog/index.ts`

Đổi `postUrl` từ relative `/blog/${slug}` thành absolute, để Internal Links từ kênh khác trỏ về được:

```ts
postUrl: `https://flowa.one/blog/${data.slug}`,
```

(domain đọc từ env `PUBLIC_BLOG_DOMAIN`, fallback `https://flowa.one`.)

### `EmbeddingBackfillCard.tsx` + `backfill-content-embeddings`

Đổi filter "đếm bài cần embed" thành **chỉ những bài có ít nhất 1 URL đã publish**:

```ts
.or(
  'website_post_url.not.is.null,' +
  'blogger_post_url.not.is.null,' +
  'wordpress_post_url.not.is.null,' +
  'flowa_blog_post_url.not.is.null'
)
```

UI hiển thị: `"X / Y bài đã publish có index"` thay vì `"0 / 577"`.

### `InternalLinksPanel.tsx`

Khi suggest, query joined URL:

```ts
.select('id, title, website_post_url, blogger_post_url, wordpress_post_url, flowa_blog_post_url')
```

Trả `{ title, url, similarity }` với `url = website_post_url ?? blogger_post_url ?? wordpress_post_url ?? flowa_blog_post_url`. Bài nào không có URL nào → loại khỏi suggestion.

### `SeoInsightsSheet.tsx`

Tab "Liên kết" chỉ enable khi article hiện tại có ít nhất 1 URL công khai (để user hiểu: phải publish trước mới có URL chèn).

## Backfill bài cũ (one-shot, optional)

Có thể chạy script đọc `publishing_logs`/`publish_attempts` cũ (nếu có data) để bơm URL cho bài đã publish trước migration. Nếu không có log cũ → để trống, các bài publish mới sẽ tự động có URL từ giờ.

## Kết quả

- Publish 1 bài WordPress → URL thật xuất hiện ngay trong DB → Internal Links có thể trỏ đến
- Có lịch sử `publish_attempts` đầy đủ để debug khi user hỏi "bài này đăng ở đâu"
- Backfill embedding chỉ chạy trên bài có URL → tiết kiệm quota, đúng mục đích
