# Khắc phục: Mặt nhân vật trong video không giống avatar brand

## Chẩn đoán

Hiện `generate-video` đang đưa **thẳng ảnh portrait studio** của character (front-face hoặc collage) làm `starting_frame_url` cho Veo i2v. Vấn đề:

1. Ảnh ref là **portrait tĩnh, neutral background, framing chuẩn studio** — không khớp scene/aspect/composition prompt yêu cầu (vd: "đứng ở quán cafe", "9:16 wide shot").
2. Veo i2v phải **vừa giữ identity vừa tái dựng cảnh** từ portrait → bắt buộc model phải "tưởng tượng" lại khuôn mặt trong context mới → **drift mạnh**, đặc biệt khi đổi góc/biểu cảm/ánh sáng.
3. Single-char không có collage anchor; collage 2+ char là layout side-by-side studio — càng xa cảnh thật.

Insight đúng của bạn: **dùng model EDIT ảnh (image-to-image) attach ref trước**, sinh ra 1 keyframe đã đặt nhân vật vào đúng scene/aspect/outfit/pose — rồi mới đưa keyframe đó vào Veo i2v. Veo chỉ cần "animate" thay vì "re-imagine".

Pattern này đã tồn tại sẵn trong project: `generate-character-image` chấp nhận `reference_image_url` + `preferred_edit_model` (Nano Banana / Gemini-3 Pro Image / KIE Flux-Kontext), và provider `geminigen-image-generator` hỗ trợ edit qua reference.

## Thay đổi

### 1. Tạo shared module `_shared/keyframe-synthesizer.ts` (mới)

API:
```ts
synthesizeKeyframe({
  scenePrompt, aspectRatio, characters: [{name, refUrl, appearance, wardrobe}], productRefUrl?,
  organizationId, supabase, lovableApiKey
}) → { url, model } | null
```

Logic:
- Build edit-prompt ngắn gọn: scene + aspect framing + "preserve EXACT face/hair/outfit of <name> from reference image".
- Multi-char: ghép tất cả ảnh ref vào content array (gemini-2.5-flash-image hỗ trợ multi-image input).
- Gọi Lovable AI Gateway với `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — fast + giữ identity tốt nhất hiện tại); fallback `google/gemini-2.5-flash-image`.
- Decode base64 → upload vào storage bucket `character-references/_keyframes/<sha8>.png` (cache theo hash của charIds + scenePrompt + aspect).
- Trả `publicUrl` để dùng làm `starting_frame_url`.
- Nếu fail → trả null (caller fallback về portrait ref như cũ).

### 2. Wire vào `generate-video/index.ts`

Sau block "MULTI-REF COLLAGE / single-char ref pick" (~line 315), trước stable seed:

- Khi `resolvedCharIds.length > 0` và **user chưa truyền `starting_frame_url` riêng** và `characterRefUrl` đang là portrait/collage → gọi `synthesizeKeyframe`.
- Nếu thành công: thay `characterRefUrl = keyframeUrl`, log `🎨 Keyframe synthesized (model=<x>) → ${keyframeUrl}`, set `keyframeSynthesized=true` trong response.
- Bỏ `[FRAME LAYOUT]` collage anchor khi đã có keyframe (không còn là collage nữa).
- Vẫn giữ Veo 3.1 force + stable seed + character text block.

### 3. Toggle trong client (optional, default ON)

`useVideoGeneration.ts` → thêm body field `synthesize_keyframe?: boolean` (default true khi có character).
Server đọc field, nếu false thì skip step trên.

`QuickClipTab.tsx` + `StoryboardVideoTab.tsx`: thêm 1 checkbox nhỏ trong Advanced "🎨 Tạo keyframe AI từ ảnh nhân vật (giữ mặt tốt hơn, +~10s)". Mặc định checked khi có character.

### 4. Toast feedback

`useVideoGeneration.ts`: nếu response trả `keyframeSynthesized=true` → toast info: "🎨 Đã dựng keyframe từ ảnh nhân vật để giữ mặt nhất quán."

### 5. Memory update

Cập nhật `mem://features/video/multi-character-identity-lock-vn.md`:
- Thêm section "Keyframe Synthesis": image-edit model dựng keyframe khớp scene từ ref + cache theo hash, hạ rate drift mặt đáng kể.

## Files chạm
- `supabase/functions/_shared/keyframe-synthesizer.ts` (mới)
- `supabase/functions/generate-video/index.ts`
- `src/hooks/useVideoGeneration.ts`
- `src/components/video/QuickClipTab.tsx`
- `src/components/video/StoryboardVideoTab.tsx`
- `.lovable/memory/features/video/multi-character-identity-lock-vn.md`

## Tiêu chí nghiệm thu
- Tạo clip với 1 character (brand có ảnh ref) → log: `🎨 Keyframe synthesized (model=google/gemini-3.1-flash-image-preview) → https://.../_keyframes/<hash>.png`.
- Mở keyframe URL: thấy nhân vật trong scene đúng aspect, mặt giống ảnh ref.
- Video output: mặt giống avatar brand rõ rệt so với trước.
- Tạo clip cùng cast + cùng scene → cache hit (không gọi lại image-edit), nhanh hơn.
- Toggle off → flow cũ (portrait làm starting frame).

## Trade-off
- Thêm ~5–15s latency (1 lần gọi image-edit).
- Tốn thêm ~1 image-gen credit / clip đầu tiên (cache cho lần sau).
- Worth: identity giữ tốt hơn nhiều — đây là điểm đau chính người dùng đang gặp.
