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

## Layer 6: Canvas Logo Compositing (deterministic post-gen)

### Vấn đề
AI models (PoYo/KIE/Gemini) khi nhận `logo_url` làm reference image + `logoDirective` text → thường:
- Vẽ lại logo (sai shape/màu/typography)
- Bịa wordmark giả "alero", "mopd"
- Đè lên typography overlay
- Bỏ qua hoàn toàn logo

### Fix
**generate-carousel-image:**
- BỎ `logoDirective` text directive (không yêu cầu model render logo)
- BỎ attach `resolvedLogoUrl` vào `userContent` refs (gateway) và `singleRefImage` (PoYo/KIE/GeminiGen slide 1 fallback)
- Cap refs gateway từ 3 → 2 (anchor + previous, không có logo)
- AntiHallucinationGuard "DO NOT render any logo/wordmark" giữ nguyên (đủ mạnh)

**generate-carousel-images-batch:**
- Fetch `include_logo` + `brand_template_id` + resolve `brand_templates.logo_url` 1 lần đầu batch
- Sau mỗi `data.imageUrl` thành công → fetch `${supabaseUrl}/functions/v1/overlay-logo-canvas` với:
  - `position`: `bottom-right` (slide 1..N-1), `bottom-center` (slide N = CTA)
  - `logoSizePercent`: `10`, `logoStyle`: `subtle`, `logoOpacity`: `100`, `padding`: `48`
- Replace `slideImageUrl` bằng URL composited TRƯỚC khi insert vào `carousel_images`
- Fail-soft: lỗi overlay → giữ ảnh AI gốc + warn log, không block batch

### Anti-pattern phải tránh
- KHÔNG bao giờ inject logo vào AI prompt hay multi-image input nữa — luôn composite post-gen
- KHÔNG dùng position `top-right` (collide với typography hook area)
- KHÔNG dùng logoStyle `glass`/`pill` cho carousel (frame phá editorial composition)

---

## Layer 7: Creative Director + Typography Art Direction

### Vấn đề
Sau Layer 6: text vẫn "AI-generated" (font generic, hierarchy mềm), color không có "mood arc" (palette flat suốt 4-10 slides), metaphor literal (mũi tên, biểu đồ, neon).

### Fix
**`_shared/carousel-creative-direction.ts` (mới):**
- `runCreativeDirection({...})` → 1 LLM call/carousel (Gemini 2.5 Flash mặc định, admin override qua `ai_function_configs.function_name='carousel-creative-direction'`)
- Tool calling structured output: `{ metaphor: {chosen, rejected, reasoning}, moodArc[], typographyRole[] }`
- Timeout 12s, fail-soft → return `null`, batch fallback Layer 4-6
- 5 archetypes: `editorial-hero`, `data-display`, `supporting-body`, `cta-poster`, `caption-only`
- Export `buildTypographyDirective()` sync builder cho prompt block

**`generate-carousel-images-batch`:**
- Gọi `runCreativeDirection` 1 lần đầu batch (sau resolve logo) → persist vào `carousels.creative_direction` (JSONB cột mới)
- Inject `LOCKED VISUAL METAPHOR` vào `seamlessContext.previousSceneDescription` mọi slide
- Inject `MOOD FOR THIS SLIDE` (contrast/saturation/focalIntent) per slide
- Pass `creativeDirection: { metaphor, moodForSlide, typographyArchetype }` vào mỗi `generate-carousel-image`

**`generate-carousel-image`:**
- Nhận `creativeDirection` + truyền vào `buildBackgroundPrompt`
- Replace TEXT RENDERING block bằng `buildTypographyDirective(archetype, ...)` khi có archetype
- Fallback giữ block legacy nếu `creativeDirection=null` hoặc archetype unavailable

### Anti-pattern phải tránh
- KHÔNG hardcode font name vào prompt (để archetype quản lý)
- KHÔNG dùng `creativeDirection` như block hard-fail (phải fail-soft)
- KHÔNG set timeout < 10s cho creative-direction call (Gemini 2.5 Flash thi thoảng cần 8-10s)
- KHÔNG persist creative_direction nếu schema validation fail (return null sớm)
