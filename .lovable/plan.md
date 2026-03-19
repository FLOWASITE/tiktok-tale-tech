

## Plan: Carousel Visual Engine — 6 Gap Fixes

### Context
Hệ thống Carousel đã hoàn thành Phases 0-5 (Design Token System, Role Detection, Gallery Skip, Seamless Continuity, DB Presets). Phân tích chuyên sâu phát hiện **6 gaps** còn lại ảnh hưởng trực tiếp đến chất lượng output.

### Gaps & Prioritized Fix Order

---

### Phase A: Gallery Hook Dark Gradient (Gap #5)
**Impact: High | Effort: Low**

**Problem**: Gallery hook slide prompt chỉ *gợi ý* AI tạo dark gradient ("The image MUST have a natural dark gradient..."). Không có programmatic fallback → text readability phụ thuộc AI luck.

**Fix**: Sau khi generate background cho gallery hook, overlay một gradient đen programmatic bằng Satori (transparent → rgba(0,0,0,0.6)) ở bottom 35%, rồi mới overlay text.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- Khi `slideRole === 'hook' && carouselStyle === 'gallery'`: gửi request overlay-text-canvas với thêm param `bottomGradient: true`

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Carousel overlay mode: nếu `bottomGradient: true`, thêm div gradient overlay dưới text element

---

### Phase B: Multi-layer Text Hierarchy (Gap #1)
**Impact: Highest | Effort: Medium**

**Problem**: Carousel overlay hiện chỉ render **1 block text flat** (`textContent` string). Không phân biệt headline/subtitle/data value → output thiếu visual hierarchy.

**Fix**: Parse `textContent` thành structured layers và render multi-block.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- Thêm `parseTextLayers(textContent, slideRole)` function:
  - Hook: line 1 = headline (3rem, bold), rest = subtitle (1.2rem, regular)
  - Body: line 1 = heading (1.5rem), rest = body text (1rem)
  - CTA: line 1 = main CTA (2rem, bold), line 2 = sub-text (1rem)
  - DataPoint: first number/percentage = hero number (4rem), rest = label
- Pass `textLayers` array thay vì single `text` string to overlay-text-canvas

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Carousel overlay mode: accept `textLayers?: { text: string; role: 'headline'|'subtitle'|'body'|'accent' }[]`
- Render each layer with different fontSize, fontWeight, color opacity, spacing
- Fallback: nếu không có `textLayers`, giữ logic single-text hiện tại

---

### Phase C: Brand Color Blending (Gap #3)
**Impact: Medium | Effort: Low**

**Problem**: `brandColors` được truyền nhưng chỉ dùng cho textColor/backgroundColor fallback. 2 brand khác nhau cùng preset → output gần giống nhau.

**Fix**: Inject brand colors vào cả background prompt và overlay.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- `buildBackgroundPrompt`: nếu có `brandColors`, thêm directive "Brand identity colors: primary={X}, accent={Y}. Incorporate these as dominant colors."
- Overlay call: pass `brandColors` xuống overlay-text-canvas

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Carousel overlay: nếu có `brandColors.backgroundColor`, dùng nó cho `solid-block` và `glass` background thay vì hardcoded rgba

---

### Phase D: Content-aware Text Fitting (Gap #6)
**Impact: Medium | Effort: Low**

**Problem**: `textContent` có thể 5 từ hoặc 200 từ — cùng layout config. Text dài bị tràn, text ngắn nhìn trống.

**Fix**: Dynamic layout adjustment based on text density.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- Thêm logic: nếu `textContent.length > 120`, giảm fontSize scale và tăng maxWidth
- Nếu `textContent.length < 20`, tăng fontSize scale và giảm maxWidth cho dramatic effect
- Override vào overlayConfig trước khi gửi

---

### Phase E: Decorative Elements cho Listicle (Gap #4)
**Impact: Medium | Effort: Medium**

**Problem**: Listicle slides thiếu visual indicators — slide number badge, progress dots, divider lines.

**Fix**: Thêm decorative overlay elements cho listicle style.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- Khi `carouselStyle === 'listicle'` và `slideRole === 'body'`: thêm `decorations` param
  - `slideNumber` badge (circle with number)
  - `progressDots` (filled dots showing position in sequence)

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Carousel overlay mode: render `decorations.slideNumberBadge` (top-left circle) và `decorations.progressDots` (bottom center)

---

### Phase F: Seamless Quality Validation (Gap #2)
**Impact: Low-Medium | Effort: Medium**

**Problem**: Seamless continuity chỉ truyền prompt hints, không validate output. 2 adjacent slides có thể hoàn toàn khác biệt về màu sắc.

**Fix**: Post-generation scene description extraction.

**File**: `supabase/functions/generate-carousel-image/index.ts`
- Sau khi generate background thành công, extract `sceneDescription` từ AI response text (bgData.choices[0].message.content)
- Return `sceneDescription` trong response để frontend chain vào slide tiếp theo (thay vì dùng slide.objective)

**File**: `src/components/CarouselViewer.tsx`
- `handleGenerateAllImages`: dùng `response.sceneDescription` cho `previousSceneDescription` thay vì `slide.objective`

---

### Implementation Order
```text
Phase A (Gallery gradient)     → 1-2 giờ
Phase D (Text fitting)         → 1 giờ  
Phase C (Brand colors)         → 1-2 giờ
Phase B (Multi-layer text)     → 3-4 giờ
Phase E (Listicle decorations) → 2-3 giờ
Phase F (Seamless validation)  → 2 giờ
```

### Files Changed Summary
| File | Phases |
|------|--------|
| `generate-carousel-image/index.ts` | A, B, C, D, E, F |
| `overlay-text-canvas/index.ts` | A, B, C, E |
| `src/components/CarouselViewer.tsx` | F |

