## Mục tiêu
Nâng chất lượng keyword bằng cách cho AI **hiểu sâu brand** — không chỉ pillars + forbidden, mà toàn bộ DNA brand (USP, audience, vị thế, đối thủ, evergreen themes, signature phrases, jurisdiction). Keyword sinh ra phải bám sát brand voice + có **Brand Fit Score** rõ ràng.

## Vấn đề hiện tại
- `fetchBrandCtx` chỉ lấy 7 trường (name, industry, tone, audience, pillars, forbidden, jurisdiction) → bỏ qua 15+ trường brand quan trọng (USP, positioning, competitors, evergreen themes, signature phrases, target_locations, mission/vision…)
- Seed auto-derive chỉ dùng pillar name/keyword đầu tiên → bỏ qua weight nuance + competitor + USP
- AI prompt chưa có **industry memory v2** (forbidden_terms ngành, claim restrictions, preferred terms) — chỉ có forbidden_words flat
- Không có **Brand Fit Score** — chỉ có `pillar_match` boolean-ish
- Không re-rank theo brand alignment, chỉ priority_score (volume/KD/intent)
- FE preview không show vì sao keyword fit/not fit brand

## Phạm vi (3 lớp)

### Lớp 1 — Brand Context sâu (BE)
File: `supabase/functions/keyword-research-v2/index.ts`

Mở rộng `fetchBrandCtx` lấy thêm:
- `unique_value_proposition`, `brand_positioning`, `mission`, `tagline`
- `signature_phrases`, `evergreen_themes`, `brand_hashtags`
- `main_competitors`, `competitive_advantages`
- `target_locations`, `target_gender`
- `preferred_words` (whitelist song song với forbidden)
- Industry template: thêm `preferred_terms`, `claim_restrictions`, `high_risk_keywords`, `target_audience` (từ resolved_rules nếu có) — fetch qua `_shared/data-fetchers/industry-fetcher-v2.ts`

`buildBrandBlock` viết lại theo cấu trúc:
```
## BRAND DNA
- Brand / Industry / Jurisdiction
- USP: ...
- Positioning: ...
- Mission/Tagline
## AUDIENCE
- Age / Gender / Segment / Locations
## VOICE
- Tone / Formality / Language style / Emoji policy
- Signature phrases (dùng làm modifier khi hợp lý)
## CONTENT TERRITORY
- Pillars (top 5 với weight + keywords)
- Evergreen themes
- Brand hashtags
## COMPETITIVE LANDSCAPE
- Main competitors (gợi ý keyword cạnh tranh)
- Competitive advantages (xoáy vào điểm mạnh)
## INDUSTRY GUARDRAILS (priority cao nhất)
- Forbidden terms (brand + industry)
- High-risk keywords (cần context)
- Claim restrictions (X → Y)
- Preferred terms
```

### Lớp 2 — Smart Seed Derivation (BE)
Khi `seeds` rỗng, derive 5 seed có chiến lược (không chỉ pillars):
1. Top 2 pillar keywords (weighted)
2. 1 USP/positioning keyword (extract noun phrase từ `unique_value_proposition`)
3. 1 evergreen theme
4. 1 location-modified seed nếu có `target_locations` (vd "{industry} {location}")

Log strategy used → lưu vào `keyword_research_jobs.result.seed_strategy` để debug.

### Lớp 3 — Brand Fit Scoring + Re-rank
Thêm field vào tool schema `submit_keyword_batch`:
- `brand_fit_score`: integer 0-100 (AI tự đánh giá)
- `brand_fit_reason`: string ngắn (vì sao fit / lệch)
- `pillar_match`: giữ nguyên
- `audience_match`: enum `core | adjacent | off-target`

System prompt yêu cầu:
- Chấm `brand_fit_score` dựa: pillar coverage, audience match, voice fit (signature/evergreen), không vi phạm forbidden/claim
- Tự loại keyword `brand_fit_score < 40` trừ khi user chọn preset `competitor_gaps`

Re-rank `priority_score` (giữ công thức cũ) **+ blend brand_fit**:
```
final_score = priority_score * 0.6 + brand_fit_score * 0.4
```

### Lớp 4 — UI Surface (FE)
Files: 
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`
- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` (preview table)

Thay đổi:
- Brand Context Panel: hiện thêm USP / Positioning / Audience locations / Top competitors (collapsible "Brand DNA đang áp dụng")
- Preview table: thêm cột **Brand Fit** (badge emerald/amber/red theo score) + tooltip show `brand_fit_reason`
- Filter mới: "Chỉ keyword core audience" + slider min brand_fit
- Sort default theo `final_score` thay vì `priority_score`

## Không làm
- Không đổi DB schema (`keyword_research_jobs.preview` là JSONB, brand_fit fields nằm trong)
- Không đụng `seo_keywords` table
- Không đổi pricing/quota

## Risks
- Token budget tăng ~30% do brand DNA block dài → mitigate: cap mỗi field 200 chars, top 3 evergreen/competitors only
- AI có thể "overfit" brand → giảm long-tail diversity → preset `default` giữ instruction "đa dạng"

## Files to edit
- `supabase/functions/keyword-research-v2/index.ts` (chính)
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (Brand DNA panel)
- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` (Brand Fit column + filter)
- Memory: cập nhật `mem://features/seo/research-lab-v2-vn.md` → v3
