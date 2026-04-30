---
name: Social Format Presets cho Video Script
description: Picker Platform×Format ở ScriptFormStepper, group theo Short-form/Long-form, auto-set duration + aspect_ratio cho luồng tạo Video Script (purpose=ai_video)
type: feature
---

# Social Format Presets

## Khi nào áp dụng
- Wizard `ScriptFormStepper` có **step riêng "Định dạng Social"** (STEP_SOCIAL_FORMAT=2) chỉ render khi `script_purpose === 'ai_video'`
- STEPS dynamic qua `buildSteps(isVideoAi)`: ai_video → 3 steps (Nội dung → Định dạng Social → Tạo kịch bản); khác → 2 steps (skip step 2)
- Step Generate hiển thị badge summary "TikTok Short · 15s · 9:16" + nút chip click → quay lại STEP_SOCIAL_FORMAT để đổi
- Override Duration nằm trong Collapsible "Tinh chỉnh thủ công" tại step Social Format
- Navigation dùng `visibleStepIds` + `currentVisibleIndex` để skip step ẩn; auto-snap về STEP_CONTENT nếu currentStep bị ẩn do đổi purpose

## Layout 2 group
- **Short-form Video** (9:16, ≤60s): TikTok, Reels, Shorts, Pinterest, Threads — `grid-cols-3 md:grid-cols-5`
- **Standard / Long-form** (1:1 hoặc 16:9): Facebook, LinkedIn, X, YouTube — `grid-cols-2 md:grid-cols-4`
- Helper `getPlatformsByGroup(group)` trong `socialFormat.ts` trả danh sách platform giữ thứ tự gốc
- `SOCIAL_GROUP_LABELS` cung cấp label + description hiển thị trên header mỗi nhóm

## Preset matrix (9 platforms × 3 formats = 27 presets)
| Platform | Short | Standard | Long | Aspect | channelKey | Group |
|---|---|---|---|---|---|---|
| TikTok | 15s | 30s | 60s | 9:16 | tiktok | short-form |
| Reels | 15s | 30s | 60s | 9:16 | reels | short-form |
| Shorts | 15s | 30s | 60s | 9:16 | shorts | short-form |
| Pinterest | 15s | 30s | 60s | 9:16 | generic | short-form |
| Threads | 15s | 30s | 60s | 9:16 | generic | short-form |
| Facebook | 30s | 60s | 90s | 1:1 | facebook | long-form |
| LinkedIn | 30s | 60s | 90s | 1:1 | generic | long-form |
| X (Twitter) | 30s | 60s | **140s** | 1:1 | generic | long-form |
| YouTube | 60s | 180s | 600s | 16:9 | youtube | long-form |

Source of truth: `src/types/socialFormat.ts` (`SOCIAL_FORMAT_PRESETS`).

## Behavior
- Chọn preset → setFormData cập nhật cả `duration`, `aspect_ratio`, `social_format_id`
- Override Duration thủ công → reset `social_format_id = undefined`
- Duration > 60s hiện cảnh báo "Sẽ chia thành N scenes × 10s do giới hạn AI video model"
- `Duration` type mở rộng: `15 | 30 | 60 | 90 | 120 | 140 | 180 | 600` (140 cho X Premium ngưỡng free 2:20)
- `DURATION_LABELS` + `DurationSelector.DURATION_CONFIG` đã include 140

## Pipeline
- `useScripts.generateScript` spread `...formData` → edge function `generate-script` nhận sẵn `aspect_ratio` + `social_format_id`
- Khi script chuyển sang Studio qua `ScriptToVideoContext`, propagate `aspect` per-scene từ aspect_ratio này
- `generate-video-prompt` nhận `channel` (map từ `preset.channelKey`) + `aspect_ratio`
- Pinterest/Threads/X dùng `channelKey: 'generic'` (chưa có template prompt riêng cho video)

## UI
- Soft Luxury: neutral `border-foreground/30 bg-foreground/[0.04]` khi active
- Platform icons dùng `ChannelIcon` (reels→instagram, shorts→youtube, x→twitter)
- Mỗi group có header: bold label + tagline mô tả
- Segmented control 3-cột Short/Standard/Long phía dưới
