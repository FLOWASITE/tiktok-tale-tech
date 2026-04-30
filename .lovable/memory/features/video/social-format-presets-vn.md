---
name: Social Format Presets cho Video Script
description: Picker Platform×Format ở ScriptFormStepper, auto-set duration + aspect_ratio cho luồng tạo Video Script (purpose=ai_video)
type: feature
---

# Social Format Presets

## Khi nào áp dụng
- Bước "Cấu hình" trong `ScriptFormStepper` khi `script_purpose === 'ai_video'`
- Chip `SocialFormatPicker` hiển thị TRƯỚC chip Duration

## Preset matrix
| Platform | Short | Standard | Long | Aspect |
|---|---|---|---|---|
| TikTok | 15s | 30s | 60s | 9:16 |
| Reels | 15s | 30s | 60s | 9:16 |
| Shorts | 15s | 30s | 60s | 9:16 |
| Facebook | 30s | 60s | 90s | 1:1 |
| LinkedIn | 30s | 60s | 90s | 1:1 |
| YouTube | 60s | 180s | 600s | 16:9 |

Source of truth: `src/types/socialFormat.ts` (`SOCIAL_FORMAT_PRESETS`).

## Behavior
- Chọn preset → setFormData cập nhật cả `duration`, `aspect_ratio`, `social_format_id`
- Override Duration thủ công → reset `social_format_id = undefined`
- Duration > 60s hiện cảnh báo "Sẽ chia thành N scenes × 10s do giới hạn AI video model"
- `Duration` type mở rộng: `15 | 30 | 60 | 90 | 120 | 180 | 600`

## Pipeline
- `useScripts.generateScript` spread `...formData` → edge function `generate-script` nhận sẵn `aspect_ratio` + `social_format_id`
- Khi script chuyển sang Studio qua `ScriptToVideoContext`, propagate `aspect` per-scene từ aspect_ratio này
- `generate-video-prompt` nhận `channel` (map từ `preset.channelKey`) + `aspect_ratio`

## UI
- Soft Luxury: neutral `border-foreground/30 bg-foreground/[0.04]` khi active
- Platform icons dùng `ChannelIcon` (reels→instagram, shorts→youtube)
- Segmented control 3-cột Short/Standard/Long
