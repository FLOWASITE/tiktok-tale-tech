
# Hoàn thiện Character Consistency System

## Tổng quan

Hiện tại MultiCharacterPicker đã tích hợp vào QuickClip và Storyboard. Còn lại cần hoàn thiện:

1. **ScriptFormStepper**: Vẫn dùng single CharacterPicker -- nâng lên MultiCharacterPicker
2. **Edge function `generate-video`**: Chỉ xử lý 1 `character_profile_id` -- cần hỗ trợ mảng `character_profile_ids`
3. **Edge function `generate-script`**: Tương tự, inject multi-character vào script generation
4. **ScriptToVideoContext**: `characterProfileId` (string) cần thành `characterProfileIds` (string[]) để propagate multi-character từ script sang video

---

## 1. ScriptFormStepper -- MultiCharacterPicker

Thay `CharacterPicker` bằng `MultiCharacterPicker` trong form tạo kịch bản. Cập nhật `formData.character_profile_id` thành `character_profile_ids: string[]`.

## 2. ScriptToVideoContext -- Multi-character propagation

- Thêm `characterProfileIds?: string[]` vào `ActiveScript` interface (giữ backward compat với `characterProfileId`)
- Khi chuyển script sang Video Studio, propagate danh sách nhân vật

## 3. Edge function `generate-video` -- Multi-character prompt injection

- Accept `character_profile_ids: string[]` (fallback `character_profile_id` cho backward compat)
- Fetch tất cả profiles, build block cho từng nhân vật với tag `[MAIN CHARACTER]` / `[SECONDARY CHARACTER N]`
- Reference image uu tien nhan vat chinh

## 4. Edge function `generate-script` -- Multi-character in script AI

- Accept `character_profile_ids` array
- Inject structured description cho moi nhan vat vao continuityRules

## 5. Script types update

- `ScriptFormData.character_profile_ids?: string[]` thay cho `character_profile_id`

---

## Technical details

### Files modified
- `src/components/script/ScriptFormStepper.tsx` -- swap CharacterPicker -> MultiCharacterPicker
- `src/contexts/ScriptToVideoContext.tsx` -- add `characterProfileIds` to ActiveScript
- `src/types/script.ts` -- update ScriptFormData type
- `supabase/functions/generate-video/index.ts` -- multi-character fetch + prompt build
- `supabase/functions/generate-script/index.ts` -- multi-character injection
- `mem://features/video/character-consistency-vn.md` -- update docs
