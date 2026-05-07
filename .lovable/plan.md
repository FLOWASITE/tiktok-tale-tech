
## Nguyên nhân

Edge function `supabase/functions/generate-video/index.ts` đang **bỏ qua model Admin chọn** trong 2 tình huống:

### 1. Identity-lock force-upgrade (nguyên nhân chính)
Lines 369–378: khi request có `character_profile_ids` (hầu như mọi render từ Script Studio đều có nhân vật), code **cứng tay ép model về `geminigen/veo-3.1`** bất chấp Admin đã chọn gì:
```ts
const IDENTITY_LOCK_MODEL = 'geminigen/veo-3.1';
if (model !== IDENTITY_LOCK_MODEL) {
  model = IDENTITY_LOCK_MODEL;
  provider = 'geminigen';
  modelUpgradedReason = 'character_identity_lock';
}
```
Tương tự ở block product (line 411): `PRODUCT_LOCK_MODEL = 'geminigen/veo-3.1'`.

→ Anh chọn `geminigen/kling-3.0-1080p` ở `/admin/ai`, nhưng vì scene có character → bị thay bằng Veo 3.1. Log chứng minh sẽ là `force-upgrade geminigen/kling-3.0-1080p → geminigen/veo-3.1`.

### 2. Allowlist PoYo quá hẹp (nếu Admin chọn `poyo/kling-*`)
`POYO_VIDEO_MODELS` trong `_shared/poyo-video-generator.ts` chỉ có `seedance-2 | sora-2 | happy-horse`. Code (line 519, 613) check `POYO_VIDEO_MODELS.includes(model)`; nếu fail → fallback sang `POYO_VIDEO_MODELS[0]` = **seedance-2**. Nên `poyo/kling-2.1` cũng bị silently swap.

---

## Hướng sửa

### Fix 1 — Tôn trọng admin override, chỉ lock khi admin KHÔNG chọn (3 chỉnh sửa nhỏ)

Trong `generate-video/index.ts`:

- Track `adminPickedModel: boolean` ngay sau block `getAIConfig` (line 146-162) — true khi `cfg.model` có giá trị.
- Ở block character lock (line 369-378): chỉ force `IDENTITY_LOCK_MODEL` khi **không** có admin pick **và** không có client model. Nếu admin đã chọn Kling/Sora/Veo khác → giữ nguyên, chỉ log warning `identity-lock skipped: admin override active`.
- Ở block product (line 410-415): áp cùng logic — đã có check `!clientModel` nhưng chưa check admin. Bổ sung `!adminPickedModel`.
- `model_upgraded_reason` chỉ set khi thực sự upgrade.

Lý do: Admin pick là quyết định chủ động → ưu tiên cao hơn auto-lock. Vẫn giữ identity-lock cho user thường (không có admin override) để không vỡ continuity hiện tại.

### Fix 2 — Mở rộng allowlist PoYo

Trong `supabase/functions/_shared/poyo-video-generator.ts`:

Mở rộng `POYO_VIDEO_MODELS` thành (đồng bộ với `useAIConfig.ts` line 333-334 và `videoModelCaps.ts`):
```ts
export const POYO_VIDEO_MODELS = [
  'poyo/seedance-2', 'poyo/seedance-1-pro',
  'poyo/sora-2', 'poyo/sora-2-pro',
  'poyo/veo-3', 'poyo/veo-3-fast', 'poyo/veo-3.1', 'poyo/veo-3.1-fast',
  'poyo/kling-2.1', 'poyo/kling-2.1-pro',
  'poyo/hailuo-02', 'poyo/happy-horse',
] as const;
```
PoYo API route bằng prefix model (`kling*` → `/kling`) nên không cần đổi gì khác.

### Fix 3 — UI feedback
Khi `model_upgraded_reason` xuất hiện trong response, hook `useVideoGeneration` hiện đã log; thêm 1 toast nhẹ "Model đã đổi sang Veo 3.1 để khoá nhân vật" để user biết (chỉ khi không phải admin override).

### Fix 4 — Cập nhật memory rule
Cập nhật `.lovable/memory/features/video/multi-character-identity-lock-vn.md`: Identity-lock CHỈ kích hoạt khi không có admin model override, để khớp behavior mới.

---

## Test checklist sau khi deploy
1. Admin set `generate-video` model = `geminigen/kling-3.0-1080p` → render scene có character → `video_generations.model_used` phải = `geminigen/kling-3.0-1080p` (không phải `veo-3.1`).
2. Admin set model = `poyo/kling-2.1` → render scene có character → submit qua PoYo `/kling` endpoint, không bị fallback về seedance-2.
3. User KHÔNG có admin override + render scene có character → vẫn force Veo 3.1 như cũ (giữ identity-lock cho mass user).

## Files sẽ sửa
- `supabase/functions/generate-video/index.ts` (3 block: track flag, char-lock guard, product-lock guard)
- `supabase/functions/_shared/poyo-video-generator.ts` (mở rộng allowlist)
- `src/hooks/useVideoGeneration.ts` (toast khi auto-upgrade — optional)
- `.lovable/memory/features/video/multi-character-identity-lock-vn.md` (update rule)
