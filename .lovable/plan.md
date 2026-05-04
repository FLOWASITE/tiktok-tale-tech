## Mục tiêu

Gộp **Internal Links** (đã có `InternalLinksPanel.tsx`) và **Backlinks** (vừa làm `BacklinksTab.tsx`) thành **1 sub-tab "Liên kết"** trong SEO Hub ▸ Track. Đây là trung tâm quản lý link equity của workspace.

## Cấu trúc mới

```
SEO Hub ▸ Track
├─ Sức khoẻ
├─ Liên kết       ← MỚI (gộp 2 thứ)
│  ├─ [Backlinks]  (default — owned external links từ social → blog)
│  └─ [Internal]   (link giữa các bài blog cùng cluster)
└─ Rank tracker
```

URL: `/seo?tab=track&sub=links` (default `view=backlinks`); secondary param `&view=internal`.

## Component mới: `LinksWorkspace.tsx`

`src/components/admin/seo-keywords/LinksWorkspace.tsx`:

- **Header bar**: tiêu đề + 2 segmented toggle (Backlinks / Internal) + KPI strip dùng chung 4 thẻ:
  - Owned backlinks (từ stats hiện tại)
  - Internal links (đếm từ `internal_links` hoặc bảng tương đương)
  - Long-form pages có ≥3 backlinks (bài "khoẻ")
  - Bài thiếu link (≤1 internal in + 0 backlink — cần action)

- **Body**: switch theo segmented:
  - `backlinks` → render `<BacklinksTab />` (tái dùng nguyên)
  - `internal` → render mới `<InternalLinksOverview />` — bảng các bài blog với cột: Title · Internal in · Internal out · Backlinks · Cluster · Action (mở `InternalLinksPanel` cho bài đó trong sheet)

- **Cross-link**: trong `BacklinksTab`, click vào row long-form → mở sheet hiện cả internal links của bài đó (thêm 1 section "Internal links to this page" trong `BacklinkDetailSheet`).

## File changes

**Tạo:**
- `src/components/admin/seo-keywords/LinksWorkspace.tsx` — segmented container + KPI chung
- `src/components/admin/seo-keywords/InternalLinksOverview.tsx` — bảng tổng quan internal links toàn workspace
- `src/hooks/useInternalLinksOverview.ts` — fetch internal links graph (dùng bảng/view sẵn có; nếu chưa có, query từ `multi_channel_contents.website_content` parse `<a href>` hoặc bảng `internal_links` nếu tồn tại)

**Sửa:**
- `src/components/admin/seo-hub/TrackWorkspace.tsx` — đổi sub-tab "Backlinks" thành "Liên kết" (icon `Link2`), value `links`, render `<LinksWorkspace />`
- `src/pages/SeoHub.tsx` — `LEGACY_MAP`: thêm `backlinks → track/links?view=backlinks`, `internal → track/links?view=internal`
- `src/components/admin/seo-keywords/BacklinkDetailSheet.tsx` — thêm section "Internal links" cho long-form URLs
- `.lovable/memory/features/seo/hub-ia-v2-vn.md` — update sub-tab list

## Data discovery (làm trước khi code)

Kiểm tra bảng/view internal links hiện có:
- Tìm `internal_links`, `internal_link_suggestions`, hoặc `linksuggestions`
- Xem `InternalLinksPanel.tsx` đang fetch từ đâu để tái dùng cùng nguồn
- Nếu chỉ có per-content suggestions (chưa có graph), fallback: query `multi_channel_contents` join với link map qua content embeddings + cluster.

## Out of scope

- Không tạo bảng mới — chỉ gộp UI và đọc data sẵn có
- Không build link graph visualizer (để pha sau)
- Không thêm rel="nofollow" / anchor analyzer
