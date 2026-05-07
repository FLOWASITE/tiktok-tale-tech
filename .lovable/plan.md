## Vấn đề
Nút **"Render N scene còn thiếu"** trên `ScriptWorkspace` đi qua `useScriptVideoBatch` — hook này **không truyền `character_profile_ids`** xuống `generate-video`, nên server không có dữ liệu nhân vật để inject + force Veo 3.1 + synth keyframe. Kết quả: clip ra mặt khác, không phải anh Minh.

`StoryboardVideoTab` và `QuickClipTab` đã đúng — chỉ batch của workspace bị thiếu.

## Sửa

### 1. `src/hooks/useScriptVideoBatch.ts`
- Mở rộng `BatchDefaults`:
  - thêm `character_profile_ids?: string[]`
  - thêm `product_profile_ids?: string[]`
  - bỏ ép `model` khi có character (để server tự upgrade lên Veo 3.1)
- Trong vòng lặp build `request`, forward 2 trường mới + `character_profile_id` (id đầu, BC).

### 2. `src/components/video/ScriptWorkspace.tsx`
- Thêm state `selectedCharacterIds`, `selectedCharacters`, `selectedProductIds`.
- Render block nhỏ phía trên Progress strip (hoặc dưới Title): `<MultiCharacterPicker>` + `<CharacterProductMap>` + alert vàng nếu chưa chọn — cùng pattern với `StoryboardVideoTab`.
- Init seed: `activeScript?.characterProfileIds ?? (activeScript?.characterProfileId ? [...] : [])`. (`MultiCharacterPicker` đã tự auto-pin nhân vật `main` của brand khi rỗng → giữ hành vi này.)
- `handleRenderMissing`:
  - Bỏ `model: 'geminigen/veo-3.1-fast'` hardcode (để admin/auto-pick + identity lock của server quyết).
  - Truyền `character_profile_ids: selectedCharacterIds`, `product_profile_ids: selectedProductIds` vào `renderMissingScenes`.

### 3. (Tuỳ chọn nhỏ) `src/contexts/ScriptToVideoContext.tsx`
Khi `setActiveScript` được gọi từ `ScriptWorkspace`, hiện chưa propagate `characterProfileIds`. Không bắt buộc sửa: `MultiCharacterPicker` đã tự auto-pin theo brand. Bỏ qua trừ khi muốn pre-select nhân vật theo metadata script (chưa có cột DB).

## Acceptance
- Bấm "Render N scene còn thiếu" trong workspace của script có brand "Flowa" → row mới trong `video_generations` có `model_used = geminigen/veo-3.1` (không có `-fast`) và `starting_frame_url` = URL keyframe vừa synth.
- Console edge function `generate-video` log `Injected 1 character(s): Anh Minh` + `🎨 Keyframe synthesized`.
- Clip render giữ đúng mặt anh Minh giữa các scene.
- Không regression batch ở `StoryboardVideoTab` / generate đơn ở `QuickClipTab`.

## Không thay đổi
- Không sửa edge function (logic identity lock đã đúng).
- Không thêm migration / cột DB.
- Không đổi UX của MultiCharacterPicker (vẫn auto-pin main char).
