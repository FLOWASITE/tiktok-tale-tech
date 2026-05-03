---
name: AI Research Lab v3 (Brand-aware)
description: Brand DNA sâu (USP/positioning/competitors/evergreen/locations) + smart seed derivation + brand_fit_score + final_score blend 60/40 + UI Brand Fit column
type: feature
---

## Brand DNA fetcher (`fetchBrandCtx` v3)
Fetch full brand: USP, brand_positioning, mission, tagline, signature_phrases, evergreen_themes, brand_hashtags, main_competitors, competitive_advantages, target_locations, target_gender, preferred_words. Industry template fetch thêm: preferred_terms, high_risk_keywords, claim_restrictions.

## System prompt sections
`BRAND DNA` → `AUDIENCE` → `VOICE` → `CONTENT TERRITORY` (pillars+evergreen+hashtags) → `COMPETITIVE LANDSCAPE` → `INDUSTRY GUARDRAILS` (forbidden + high-risk + claim X→Y + preferred) → `OUTPUT BIAS`.

## Smart Seed Derivation (server-side khi seeds rỗng)
1. Top 2 pillar keywords (weighted)
2. USP/positioning noun phrase (first 6 words)
3. 1 evergreen theme
4. Location-modified seed `{industry} {target_location[0]}`
Lưu `seedStrategy: ["pillar:...", "usp:...", "evergreen:...", "local:..."]` vào `keyword_research_jobs.result`.

## Tool schema mở rộng (`submit_keyword_batch`)
Thêm 3 fields/keyword: `audience_match` (core/adjacent/off-target), `brand_fit_score` (0-100), `brand_fit_reason` (≤80 chars).

## Final score blend
```
priority = vol*0.5 + (100-KD)*0.3 + intentBonus*0.2  (vol normalized to 0-100)
final_score = brandCtx ? priority*0.6 + brand_fit*0.4 : priority
```
Auto-filter `brand_fit_score < 40` trừ preset `competitor_gaps`. Sort theo `final_score` desc trước khi stream. DB `priority_score` cũng dùng `final_score`.

## UI
- KeywordResearchLabTab: Collapsible "Brand DNA AI đang áp dụng" (USP / Positioning / Audience+locations / Đối thủ / Evergreen).
- KeywordPreviewTable: cột **Brand fit** (emerald ≥70, amber 40-69, rose <40, tooltip = brand_fit_reason); filter "Core audience" + slider min brand_fit; sort default theo final_score.
