---
name: Multi-Character Identity Lock
description: generate-video build collage 2+ nhân vật + force Veo 3.1 (kể cả 1 char) + stable seed + auto-pin brand character + warning banner khi chưa chọn
type: feature
---

## Server (`supabase/functions/generate-video/index.ts`)
- Nếu `character_profile_ids.length >= 2` và chưa có ref → build side-by-side collage qua `_shared/character-collage.ts`, cache `character-references/_collage/<sha8>.png`, inject `[FRAME LAYOUT]` anchor (LEFT→RIGHT theo `sorted` order).
- Single char: pickRefForChar (smart angle: close-up/full-body/side/outfit/front).
- **Force `geminigen/veo-3.1` (NOT Fast) khi `resolvedCharIds.length > 0`** — kể cả khi chưa có ref ảnh, vì Veo 3.1 Fast drift mặt rất mạnh. Set `modelUpgradedReason='character_identity_lock'` trả về client.
- Stable seed = `deriveStableSeed(sortedIds)` → forward `seed` param tới geminigen + poyo provider.
- Log debug: `🔒 Identity lock active: chars=N, refUrl=yes/no, seed=X, model=geminigen/veo-3.1`.

## Frontend
- **Auto-pin brand character** trong `MultiCharacterPicker`:
  - Priority 1: nhân vật brand có `default_role='main'`.
  - Priority 2: nhân vật đầu tiên thuộc brand (kèm toast info gợi ý đặt vai chính).
- Banner amber khi `selectedCharacterIds.length === 0` ở cả `QuickClipTab` + `StoryboardVideoTab` — không block generate.
- `autoPickModelForAspect(aspect, hasCharacter)`: hasCharacter=true → trả thẳng `geminigen/veo-3.1` để cost estimate khớp với model server thực sự dùng.
- `useVideoGeneration` log payload `[generate-video req]` để debug.
