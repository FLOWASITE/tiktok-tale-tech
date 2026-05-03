---
name: AI Research Lab v2
description: Multi-seed + Firecrawl SERP grounding + competitor scrape + brand/industry context + Autocomplete/PAA seed expansion + SERP cache + UX preview score/merge
type: feature
---

## Flow
1. **Input**: multi-seed (max 5) + competitor URLs (max 3) + preset chip + brandTemplateId (auto từ active brand)
2. **Edge `keyword-research-v2`** (SSE):
   - Fetch brand_templates (brand_name, industry, tone, audience, content_pillars, forbidden_words) + industry_templates.forbidden_terms → `brandCtx`
   - Firecrawl `/v2/scrape` competitor URLs (cache 6h memory)
   - Firecrawl `/v2/search` mỗi seed → top 10 (cache 24h memory by seed+country+lang)
   - **Seed expansion** (`_shared/seed-expander.ts`): Google Autocomplete (`suggestqueries.google.com`, free) + PAA regex từ SERP titles → emit `expanded_seeds` SSE event
   - Lovable AI `gemini-2.5-pro` với system prompt chứa BRAND CONTEXT block + tool `submit_keyword_batch` (có field `pillar_match`)
   - Gap detection vs `seo_keywords` → `is_gap`
   - Lưu preview vào `keyword_research_jobs.preview` + `result.expandedSeeds` + `result.brandTemplateId`
3. **FE preview table** (`KeywordPreviewTable`):
   - **Priority score** = vol*0.5 + (100-KD)*0.3 + intentBonus*0.2; chip màu emerald/amber/muted
   - Filter: intent, funnel, gap-only, **match pillar** (chỉ hiện khi có pillar data)
   - **Cluster auto-merge** Jaccard ≥ 0.6 → canonical name
   - Action **"Top 20 theo score"** + "Lưu N keyword"

## SSE events
- `progress`, `serp`, `expanded_seeds` (NEW), `keyword_batch`, `done`, `error`

## Cache
- In-memory Map TTL: SERP search 24h, scrape 6h, Autocomplete 24h
- Reset khi cold-start edge function (acceptable cho workload này)

## Components
- `KeywordResearchLabTab.tsx` — pass brandTemplateId, badge "Context: {brand}", chip panel expanded seeds
- `KeywordPreviewTable.tsx` — score column, pillar_match badge, cluster merge, top 20
- `_shared/seed-expander.ts` — expandSeeds(seeds, serpGround, locale)

## Resilience
- Firecrawl thiếu key → skip grounding, vẫn chạy AI
- Autocomplete fail → skip expanded seeds (không block flow)
- Brand fetch fail → null ctx, generic prompt
- AI 429/402 → SSE error; non-quota fail → fallback `gemini-2.5-flash`
