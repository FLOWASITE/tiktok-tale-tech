---
name: AI Research Lab v3.2 (Brand + Social-aware + Multi-turn)
description: Brand DNA + Social Footprint + multi-turn tool loop (max 6 vòng) hit limit, USP noun-phrase fallback khi brand thiếu industry/pillars, source="ai_research" hợp constraint, seed-expander UTF-8 force decode
type: feature
---

## Backend `keyword-research-v2`
- `fetchBrandCtx(brandTemplateId)` — đọc brand_templates + industry_templates merge forbidden/preferred/claim_restrictions
  - **Bug đã fix**: header function `async function fetchBrandCtx(...)` từng bị xoá → ReferenceError silent (catch swallow), brandCtx luôn null. Đã restore.
- `fetchSocialSignals` chạy song song qua Promise.all, fail-soft
- **Smart seed derivation** ưu tiên: pillar → USP phrase → evergreen → location → social_topic → social_term. Khi brand thiếu industry/pillars → fallback `extractTerms(usp+positioning+mission+tagline)` lấy 6 noun-phrases làm seed (rất quan trọng cho brand mới).
- **Multi-turn tool loop** (`MAX_ROUNDS=6`): mỗi round feed lại tool result `{ack, received, total_so_far, need_more}` + user msg "tiếp tục, không lặp [last 20]" cho đến khi đủ `limit` hoặc model dừng call tool. Dedupe theo `keyword.toLowerCase()`. Fix lỗi qwen-plus chỉ trả 1 batch 5 cái dù limit=150.
- **Source value**: insert `seo_keywords` dùng `source="ai_research"` (KHÔNG dùng `"ai_research_deep"` → vi phạm `seo_keywords_source_check`).

## Seed Expander (`_shared/seed-expander.ts`)
- Force `TextDecoder("utf-8")` decode response từ Google Suggest (charset header sai → mojibake `c�ng ty`).
- Filter `\uFFFD` replacement char khỏi output.

## Frontend
- `KeywordResearchLabTab`:
  - Inline amber warning khi `!brand.industry && !hasPillars`: "Brand thiếu DNA — keyword sẽ kém chính xác" + link `/brand`.
  - Toast warning khi `done.inserted === 0 && total > 0` ở mode deep (báo bug constraint/dedupe).
  - SSE event `brand_signals` render tín hiệu social trong Brand DNA panel.
- `KeywordPreviewTable`: badge 📱 cho `social_match` keyword.

## Privacy/budget
- KHÔNG nhồi raw caption vào prompt — chỉ aggregate (topics + bigram terms + hashtag freq)
- Cap mỗi list 5–12 item; total social block <600 token
