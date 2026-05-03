## Mục tiêu
Nâng cấp **SEO Hub → Discover → AI Research Lab** trên 4 trục: chất lượng keyword (brand+industry context), tốc độ/chi phí (cache + streaming), coverage (Autocomplete + PAA), UX preview/save (filter, cluster merge, priority score).

---

## 1. Chất lượng — Brand + Industry context vào AI

**File**: `supabase/functions/keyword-research-v2/index.ts`

- FE truyền thêm `brandTemplateId` (optional) trong body request.
- Edge function fetch `brand_templates` theo id → lấy: `brand_name`, `industry`, `brand_voice`, `target_audience`, `content_pillars[]`, `industry_template_id`.
- Nếu có `industry_template_id` → join `industry_templates` → lấy `forbidden_terms`, `claim_restrictions`, `jurisdiction`.
- `buildSystemPrompt()` thêm block:
  ```
  ## Brand context
  Tên: {brand_name} | Ngành: {industry}
  Tone: {brand_voice}
  Audience: {target_audience}
  Pillars (priority): {top 3 pillars + keywords}
  
  ## Output bias
  - Keyword phải sát ngành & audience trên (không sinh keyword chung chung)
  - Mỗi keyword `cluster_name` ưu tiên ánh xạ vào 1 trong 3 pillars
  - TRÁNH dùng các thuật ngữ: {forbidden_terms[:20]}
  ```
- Thêm field `pillar_match` (string|null) vào tool schema → AI gắn pillar tương ứng để FE hiển thị badge.

**File**: `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`
- Truyền `brandTemplateId: currentBrand?.id` trong fetch body.
- Hiện badge nhỏ "Đang dùng context: {brand_name}" cạnh tiêu đề khi có brand.

---

## 2. Tốc độ + chi phí — Cache SERP + AI streaming sớm

**Cache Firecrawl SERP** (giảm Firecrawl credits & latency từ ~8s → ~50ms khi hit):
- Reuse `_shared/cache-utils.ts` (`withCache`).
- Key: `firecrawl:search:{seed}:{country}:{lang}` — TTL 24h, scope `global`.
- Wrap cả `firecrawlSearch` và `firecrawlScrape(url)` (TTL 6h cho scrape).

**AI streaming sớm** (UX: batch đầu hiện sau ~5-8s thay vì chờ ~30s):
- `callAIWithMetrics` đã hỗ trợ `stream: true` (xem pattern carousel streaming). Bật stream cho tool-calls.
- Parse từng `tool_call` chunk → emit SSE `keyword_batch` ngay khi gom đủ 5 keyword (không chờ end-of-stream).
- Watchdog 60s không có chunk → abort + fallback flash.

**Frontend**: không đổi (đã consume SSE batch sẵn).

---

## 3. Mở rộng seed tự động — Autocomplete + PAA

**File mới**: `supabase/functions/_shared/seed-expander.ts`
- `expandSeeds(seeds, locale)` → return `expandedSeeds: string[]` (cap 15).
- 2 nguồn (chạy song song qua `Promise.all`):
  1. **Google Autocomplete** (free, không cần API): 
     `GET https://suggestqueries.google.com/complete/search?client=firefox&q={seed}&hl=vi&gl=vn`
     → JSON array, lấy 5 suggestion đầu/seed.
  2. **People Also Ask** từ Firecrawl SERP grounding đã có: regex extract câu hỏi từ titles/descriptions (`/^(làm sao|cách|tại sao|có nên|là gì|khi nào|ở đâu)/i`).
- Dedupe + filter trùng với seed gốc.
- Cache 24h key `autocomplete:{seed}:{locale}`.

**Tích hợp** trong `keyword-research-v2`:
- Sau bước SERP grounding → gọi `expandSeeds()` → merge vào `seeds` trước khi build prompt.
- Send SSE `progress` 35%: "Mở rộng seed: {n} biến thể từ Autocomplete".
- Đảm bảo cap tổng seed ≤ 10 để không bloat prompt.

**FE**: không đổi input UX (vẫn 5 seed user nhập); hiện expanded list trong panel "Seed mở rộng (auto)" dạng readonly chip dưới textarea.

---

## 4. UX preview + save

**File**: `src/components/admin/seo-keywords/KeywordPreviewTable.tsx` (đọc + extend)

a) **Priority score** hiển thị inline:
- Công thức: `score = round(volume × 0.5 + (100-difficulty) × 0.3 + intentBonus × 0.2)`  
  với `intentBonus = {transactional: 100, commercial: 80, informational: 50, navigational: 30}`.
- Cột mới "Score" sortable (default sort desc).
- Color chip: ≥70 emerald, 40-69 amber, <40 muted.

b) **Bulk filter chips** (above table):
- Intent: All / Info / Commercial / Transactional / Navigational
- Funnel: All / TOFU / MOFU / BOFU
- "Chỉ gap" toggle (đã có) — giữ nguyên
- "Match pillar" toggle (chỉ keyword có `pillar_match`)

c) **Cluster auto-merge** (giảm cluster trùng do AI sinh):
- Trước khi render, group keywords theo `cluster_name` lowercased + simple stem (bỏ dấu, hyphen).
- Merge cluster có Jaccard token similarity ≥ 0.6 → dùng cluster lớn hơn làm canonical.
- Hiển thị merged cluster header (có "+N gộp" badge nếu merge).

d) **Save UX**:
- Button "Lưu top 20 theo score" (one-click) bên cạnh "Lưu đã chọn".
- Sau save → toast "Đã lưu N keyword vào pool, top {min(10, N)} đang enrich SERP".

---

## 5. Memory update

Cập nhật `mem://features/seo/research-lab-v2-vn`:
- Thêm: brand context injection (pillars + forbidden_terms), Autocomplete+PAA seed expansion, SERP cache 24h, AI streaming tool-calls, cluster Jaccard merge, priority_score formula, pillar_match badge.

---

## Files thay đổi

**Edge functions**:
- `supabase/functions/keyword-research-v2/index.ts` (brand context, cache wrap, streaming, expand seeds, pillar_match)
- `supabase/functions/_shared/seed-expander.ts` (mới)

**Frontend**:
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (truyền brandTemplateId, badge brand context, panel expanded seeds)
- `src/components/admin/seo-keywords/KeywordPreviewTable.tsx` (score column, bulk filters, cluster merge, save top-20)

**DB**: không cần migration — dùng `keyword_research_jobs.preview` JSONB sẵn có để chứa `pillar_match` + `score`.

**Memory**:
- `.lovable/memory/features/seo/research-lab-v2-vn.md` (cập nhật)

---

## QA

1. Chạy research với brand có 3 pillars + industry_template → keyword sinh ra phải bám pillar (badge "Pillar: X" xuất hiện), không có forbidden term.
2. Chạy research lần 2 cùng seeds → SERP cache hit (xem console "[cache] hit firecrawl:search:..."), latency giảm rõ.
3. Bật Devtools network → SSE `keyword_batch` đầu tiên xuất hiện < 10s.
4. Seed = "spa" → expanded chip hiện "spa giá rẻ", "cách chọn spa", "spa gần tôi"... (Autocomplete + PAA).
5. Preview table: sort theo Score desc, filter "Commercial" + "BOFU" → giữ đúng row; bấm "Lưu top 20" → 20 keyword lưu xong, top 10 vào enrich queue.
6. Cluster có "chăm sóc da" và "chăm sóc da mặt" → merge thành 1 với badge "+1 gộp".
