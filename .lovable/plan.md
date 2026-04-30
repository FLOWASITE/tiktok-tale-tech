## Phát hiện từ tài liệu chính thức

Đã đọc `docs.poyo.ai/llms.txt` + chi tiết từng model. Bảng độ dài tối đa **theo doc chính thức** (không phải đoán):

| Model | Doc nguồn | Duration support | Aspect ratios |
|---|---|---|---|
| **Seedance 2 / Seedance 2 Fast** | `/video-series/seedance-2` | **4-15s** (integer) ⚡ | 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 |
| **VEO 3.1 (lite/fast/quality)** | `/video-series/veo-3-1` | **8s cố định** | up to 4K |
| **Sora 2** | `/video-series/sora-2` | 10s hoặc 15s | — |
| **Sora 2 Pro** | `/video-series/sora-2-pro` | 15s hoặc 25s | — |
| **Hailuo 2.3** | `/video-series/hailuo-2-3` | 6s hoặc 10s (1080p chỉ 6s) | — |
| **Kling 2.6** | `/video-series/kling-2-6` | 5s hoặc 10s | 1:1, 16:9, 9:16 |
| **Runway Gen-4.5** | `/video-series/runway-gen-4-5` | 5s hoặc 10s | 16:9, 9:16, 4:3, 3:4, 1:1, 21:9 |
| **Wan 2.5 t2v** | `/video-series/wan2.5-text-to-video` | 5s hoặc 10s | nhiều preset |

→ Code hiện tại trong `pickRecommendedVideoModel` đang giả định **Seedance cap 6s** — sai. Doc chính thức xác nhận **Seedance 2 hỗ trợ tới 15s**, dù credit tính theo duration.

## Phát hiện 2 — Bug model ID

`generate-script/index.ts` (lines 1157-1163) đang return id:
- `poyo/n-2` ← **không tồn tại** trong `_shared/poyo-video-generator.ts` (chỉ có `poyo/seedance-2`, `poyo/sora-2`, `poyo/happy-horse`)
- `geminigen/n-3-fast`, `geminigen/n-3.1-fast` ← **không tồn tại** trong `_shared/geminigen-video-generator.ts` (đúng phải là `geminigen/veo-3-fast`, `geminigen/veo-3.1-fast`)

→ Frontend pre-select preset đọc id này sẽ fail (không match), badge `recommended_video_model` hiển thị id ảo. Cần fix để khớp registry thật.

## Đề xuất thay đổi

### 1. Fix model IDs đúng với provider registry
File: `supabase/functions/generate-script/index.ts` (function `pickRecommendedVideoModel`, ~line 1153)

| Trước (sai) | Sau (đúng) |
|---|---|
| `poyo/n-2` | `poyo/seedance-2` |
| `geminigen/n-3-fast` | `geminigen/veo-3-fast` |
| `geminigen/n-3.1-fast` | `geminigen/veo-3.1-fast` |

### 2. Nâng cap Seedance 6s → 12s (sweet spot)

Doc cho phép tới 15s, nhưng:
- 15s/clip với prompt phức tạp dễ bị drift chất lượng
- 12s là sweet spot: giảm ~50% số clip vs 6s, vẫn an toàn về coherence
- Vẫn dưới ngưỡng credit "premium" (Seedance bill theo duration tuyến tính)

Bảng auto-pick mới:

| Aspect / Total duration | Recommended model | maxClipSec | Lý do |
|---|---|---|---|
| 9:16 ≤60s (TikTok/Reels short) | `poyo/seedance-2` | **8s** | Pacing nhanh nhưng vẫn giảm 25% clip vs 6s |
| 9:16 >60s (Reels long, story) | `poyo/seedance-2` | **12s** | Long-form vertical → ít clip = mượt hơn, rẻ hơn Veo |
| 16:9 (YouTube/LinkedIn) | `geminigen/veo-3.1-fast` | **8s** | Veo 3.1 fixed 8s, chất lượng cinematic cho horizontal |
| 2:3 (Pinterest) | `poyo/seedance-2` | **12s** | Lifestyle pacing chậm |
| 1:1 (Square feed) | `poyo/seedance-2` | **8s** | Feed video ngắn, balance |
| Default fallback | `poyo/seedance-2` | **8s** | An toàn |

### 3. Tác động đo lường

Video TikTok 90s vertical:
- **Trước (cap 6s):** ~15 clip Seedance
- **Sau (cap 12s):** ~8 clip Seedance → **giảm 47%**

Video YouTube 16:9 dài 120s:
- **Trước (cap 6s, pick id sai):** ~20 clip
- **Sau (cap 8s, Veo 3.1 Fast id đúng):** ~15 clip → **giảm 25%** + render đúng provider

Video TikTok ngắn 30s:
- **Trước (cap 6s):** 5 clip
- **Sau (cap 8s):** 4 clip → **giảm 20%**

### 4. Inject doc-backed constraint vào AI prompt

Tại line 1504, mở rộng `[AI RENDER MODEL]` block để liệt kê duration support thật:

```
[AI RENDER MODEL]
Mỗi PROMPT sẽ được render bằng **Seedance 2** (cap 12s/clip — model hỗ trợ 4-15s).
- Viết visual prompt cho 1 cảnh duy nhất, không có cut/transition trong cùng prompt.
- Tránh chuyển động phức tạp đa hướng (drift risk khi clip >10s).
- Camera move chỉ 1 hướng (dolly/pan/tilt) hoặc static.
```

### 5. Update memory

`mem://features/video/smart-model-pick-vn` — cập nhật bảng cap mới (8s/12s thay 6s/10s) + ghi chú "đã verify với docs.poyo.ai chính thức".

## Files thay đổi

- `supabase/functions/generate-script/index.ts` — sửa `pickRecommendedVideoModel` (model id + cap), mở rộng prompt block
- `mem://features/video/smart-model-pick-vn` — update specs

## Không thay đổi

- Logic `computeSmartSceneCount` + `buildSceneDurationPlan` (đã hoạt động đúng, chỉ nhận cap mới)
- Frontend `useScripts.ts` toast (sẽ tự nhận id mới qua metadata)
- Provider registry `_shared/*-video-generator.ts` (đã có sẵn id đúng)
- Pricing/quota logic
- User vẫn override được tại QuickClip

Bấm **Approve** để mình implement.