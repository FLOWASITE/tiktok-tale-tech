---
name: AI Research Lab v3.5 (Brand-aware + Modifier expander + Pro Priority)
description: Brand DNA + Social + Multi-turn loop + USP fallback + Modifier expander (verified Google Suggest) + Brand domination preset (hardcoded patterns) + Priority công thức SEO chuẩn (relevance × intent_weight × log10(vol) / sqrt(KD)) + Funnel Health alert
type: feature
---

## Backend `keyword-research-v2`
- `fetchBrandCtx(brandTemplateId)` — đọc brand_templates + industry_templates merge forbidden/preferred/claim_restrictions
- `fetchSocialSignals` chạy song song qua Promise.all, fail-soft
- **Smart seed derivation** ưu tiên: pillar → USP phrase → evergreen → location → social_topic → social_term. Khi brand thiếu industry/pillars → fallback `extractTerms(usp+positioning+mission+tagline)` lấy 6 noun-phrases làm seed.
- **Multi-turn tool loop** (`MAX_ROUNDS=6`): mỗi round feed lại `{ack, received, total_so_far, need_more}` cho đến khi đủ `limit`. Dedupe theo `keyword.toLowerCase()`.
- **Streaming AI rounds**: `callAI` nhận `onRoundBatch(batch, round, total)` callback → SSE event `ai_keywords_raw` ngay khi mỗi tool-round trả keyword (kèm progress thật theo `total/limit`, không heartbeat fake). Brand domination seeds cũng emit ngay (round=-1). FE push row `_pending=true`; khi event `keyword_batch` (enriched) đầu tiên đến thì reset list. KHÔNG còn `hb` interval bump pct giả.
- **Source value**: insert `seo_keywords` dùng `source="ai_research"` (KHÔNG `"ai_research_deep"` → vi phạm constraint).
- **Modifier expander** (gọi từ `expandWithModifiers`): pattern `<seed> <modifier>` cho VN modifier (tốt nhất, giá rẻ, miễn phí, 2026, cho doanh nghiệp, hướng dẫn, review, mua, thay thế…), verify qua Google Suggest, chỉ giữ keyword có gợi ý thật → tránh keyword "ảo".
- **Brand domination preset** (`generateBrandDominationSeeds`): sinh CỨNG (không cần AI) các pattern `<brand>`, `<brand> là gì/giá/review/login/đăng nhập/miễn phí/alternatives`, `<brand> vs <competitor>`, `so sánh <brand> và <competitor>`, biến thể không dấu/viết liền. Tag intent=navigational cho login, commercial cho review/giá/vs. AI vẫn chạy để bổ sung biến thể ngách. Domination seeds prepended vào `suggestions` (brand_fit_score=100, dedupe theo keyword).
- **Priority công thức chuẩn SEO**: `Priority = (relevance × intent_weight × log10(volume+10)) / sqrt(difficulty+1)`, normalize / 18.8 → 0-100. Intent weight: transactional=4, commercial=3, navigational=2, informational=1. Mỗi keyword có thêm `priority_breakdown` để UI tooltip.

## Seed Expander (`_shared/seed-expander.ts`)
- `expandSeeds` — Google Suggest + PAA, force `TextDecoder("utf-8")`, filter `\uFFFD`.
- `expandWithModifiers(seeds, locale, max)` — modifier-based, verified qua autocomplete (max 30 candidate check).
- `generateBrandDominationSeeds(brandName, competitors)` — pure pattern, không network call.
- `KEYWORD_MODIFIERS` exported dùng chung.

## Frontend
- `KeywordResearchLabTab`:
  - Preset chips: thêm **Brand domination** (icon Crown) — đứng đầu list.
  - Inline amber warning khi brand thiếu DNA + toast warn `inserted===0 && total>0` (mode deep).
  - SSE event `brand_signals` render trong Brand DNA panel.
  - Export CSV/JSON QA report.
- `KeywordPreviewTable`: cột Priority có tooltip breakdown `(relevance × intent_weight × log10(vol)) / sqrt(KD)`.
- `OverviewTab` Funnel distribution:
  - Badge sức khỏe (Healthy / Thiếu BOFU / TOFU quá nặng) khi pool ≥ 20 keyword.
  - Vạch benchmark TOFU 50% / MOFU 30% / BOFU 20% trên progress bar.
  - Thanh chuyển amber khi lệch benchmark > 20pp.
  - CTA inline khi BOFU < 10%: "Chạy preset Commercial intent".

## Privacy/budget
- KHÔNG nhồi raw caption vào prompt — chỉ aggregate.
- Modifier expander cap 30 autocomplete call để tránh rate limit Google.
