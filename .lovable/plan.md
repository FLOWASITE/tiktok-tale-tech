## Mục tiêu

Nâng tầm thẩm mỹ (màu sắc + typography) cho **TẤT CẢ 6 visual preset** carousel: `minimalist`, `flat_design`, `gradient`, `geometric`, `illustration`, `product_only`. Hết generic Inter / màu chung chung — mỗi preset có DNA design riêng, có reference editorial cụ thể.

## Phân tích vấn đề hiện tại

1. `image-prompt-data.ts` keywords quá generic (vd: "minimalist, clean, soft palette") → AI render kiểu PowerPoint.
2. `carousel-creative-direction.ts` `ARCHETYPE_SPECS` hardcode `Inter` cho 3/5 archetype — mâu thuẫn với chính FORBIDDEN block "no Inter, no Helvetica".
3. Không có **tonal palette** theo preset — chỉ inject 1 brand color, AI tự bịa các màu còn lại.
4. Không có **reference language** (Aesop / Kinfolk / Pentagram / Stripe…) → AI không có "neo" thẩm mỹ.

## Thiết kế mới — 6 Preset DNA

| Preset | Color philosophy | Display font | Body font | Reference |
|---|---|---|---|---|
| **minimalist** | Off-white `#F8F6F2` + ink `#1A1A1A` + warm grey `#8A8A87` + 1 brand accent ≤5% | Fraunces / GT Sectra (modern serif) | Söhne / GT America (neo-grotesk) | Aesop, Kinfolk, Apple Notes |
| **flat_design** | 2 màu primary tương phản cao + 1 accent saturated, no gradient | Archivo Black / Druk Wide | IBM Plex Sans | Stripe, Linear, Vercel |
| **gradient** | Mesh gradient 3-4 stop từ brand accent → analogous, glassmorphism | Migra / Editorial New | Inter Display / Geist | Linear changelog, Arc browser, Rauno |
| **geometric** | Navy `#0B1F3A` + ivory `#F4EFE6` + gold `#C9A961` | Domaine Display / Canela | Söhne / Sohne Breit | Pentagram, NYT Magazine, Aesthete |
| **illustration** | Warm cream `#FDF6EC` + terracotta `#E07A5F` + sage `#83A275` + ink | Recoleta / Tiempos Headline | Nunito / Outfit | Notion illustrations, Headspace |
| **product_only** | Studio neutral (paper white, contact shadow) + brand accent on product only | Tiempos Headline / Editorial New | Söhne | Aesop product page, Apple Store |

Mỗi preset gắn thêm:
- `negativeKeywords` cụ thể (vd minimalist cấm "tech UI / centered text / gradient"; flat_design cấm "Inter / pastel / shadow")
- `compositionRule` (grid, alignment, negative space %)
- `referenceCue` (1 dòng "in the editorial language of …")

## Refactor plan

### File 1: `supabase/functions/_shared/image-prompt-data.ts`
Refactor 6 entries trong `IMAGE_STYLE_PRESETS`: thay `keywords` flat thành object `{ palette, typography, composition, reference, negative }`. Giữ backward-compat: vẫn export 1 `keywords[]` flatten cho các caller cũ.

### File 2: `supabase/functions/_shared/carousel-creative-direction.ts`
- Thêm `PRESET_TYPOGRAPHY: Record<VisualPreset, {display, body}>` map preset → font character.
- Sửa `buildTypographyDirective` nhận thêm `visualPreset`, override `spec.displayFont` / `spec.bodyFont` từ `PRESET_TYPOGRAPHY` (preset wins over archetype default).
- Bỏ `Inter` khỏi `ARCHETYPE_SPECS` — thay bằng "neo-grotesk with refined letter spacing" làm fallback chung.
- Thêm function `buildPaletteDirective(visualPreset, brandPrimary, brandSecondary?)` trả 5-6 dòng "Palette: paper #F8F6F2 (60%), ink #1A1A1A (30%), brand accent #XXX (5%)…" — inject vào prompt.

### File 3: `supabase/functions/_shared/image-prompt-style-computer.ts`
Khi brand chưa có secondary color → dùng tonal palette từ preset (không để AI bịa).

### File 4: `supabase/functions/generate-carousel-image/index.ts`
- Gọi `buildPaletteDirective(visualPreset, …)` và `buildTypographyDirective(archetype, …, visualPreset)` (truyền thêm preset).
- Thêm 1 dòng `referenceCue` của preset vào cuối prompt: `"Editorial reference: ${reference}"`.

### File 5: `supabase/functions/_shared/carousel-image-batch-payload.ts`
Truyền `visualPreset` xuyên suốt nếu chưa có.

### File 6 (UI — chỉ label/description, KHÔNG đổi value):
`src/components/carousel/VisualPresetSelector.tsx` + `src/types/carousel.ts`
- Cập nhật `PRESET_PREVIEW` colors + font name đúng với preset DNA mới (vd minimalist → `["#F8F6F2","#1A1A1A","#8A8A87"]`, font `Fraunces`).
- Cập nhật `description` ngắn gọn theo DNA mới (vd "Editorial Aesop-like" thay vì "tối giản, font Inter").

## QA

1. Generate 1 carousel 5 slide × 6 preset (test matrix).
2. Spot-check log `[creative-direction]` confirm prompt chứa: hex codes cụ thể + tên font theo bảng + reference cue.
3. Visual diff trước/sau: text crisp, palette consistent, không còn "AI generic".

## Ngoài phạm vi (không làm trong plan này)

- Đổi cấu trúc DB `carousel_style_presets` (giữ nguyên schema)
- Đổi routing provider (GeminiGen vẫn là primary)
- Đổi UI selector layout — chỉ refresh nội dung mô tả
- Migration cho carousel cũ — preset mới chỉ áp cho generate-mới

## Câu hỏi xác nhận

1. **Tên font có hợp pháp không?** Các font Fraunces/Söhne/Druk/Domaine/Recoleta là tên gọi mô tả character cho AI image gen — **không phải embed font thật vào app**. AI sẽ render theo character. OK?
2. **Có muốn giữ tên hiển thị cũ** trong UI ("Clean Modern", "Bold Infographic"…) hay đổi theo DNA mới ("Editorial Aesop", "Stripe Flat"…)? Mặc định plan này **giữ tên cũ**, chỉ đổi description + preview swatch.
