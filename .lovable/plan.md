

## Tách `buildImagePrompt()` thành Pipeline Modules

### Phân tích hiện trạng

File `image-prompt-builder.ts` (1213 dòng) chứa:
- **Lines 1-114**: Types & interfaces
- **Lines 119-185**: `IMAGE_STYLE_PRESETS` data (12 styles)
- **Lines 191-358**: `CHANNEL_IMAGE_SPECS` data (12 channels)
- **Lines 365-390**: `JOURNEY_STAGE_VISUALS` data
- **Lines 392-595**: Helper functions (`buildColorSection`, `buildPersonaVisualSection`, `buildJourneyStageSection`, `buildContentRoleSection`, `buildContentAngleSection`, `buildHookSection`)
- **Lines 600-712**: Text-in-image + structured layout builders
- **Lines 717-728**: Style preset builder
- **Lines 734-810**: Country character directives + sandwich builders
- **Lines 815-1035**: **`buildImagePrompt()` main function** (~220 dòng, 3 mode branches)
- **Lines 1040-1083**: Utility functions (`buildSimpleImagePrompt`, `getChannelAspectRatio`, `getChannelSpecs`)
- **Lines 1089-1213**: `computeStyleFromBrand()` + data maps

Hàm chính `buildImagePrompt()` thực chất chỉ ~220 dòng — phần lớn file là **data declarations** và **helper functions** đã tách sẵn. Vấn đề chính là tất cả nằm trong 1 file monolith, và main function dùng if/else branching cho 3 modes.

Caller duy nhất: `generate-brand-image/index.ts` line 391.

---

### Kiến trúc đề xuất

```text
supabase/functions/_shared/
├── image-prompt-builder.ts          ← GIỮ LẠI (re-export facade)
├── image-prompt/
│   ├── types.ts                     ← Types + interfaces
│   ├── data/
│   │   ├── channel-configs.ts       ← CHANNEL_IMAGE_SPECS
│   │   ├── style-presets.ts         ← IMAGE_STYLE_PRESETS
│   │   ├── strategic-mappings.ts    ← Journey, Role, Angle, Hook data
│   │   └── country-directives.ts   ← COUNTRY_CHARACTER_DIRECTIVES
│   ├── builders/
│   │   ├── channel-spec.ts         
│   │   ├── brand-color.ts          
│   │   ├── style-preset.ts         
│   │   ├── strategic-context.ts     ← Role + Angle + Journey + Hook
│   │   ├── persona.ts              
│   │   ├── localization.ts          ← Country prefix + suffix
│   │   ├── text-layout.ts           ← Text-in-image + structured layout
│   │   ├── creative-mode.ts         ← Mode-specific prefix (full/brand_only/raw)
│   │   └── negative-prompt.ts      
│   ├── assembler.ts                 ← Segment collector + joiner
│   └── style-computer.ts           ← computeStyleFromBrand()
```

**Tuy nhiên**, edge functions không hỗ trợ import từ subdirectories sâu một cách đáng tin cậy. Tất cả shared code phải nằm trong `_shared/`. Do đó cấu trúc thực tế:

```text
supabase/functions/_shared/
├── image-prompt-builder.ts          ← Facade (re-exports, backward compatible)
├── image-prompt-types.ts            
├── image-prompt-data.ts             ← All data constants
├── image-prompt-builders.ts         ← All builder functions  
├── image-prompt-assembler.ts        ← Assembler + PromptSegment type
└── image-prompt-style-computer.ts   ← computeStyleFromBrand()
```

### Chi tiết triển khai

#### File 1: `image-prompt-types.ts` (~85 dòng)
Move tất cả type/interface declarations (lines 17-117): `Channel`, `BrandColors`, `BrandImageContext`, `PersonaContext`, `ContentRole`, `ContentAngle`, `ImageContentType`, `TextPosition`, `TypographyStyle`, `FooterInfo`, `PromptMode`, `ImagePromptParams`, `ImageStylePreset`.

Thêm types mới:
```typescript
export interface PromptSegment {
  id: string;
  position: 'prefix' | 'core' | 'suffix';
  priority: number;
  content: string;
}

export interface PromptContext {
  params: ImagePromptParams;
  channelSpec: ChannelImageSpec;
  finalAspectRatio: string;
  isWithText: boolean;
}
```

#### File 2: `image-prompt-data.ts` (~350 dòng)
Move tất cả data constants:
- `IMAGE_STYLE_PRESETS` (lines 119-185)
- `CHANNEL_IMAGE_SPECS` (lines 191-358)
- `JOURNEY_STAGE_VISUALS` (lines 365-390)
- `CONTENT_ROLE_VISUALS` (lines 463-483)
- `CONTENT_ANGLE_VISUALS` (lines 489-523)
- `HOOK_TYPE_VISUALS` (lines 530-542)
- `COUNTRY_CHARACTER_DIRECTIVES` (lines 734-784)
- `INDUSTRY_STYLE_MAP` + `TONE_STYLE_AFFINITY` (lines 1089-1119)

#### File 3: `image-prompt-builders.ts` (~250 dòng)
Move tất cả builder functions, mỗi function trả về `PromptSegment | null`:
- `buildChannelSpec()` → segment id `channel_spec`, position `core`, priority 100
- `buildBrandColors()` → `brand_colors`, `core`, 90
- `buildStylePreset()` → `style_preset`, `core`, 95
- `buildStrategicContext()` → gộp Role + Angle + Journey + Hook → `strategic_context`, `core`, 80
- `buildPersonaVisual()` → `persona`, `core`, 60
- `buildTextLayout()` → gộp text-in-image + structured layout → `text_layout`, `core`, 50
- `buildCreativeMode()` → mode prefix → `creative_mode`, `prefix`, 100
- `buildLocalizationPrefix()` → `localization_prefix`, `prefix`, 90
- `buildLocalizationSuffix()` → `localization_suffix`, `suffix`, 100
- `buildNegativePrompt()` → `negative_prompt`, `suffix`, 50
- `buildCriticalRules()` → `critical_rules`, `suffix`, 90

#### File 4: `image-prompt-assembler.ts` (~60 dòng)
```typescript
export function assembleImagePrompt(params: ImagePromptParams): {
  prompt: string;
  trace: PromptSegment[];
} {
  const ctx = buildPromptContext(params);
  const builders = getBuilders(params.promptMode);
  const segments = builders
    .map(b => b(ctx))
    .filter(Boolean);
  // Sort by position order (prefix→core→suffix), then priority desc
  // Join with \n\n
  return { prompt, trace: segments };
}
```

#### File 5: `image-prompt-style-computer.ts` (~130 dòng)
Move `computeStyleFromBrand()` + its data maps.

#### File 6: `image-prompt-builder.ts` (facade, ~30 dòng)
```typescript
// Backward-compatible facade — caller không cần đổi gì
export { assembleImagePrompt as buildImagePrompt } from './image-prompt-assembler.ts';
export { buildSimpleImagePrompt, getChannelAspectRatio, getChannelSpecs } from './image-prompt-assembler.ts';
export { computeStyleFromBrand } from './image-prompt-style-computer.ts';
export type { /* all types */ } from './image-prompt-types.ts';
```

**Caller `generate-brand-image/index.ts` không cần thay đổi** — import path và function signature giữ nguyên.

---

### Điểm khác biệt so với đề xuất của bạn

1. **Không dùng nested folders** (`prompt-builders/data/`) — edge functions trong `_shared` hoạt động tốt nhất với flat structure
2. **PromptContext đơn giản hơn** — wrap `ImagePromptParams` thay vì tạo interface mới hoàn toàn, giảm mapping code
3. **Facade pattern** — giữ `image-prompt-builder.ts` làm re-export hub, zero breaking changes
4. **Builder functions** thay vì class instances — phù hợp Deno runtime, nhẹ hơn

### Phạm vi

| File | Dòng | Loại |
|------|------|------|
| `image-prompt-types.ts` | ~85 | Mới |
| `image-prompt-data.ts` | ~350 | Mới (move data) |
| `image-prompt-builders.ts` | ~250 | Mới (move + refactor builders) |
| `image-prompt-assembler.ts` | ~60 | Mới |
| `image-prompt-style-computer.ts` | ~130 | Mới (move) |
| `image-prompt-builder.ts` | ~30 | Rewrite (facade) |

**Tổng: 6 files, ~905 dòng (từ 1213 dòng gốc). Không thay đổi caller.**

