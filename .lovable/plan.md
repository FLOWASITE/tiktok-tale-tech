## Mục tiêu

Giảm số PROMPT/clip xuống **mức tối thiểu vật lý** mà cap model cho phép, bỏ "ideal pacing" theo `avgSceneSec` (vốn đẩy số scene lên cao hơn cần thiết cho pacing thẩm mỹ).

## Tác động đo lường

Ví dụ video 9:16 (cap Seedance = 8s short / 12s long):

| Duration | Aspect | Trước (có avgScene) | Sau (chỉ cap) | Giảm |
|---|---|---|---|---|
| 30s | 9:16 | 1 + round(28/4)=7 + 1 = **8 prompt** | 1 + ceil(28/8) = **5 prompt** | -38% |
| 45s | 9:16 | 1 + round(43/4)=11 → clamp **11 prompt** | 1 + ceil(43/8) = **7 prompt** | -36% |
| 60s | 9:16 | 1 + round(58/4)=15 → **15 prompt** | 1 + ceil(58/8) = **9 prompt** | -40% |
| 90s | 9:16 | 1 + round(88/5)=18 → clamp 18 | 1 + ceil(88/12) = **9 prompt** | -50% |
| 120s | 16:9 | 1 + round(118/6)=20 | 1 + ceil(118/8) = **16 prompt** | -20% |

→ Ngắn (≤60s) giảm mạnh nhất (−36 to −40%), long-form vertical giảm tới **−50%**.

## Trade-off đã hiểu

- **Lợi:** ít credit render hơn, ít task PoYo/Veo song song hơn → ít timeout, ít quota burn.
- **Hại:** mỗi clip dài 8s/12s với 1 visual duy nhất → pacing có thể "lỳ" với video TikTok ngắn (vốn quen cắt nhanh 3-4s/scene). AI sẽ phải mô tả cảnh "có chuyển động liên tục" để 8s không bị tĩnh.
- **Bù lại:** prompt đã có sẵn block `[AI RENDER MODEL]` ở line 1504 yêu cầu "1 cảnh duy nhất, camera 1 hướng, tránh drift" → đã align với clip dài.

## Thay đổi kỹ thuật

### File: `supabase/functions/generate-script/index.ts`

**1. Sửa `computeSmartSceneCount` (line 1062-1070)**

Hiện tại:
```ts
const idealBody = remaining / pacing.avgSceneSec;
const minBody   = Math.ceil(remaining / sceneDurationCapSec);
const bodyScenes = Math.max(minBody, Math.round(idealBody));  // ← đẩy số scene lên
```

Sau:
```ts
// Bỏ avgScene pacing, chỉ tôn trọng cap model → luôn ra số clip tối thiểu
const bodyScenes = Math.ceil(remaining / sceneDurationCapSec);
```

Vẫn giữ `clamp(2, pacing.maxScenes)` để safety.

**2. Cập nhật comment block (line 1061, 1132-1145)**

Đổi mô tả: "Smart scene count = MIN clip cần để cover duration, không tính avgScene pacing nữa".

**3. Cập nhật `[AI RENDER MODEL]` block trong system prompt (~line 1504)**

Thêm hint:
> "Mỗi clip dài 8-12s. Mô tả cảnh có **chuyển động liên tục** (subject action, camera move 1 hướng) để clip không bị tĩnh. Tránh chia 1 prompt thành nhiều moment nhỏ."

**4. Memory update**

Cập nhật `mem://features/video/smart-model-pick-vn`: ghi rõ "Đã bỏ avgScene pacing — số clip = ceil(duration/cap), giảm thêm 30-50% so với phiên bản trước".

## Không thay đổi

- Cap 8s/12s (giữ nguyên, không nâng lên 15s)
- `pickRecommendedVideoModel` (logic auto-pick model giữ nguyên)
- `buildSceneDurationPlan` (cân bằng độ dài per-prompt vẫn hoạt động đúng với sceneCount mới)
- `pacing.maxScenes` clamp (giữ làm safety net)
- `pacing.hookSceneSec` (hook vẫn là scene riêng, ngắn 2-4s)
- Frontend, pricing, quota, provider registry

## Files thay đổi

- `supabase/functions/generate-script/index.ts` — sửa `computeSmartSceneCount` + 2 comment block + AI prompt hint
- `mem://features/video/smart-model-pick-vn` — update specs

Bấm **Approve** để mình implement.
