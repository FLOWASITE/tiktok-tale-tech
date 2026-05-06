---
name: Multi-Character Identity Lock
description: generate-video build collage 2+ nhân vật + force Veo 3.1 + stable seed + auto-pin brand char + KEYFRAME SYNTHESIS bằng image-edit model để giữ mặt brand
type: feature
---

## Server (`supabase/functions/generate-video/index.ts`)
- Nếu `character_profile_ids.length >= 2` và chưa có ref → build side-by-side collage qua `_shared/character-collage.ts`, cache `character-references/_collage/<sha8>.png`, inject `[FRAME LAYOUT]` anchor.
- Single char: pickRefForChar (smart angle: close-up/full-body/side/outfit/front).
- **Force `geminigen/veo-3.1` (NOT Fast) khi `resolvedCharIds.length > 0`** — Set `modelUpgradedReason='character_identity_lock'`.
- Stable seed = `deriveStableSeed(sortedIds)` → forward `seed` param tới geminigen + poyo provider.

## 🎨 Keyframe Synthesis (NEW — fix mặt không giống avatar brand)
- Module `_shared/keyframe-synthesizer.ts`: gọi image-edit model **`google/gemini-3.1-flash-image-preview`** (Nano Banana 2, fallback `gemini-2.5-flash-image`) với **multi-image input** (ảnh ref các nhân vật + product nếu có) để dựng 1 keyframe khớp scene+aspect.
- Keyframe sau đó được dùng làm `starting_frame_url` cho Veo i2v → Veo chỉ cần animate, không phải re-imagine khuôn mặt → giữ identity tốt hơn rất nhiều so với portrait studio.
- Cache: `character-references/_keyframes/<orgId>/<sha16>.png`, key = sha256(sortedCharIds + scenePrompt + aspect + productRef).
- Toggle: client gửi `synthesize_keyframe` (default true). User truyền `starting_frame_url` riêng → skip synth.
- Bỏ `[FRAME LAYOUT]` collage anchor sau khi synth (không còn là collage).
- Response trả `keyframe_synthesized: true` + `keyframe_model` → client toast "🎨 Đã dựng keyframe từ ảnh nhân vật".

## Frontend
- **Auto-pin brand character** trong `MultiCharacterPicker`: ưu tiên `default_role='main'`, fallback first brand char (kèm toast).
- Banner amber khi chưa chọn character ở `QuickClipTab` + `StoryboardVideoTab`.
- `autoPickModelForAspect(aspect, hasCharacter)`: hasChar=true → trả thẳng `geminigen/veo-3.1`.
- `useVideoGeneration` log `[generate-video req]` + 2 toast: identity lock + keyframe synthesized.
