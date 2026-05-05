# External Link Pool — Backlink & Internal Link

Mục tiêu: Mở rộng tab Backlinks (hiện chỉ hiện URL Flowa đã publish) thành **pool nguồn link** kéo từ chính website của user (kể cả bài đăng thủ công), dùng làm:
- Nguồn **backlink** chèn từ social/blog Flowa về site mục tiêu.
- Nguồn **internal link** giữa các bài long-form trong cùng domain.
- Đầu vào cho **AI suggest** internal link khi soạn content.

## 1. Database

Migration tạo bảng mới `external_link_sources`:

| Column | Type | Note |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid | RLS isolation |
| brand_template_id | uuid | nullable, ràng buộc theo brand |
| source_type | text | `wordpress` / `blogger` / `wordpress_com` / `sitemap` / `manual` |
| source_ref_id | text | id connection (social_connections.id) hoặc domain |
| domain | text | host chuẩn hoá |
| url | text | URL đầy đủ (unique trong org+url) |
| title | text | |
| excerpt | text | nullable |
| keywords | text[] | extract từ title + slug để match |
| published_at | timestamptz | |
| last_synced_at | timestamptz | |
| status | text | `active` / `archived` |
| metadata | jsonb | tags, category, image, raw |

RLS: org members CRUD. Index `(organization_id, domain)`, GIN trên `keywords`, full-text trên `title`.

## 2. Edge function `sync-external-links`

Một function gateway cho mọi nguồn:

- Input: `{ connectionId?: string, sitemapUrl?: string, brandTemplateId?: string }`
- Routing theo `social_connections.platform`:
  - `wordpress` → REST `/{site}/wp-json/wp/v2/posts?per_page=100&_fields=id,link,title,excerpt,date,slug,categories` (Application Password đã lưu trong connection).
  - `wordpress_com` → connector gateway `/wordpress_com/rest/v1.1/sites/{siteId}/posts?number=100`.
  - `blogger` → Google Blogger API `/blogger/v3/blogs/{blogId}/posts?maxResults=500` (OAuth refresh sẵn có).
  - `website` (NukeViet/custom) hoặc `sitemapUrl` → fetch `sitemap.xml`/`sitemap_index.xml`, parse `<loc>` + `<lastmod>`, optional fetch HTML để lấy `<title>` cho 50 URL đầu (giới hạn).
- Pagination: loop đến 5 trang hoặc tối đa 1000 URL/lần sync.
- Upsert theo `(organization_id, url)`. Đánh `last_synced_at = now()`.
- Trả `{ inserted, updated, total }`.

## 3. Cron sync

`pg_cron` chạy `sync-external-links` cho mỗi connection long-form mỗi 24h (giờ thấp tải, lệch ngẫu nhiên). Manual "Sync ngay" nút trên UI cho on-demand.

## 4. Hook + UI

### `src/hooks/useExternalLinks.ts`
- `useExternalLinks(filter)` — list pagination, filter theo domain/source_type/keyword search.
- `useExternalLinkStats()` — count theo source_type, domain.
- `useSyncExternalLinks()` — mutation gọi edge function.

### Sub-tab mới trong **LinksWorkspace** (`/seo?tab=track&sub=links`)

`view=external` (cùng cấp `view=backlinks`):

- KPI strip: tổng URL pool · domains · last sync.
- Toolbar: Source select (All/WordPress/Blogger/Sitemap), domain filter, search.
- Table: Title · Domain · Source · Published · Last synced · [Open] [Copy URL] [Insert →].
- Header có dropdown **"Sync from..."**: list các long-form connection đang active + ô **"Sitemap URL..."** cho generic site.

### Component `ExternalLinkPicker.tsx` (reusable)
Dialog/Popover dùng trong:
- `BlogPostMultiChannel` editor (nút "Chèn link nội bộ").
- `MultiChannelCreate` cho long-form.
Trả `{ url, title, anchor }`. Hỗ trợ search-as-you-type, lọc theo domain hiện tại (cho internal) hoặc khác domain (cho backlink).

## 5. AI Internal Link Suggester

Edge function `suggest-internal-links`:

- Input: `{ contentId | draftText, organizationId, brandTemplateId, mode: 'internal'|'backlink' }`.
- Lấy 200 candidate URLs từ pool (filter theo cùng domain cho internal), build text `title + keywords` → cosine similarity với `gte-small` embedding của draft.
- Trả top-5 `{ url, title, score, suggestedAnchor }`. AI sinh anchor text tự nhiên theo Vietnamese context (Lovable Gateway Gemini Flash).
- UI: hiển thị card "Gợi ý link" trong sidebar editor; click "Chèn" → insert markdown `[anchor](url)`.

## 6. Files

```
supabase/migrations/<ts>_external_link_sources.sql       (mới)
supabase/functions/sync-external-links/index.ts          (mới)
supabase/functions/suggest-internal-links/index.ts       (mới)
supabase/config.toml                                      (đăng ký 2 fn)

src/hooks/useExternalLinks.ts                             (mới)
src/components/admin/seo-keywords/ExternalLinksTab.tsx    (mới)
src/components/admin/seo-keywords/ExternalLinkPicker.tsx  (mới, reusable)
src/components/admin/seo-keywords/LinksWorkspace.tsx      (thêm sub-view "external")
src/components/seo/InternalLinkSuggestPanel.tsx           (mới, dùng trong long-form editor)
```

Tích hợp picker vào BlogPostMultiChannel/MultiChannelCreate ở bước follow-up sau khi base sync hoạt động.

## 7. Bảo mật & quota

- RLS strict theo `organization_id`.
- Sync giới hạn 1000 URL/lần, 1 sync/connection/giờ (chống spam).
- WordPress.org dùng Application Password đã encrypt trong `social_connections.metadata` (đã có sẵn cho publish-wordpress).
- Sitemap fetch: chỉ HTTPS, follow tối đa 3 sitemap_index, timeout 15s.

## Kết quả

User có 1 nơi duy nhất xem mọi URL trên các property của mình (Flowa-published + bài cũ trên WP/Blogger + bất kỳ site nào có sitemap), copy nhanh hoặc để AI tự gợi ý chèn internal/backlink khi viết bài mới.