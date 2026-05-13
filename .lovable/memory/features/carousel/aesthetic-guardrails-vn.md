---
name: Carousel Aesthetic Guardrails
description: Anti-hallucination + visual style override + softened brand-color directive trong generate-carousel-image để fix logo giả, fake text bake-in, cliché tech-corporate-red, và monotone palette
type: feature
---

# Carousel Aesthetic Guardrails (generate-carousel-image)

## Vấn đề gốc
4 slide carousel ra với:
1. **Logo hallucination** — model tự vẽ logo "alero", "mopd", "(attached)" vào nền
2. **Fake text bake-in** — bullets, percentages "$50", "0.5%↓" floating cards do AI tự thêm
3. **Cliché tech-corporate-red** — circuit board + glowing nodes + dark navy + neon red lặp 4/4 slide
4. **Monotone** — brandColorDirective cũ ép "40-60% dominant" → toàn slide đỏ rực
5. **Style preset bị override** — `flat_design` user chọn nhưng `educational`/`gallery` block đẩy cinematic 3D

## Fix trong `buildBackgroundPrompt()` (supabase/functions/generate-carousel-image/index.ts)

### 1. cleanedPrompt — strip leak
- Strip "Slide N/M", "Pillar:", "Hook:", "CTA:", "Headline:" leak từ originalPrompt
- Strip standalone numbers-with-unit (`4.2x`, `73%`, `$50`) để AI không vẽ floating data cards

### 2. topicDirective — visual metaphor only
- Đổi "scene MUST be directly relevant" → "VISUALLY relevant qua metaphor/symbol"
- Thêm: "DO NOT spell out topic title or keywords as visible text — typography handled by TEXT RENDERING block ONLY"

### 3. visualPresetOverride (mới) — chạy SAU styleDirective để override
- `visualPreset` được pass thẳng vào function (signature mới)
- Anti-cliché list: NO circuit boards, NO neon nodes, NO holographic UI, NO matrix streams, NO floating data cards
- Style lock theo preset: `flat_design` → 2D vector, `minimal` → editorial whitespace, `organic` → soft hand-drawn

### 4. antiHallucinationGuard (sandwich đầu+cuối prompt)
- "DO NOT render any logo/wordmark/watermark/signature" (logo composited separately)
- "DO NOT render any text EXCEPT TEXT RENDERING block. Nếu không có block → 100% text-free"
- "DO NOT invent fake brand names like alero, mopd"

### 5. brandColor softening
- Đổi "MUST dominate 40-60%" → "Use as accent ~30-40%, pair với neutral whites/creams cho breathing room. Do NOT wash entire image"
- brandColorReinforcement đổi từ "MUST be clearly dominant" → "should be present ~30-40% with neutral breathing room"

## Anti-pattern phải tránh (đừng quay lại)
- "PRIMARY BRAND COLOR ... MUST dominate 40-60%" → tạo monotone, mệt mắt
- Topic relevance bằng "Every visual element should reinforce the topic" → AI bake topic title vào ảnh
- Style directive chỉ map theo `carouselStyle`, không xét `visualPreset` → flat_design bị silent override
- Không có anti-hallucination → fake logos & fake bullet cards

## Layer 4 Cohesion (generate-carousel-images-batch)

### 4.1 Visual Lexicon Lock
- Sau slide 1 success → chạy `extractVisualLexicon()` (Gemini Flash Lite multimodal) PARALLEL với `extractLockedPalette()`
- Output: 1 paragraph ≤80 từ mô tả 4 dimensions: METAPHOR, LIGHTING, MEDIUM, PERSPECTIVE
- Persist vào `carousels.visual_lexicon` (TEXT column)
- Inject vào `seamlessContext.previousSceneDescription` cho slides 2..N as `VISUAL LEXICON (lock from slide 1 — match exactly): ...`
- Edge function config key: `extract-carousel-lexicon` (admin có thể override model + max_tokens)

### 4.3 Composition Scaffold Rotation
- `pickCompositionScaffold(slideNum, totalSlides)` inject per-slide composition archetype
- Slide 1: hero left + breathing right
- Last slide: single icon + 60% negative space (CTA-ready)
- Middle slides: rotate qua [split 60/40, full-width centered, top-down flat-lay, asymmetric editorial]
- Append vào layeredPrevDesc cho mọi slide → break monotone composition

### 4.2 Text bake-in detection (DEFERRED)
- Layer 1 (anti-hallucination prompt sandwich) đã đủ mạnh trong test
- Skip OCR/vision check để tiết kiệm 1 call/slide

## Layer 5 Routing (generate-carousel-image)

### 5.1 Editorial preset → Lovable Gateway
- Set `editorialPresets = {flat_design, minimalist, editorial_minimal, soft_organic}`
- Khi `visualPreset` thuộc set + `isSingleImageProvider(requestedModel)`:
  - `forceLovableGateway = true`
  - `imageModel = 'google/gemini-3.1-flash-image-preview'`
  - 3 provider branches (PoYo / KIE / GeminiGen) có gate `if (!forceLovableGateway && isXxxModel(...))` → bỏ qua
  - Fall-through tới Lovable Gateway block (line ~1046) chạy với gemini-3.1-flash-image
- Lý do: PoYo/KIE/GeminiGen lean photoreal/cinematic → over-render flat_design thành 3D. Gemini 3.1 Flash Image (Nano Banana 2) tôn trọng directive 2D vector clean editorial.
- Photoreal presets (gradient/geometric/illustration/product_only) → giữ provider chain hiện tại.
