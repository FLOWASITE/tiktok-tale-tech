# AI Research Lab v2 — Refactor toàn diện

## Mục tiêu
Biến tab Research từ "AI đoán mò keyword → auto-save" thành workflow grounded:
**Input đa nguồn → SERP grounding → Stream preview → User chọn → Save → Auto-enrich → Gap/Intent matrix.**

## Kiến trúc tổng thể

```text
[Multi-seed + Competitor URLs + Preset]
          │
          ▼
  keyword-research-v2 (SSE)
   ├─ 1. Firecrawl scrape competitor URLs (nếu có)
   ├─ 2. Firecrawl /search top 10 SERP cho mỗi seed (grounding)
   ├─ 3. Gemini stream keyword (tool-call từng batch 5)
   │     → SSE event "keyword" cho FE render live
   ├─ 4. Gap detection: so với seo_keywords hiện có
   └─ 5. SSE event "done" với jobId
          │
          ▼
  Live Preview Table (FE)
   ├─ Tick chọn keyword muốn giữ
   ├─ Filter Intent × Funnel matrix
   └─ Save button → upsert + cluster
          │
          ▼
  Auto-trigger enrich-keyword-serp cho top N (priority cao)
```

## Backend changes

### 1. Edge function mới: `keyword-research-v2`
- `verify_jwt = false`, JWT validate trong code (theo project pattern)
- Input: `{ seeds: string[], competitorUrls?: string[], preset?: string, organizationId, locale, limit }`
- Steps:
  1. **Competitor scrape** (nếu có URL): Firecrawl `/v2/scrape` format `markdown`, extract H1/H2/keywords từ content → đưa vào context.
  2. **SERP grounding** cho từng seed: Firecrawl `/v2/search` lấy 10 results (title+description), inject vào prompt → AI estimate dựa data thật.
  3. **Stream generation**: gọi Lovable AI `stream:true` với tool-call `submit_keyword_batch` (5 keyword/batch). Parse SSE từ gateway, mỗi batch hoàn chỉnh emit SSE event `keyword_batch` về FE.
  4. **Gap detection**: query `seo_keywords` existing trong org → mark `is_gap: true` cho keyword chưa có.
  5. **Không auto-insert**. Trả về `previewToken` + lưu kết quả tạm vào `keyword_research_jobs.result.preview` để user chọn.

### 2. Edge function mới: `keyword-research-save`
- Input: `{ jobId, selectedKeywords: string[] }` (mảng keyword đã tick)
- Logic: filter preview theo selected → upsert vào `seo_keywords` + tạo cluster (giữ logic cũ từ v1).
- Trả về `{ inserted, autoEnrichJobId }`.
- **Auto-enrich**: nếu top N (10) keyword priority cao chưa có SERP data → fire-and-forget gọi `enrich-keyword-serp` cho từng keyword, gom thành 1 enrichment job.

### 3. Preset templates (server-side prompt fragments)
Lưu trong code, không cần DB:
- `long_tail_questions` — focus 4+ words + question modifiers
- `commercial_intent` — "giá", "mua", "đăng ký", "tốt nhất"
- `local_seo_vn` — thêm city/quận VN
- `competitor_gaps` — đòi hỏi competitorUrls, focus keyword đối thủ rank nhưng mình không có

### 4. Migration
- `keyword_research_jobs`: thêm cột `preview JSONB` (lưu suggestions trước khi user chọn) + `serp_grounding JSONB` (raw Firecrawl) + `selected_count INT`.
- Index `(organization_id, created_at DESC)`.

## Frontend changes

### 1. `KeywordResearchLabTab.tsx` — refactor (giữ structure UI hiện tại)
Layout giữ nguyên 2 card (Input + History), nhưng nâng:

**Card Input:**
- Textarea multi-seed (1 dòng = 1 seed, max 5)
- Optional: textarea "Competitor URLs" (1 URL/dòng, max 3)
- Preset chips: 4 preset (click → highlight, gửi flag lên backend)
- Limit slider 5-100
- Toggle "Live preview" (default ON) — nếu OFF thì auto-save như v1

**Khi Run:**
- Gọi v2 endpoint qua `fetch` SSE (giống pattern carousel streaming)
- Hiển thị progress bar + counter "Đã sinh: 23/30"
- Stream từng keyword vào table preview ngay khi nhận

### 2. Component mới: `KeywordPreviewTable.tsx`
- Hiện trong Card thứ 3 (chỉ khi đang stream hoặc có preview)
- Cột: ☑ | Keyword | Volume | KD | Intent badge | Funnel badge | Cluster | Gap (badge xanh "Mới")
- Filter: Intent multi-select + Funnel multi-select + "Chỉ hiện gap"
- Bulk: "Chọn tất", "Bỏ chọn", "Chọn gap only"
- CTA: "Lưu N keyword đã chọn" → gọi `keyword-research-save`

### 3. Component mới: `IntentFunnelMatrix.tsx`
- Hiện sau khi save xong hoặc trên History job
- 3×4 grid: rows = TOFU/MOFU/BOFU, cols = informational/commercial/transactional/navigational
- Mỗi ô: count + click drill-down

### 4. Card History (giữ + nâng):
- Thêm badge "preview pending" cho job có preview chưa save
- Click job → mở lại preview table (resume flow)

## Streaming pattern (theo Carousel Prompt Streaming memory)
- Server: `Deno.serve` trả `text/event-stream`, watchdog 30s/150s
- Events: `progress` (10-90%), `keyword_batch` (mảng 5), `gap_summary`, `done`, `error`
- Client: line-by-line parser, AbortController để cancel

## Resilience
- Firecrawl fail → fallback skip grounding (log warning), vẫn chạy AI
- Lovable AI 429/402 → surface lỗi qua SSE `error` event
- Gemini không trả tool-call → retry 1 lần với gemini-2.5-flash

## Files

**Tạo mới:**
- `supabase/functions/keyword-research-v2/index.ts`
- `supabase/functions/keyword-research-save/index.ts`
- `supabase/migrations/<ts>_keyword_research_v2.sql`
- `src/components/admin/seo-keywords/KeywordPreviewTable.tsx`
- `src/components/admin/seo-keywords/IntentFunnelMatrix.tsx`
- `.lovable/memory/features/seo/research-lab-v2-vn.md`

**Sửa:**
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (refactor input + tích hợp stream + preview)
- `supabase/config.toml` (thêm 2 function với `verify_jwt = false`)
- `mem://index.md` (link memory mới)

**Giữ nguyên:**
- `keyword-research` v1 (backward compat, ẩn dần)
- `enrich-keyword-serp` (gọi từ save flow)
