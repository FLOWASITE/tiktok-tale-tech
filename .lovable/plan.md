# Phase 4 — Hoàn thiện vòng đời Pillar Cluster

Sau 3 phase trước (schema, UI form, prompt injection), còn lại 2 mảnh để Pillar Cluster thực sự "tự vận hành":

## 1. AI gợi topic từ keyword chưa có content
**Edge function mới**: `supabase/functions/suggest-cluster-topics/index.ts`
- Input: `{ clusterId }`
- Logic:
  - Fetch cluster + pillar keyword + tất cả `seo_keywords` thuộc cluster có `assigned_landing_page_id IS NULL` (uncovered)
  - Fetch brand context (tên brand, industry, tone) từ `brand_templates`
  - Gọi `callAI` (Gemini 2.5 Flash) với prompt: "Đề xuất 5-10 topic ý tưởng phủ các keyword sau, mỗi topic gắn 1-3 keyword, intent rõ ràng (TOFU/MOFU/BOFU), tiêu đề tiếng Việt, angle ngắn"
  - Output JSON `{ suggestions: [{ title, angle, keyword_ids[], intent }] }`
- Đăng ký `verify_jwt = false` trong `config.toml`, validate JWT trong code (pattern singleton service client)

**UI**: nút "Gợi ý topic bằng AI" trong `PillarDetailView.tsx` →
- Mở dialog list các suggestion (checkbox + edit title)
- Khi user "Tạo topic đã chọn" → bulk insert `topic_history` rows với `cluster_id` đã set, redirect sang `/multi-channel/create?topic=...&clusterId=...` cho từng cái (hoặc lưu nháp).

## 2. ClusterContextCard trong MultiChannelViewer
Hiện tại đã có `ClusterContextBadge` (chỉ tên + count). Bổ sung **`ClusterContextCard.tsx`** xuất hiện ở sidebar/bottom của viewer:
- Header: tên pillar + status + coverage % (từ `cluster_coverage` view)
- **Sister Content** (3-5 bài cùng cluster): list link → `/multi-channel/{id}`, mỗi item hiển thị title + channel icons + ngày tạo
- **Pillar Content link**: nếu cluster có `pillar_content_id` → CTA "Xem trang trụ"
- **Suggested internal links**: gọi `suggest-internal-links` (đã có cluster boost) — hiện 3 anchor đề xuất + nút copy markdown
- **Keyword phủ trong bài này**: list `target_keyword_ids` đã link

Mount card trong `MultiChannelViewer.tsx` chỉ khi `content.cluster_id` có giá trị; collapse được.

## 3. Cluster status auto-update (trigger)
Migration nhỏ:
- Trigger sau INSERT/UPDATE/DELETE `multi_channel_contents` → recompute `seo_clusters.status`:
  - `coverage_pct >= 80%` & có `pillar_content_id` → `completed`
  - `coverage_pct > 0` → `active`
  - else → giữ `planning`
- Hoặc đơn giản hơn: làm function SQL `refresh_cluster_status(cluster_id uuid)` rồi gọi từ frontend sau khi tạo content.

→ Chọn approach **function SQL + gọi từ MultiChannelCreate** (nhẹ hơn trigger, dễ debug).

## Files
**New:**
- `supabase/functions/suggest-cluster-topics/index.ts`
- `src/components/seo/ClusterContextCard.tsx`
- `src/components/admin/seo-keywords/SuggestTopicsDialog.tsx`
- 1 migration: `refresh_cluster_status()` function + entry trong `config.toml` cho function mới

**Modified:**
- `src/components/admin/seo-keywords/PillarDetailView.tsx` — thêm nút "Gợi ý topic AI"
- `src/components/MultiChannelViewer.tsx` — mount `ClusterContextCard` dưới badge
- `src/pages/MultiChannelCreate.tsx` — gọi `refresh_cluster_status` sau khi insert

## Out of scope phase này
- Không tự động generate full content khi accept suggestion (user vẫn click qua wizard)
- Không build pillar-page generator riêng (tận dụng MultiChannelCreate với channel=website)
- Không track ranking per cluster (đã có RankTrackerTab riêng)
