---
name: Character Consistency System
description: Character profiles for maintaining visual consistency across video scenes
type: feature
---

## Bảng `character_profiles`
- Lưu: name, description, appearance (jsonb), wardrobe, reference_image_url
- RLS: org_members CRUD
- Storage bucket: `character-references` (public read, auth upload/delete)

## Frontend
- `useCharacterProfiles` hook: CRUD + `buildCharacterBlock()` utility
- `CharacterProfileManager`: Dialog form CRUD trong VideoStudioPage (collapsible)
- `CharacterPicker`: Select dropdown dùng trong QuickClipTab

## Backend Prompt Injection
- `generate-video`: Nếu có `character_profile_id` → fetch profile → prepend `[CHARACTER CONSISTENCY]` block vào prompt + dùng reference_image làm `starting_frame_url`
- `generate-video-prompt`: Nếu có `character_profile_id` → inject `CHARACTER` context vào user prompt cho AI

## Phase 2 (chưa triển khai)
- Script integration (ScriptNew chọn character, truyền qua ScriptToVideoContext)
- Storyboard batch: inject character vào mọi scene
- Last-frame extraction: lấy frame cuối video trước làm starting_frame cho scene tiếp
