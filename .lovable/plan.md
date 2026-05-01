## Mục tiêu

Tạo file test `src/components/video/__tests__/quickclip-character-consistency.test.ts` kiểm tra pipeline nhân vật trong QuickClip, bao gồm:

### Test cases

1. **handleGenerate gửi đúng character fields**
   - `character_profile_id` = ID nhân vật đầu tiên
   - `character_profile_ids` = toàn bộ mảng đã chọn
   - Khi không chọn nhân vật → cả 2 field đều `undefined`

2. **handleSmartPrompt gửi đúng character fields tới generate-video-prompt**
   - Tương tự logic: `character_profile_id` = `selectedCharacterIds[0]`, `character_profile_ids` = mảng

3. **Scene navigation giữ nguyên character selection**
   - Khi chuyển scene (activeSceneIndex thay đổi), `selectedCharacterIds` không bị reset
   - Prompt thay đổi theo scene nhưng nhân vật giữ nguyên

4. **Multi-character ordering preserved qua scenes**
   - Thứ tự trong `character_profile_ids` (vai chính/phụ) không thay đổi khi navigate giữa các scene

5. **Reference image fallback logic**
   - `starting_frame_url` lấy từ `selectedCharacters[0].reference_image_url`
   - Nếu nhân vật không có ảnh reference → `undefined`

### Kỹ thuật

- Pure unit test với Vitest, không render component (extract logic ra helper functions để test)
- Mirror chính xác logic từ `QuickClipTab.tsx` lines 142-153 (Smart Prompt) và 179-195 (Generate)
- Reuse `makeProfile` helper từ file test hiện có
- ~12-15 test cases tổng cộng

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/video/__tests__/quickclip-character-consistency.test.ts` | Tạo mới |
