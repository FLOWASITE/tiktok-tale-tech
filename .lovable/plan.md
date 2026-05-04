## Mục tiêu

Thêm trang **"Backlinks / Link đã publish"** vào SEO Hub → tab **Track**, giúp user xem & quản lý toàn bộ URL bài đã publish lên các kênh social/website (Facebook, X, WordPress, Blogger, LinkedIn, IG, TikTok, Threads, Zalo, Website…) — dùng cho SEO off-page (audit backlink, copy link, kiểm tra trạng thái).

## Nguồn dữ liệu

Table `publish_attempts` (đã có sẵn):
- `external_post_url`, `external_post_id`, `platform`, `channel`, `status`
- `content_id` → join `multi_channel_contents`/`topics` để lấy tiêu đề & focus keyword
- `attempted_at`, `completed_at`, `organization_id` (RLS)

Hiện DB có 47 URLs (35 FB + 12 X). Sẽ tự động grow khi user publish thêm.

## Thiết kế

### 1. Sub-tab mới trong Track

`TrackWorkspace.tsx` → thêm sub-tab thứ 3: **"Backlinks"** (icon `Link2`):
```
Track ▸ [Sức khoẻ] [Backlinks] [Rank tracker]
```
URL: `/admin/seo?tab=track&sub=backlinks` (và bản user `/seo?tab=track&sub=backlinks`).

### 2. Component `BacklinksTab.tsx` (mới, `src/components/admin/seo-keywords/`)

**Layout:**
- **KPI strip** (4 thẻ): Tổng link · Theo platform (mini-chart) · 7 ngày qua · Lỗi / chờ retry
- **Filter bar:** search URL/title · select platform · select status · date-range · select brand
- **Bảng** (sortable):

  | Title (link tới content) | Platform (icon+badge) | URL (truncate + copy + open) | Trạng thái | Ngày publish | Actions |

  Actions: Copy URL · Open · Re-check (HEAD request → 200/404) · Xem chi tiết (Sheet hiển thị payload + error)

- **Bulk actions:** Export CSV (cho disavow/báo cáo backlink), Copy tất cả URL
- **Pagination** server-side (50/trang)

### 3. Hook `useBacklinks.ts`

TanStack Query, query `publish_attempts` join `multi_channel_contents` (title, focus_keyword, topic_id), filter theo `organization_id` (BrandContext), trả paginated.

### 4. Re-check status (optional, nice-to-have)

Edge function mới `check-backlink-status` (Deno): nhận mảng URL → fetch HEAD → trả `{url, status, redirectTo}`. Update cache local (không persist DB). Rate-limit 20 URL/lần.

### 5. Export CSV

Client-side: `Title, Platform, URL, Status, PublishedAt, FocusKeyword` → tải về.

## Files

**Tạo:**
- `src/components/admin/seo-keywords/BacklinksTab.tsx`
- `src/components/admin/seo-keywords/BacklinksFilters.tsx`
- `src/components/admin/seo-keywords/BacklinkDetailSheet.tsx`
- `src/hooks/useBacklinks.ts`
- `supabase/functions/check-backlink-status/index.ts` (+ entry trong `config.toml`, `verify_jwt = true`)

**Sửa:**
- `src/components/admin/seo-hub/TrackWorkspace.tsx` — thêm sub-tab "backlinks"
- `src/pages/SeoHub.tsx` — extend `LEGACY_MAP` (nếu cần alias `backlinks`/`links`)
- `.lovable/memory/features/seo/hub-ia-v2-vn.md` — update sub-tab list của Track

## Quyền & isolation

- RLS sẵn có theo `organization_id` (tự động).
- User thường thấy backlinks của workspace; admin route (`/admin/seo`) thấy giống user (data không cross-org).

## Edge cases

- `external_post_url` NULL → loại khỏi list (chỉ hiện success + có URL).
- Platform `website/blogger/wordpress` → URL có thể là canonical bài blog → highlight badge "Long-form" (giá trị SEO cao).
- Content bị xoá → vẫn hiển thị URL với title "(deleted content)".
- Re-check status: timeout 5s/url, fail-open (hiển thị "unknown").

## Out of scope (lần này)

- Không tự crawl backlink bên ngoài (Ahrefs-style).
- Không track anchor text / DR — chỉ owned backlinks (link mình tự publish).
- Không tích hợp Google Search Console (để pha sau).
