# Cập nhật danh sách model video GeminiGen

## Phát hiện từ `geminigen.ai/pricing`

GeminiGen hiện cung cấp nhiều model video hơn list trong code (Sora không thấy trên pricing nhưng giữ lại do code đã wired).

### Bổ sung mới (chưa có trong code)
**Veo (Google):**
- `veo-3.1-fast-fullhd` — Fast Full HD
- `veo-3.1-lite-hd` — Lite HD
- `veo-3.1-lite-fullhd` — Lite Full HD
- `veo-3.1-hd`, `veo-3.1-fullhd` — Premium HD/Full HD (giữ `veo-3.1` làm alias)

**Grok (xAI):**
- `grok-3` — Free tier, fast video gen

**Bytedance Seedance 2.0:** (mới hoàn toàn)
- `seedance-2-fast-480p`, `seedance-2-fast-720p`
- `seedance-2-pro-480p`, `seedance-2-pro-720p`
- `seedance-2-omni-fast`, `seedance-2-omni-pro`
- `seedance-2-omni-fast-vip`, `seedance-2-omni-pro-vip`

**Kling (Kuaishou):** (mới hoàn toàn)
- `kling-3.0-720p`, `kling-3.0-1080p`
- `kling-3.0-edit-720p`, `kling-3.0-edit-1080p`
- `kling-3.0-motion-control-720p/1080p`
- `kling-o1-720p`, `kling-o1-1080p`, `kling-o1-edit-1080p`
- `kling-2.6-720p`, `kling-2.6-1080p`, `kling-2.6-1080p-audio`
- `kling-2.6-motion-control-720p/1080p`
- `kling-2.5-720p`, `kling-2.5-1080p`, `kling-2.5-720p-relax`
- `kling-2.1-5s-720p/1080p`, `kling-2.1-10s-720p/1080p`
- `kling-lipsync`

**Tổng:** ~30+ model mới.

## Files cần update

### 1. `src/types/aiProvider.ts` (line 142-148)
- Mở rộng `geminigen.models[]` với 30+ ID mới (group: Veo / Grok / Seedance / Kling).
- Update `description` từ chỉ-image sang "Veo, Grok, Seedance, Kling video + Imagen/Nano Banana".

### 2. `src/hooks/useAIConfig.ts` (line 274-297)
- Trong array `video[]`: thêm các `geminigen/*` ID mới ở trên (giữ alphabetical theo provider).

### 3. `supabase/functions/_shared/geminigen-video-generator.ts`
- Update header comment (line 4) liệt kê model mới.
- **Endpoint `/uapi/v1/video-gen/veo` chỉ dùng cho Veo.** Cần check pricing/docs xem Seedance/Kling/Grok có endpoint riêng không.
  - Nếu có, thêm route function chọn endpoint theo prefix model:
    - `veo-*` → `/uapi/v1/video-gen/veo`
    - `sora-*` → `/uapi/v1/video-gen/sora` (cũ đã pattern này)
    - `grok-*` → `/uapi/v1/video-gen/grok`
    - `seedance-*` → `/uapi/v1/video-gen/seedance`
    - `kling-*` → `/uapi/v1/video-gen/kling`
  - Endpoint thực tế chưa confirm trong docs (404). **Sẽ implement endpoint switcher dựa trên pattern đoán + log warning** để khi gọi thật sẽ thấy lỗi cụ thể và sửa nhanh.

### 4. `src/components/video/ProviderModelPicker.tsx` (nếu có grouping UI)
- Nếu component group model theo family thì thêm 4 nhóm mới: Grok, Seedance, Kling, các Veo lite.

## Không thay đổi
- DB migration: không cần (model là string).
- Sora models: giữ nguyên cho backward compat.
- PoYo video models: giữ nguyên (đã update riêng nếu cần).

## Lưu ý / Risk
- **Endpoint chưa verify**: API path cho Seedance/Kling/Grok là suy đoán. Cần test 1 model thực tế sau khi deploy để confirm + fix path nếu sai.
- Pricing chênh lệch lớn giữa các model (free → $0.175/sec) → admin cần biết rõ khi pick. Sẽ thêm tooltip pricing nếu kịp scope.
