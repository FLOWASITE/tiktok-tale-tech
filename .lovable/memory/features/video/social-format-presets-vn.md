---
name: Social Format Presets cho Video Script
description: Picker Platform×Format ở ScriptFormStepper, group theo Short-form/Long-form, auto-default + quick-pick chips + sticky summary cho luồng tạo Video Script (purpose=ai_video)
type: feature
---

# Social Format Presets

## Khi nào áp dụng
- Wizard `ScriptFormStepper` có **step riêng "Định dạng Social"** (STEP_SOCIAL_FORMAT=2) chỉ render khi `script_purpose === 'ai_video'`
- STEPS dynamic qua `buildSteps(isVideoAi)`: ai_video → 3 steps; khác → 2 steps (skip step 2)
- Step Generate hiển thị badge summary "TikTok Standard · 30s · 9:16" + chip click → quay về STEP_SOCIAL_FORMAT
- Navigation dùng `visibleStepIds` + `currentVisibleIndex`; auto-snap về STEP_CONTENT nếu currentStep bị ẩn do đổi purpose

## Step 2 UX (đã hoàn thiện)

### Auto-default
- Khi user lần đầu vào Step 2 mà `social_format_id` rỗng → tự set `DEFAULT_PRESET_ID = 'tiktok-standard'` (30s, 9:16) qua useEffect
- Tránh trạng thái "Mặc định · 60s · 9:16" mơ hồ ban đầu

### Quick-pick chips (top step)
- 3 preset phổ biến nhất từ `getQuickPickPresets()`: TikTok Standard, Reels Short, YouTube Standard
- Hàng ngang scroll-x với label "Nhanh", chip có icon platform + duration
- Click → set preset luôn không cần duyệt picker

### Compact hero
- Icon-square 8x8 inline + title + 1 dòng subtitle
- Tiết kiệm vertical space cho picker chính

### Picker (SocialFormatPicker)
- 2 group rows:
  - **Short-form** (TikTok, Reels, Shorts, Pinterest, Threads): mobile horizontal scroll-snap, desktop grid-cols-5
  - **Long-form** (Facebook, LinkedIn, X, YouTube): mobile grid-cols-2, desktop grid-cols-4
- Mỗi group có header bold + tagline group
- Format card (Ngắn/Vừa/Dài) hiển thị:
  - Format label
  - Duration shortLabel + `<AspectMini>` visual rectangle scale theo 9:16/1:1/16:9
  - Aspect ratio text (mono)
  - `preset.description` (line-clamp-2, tone/use-case)
  - Badge "✨ Phổ biến" góc top-right cho preset `recommended` (mặc định = `format='standard'`)
  - Selected → ring + check icon
- Alert card khi `duration > 60`: hiện scenes + ước tính render minutes (`getEstimatedScenes`, `getEstimatedRenderMinutes`)

### Sticky summary
- Card sticky `bottom-0` với backdrop-blur, hiển thị:
  - "Đã chọn: {preset.label}"
  - 3 mono chip: `{duration}s` · `{aspect}` · `{N scenes}`
- Collapsible "Tinh chỉnh thời lượng thủ công" → DurationSelector (override → reset social_format_id)

## Layout 2 group (picker)
- **Short-form Video** (vertical, ≤90s): TikTok, Reels, Shorts, FB Reels, Pinterest, Threads → `md:grid-cols-6`
- **Standard / Long-form** (1:1 hoặc 16:9): Facebook, LinkedIn, X, YouTube → `md:grid-cols-4`
- Helper `getPlatformsByGroup(group)` trong `socialFormat.ts`
- `SOCIAL_GROUP_LABELS` cung cấp label + description header

## Preset matrix (10 platforms × 3 formats = 30 presets) — 2026 spec
| Platform | Short | Standard | Long | Aspect | channelKey | Group |
|---|---|---|---|---|---|---|
| TikTok | 15s | 30s ⭐ | 60s | 9:16 | tiktok | short-form |
| Reels (IG) | 15s ⭐(quick) | 30s | **90s** | 9:16 | reels | short-form |
| Shorts (YT) | 15s | 30s | 60s | 9:16 | shorts | short-form |
| **FB Reels** | 15s | 30s | 90s | 9:16 | facebook | short-form |
| Pinterest | 15s | 30s ⭐ | 60s (Idea Pin) | **2:3** native / 9:16 long | generic | short-form |
| Threads | 15s | 30s | 60s | 9:16 | generic | short-form |
| Facebook (Feed) | 30s | 60s | 90s | 1:1 | facebook | long-form |
| LinkedIn | 30s | 60s | 90s | **16:9** | generic | long-form |
| X (Twitter) | 30s | 60s | **140s** | 1:1 | generic | long-form |
| YouTube | 60s ⭐(quick) | 180s | 600s | 16:9 | youtube | long-form |

⭐ = `recommended` (format='standard') | ⭐(quick) = trong `QUICK_PICK_PRESET_IDS`
Source of truth: `src/types/socialFormat.ts` (`SOCIAL_FORMAT_PRESETS`).

## Helpers (socialFormat.ts)
- `DEFAULT_PRESET_ID = 'tiktok-standard'` — auto-default khi vào step
- `QUICK_PICK_PRESET_IDS` + `getQuickPickPresets()` — 3 chip nhanh
- `isRecommendedPreset(preset)` — derive từ `recommended === true || format === 'standard'`
- `getEstimatedScenes(duration)` — `Math.ceil(duration / 10)` cho cảnh báo
- `getEstimatedRenderMinutes(scenes)` — ~30s/scene avg

## Behavior
- Chọn preset → setFormData cập nhật cả `duration`, `aspect_ratio`, `social_format_id`
- Override Duration thủ công → reset `social_format_id = undefined`
- `Duration` type: `15 | 30 | 60 | 90 | 120 | 140 | 180 | 600` (140 cho X Premium)
- `SocialFormatPicker` sync `activePlatform` khi `value` thay đổi từ ngoài (quick-pick chip)

## Pipeline
- `useScripts.generateScript` spread `...formData` → edge `generate-script` nhận sẵn `aspect_ratio` + `social_format_id`
- Script chuyển Studio qua `ScriptToVideoContext`, propagate `aspect` per-scene
- `generate-video-prompt` nhận `channel` (từ `preset.channelKey`) + `aspect_ratio`
- Pinterest/Threads/X dùng `channelKey: 'generic'` (chưa có template prompt video riêng)

## UI tokens
- Soft Luxury: neutral `border-foreground/30 bg-foreground/[0.04]` khi active
- ChannelIcon mapping: reels→instagram, shorts→youtube, x→twitter
- AspectMini: 9:16 `w-2.5 h-[18px]`, 16:9 `w-[18px] h-2.5`, 1:1 `w-3 h-3`
- Sticky summary: `backdrop-blur-sm` + `bg-gradient-to-t from-background`
