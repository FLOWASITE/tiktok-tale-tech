---
name: AI Research Lab v3.1 (Brand + Social-aware)
description: Brand DNA + Social Footprint (active platforms, recent topics/hashtags/captions, audience questions từ social_connections + multi_channel_contents 60d + social_post_engagements) → smart seeds + brand_fit + social alignment +15 bonus, UI Tín hiệu Social panel + 📱 badge
type: feature
---

## Backend `keyword-research-v2`
- `fetchSocialSignals(brandTemplateId, organizationId)` chạy song song với `fetchBrandCtx`:
  - `social_connections` (is_active, scoped by brand_template_id) → active_platforms + handles
  - `multi_channel_contents` 60d → recent_topics, tags, hashtags, frequent_terms (bigram + word freq, có STOPWORDS VI/EN)
  - `social_post_engagements` (event_type='comment') → audience_questions (regex `?`)
  - Fail-soft: try/catch toàn bộ, return null không block research
- `buildBrandBlock` thêm section **SOCIAL FOOTPRINT** (active channels, handles, topics, hashtags, frequent terms, audience questions)
- Smart seed derivation thêm 2 nguồn: `social_topic` (recent_topics[0]) + `social_term` (frequent_terms[0])
- Scoring: keyword chứa term thuộc social footprint → `brand_fit_score += 15` (cap 100), gắn `social_match` field
- SSE event mới: `brand_signals` emit ở pct 8-10

## Frontend
- `KeywordResearchLabTab`: state `brandSignals`, listen SSE `brand_signals`, render trong Brand DNA collapsible:
  - Section "Tín hiệu Social (60d)": active platforms, top topics chips, hashtags, frequent terms, 1 audience question
  - Empty state: tip kết nối social
- `KeywordPreviewTable`: badge 📱 inline cạnh keyword nếu có `social_match`, tooltip Brand Fit ghép thêm "📱 Khớp social: ..."

## Privacy/budget
- KHÔNG nhồi raw caption vào prompt — chỉ aggregate (topics + bigram terms + hashtag freq)
- Cap mỗi list 5–12 item; total social block <600 token
