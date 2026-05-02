## Vấn đề hiện tại

Pillar SEO (`seo_clusters`) và tab **Keywords** (`KeywordExplorerTab`) đang **rời rạc**:

- Tab **Keywords** chỉ hiển thị cột "Cluster" lấy từ bảng `keyword_clusters` cũ (grouping đơn thuần), KHÔNG phải Pillar (`seo_clusters`).
- Từ tab Keywords không có cách nào gán keyword vào Pillar — phải vào tab Pillars → mở từng pillar → "Thêm keyword".
- Filter trong Keywords tab cũng chỉ filter theo cluster cũ, không filter được theo Pillar.

## Mục tiêu

Cho phép user **gán / chuyển / lọc** keyword theo **Pillar (seo_clusters)** trực tiếp từ tab Keywords, đồng thời vẫn giữ được tab Pillars chi tiết như hiện tại.

## Thay đổi UI — `KeywordExplorerTab.tsx`

1. **Thêm cột "Pillar"** (sau cột "Cluster" cũ, hoặc thay thế tùy quyết định cuối):
   - Hiển thị tên + chấm màu pillar (`seo_clusters.color`).
   - Inline `Select` cho phép đổi pillar ngay trên row (giống cách đổi `status` đang làm) — gồm option "— Không pillar —" để gỡ.

2. **Thêm filter "Pillar"** ở thanh filter trên cùng, bên cạnh filter Cluster cũ:
   - Load danh sách `seo_clusters` của org.
   - Option "all" / "none" (chưa gán pillar) / từng pillar.

3. **Bulk action "Gán vào Pillar"**:
   - Thêm checkbox column ở mỗi row + checkbox header.
   - Khi có ≥1 row được chọn, hiện thanh action sticky: dropdown chọn pillar + nút "Gán" → update `cluster_id` (cột seo_clusters) của tất cả keyword đã chọn trong 1 query, sau đó gọi `refresh_cluster_status` RPC cho mỗi pillar bị ảnh hưởng (cũ + mới).

4. **Quick link** từ tên pillar trên row → set state mở `PillarDetailView` (cần lift state lên `AdminSeoHub` hoặc dùng query param `?pillar=<id>` để chuyển sang tab Pillars và auto-open). Phương án nhẹ: dùng query param và `PillarsTab` đọc nó để auto setActiveId.

## Schema check

`seo_keywords.cluster_id` đã reference cả `keyword_clusters` (cũ) **và** `seo_clusters` (mới)? Cần xác nhận:
- Nếu **dùng chung 1 cột `cluster_id`** cho 2 hệ → conflict, phải tách thành cột riêng (`pillar_cluster_id` hoặc tương tự).
- Nếu **đã có cột riêng cho pillar** (theo memory `seo_keywords.cluster_id` thuộc `seo_clusters`, còn `keyword_clusters` cũ join qua bảng khác) → dùng luôn.

→ Bước đầu sẽ `read_query` confirm. Nếu cần tách cột, tạo migration:
```sql
ALTER TABLE public.seo_keywords ADD COLUMN pillar_id uuid REFERENCES public.seo_clusters(id) ON DELETE SET NULL;
CREATE INDEX idx_seo_keywords_pillar_id ON public.seo_keywords(pillar_id);
-- backfill nếu cluster_id hiện đang trỏ vào seo_clusters
```
Đồng thời update `PillarDetailView`, `cluster_coverage` view, và `refresh_cluster_status` RPC để dùng cột mới.

## Backend tasks

- `refresh_cluster_status` RPC: gọi cho cả pillar cũ (bị remove keyword) và pillar mới sau bulk assign.
- Invalidate queries: `seo-keywords`, `seo-cluster-coverage`, `seo-cluster-keywords`, `seo-clusters`.

## Files dự kiến chỉnh sửa

- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` — thêm cột Pillar, filter, bulk action, checkbox.
- `src/components/admin/seo-keywords/PillarsTab.tsx` — đọc query param `?pillar=` để auto open detail.
- `src/pages/AdminSeoHub.tsx` — wire query param tab switch (nếu cần).
- `src/components/admin/seo-keywords/PillarDetailView.tsx` — refresh status sau remove keyword.
- (Tùy schema) `supabase/migrations/<ts>_pillar_id.sql` + types regenerate.

## Out of scope

- Không đụng `keyword_clusters` cũ (giữ nguyên grouping song song như memory đã lưu).
- Không đổi UX tab Pillars hiện tại — chỉ thêm entry point từ Keywords.
