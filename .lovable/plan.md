## Mục tiêu

Xây hệ thống **Keyword Intelligence** cho flowa.one: nghiên cứu sâu (qua AI + web search) → phân loại theo cluster/intent → quản lý vòng đời (planned → assigned → published → tracking) → liên kết trực tiếp với `seo_landing_pages` để programmatic SEO scale có chiến lược.

Hiện tại keyword mới là `text[]` nhúng trong landing page. Plan này tách thành **bảng độc lập** + dashboard riêng.

---

## 1. Database Schema (3 bảng mới)

**`seo_keywords`** — kho từ khóa trung tâm
```text
id, organization_id, keyword (unique per org), locale='vi'
search_volume (int)         -- ước lượng/tháng
difficulty (0-100)           -- KD score
cpc_vnd (numeric)            -- giá trị thương mại
intent (enum: informational | commercial | transactional | navigational)
funnel_stage (TOFU | MOFU | BOFU)
serp_features (jsonb)        -- featured_snippet, paa, video, local_pack...
top_competitors (jsonb)      -- [{domain, url, title}] top 10
content_gap_score (0-100)    -- AI tính: gap so với competitor
priority_score (0-100)       -- volume × intent × (100-difficulty) / 100
cluster_id (FK → keyword_clusters)
status (new | researching | planned | assigned | published | tracking | archived)
assigned_landing_page_id (FK → seo_landing_pages, nullable)
current_rank (int, nullable) -- vị trí hiện tại trên Google
last_checked_at, source (manual|ai_suggested|gsc_import|competitor_scrape)
notes, created_at, updated_at
```

**`keyword_clusters`** — nhóm topic (semantic cluster)
```text
id, organization_id, name (vd: "AI Marketing cho Spa")
description, parent_cluster_id (nullable, hỗ trợ tree 2 cấp)
pillar_keyword_id (FK → seo_keywords, keyword chính)
target_pillar_page_slug, color (hex cho UI)
keyword_count (cached), avg_priority (cached)
created_at, updated_at
```

**`keyword_research_jobs`** — lịch sử AI research
```text
id, organization_id, seed_keyword, mode (expand|cluster|gap_analysis|serp_scan)
status (queued|running|done|failed), result (jsonb), keywords_added (int)
ai_model, cost_usd, created_by, created_at, completed_at
```

RLS: org isolation theo `organization_id` (pattern chuẩn của project).

---

## 2. Edge Functions (3 functions mới)

**`keyword-research`** — research engine chính
- Input: `{ seed: string, mode: 'expand'|'cluster'|'gap', orgId, locale }`
- Pipeline:
  1. **Expand**: Gemini 2.5 Pro sinh 30-50 keyword variants tiếng Việt (long-tail, question-based, modifier-based) + web search qua Perplexity/Lovable AI search để verify volume tendencies
  2. **SERP scan**: gọi Perplexity sonar lấy top-10 URLs cho mỗi keyword → trích domain + title
  3. **Gap analysis**: AI so sánh content competitor vs flowa.one để score `content_gap_score`
  4. **Auto-cluster**: embedding `gte-small` (đã có sẵn) → cosine similarity ≥ 0.78 group thành cluster
  5. Bulk insert vào `seo_keywords` với `priority_score` tính sẵn
- Background persistence pattern (đã có trong codebase)
- Trace + cost log qua `_shared/logger.ts`

**`keyword-bulk-import`** — import CSV/GSC
- Parse CSV (keyword, volume, kd, cpc) hoặc GSC export (query, impressions, clicks, position)
- Dedupe theo `(organization_id, keyword)`
- Auto-assign cluster nếu có embedding match

**`keyword-assign-to-page`** — gán keyword cho landing page
- Update `assigned_landing_page_id`, set status='assigned'
- Trigger regenerate `keywords` array trong `seo_landing_pages` (tổng hợp pillar + secondary)

---

## 3. Admin UI — `/admin/seo-keywords`

**Tab 1: Dashboard**
- 4 KPI cards: Total keywords, Clusters, Assigned/Unassigned ratio, Avg priority
- Funnel chart: TOFU/MOFU/BOFU distribution
- Top 10 high-priority unassigned keywords (action: "Tạo landing page" → pre-fill `generate-seo-landing`)

**Tab 2: Keyword Explorer** (data table)
- Columns: keyword, volume, KD, intent, cluster, status, priority_score, assigned page
- Filters: cluster, intent, funnel_stage, status, priority range
- Bulk actions: assign cluster, change status, delete, export CSV
- Row click → side drawer: SERP top-10, gap analysis, history

**Tab 3: Cluster Manager**
- Tree view 2 cấp (pillar → sub-clusters)
- Drag-drop keyword giữa clusters
- Mỗi cluster card: pillar keyword, count, avg priority, link tới pillar page

**Tab 4: Research Lab**
- Form: seed keyword + mode → trigger `keyword-research` job
- Job history table với status realtime (Supabase realtime channel)
- Preview kết quả trước khi commit vào DB

**Tab 5: Import/Export**
- Upload CSV (template downloadable)
- Connect GSC: nếu có GA4/GSC connection (đã thấy trong context trước) → import top queries auto

---

## 4. Tích hợp với hệ thống SEO hiện có

- **`generate-seo-landing`** mở rộng: nhận thêm `cluster_id` hoặc `keyword_ids[]` → AI nhận full SERP context, top competitors, gap analysis làm input → output chất lượng cao hơn nhiều so với chỉ truyền topic string
- **`AdminSeoPages`**: thêm cột "Keywords assigned" + filter theo cluster
- **`DynamicLandingPage`**: render `keywords` từ assigned keywords (đã có sẵn)
- **Sitemap**: priority trong sitemap.xml tính từ `priority_score` của keyword chính
- Sidebar admin: thêm "SEO Keywords" (icon `KeySquare`) ngay dưới "SEO Pages"

---

## 5. Technical details

- **Embedding cho cluster**: dùng pipeline `gte-small` 384-dim đã có (`industry_knowledge_nodes` pattern), tạo IVF index `WITH (lists=50)` cho `seo_keywords.embedding`
- **Priority formula** (function SQL `calc_keyword_priority`):
  ```text
  ROUND(LEAST(100, (LOG(volume+1) * 12) * (intent_weight) * (100-difficulty)/100))
  intent_weight: transactional=1.5, commercial=1.3, informational=1.0, navigational=0.7
  ```
- **Trigger**: sau insert/update keyword → recompute `keyword_count` & `avg_priority` cho cluster
- **AI model**: `google/gemini-2.5-pro` cho research (long context, reasoning), `google/gemini-2.5-flash` cho clustering nhanh
- **Cache**: SERP scan kết quả cache 7 ngày qua `withCache` (key = hash(keyword+locale))
- **Cost guard**: research job > 50 keywords cần confirm; max 200 keyword/job

---

## 6. Deliverables (theo thứ tự build)

1. Migration: 3 bảng + RLS + indexes + `calc_keyword_priority` function + cluster trigger
2. Edge function `keyword-research` (core, có Perplexity + Gemini)
3. Edge function `keyword-bulk-import` (CSV parser)
4. UI page `/admin/seo-keywords` với 5 tabs
5. Sidebar entry + route registration
6. Update `generate-seo-landing` nhận `cluster_id` / `keyword_ids[]`
7. Update `AdminSeoPages` hiển thị keyword links
8. Optional: GSC auto-import (nếu connection đã sẵn)

---

## Câu hỏi trước khi build

1. **Nguồn data volume/KD**: Plan đang dùng AI ước lượng (free) + manual import CSV. Bạn có muốn tích hợp luôn API trả phí (DataForSEO ~$50/mo, hoặc Ahrefs API)? Hay chỉ AI estimate + GSC thật là đủ?
2. **Scope MVP**: Build hết 8 deliverables 1 lần, hay chia 2 phase (Phase 1: schema + research + UI cơ bản, Phase 2: cluster manager + GSC import)?
3. **Bulk research budget**: Default tôi đặt giới hạn 200 keyword/job. OK không, hay cần lớn hơn (vd 1000)?
