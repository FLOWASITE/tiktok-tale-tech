## Layer 7: Creative Director + Typography Art Direction

Combo **A' + C**: thêm 1 LLM step "Art Director" trước batch (sinh metaphor + mood arc + typo role per slide), sau đó nâng cấp `TEXT RENDERING` block trong từng prompt thành 1 typography system thực sự (vẫn để AI render text, không Canvas).

Mục tiêu fix 3 điểm yếu lớn nhất theo eval gần nhất:
- Typography craft 4/10 → 7/10
- Color storytelling 5.5/10 → 8/10
- Conceptual originality 5/10 → 7/10

---

### C — Creative Director Step (1 LLM call/carousel)

**File mới:** `supabase/functions/_shared/carousel-creative-direction.ts`

Export `runCreativeDirection({ topic, carouselStyle, visualPreset, slides, brandColors, organizationId })` → trả về:

```ts
{
  metaphor: { chosen: string; rejected: string[]; reasoning: string },
  moodArc: Array<{ slideNumber: number; role: 'hook'|'explain'|'data'|'support'|'cta';
                   contrast: 'high'|'mid'|'low'; saturation: 'bold'|'muted'|'accent';
                   focalIntent: string }>,
  typographyRole: Array<{ slideNumber: number; archetype: 'editorial-hero'|'data-display'|'supporting-body'|'cta-poster'|'caption-only' }>
}
```

Internals:
- 1 call tới Lovable Gateway, model mặc định `google/gemini-2.5-flash` (admin override qua `ai_function_configs.function_name='carousel-creative-direction'`)
- Tool calling structured output (schema cố định)
- Prompt: "Bạn là Creative Director cho 1 carousel `{slideCount}` slides về `{topic}`. Sinh 3 metaphor abstract (loại bỏ literal: mũi tên, biểu đồ, circuit board, neon). Chọn 1 metaphor mạnh nhất. Sinh mood arc theo slide role (hook tension cao → explain mid → data focal → cta resolve). Map mỗi slide vào 1 typography archetype."
- Fail-soft: lỗi/timeout 8s → return `null`, batch tiếp tục với pipeline cũ
- Persist vào `carousels.creative_direction` (JSONB, cột mới)

**Inject vào batch** (`generate-carousel-images-batch/index.ts`):
- Gọi `runCreativeDirection` 1 lần đầu batch (parallel với resolve logo/org)
- Truyền `creativeDirection` vào mỗi `generate-carousel-image` request:
  ```ts
  body: { ..., creativeDirection: cd ? {
    metaphor: cd.metaphor.chosen,
    moodForSlide: cd.moodArc[i],
    typographyRole: cd.typographyRole[i].archetype
  } : null }
  ```
- Inject metaphor vào `seamlessContext.previousSceneDescription` cho slide 1 (replace generic topic):
  `LOCKED VISUAL METAPHOR (use throughout series): {metaphor.chosen}`

---

### A' — Typography Art Direction trong PROMPT (giữ AI render text)

**File:** `supabase/functions/generate-carousel-image/index.ts`

Thêm helper `buildTypographySystem(typographyRole, textContent, visualPreset, slideRole)` → trả về 1 block thay thế `TEXT RENDERING` cũ (lines 1496-1581).

**5 typography archetypes** (mỗi cái có font pairing + size ratio + composition rule):

| Archetype | Display Font Hint | Body Font Hint | Size Ratio | Composition |
|---|---|---|---|---|
| `editorial-hero` | Playfair / Fraunces (serif, high contrast) | Inter (clean sans) | 8:1 | Left-aligned, hanging punctuation, generous leading 1.4 |
| `data-display` | Archivo Black / Bebas Neue (condensed bold) | IBM Plex Mono (mono) | 12:1 | Center, tight tracking on number, label in uppercase 0.15em tracking |
| `supporting-body` | Inter Bold | Inter Regular | 3:1 | Left, comfortable measure 45ch, leading 1.6 |
| `cta-poster` | Druk / Anton (massive sans) | Inter | 6:1 | Center, all-caps, 0.05em tracking, single line |
| `caption-only` | Inter Medium | — | 1:1 | Bottom-left corner, 0.1em tracking, low-contrast ghost text |

Pairing fallback theo `visualPreset`:
- `flat_design` / `minimalist` → editorial-hero default
- `geometric` (corporate) → data-display + Playfair
- `illustration` → supporting-body với Nunito
- `gradient` → cta-poster với Druk

**Block mới (đơn giản hoá ví dụ — file thực tế sẽ có instruction chi tiết hơn):**
```
TYPOGRAPHIC SYSTEM (museum-grade — execute as a master typographer would):
Archetype: {archetype}
Display font: {displayFontHint} (or visually identical alternative)
Body font: {bodyFontHint}
Size ratio (display:body): {ratio}
Hierarchy (top to bottom):
  1. {dataValue} — display weight, {ratio}x base size, tight tracking -0.02em, hanging if punctuation
  2. {headline} — display weight, base size × 4, leading 1.2
  3. {subtitle} — body regular, base size × 1.5, leading 1.5, color 70% opacity
  4. {caption} — body medium UPPERCASE, base size × 0.6, tracking 0.15em
Composition: {compositionRule}
Optical adjustments: kern manually for each character; numerals tabular; quotes typographic ("" not ""); avoid widow/orphan.
NO generic "modern sans" fallback — commit to the archetype.
```

Anti-pattern guard append vào `antiHallucinationGuard`:
- "DO NOT use Helvetica/Arial/default web fonts for display text — commit to the archetype font character."
- "DO NOT center text when archetype says left-aligned. Composition rule is mandatory."

---

### Database

Migration: 
```sql
ALTER TABLE carousels ADD COLUMN creative_direction JSONB;
```

(Dùng cho debugging A/B + future analytics; không phá schema cũ.)

---

### Validation

1. Regen carousel `2454080d-060b-4e09-9666-e1be0cc2f5c3` (educational + flat_design):
   - Check `carousels.creative_direction` populated
   - 4 slides phải dùng metaphor abstract chung (không còn mũi tên/biểu đồ literal)
   - Hook slide vs CTA slide phải có **font weight contrast rõ rệt** (hero serif vs poster sans)
   - Color saturation slide hook > slide explain (mood arc working)
2. Test 1 carousel với `creative_direction = null` (giả lập fail) → confirm fall-back về Layer 4-6 hoạt động bình thường
3. Edge function logs: 1 dòng `[creative-direction]` mỗi carousel với metaphor chosen + tokens used
4. Eval mới:
   - Typography craft target ≥ 7/10
   - Color storytelling target ≥ 8/10  
   - Originality target ≥ 7/10

---

### Out of scope (defer)

- Layer 8 Aesthetic Scoring + Auto-Refine (đợi A'+C có baseline tốt)
- UI để user chọn manual archetype per slide
- Custom font upload per brand
- Ablation logging (so sánh A/B với feature flag)

---

### Files changed

- **NEW**: `supabase/functions/_shared/carousel-creative-direction.ts`
- **NEW**: migration `add_creative_direction_to_carousels.sql`
- **EDIT**: `supabase/functions/generate-carousel-images-batch/index.ts` (gọi creative-direction + pass-through)
- **EDIT**: `supabase/functions/generate-carousel-image/index.ts` (signature thêm `creativeDirection`, replace TEXT RENDERING block bằng `buildTypographySystem`)
- **EDIT**: `.lovable/memory/features/carousel/aesthetic-guardrails-vn.md` (Layer 7 section)
