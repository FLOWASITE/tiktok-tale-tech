

# Phase 0: Tạo Design Token System — `carousel_style_presets`

## Scope

1. **Migration**: Tạo bảng `carousel_style_presets` + seed 6 presets
2. **RLS**: Authenticated users READ, service_role WRITE
3. **Helper**: `src/lib/carouselStylePresets.ts` — query + cache 5 phút

## Chi tiết kỹ thuật

### 1. Migration SQL

Tạo bảng với schema:
- `id` uuid PK, `preset_key` text UNIQUE, `display_name` text, `tokens` jsonb, `overlay_config` jsonb, `is_active` boolean DEFAULT true, `created_at`/`updated_at` timestamptz

RLS policies:
- `SELECT` cho `authenticated`
- `INSERT/UPDATE/DELETE` chỉ cho `service_role` (dùng `to service_role`)

Seed 6 presets (minimalist, flat_design, gradient, geometric, illustration, product_only) với đầy đủ design tokens theo spec (colors, typography, layout, effects, safeZone) và overlay_config theo slide role (hook, body, cta, dataPoint, quote, visual).

### 2. Frontend Helper — `src/lib/carouselStylePresets.ts`

```text
carouselStylePresets.ts
├── In-memory cache Map<string, {data, timestamp}>
├── CACHE_TTL = 5 * 60 * 1000 (5 min)
├── getStylePreset(presetKey: string) → Promise<preset | null>
│   ├── Check cache → return if fresh
│   ├── Query supabase.from('carousel_style_presets').select('*').eq('preset_key', key).single()
│   └── Store in cache + return
└── getAllStylePresets() → Promise<preset[]>
```

Export TypeScript interface `CarouselStylePreset` matching the DB schema.

### 3. Không thay đổi code existing

Chỉ tạo mới: 1 migration, 1 helper file. Không sửa bất kỳ file nào đang có.

