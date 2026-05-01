---
name: Character Consistency System
description: Full character consistency system with AI auto-fill, multi-character, voice binding, multi-ref images, batch injection, script integration, last-frame chaining
type: feature
---

## Bảng `character_profiles`
- Cột: name, description, appearance (jsonb), wardrobe, reference_image_url, reference_images (jsonb array), default_voice_id, default_voice_provider
- reference_images: mảng `{url, label}` với label = front|side|full-body|close-up|outfit (tối đa 5)
- RLS: org_members CRUD
- Storage bucket: `character-references`

## Phase 1 — Core
- `useCharacterProfiles` hook: CRUD + `buildCharacterBlock()` + ReferenceImage types
- `CharacterPicker`: Single-select dropdown (kept for backward compat)
- Prompt injection: generate-video + generate-video-prompt + generate-script

## Phase 2 — Enhanced
- Multi-reference images: upload 5 ảnh với label, smart image selection theo context
- Storyboard batch injection: CharacterPicker + inject character vào loop
- Script integration: character_profile_id trong ScriptFormData + ActiveScript.characterProfileId
- Last-frame chaining: sequential batch dùng previousVideoUrl làm starting_frame cho scene tiếp

## Phase 3 — Advanced
- **AI auto-fill**: Edge function `analyze-character-image` dùng Gemini Vision phân tích ảnh → tự điền appearance fields
- **Multi-character**: `MultiCharacterPicker` component cho phép chọn tối đa 3 nhân vật (chính + phụ)
- **Voice binding**: default_voice_id + default_voice_provider trên character_profiles, UI trong CharacterProfileManager
- **Auto-extract last frame**: Batch generate lấy video_url từ scene trước làm starting_frame_url cho scene sau

## Phase 3.5 — Full Integration (hoàn thiện)
- **MultiCharacterPicker tích hợp toàn bộ**: QuickClipTab, StoryboardVideoTab, ScriptFormStepper đều dùng MultiCharacterPicker
- **ScriptToVideoContext**: `characterProfileIds: string[]` propagate multi-character từ script sang video studio
- **ScriptFormData**: thêm `character_profile_ids?: string[]` (giữ backward compat `character_profile_id`)
- **Edge function `generate-video`**: Accept `character_profile_ids` array, fetch tất cả profiles, build block `[MAIN CHARACTER]` / `[SECONDARY CHARACTER N]`, ref image từ primary
- **Edge function `generate-script`**: Accept `character_profile_ids` array, inject multi-character context `[NHÂN VẬT CHÍNH]` / `[NHÂN VẬT PHỤ N]` vào system prompt
- **Backward compat**: Cả 2 edge functions fallback `character_profile_id` nếu `character_profile_ids` không có
