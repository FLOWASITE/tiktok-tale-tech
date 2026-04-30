## Vấn đề

Step 2 ("Nền tảng video") trong ScriptFormStepper đã thu thập `social_format_id` + `aspect_ratio` (TikTok 9:16, Reels 9:16, Shorts 9:16, Pinterest 2:3, FB Feed 4:5, YouTube 16:9...) và truyền lên edge function `generate-script` — nhưng **edge function bỏ qua hoàn toàn** 2 field này. Hậu quả:

- Prompt `ai_video` mặc định gắn cứng `[00:00-00:08]` (8s/scene) → mismatch với nền tảng tạo clip thực tế (Seedance default 5-6s, Veo 3 Fast 6-8s, Wizard chia scene theo 6s).
- Visual rule generic "Medium shot, soft lighting" — không nói đến **aspect ratio**, **safe zone** cho text overlay (TikTok cần chừa 220px top + 480px bottom cho UI), không có **vertical framing** cho 9:16.
- Không có hint về **scene continuity** (background/wardrobe nhất quán giữa các PROMPT) → khi stitch lại MP4 sẽ giật.
- Số PROMPT không khớp với `getEstimatedScenes(preset)` → Wizard tạo thừa/thiếu scene so với kịch bản.
- Pinterest 2:3, FB Feed 4:5 đều bị xử lý như 9:16 generic → smart-crop của render-video-creatomate hoạt động nhưng nội dung visual ban đầu sai khung hình.

## Mục tiêu

Sửa duy nhất prompt của `generate-script` để mỗi PROMPT/scene xuất ra **đúng nền tảng đích**: aspect ratio, scene duration, scene count, framing rules, text-safe zone, continuity hints.

## Phạm vi

**Chỉ một file:** `supabase/functions/generate-script/index.ts`

Không động vào: UI form, ScriptToVideoContext, Wizard, render edge functions, DB schema.

## Thay đổi

### 1. Destructure 2 field mới (line 1491)

```ts
let { topic, duration, video_type, character_type, script_purpose,
      voice_region, dialogue_style, social_format_id, aspect_ratio, /* mới */
      brandTemplateId, ... } = await req.json();
```

### 2. Thêm preset table trong edge function

Tạo constant `VIDEO_PLATFORM_SPECS` map từ `social_format_id` (vd `tiktok-standard`, `reels-short`, `pinterest-standard`, `fb-feed-standard`, `youtube-long`...) → spec object:

```ts
{
  platformLabel: 'TikTok',
  aspect: '9:16',
  sceneDurationSec: 6,        // align với Seedance/Veo Fast
  recommendedScenes: 5,       // = ceil(duration / sceneDurationSec)
  framingHint: 'Vertical framing, subject center, head ~upper third',
  safeZone: 'Chừa top 220px (UI), bottom 480px (caption + CTA)',
  textOverlayPosition: 'Center-upper, font 56-72px, max 6 từ',
  cameraStyle: 'Static or slow push-in (giữ subject in-frame khi crop)',
  continuityRules: 'Wardrobe + background + lighting NHẤT QUÁN giữa các PROMPT',
}
```

Có ~10 preset (đủ map từ `SOCIAL_FORMAT_PRESETS`). Default fallback = TikTok 9:16 6s.

### 3. Helper mới `getPlatformSpec(socialFormatId, aspectRatio, duration)`

Trả về spec; nếu `socialFormatId` không match thì compose từ `aspect_ratio` + duration (graceful degrade cho old payloads).

### 4. Sửa `getOutputFormat()` cho case `ai_video`

Thay `[00:00-00:08]` cứng bằng `[00:00-00:0{spec.sceneDurationSec}]` động. Thêm 2 dòng vào `[VISUAL DIRECTION]`:
```
• Aspect: ${spec.aspect} (${spec.platformLabel})
• Framing: ${spec.framingHint}
• Safe zone: ${spec.safeZone}
```
Thêm dòng cuối `[CONTINUITY]: Match wardrobe/background/lighting với PROMPT trước đó (chỉ subject action thay đổi).`

### 5. Sửa `getPurposeVisualRules()` case `ai_video`

Mở rộng từ 4 dòng generic thành block đầy đủ:
- Aspect & framing rules theo `spec`
- Text-safe zone (vital cho TikTok/Reels caption không bị che)
- Camera style align với aspect (vertical = static/slow push, horizontal = có thể pan)
- **Continuity contract**: subject/wardrobe/lighting/background NHẤT QUÁN xuyên suốt (Seedance/Veo không nhớ giữa lần generate).

### 6. Sửa `getPromptCount(duration)` → ưu tiên `spec.recommendedScenes`

Khi có `spec`, dùng `spec.recommendedScenes` thay vì công thức cũ. Đảm bảo Wizard chia đúng số clip (`scriptScenesCount === recommendedScenes`).

### 7. Sửa `getPurposeSelfCheck()` case `ai_video`

Thêm 2 check item mới:
```
□ ASPECT RATIO ĐÚNG ${spec.aspect}?
  - Mỗi PROMPT có chỉ định framing phù hợp ${spec.platformLabel}?
□ CONTINUITY GIỮA CÁC PROMPT?
  - Wardrobe/background nhất quán?
  - Không thay đổi setting đột ngột?
```

### 8. Truyền `spec` vào `buildSystemPrompt()`

Thêm param thứ 12 `platformSpec?: PlatformSpec`. Pass xuống các helper. Thêm 1 block ngắn ở đầu system prompt:

```
# 🎬 NỀN TẢNG ĐÍCH
- Platform: ${spec.platformLabel}
- Aspect ratio: ${spec.aspect}
- Mỗi clip: ${spec.sceneDurationSec}s (giới hạn AI video generator)
- Tổng số PROMPT: ${spec.recommendedScenes}
- Mọi visual direction PHẢI tuân thủ framing & safe zone của ${spec.platformLabel}.
```

### 9. Log để debug

```ts
console.log('[generate-script] Platform spec:', spec.platformLabel, spec.aspect, `${spec.recommendedScenes}×${spec.sceneDurationSec}s`);
```

## Out of scope (pha sau)

- Sửa UI form / Wizard / render functions.
- DB migration.
- Long-form (>90s) — vẫn dùng spec mặc định.
- Per-purpose tuning cho `teleprompter` / `production` (chỉ `ai_video` đụng tới).

## Files

**Edited:**
- `supabase/functions/generate-script/index.ts` (~150 dòng thêm/sửa, không xóa logic cũ)

Bấm Approve để mình implement.