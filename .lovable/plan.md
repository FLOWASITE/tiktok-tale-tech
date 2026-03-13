

## Plan: Update PoYo.ai Models to Latest

### Phát hiện từ PoYo.ai docs (March 2026)

PoYo đã ra model mới **Nano Banana 2** (powered by Gemini 3.1 Flash) với model ID `nano-banana-2-new`. Model cũ `nano-banana-2` giờ gọi là **Nano Banana Pro** (Gemini 3 Pro).

```text
Hiện tại trong code:              PoYo API thực tế:
─────────────────────             ──────────────────
poyo/nano-banana-2       →        nano-banana-2       (= Nano Banana Pro, Gemini 3 Pro)
poyo/nano-banana-2-edit  →        nano-banana-2-edit  (= Nano Banana Pro Edit)
                                  nano-banana-2-new   (= Nano Banana 2 MỚI, Gemini 3.1 Flash) ← THIẾU
                                  nano-banana-2-new-edit ← THIẾU
```

### Thay đổi (3 files)

#### 1. `src/types/aiProvider.ts` — Update PoYo provider config
- Thêm `poyo/nano-banana-2-new` và `poyo/nano-banana-2-new-edit` vào models list
- Update description: thêm "Nano Banana 2 (Gemini 3.1 Flash)"
- Đặt `nano-banana-2-new` làm model đầu tiên (recommended)

#### 2. `src/hooks/useAIConfig.ts` — Update model lists + MODEL_INFO
- Thêm `poyo/nano-banana-2-new` và `poyo/nano-banana-2-new-edit` vào `AVAILABLE_MODELS['image']`
- Thêm MODEL_INFO entries cho 2 model mới:
  - `nano-banana-2-new`: "Nano Banana 2" — Gemini 3.1 Flash, default 2K/4K, $0.025, fast, recommended
  - `nano-banana-2-new-edit`: "Nano Banana 2 Edit" — edit variant, 2K/4K
- Update entry `nano-banana-2` description: rename to "Nano Banana Pro" (Gemini 3 Pro)
- Đánh dấu `nano-banana-2-new` là `isRecommended: true`, bỏ recommend từ `nano-banana-2`

#### 3. `supabase/functions/_shared/poyo-image-generator.ts`
- Update comment header để reflect model mới
- Thêm `nano-banana-2-new` support cho `resolution` param (1K/2K/4K) — PoYo API hỗ trợ field `resolution` cho model mới này
- Update `mapAspectRatioToSize()` thêm extreme ratios (`1:4`, `4:1`, `1:8`, `8:1`) mà Nano Banana 2 hỗ trợ

### Không thay đổi
- `poyo-image-generator.ts` flow (submit → poll) giữ nguyên — chỉ thêm `resolution` field
- Backend routing logic không đổi (strip prefix → gửi API)

