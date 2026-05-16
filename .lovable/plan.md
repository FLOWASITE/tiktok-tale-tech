## Nguyên nhân

`useMultiChannelContents.fetchContents` đang chạy `SELECT *` trên `multi_channel_contents` — bảng có **81 cột**, bao gồm những cột rất nặng:

- `content_embedding` (vector 384-dim) — PostgREST serialize thành chuỗi JSON ~6-8KB/row
- `critique_details`, `global_hook`, `hook_evaluations`, `*_seo_data` (jsonb lớn)
- 18+ cột `*_content` (mỗi long-form 5-15KB)

Với 717 row trong DB (org hiện tại), payload trả về có thể lên 6-10MB, cộng vector serialization → chậm/timeout/network error trên mobile (Galaxy Fold đang dùng), đúng như session replay show skeleton mãi rồi báo lỗi.

## Giải pháp: 2-tier loading

**Tier 1 — Danh sách (sidebar):** chỉ select những cột cần để render row trong list

**Tier 2 — Chi tiết (viewer):** khi user click 1 item, fetch full row bằng `id`

### Thay đổi

**1. `src/hooks/useMultiChannelContents.ts`**

- `fetchContents()` đổi `select('*')` → explicit list cột nhẹ:
  ```
  id, title, topic, industry, content_goal, selected_channels,
  brand_template_id, brand_name, primary_color,
  channel_images, channel_statuses, tags, status, priority, deadline,
  campaign_id, user_id, core_content_id, content_role, content_angle,
  critique_score, was_refined, refinement_count,
  cluster_id, pillar_id, target_keyword_ids,
  website_post_url, blogger_post_url, wordpress_post_url,
  shopify_post_url, wix_post_url, medium_post_url, pinterest_post_url, bluesky_post_url,
  created_at, updated_at
  ```
  → loại bỏ tất cả `*_content`, `*_seo_data`, `content_embedding`, `critique_details`, `global_hook`, `hook_evaluations`, `selected_hooks`.

- `transformContent` cho phép các cột content `undefined` (xử lý như chưa load), giữ nguyên type signature.

- Thêm hàm mới `fetchContentDetail(id)` → `select('*')` cho 1 row, dùng để hydrate khi user mở viewer.

- Thêm `.limit(500)` làm safety net (717 row đã sát giới hạn PostgREST 1000 mặc định).

- Tăng timeout/abort signal 15s cho fetchContents để fail nhanh hơn thay vì spinner mãi.

**2. `src/components/MultiChannelViewer.tsx` (hoặc nơi consume)**

- Khi `setSelectedChannel`/mở 1 content, nếu content thiếu các field `*_content` thì gọi `fetchContentDetail(id)` để load đầy đủ rồi merge vào state.
- Add tiny loading state trong viewer khi đang hydrate.

**3. Thông báo lỗi rõ hơn**

- Trong `catch` của `fetchContents`: log cụ thể `error.code` (timeout vs network vs RLS), hiển thị toast với nút "Thử lại" gọi lại `fetchContents`.

### Tác động

- Payload list giảm từ ~6-10MB → ~200-400KB (giảm ~95%)
- Hết timeout/network error trên mobile
- Viewer load chi tiết on-demand (mất thêm ~200ms khi click 1 item, chấp nhận được)
- Không đổi schema DB, không cần migration

### Không làm

- Không thay đổi logic generate/regenerate/save
- Không đổi RLS hay backend
- Không thêm tính năng mới