# Phát hiện từ record thực tế

Pull `carousel_style_presets` từ DB → **xác nhận root cause** ảnh tạo ra vẫn xấu dù đã code Preset DNA:

| preset | accent (DB) | bg (DB) | heading font (DB) | DNA mới (code) |
|---|---|---|---|---|
| minimalist | `#2563EB` xanh generic | `#FFFFFF` trắng | Inter / Helvetica | paper `#F8F6F2` + ink `#1A1A1A`, **Fraunces / Söhne** |
| flat_design | `#E94560` | `#1A1A2E` navy | Montserrat | Stripe palette, **Archivo Black / IBM Plex** |
| gradient | `#00f2fe` | mesh `#667eea→#764ba2` | Plus Jakarta | Aurora mesh từ brand, **Migra / Geist** |
| geometric | `#C9A84C` | `#0A1628` | Playfair | navy `#0B1F3A` + ivory `#F4EFE6` + gold, **Domaine / Söhne** |
| illustration | `#E07A5F` | `#FFF8F0` | Playfair | warm cream + terracotta + sage, **Recoleta / Nunito** |
| product_only | `#E53E3E` | `#FFFFFF` | Montserrat | Studio neutral + brand accent on product, **Tiempos / Söhne** |

**Pipeline đang inject 2 nguồn xung đột vào prompt:**
1. `buildBackgroundPrompt(... blendedTokens ...)` — lấy hex + font cụ thể từ DB tokens (cũ)
2. `buildPresetDirective()` — block "PRESET DNA" mới (Fraunces, paper, …)

Model thấy mâu thuẫn → bám theo hex/font cụ thể của DB (Inter, white, generic blue) → ảnh ra "PowerPoint" như user phàn nàn.

## Kế hoạch

**1 migration duy nhất** update 6 row trong `carousel_style_presets` để `tokens.colors` + `tokens.typography` khớp với DNA trong `_shared/carousel-preset-dna.ts`. Layout/spacing/safeZone giữ nguyên (các field này tốt rồi).

### Mapping cụ thể

- **minimalist** → bg `#F8F6F2`, text.primary `#1A1A1A`, text.secondary `#8A8A87`, accent `#1A1A1A`; heading `'Fraunces', 'GT Sectra', Georgia, serif`; body `'Söhne', 'GT America', 'Inter', sans-serif`
- **flat_design** → bg `#FFFFFF`, text `#0A2540`, accent `#635BFF` (Stripe purple); heading `'Archivo Black', 'Druk Wide', Impact, sans-serif`; body `'IBM Plex Sans', sans-serif`
- **gradient** → bg `linear-gradient(135deg, brand 0%, brand-dark 100%)`, text `#FFFFFF`, accent `#A78BFA`; heading `'Migra', 'Editorial New', serif`; body `'Inter Display', 'Geist', sans-serif`
- **geometric** → bg `#F4EFE6` ivory, text `#0B1F3A` navy, accent `#C9A961` gold; heading `'Domaine Display', 'Canela', 'Playfair Display', serif`; body `'Söhne', 'Inter', sans-serif`
- **illustration** → bg `#FDF6EC` cream, text `#2D2A26`, secondary terracotta `#E07A5F`, accent sage `#83A275`; heading `'Recoleta', 'Tiempos Headline', serif`; body `'Nunito', 'Outfit', sans-serif`
- **product_only** → bg `#F5F2ED` studio neutral, text `#1A1A1A`, accent = brand (filled in via `blendBrandColors`); heading `'Tiempos Headline', 'Editorial New', serif`; body `'Söhne', 'Inter', sans-serif`

### File thay đổi
- **New**: `supabase/migrations/<timestamp>_sync_carousel_preset_tokens_with_dna.sql` (6× UPDATE jsonb_set)
- **No code change** — `buildPresetDirective` + `blendBrandColors` đã đúng; chỉ cần "single source of truth" giữa DB tokens và DNA file là khớp nhau.

### QA sau migration
1. `psql` verify 6 row có hex + font mới
2. Test 1 carousel mỗi preset trên `/carousel`
3. Spot check: minimalist phải ra warm paper (không trắng tinh + xanh), geometric ra navy/ivory/gold (không black/Playfair generic)

### Lưu ý
- Font names như Fraunces/Söhne/Domaine vẫn là "character names" cho image model — model không có font thật, nhưng giờ chỉ còn **1 nguồn** font name → không bị Inter/Montserrat từ DB ghi đè nữa.
- Nếu user đã có brand color, `blendBrandColors` sẽ override `accent` → vẫn hoạt động đúng vì logic blend không đổi.
