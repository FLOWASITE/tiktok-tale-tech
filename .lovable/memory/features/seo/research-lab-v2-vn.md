---
name: AI Research Lab v2
description: Multi-seed + Firecrawl SERP grounding + competitor scrape + SSE streaming preview + user-pick save + auto-enrich top10 + Intent×Funnel matrix
type: feature
---

## Flow
1. **Input**: multi-seed (max 5) + competitor URLs (max 3) + preset chip (long_tail_questions / commercial_intent / local_seo_vn / competitor_gaps).
2. **Edge `keyword-research-v2`** (SSE, verify_jwt=false, JWT validate trong code):
   - Firecrawl `/v2/scrape` competitor URLs → markdown context
   - Firecrawl `/v2/search` mỗi seed → top 10 titles+descriptions làm grounding
   - Lovable AI `gemini-2.5-pro` (fallback `flash` nếu fail không phải 429/402) với tool-call `submit_keyword_batch`
   - Gap detection: query `seo_keywords` existing → mark `is_gap`
   - Lưu preview vào `keyword_research_jobs.preview` (JSONB), status = `preview_ready`
   - SSE events: `progress` (5/15/30/50/80), `serp`, `keyword_batch` (5 mỗi lần), `done`, `error`
3. **FE preview table**: filter intent/funnel/gap-only, bulk select, "Chọn gap" CTA
4. **Edge `keyword-research-save`**: filter preview theo selectedKeywords → upsert `seo_keywords` + tạo cluster → fire-and-forget `enrich-keyword-serp` cho top 10 (volume desc, KD asc) → lưu `enrich_job_id`

## Schema additions (`keyword_research_jobs`)
- `seeds JSONB`, `competitor_urls JSONB`, `preset TEXT`
- `serp_grounding JSONB`, `preview JSONB`
- `selected_count INT`, `auto_enrich BOOL`, `enrich_job_id UUID`
- Status mới: `preview_ready` (giữa running và done)

## Components
- `KeywordResearchLabTab.tsx` — input + SSE consumer + progress
- `KeywordPreviewTable.tsx` — table với filter + checkbox + save
- `IntentFunnelMatrix.tsx` — 3×4 grid heatmap dùng `hsl(var(--primary)/alpha)`

## Resilience
- Firecrawl thiếu key hoặc fail → skip grounding, vẫn chạy AI (UI báo "⚠ Firecrawl: không có data")
- AI 429/402 → SSE `error` event với status, FE toast
- Pro fail (non-quota) → auto fallback `gemini-2.5-flash`
- AbortController FE → user huỷ giữa chừng
