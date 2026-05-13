---
name: Carousel Preset DNA
description: 6 visual preset có DNA cụ thể (palette + typography + editorial reference) thay vì keywords generic
type: design
---

# Carousel Preset DNA

## Single source of truth
`supabase/functions/_shared/carousel-preset-dna.ts` — `PRESET_DNA: Record<VisualPresetKey, PresetDNA>` định nghĩa cho 6 preset:
- `minimalist` — Aesop/Kinfolk: paper #F8F6F2 + ink #1A1A1A + Fraunces/Söhne
- `flat_design` — Stripe/Linear: block màu cứng + Archivo Black/IBM Plex
- `gradient` — Linear/Arc: mesh gradient + glassmorphism + Migra/Geist
- `geometric` — Pentagram/NYT Mag: navy #0B1F3A + ivory + gold + Domaine
- `illustration` — Notion/Headspace: cream + terracotta + sage + Recoleta
- `product_only` — Aesop/Apple Store: studio paper + Tiempos

Token `BRAND_PRIMARY` trong palette được replace bằng `brandColors.textColor` runtime.

## Pipeline
1. `buildPresetDirective(preset, brandPrimary)` → block "PRESET DNA" inject vào prompt PART 2.5 (sau brand color, trước style).
2. `getPresetFonts(preset)` → override `displayFont`/`bodyFont` trong `ARCHETYPE_SPECS` của `carousel-creative-direction.ts` cho archetype `editorial-hero`/`supporting-body`/`caption-only` (data-display & cta-poster giữ font condensed riêng).
3. UI `VisualPresetSelector.PRESET_PREVIEW` + `VISUAL_PRESET_OPTIONS` mirror đúng palette + tên font preset DNA.

## Quy tắc
- KHÔNG bao giờ hardcode `Inter` hay `Helvetica` trong archetype — luôn dùng "neo-grotesk" làm fallback character.
- Khi thêm preset mới: cập nhật cả `PRESET_DNA`, `VisualPresetType`, `VISUAL_PRESET_OPTIONS`, `PRESET_PREVIEW` đồng bộ.
- Forbidden list của preset là hard rule — không nới ra chỉ vì brand color hợp.
