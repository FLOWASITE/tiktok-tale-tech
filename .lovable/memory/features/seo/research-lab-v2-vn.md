---
name: AI Research Lab v2
description: Auto-seed từ brand context (pillars/industry) + Multi-seed override + Firecrawl SERP grounding + Autocomplete/PAA expansion + cache + UX preview score/merge
type: feature
---

## Auto-research mode (default)
- **FE không yêu cầu nhập seed**. Tab Discover hiển thị **brand context card** với:
  - Badge "Auto từ brand" + "Context: {brand_name}"
  - Chip readonly các seed sẽ dùng (derived từ `content_pillars` top 5 sort theo weight, fallback `brand_name + industry`)
- Nút **Run research** enabled khi có brand HOẶC user mở "Tuỳ chỉnh nâng cao" và nhập seed override
- Empty state khi chưa chọn brand → CTA `/brand`
- Hint khi brand không có pillars → khuyến nghị cấu hình hoặc nhập seed thủ công

## Override flow
- Collapsible "Tuỳ chỉnh nâng cao" chứa: textarea seeds (override), competitor URLs, preset chips, limit input
- `effectiveSeeds = overrideSeeds.length > 0 ? overrideSeeds : autoSeeds`
- Body gửi BE thêm flag `autoFromBrand: boolean` để log/analytics

## Backend fallback (`keyword-research-v2/index.ts`)
- Nếu `seeds` rỗng nhưng có `brandTemplateId` → server tự derive (cùng logic FE) từ `brand_templates.content_pillars`
- Trả 400 nếu cả brand lẫn seeds đều thiếu

## Pipeline (giữ nguyên)
1. Fetch brand_templates + industry_templates → `brandCtx` (pillars, forbidden_terms)
2. Firecrawl scrape competitor (cache 6h) + search mỗi seed (cache 24h)
3. Seed expansion: Google Autocomplete + PAA (cache 24h) → SSE `expanded_seeds`
4. Lovable AI gemini-2.5-pro với BRAND CONTEXT block + tool `submit_keyword_batch` (có `pillar_match`)
5. Gap detection vs `seo_keywords`
6. Lưu preview vào `keyword_research_jobs.preview`

## SSE events
- `progress` (5/8/15/25/35/...), `serp`, `expanded_seeds`, `keyword_batch`, `done`, `error`
- Heartbeat `: ping` mỗi 5s khi chờ AI để tránh proxy buffering
- Header `X-Accel-Buffering: no`

## FE preview table
- Priority score = vol*0.5 + (100-KD)*0.3 + intentBonus*0.2; chip emerald/amber/muted
- Filter: intent, funnel, gap-only, match pillar
- Cluster auto-merge Jaccard ≥ 0.6
- "Top 20 theo score" + "Lưu N keyword"

## Resilience
- Firecrawl thiếu key → skip grounding
- Autocomplete fail → skip expanded
- Brand fetch fail → null ctx, generic prompt
- AI 429/402 → SSE error; non-quota fail → fallback gemini-2.5-flash
- Watchdog FE: abort sau 90s không có chunk
