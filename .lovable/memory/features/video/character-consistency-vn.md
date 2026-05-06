---
name: Character Consistency System
description: Full character consistency system with AI auto-fill, multi-character, voice binding, multi-ref images, batch injection, script integration, last-frame chaining
type: feature
---

## Bảng `character_profiles`
- Cột: name, description, appearance (jsonb), wardrobe, reference_image_url, reference_images (jsonb array), default_voice_id, default_voice_provider, default_role ('main'|'supporting'), brand_template_id
- reference_images: mảng `{url, label}` với label = front|side|full-body|close-up|outfit (tối đa 5)
- RLS: org_members CRUD
- Storage bucket: `character-references`
- **Constraint:** partial unique index `uniq_main_character_per_brand` — mỗi brand_template_id chỉ tối đa 1 nhân vật `default_role='main'`. UI: `findMainCharacterForBrand()` helper trong useCharacterProfiles + Alert cảnh báo trong CharacterFormSheet (disable Save) + AIBulkGenerateSheet (disable Vai chính + auto-fallback supporting). DB error 23505 → toast VN friendly.

## Injection Architecture — Single Source of Truth
- **Frontend KHÔNG inject character block vào prompt** — chỉ truyền `character_profile_ids: string[]`
- **Edge functions là nơi duy nhất** build character block từ DB data
- Tránh double injection / mâu thuẫn nhãn

## Label Convention
- **Video models** (generate-video, generate-video-prompt): English labels `[MAIN CHARACTER]` / `[SUPPORTING CHARACTER N]`
- **Script generation** (generate-script): Vietnamese labels `[NHÂN VẬT CHÍNH]` / `[NHÂN VẬT PHỤ N]`
- Multi-character: thêm `[CHARACTER DISTINCTION]` block cảnh báo không trộn lẫn ngoại hình

## Voice/Lip-sync Constraints
- `default_voice_id` + `default_voice_provider` được inject vào character block
- generate-video: `Voice ID: xxx (provider). Lip sync must match.`
- generate-script: `Giọng nói: voice_id=xxx. Khẩu hình và biểu cảm miệng phải khớp.`
- generate-video-prompt: `Voice: xxx — lip sync must match this voice.`

## Phase 1 — Core
- `useCharacterProfiles` hook: CRUD + `buildCharacterBlock()` + ReferenceImage types
- `CharacterPicker`: Single-select dropdown (kept for backward compat, unused)
- Prompt injection: generate-video + generate-video-prompt + generate-script

## Phase 2 — Enhanced
- Multi-reference images: upload 5 ảnh với label, smart image selection theo context
- Storyboard batch injection + inject character vào loop
- Script integration: character_profile_id trong ScriptFormData + ActiveScript.characterProfileId
- Last-frame chaining: sequential batch dùng previousVideoUrl làm starting_frame cho scene tiếp

## Phase 3 — Advanced
- **AI auto-fill**: Edge function `analyze-character-image` dùng Gemini Vision phân tích ảnh → tự điền appearance fields
- **Multi-character**: `MultiCharacterPicker` component cho phép chọn tối đa 3 nhân vật (chính + phụ)
- **Voice binding**: default_voice_id + default_voice_provider trên character_profiles, UI trong CharacterProfileManager
- **Auto-extract last frame**: Batch generate lấy video_url từ scene trước làm starting_frame_url cho scene sau

## Phase 3.5 — Full Integration
- **MultiCharacterPicker**: QuickClipTab, StoryboardVideoTab, ScriptFormStepper
- **ScriptToVideoContext**: `characterProfileIds: string[]` propagate multi-character
- **ScriptFormData**: `character_profile_ids?: string[]`
- **VideoGenerationRequest**: `character_profile_ids?: string[]`
- **3 Edge functions đều hỗ trợ multi-character** với backward compat `character_profile_id`
- **Frontend không inject prompt** — chỉ gửi IDs, edge function build block
