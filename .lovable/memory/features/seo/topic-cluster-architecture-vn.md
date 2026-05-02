---
name: SEO Topic Cluster (Pillar-Cluster)
description: Bảng seo_clusters + topic_history.cluster_id + multi_channel_contents.cluster_id; view cluster_coverage; refresh_cluster_status RPC; UI Pillars tab + ClusterPicker form + ClusterContextCard sidebar; suggest-cluster-topics edge gen ý tưởng từ uncovered keyword
type: feature
---

## Schema
- `seo_clusters` (id, organization_id, name, description, pillar_keyword_id, pillar_content_id, color, status: planning|active|completed|archived)
- `seo_keywords.cluster_id`, `topic_history.cluster_id`, `multi_channel_contents.cluster_id` + `target_keyword_ids text[]`
- View `cluster_coverage` (keyword_count, keywords_covered, coverage_pct)
- RPC `refresh_cluster_status(_cluster_id uuid)` — auto set planning/active/completed dựa coverage ≥80% & có pillar_content_id; archived giữ nguyên

## Edge Functions
- `suggest-cluster-topics` (verify_jwt=false, manual JWT) — Gemini 2.5 Flash, input `{clusterId}`, output `{suggestions:[{title,angle,keyword_ids,intent}]}`. Chỉ suggest cho keyword `assigned_landing_page_id IS NULL`.
- `generate-multichannel` — inject `## 🎯 SEO PILLAR CLUSTER` block với pillar name + keyword list + intent/volume + on-page rules (density 0.8-1.5%, H2/H3 cho website)
- `suggest-internal-links` — boost similarity +0.1 nếu cùng `cluster_id`

## Components
- `PillarsTab` + `PillarDetailView` (admin/seo-keywords) — manage pillars, đặt pillar keyword, add/remove keywords. Nút "Gợi ý topic AI" mở `SuggestTopicsDialog`.
- `SuggestTopicsDialog` — gọi edge, list suggestions với checkbox + edit title, "Lưu vào nháp" insert `topic_history` (category=seo, content_goal map TOFU→awareness/MOFU→educate/BOFU→convert), hoặc "Tạo content" navigate `/multi-channel/create?topic=...&clusterId=...&keywordIds=...`
- `ClusterPicker` — dropdown trong MultiChannelFormWizard, auto-load keywordIds bơm vào KeywordTargetPicker
- `ClusterContextBadge` — compact badge trong viewer header
- `ClusterContextCard` — sidebar card: coverage progress, pillar page link, sister content (5 bài + copy markdown), pillar keyword

## Frontend wiring
- `MultiChannelCreate` sau insert content → update cluster_id + target_keyword_ids → gọi `rpc('refresh_cluster_status')`
- `MultiChannelViewer` mount `ClusterContextCard` trong sidebar khi `content.cluster_id` có giá trị
- `AdminSeoHub` có tab `Pillars` (icon Target), 9 tabs total

## Lưu ý
- Tab `Clusters` cũ (`KeywordClusterTab` → `keyword_clusters`) là grouping đơn thuần, KHÔNG xóa, hai hệ song song
- Cast `cluster_coverage` view qua `(supabase as any)` vì view không có trong generated types
- `topic_history` không có `target_keyword_ids` column — dùng `related_keywords text[]` để lưu keyword ids
