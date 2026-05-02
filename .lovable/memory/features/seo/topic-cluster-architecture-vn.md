---
name: SEO Topic Cluster (Pillar-Cluster)
description: Bảng seo_clusters + topic_history.cluster_id + view cluster_coverage; 1 pillar gom keyword + topic + content thành silo SEO; UI tab Pillars trong SEO Hub với PillarsTab + PillarDetailView; ClusterPicker dùng trong form tạo content auto-fill keywords
type: feature
---

## Schema
- `seo_clusters` (id, organization_id, name, description, pillar_keyword_id → seo_keywords, pillar_content_id → multi_channel_contents, color, status: planning|active|completed|archived)
- `topic_history.cluster_id` FK → seo_clusters
- `seo_keywords.cluster_id` FK → seo_clusters (cột đã có sẵn từ trước, migration thêm FK)
- View `cluster_coverage` (cluster_id, keyword_count, keywords_covered, topic_count, topics_used, coverage_pct)
- RLS: org members CRUD via `is_org_member()`

## Components
- `src/components/admin/seo-keywords/PillarsTab.tsx` — grid pillar cards, tạo/xóa, click mở detail
- `src/components/admin/seo-keywords/PillarDetailView.tsx` — pillar keyword + content + danh sách cluster keywords, đặt pillar, add/remove keyword
- `src/components/seo/ClusterPicker.tsx` — dropdown chọn pillar trong form tạo content; khi chọn auto-load `keywordIds` để parent bơm vào `KeywordTargetPicker`
- `AdminSeoHub` thêm tab `Pillars` (icon Target), 9 tabs total

## Lưu ý
- Tab `Clusters` cũ (`KeywordClusterTab` → `keyword_clusters`) là grouping đơn thuần, KHÔNG xóa, hai hệ song song.
- Pillars là kiến trúc strategic mới (Pillar-Cluster cho silo SEO).
- Cast `cluster_coverage` view qua `(supabase as any)` vì view không có trong generated types.

## TODO chưa làm
- Inject cluster context vào `generate-multichannel` prompt
- ClusterPicker tích hợp vào MultiChannelFormWizard
- Edge `suggest-cluster-topics` (AI gợi topic từ uncovered keywords)
- ClusterContextCard trong viewer (sister content + internal links)
- Boost cluster similarity trong `suggest-internal-links`
