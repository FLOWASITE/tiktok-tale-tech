## Vấn đề

Hiện `getPromptCount(duration, spec)` chỉ trả `ceil(duration / sceneDurationSec)` — cùng công thức cho mọi nền tảng. Hậu quả:

- **TikTok/Reels/Shorts 30s** → 5 scene × 6s đều nhau, mất "hook nhanh 0-3s" và pacing dồn dập đặc trưng short-form vertical (chuẩn industry: hook ≤3s, scene 2-4s, retention drop nếu scene >5s).
- **Pinterest 2:3** → cần ít scene hơn (ảnh tĩnh + slow zoom kiểu Idea Pin), nhưng đang bằng TikTok.
- **YouTube Long 600s** → bị clamp 20 scene (3-4s/scene cho 10 phút) — quá ít, kịch bản dài thường cần story beats rõ.
- **LinkedIn/Facebook Feed** → cần scene dài hơn (talking-head, B-roll chậm), nhưng đang dùng cùng 6s.

Wizard render khớp 1-1 scene → nếu prompt count sai, video pacing sai theo.

## Mục tiêu

Tính số PROMPT thông minh theo **(nền tảng × độ dài × purpose)**, không chỉ phép chia. Mỗi platform có "pacing profile" riêng dựa trên best practice short-form/long-form 2026.

## Phạm vi

**Chỉ một file:** `supabase/functions/generate-script/index.ts`

## Thay đổi

### 1. Thêm field `pacing` vào `PlatformSpec`

```ts
interface PlatformSpec {
  platformLabel: string;
  aspect: string;
  sceneDurationSec: number;       // độ dài CLIP AI tối đa (giữ nguyên — Seedance/Veo cap)
  avgSceneDurationSec: number;    // MỚI — pacing trung bình mong muốn cho platform
  hookSceneDurationSec: number;   // MỚI — scene đầu (hook) cần ngắn hơn cho retention
  maxScenes: number;              // MỚI — hard cap để Wizard không quá tải
  recommendedScenes: number;      // tính lại theo công thức mới
  ...
}
```

### 2. Cập nhật `PLATFORM_SPEC_BY_ID` với pacing profiles

| Platform group | avgScene | hookScene | maxScenes | Lý do |
|---|---|---|---|---|
| TikTok / Reels / Shorts / FB Reels (short-form vertical) | **3.5s** | 2s | 18 | Hook nhanh, cắt dồn dập, retention chuẩn |
| Pinterest Pin (2:3 ảnh tĩnh + motion) | **6s** | 4s | 8 | Idea Pin nhịp chậm, mỗi card 1 ý |
| Pinterest Idea Pin Long (9:16) | 4s | 3s | 12 | Như TikTok nhẹ |
| Threads / Bluesky / WhatsApp | 4s | 3s | 15 | Short-form nhưng nhẹ hơn |
| Facebook Feed / X | **5s** | 3s | 16 | Mid-pacing, có chỗ thở |
| LinkedIn (B2B, 16:9) | **6s** | 4s | 18 | Talking-head, slow B-roll |
| YouTube (16:9, long-form) | **8s** | 4s | 40 | Story beats, không cắt vụn |

### 3. Viết lại `getPromptCount(duration, spec, purpose)`

```ts
function getPromptCount(duration, spec, purpose) {
  // Non-video purpose giữ nguyên fallback cũ (teleprompter/production)
  if (!spec) return /* legacy switch */;

  // Hook chiếm scene đầu, phần còn lại chia theo avgScene
  const hookSec = spec.hookSceneDurationSec;
  const remaining = Math.max(0, duration - hookSec);
  const bodyScenes = Math.round(remaining / spec.avgSceneDurationSec);
  const total = Math.min(spec.maxScenes, Math.max(2, 1 + bodyScenes));

  // Range ±1 cho AI có flexibility (vd "8-9")
  return total > 3 ? `${total - 1}-${total}` : `${total}`;
}
```

### 4. Cập nhật `getPlatformSpec()` để tính `recommendedScenes` theo công thức mới

Thay `ceil(duration / sceneDurationSec)` bằng cùng logic hook + body như `getPromptCount`. Đảm bảo `recommendedScenes` (dùng trong system prompt + Wizard expectation) khớp với `promptCount` (dùng trong AI instruction).

### 5. Inject pacing rule vào system prompt

Trong block `# 🎬 NỀN TẢNG ĐÍCH` (line ~1721), thêm:

```
- Pacing chuẩn ${spec.platformLabel}: scene đầu (HOOK) ~${hookSec}s, các scene sau ~${avgSec}s.
- Tổng: ${recommendedScenes} PROMPT (đã tính theo pacing đặc thù platform).
- KHÔNG chia đều cứng nhắc — scene 1 phải PUNCHY/ngắn để giữ retention.
```

### 6. Cập nhật `getPurposeSelfCheck` `ai_video`

Thêm checklist:
```
□ SCENE 1 LÀ HOOK (≤${hookSec}s)?
  - Visual gây tò mò ngay 1s đầu?
  - Không mở chậm (intro/logo)?
□ PACING KHỚP ${platformLabel}?
  - Scene trung bình ~${avgSec}s?
  - Tổng số scene = ${recommendedScenes} (±1)?
```

### 7. Log pacing để debug

```ts
console.log('[generate-script] Pacing:', spec.platformLabel,
  `hook=${spec.hookSceneDurationSec}s avg=${spec.avgSceneDurationSec}s → ${spec.recommendedScenes} scenes for ${duration}s`);
```

## Ví dụ kết quả

| Input | Trước | Sau |
|---|---|---|
| TikTok 30s | 5 scenes × 6s | **8 scenes** (1 hook 2s + 7 body ~4s) |
| Reels 60s | 10 scenes × 6s | **15 scenes** (1 hook 2s + 14 body ~4s) — clamp 18 |
| Pinterest 30s | 5 scenes × 6s | **5 scenes** (1 hook 4s + 4 body ~6s) |
| LinkedIn 90s | 15 scenes × 6s | **15 scenes** (1 hook 4s + 14 body ~6s) |
| YouTube 600s | 20 scenes (clamped) | **40 scenes** (1 hook 4s + 39 body ~8s, clamp max) |

## Out of scope

- UI form, Wizard, render edge functions — không động.
- Chưa tách pacing theo `script_purpose` (educational vs entertainment) — pha sau.
- DB schema không đổi.

## Files

**Edited:**
- `supabase/functions/generate-script/index.ts` (~50 dòng: mở rộng interface, cập nhật 30 preset entries với 3 field mới, viết lại 2 hàm, thêm checklist)

Bấm Approve để mình implement.