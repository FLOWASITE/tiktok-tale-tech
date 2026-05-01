---
name: Character Consistency System
description: Character profiles for maintaining visual consistency across video scenes with multi-ref images, batch injection, script integration, and last-frame chaining
type: feature
---

## Bảng `character_profiles`
- Lưu: name, description, appearance (jsonb), wardrobe, reference_image_url, **reference_images (jsonb array)**
- reference_images: mảng `{url, label}` với label = front|side|full-body|close-up|outfit (tối đa 5)
- RLS: org_members CRUD
- Storage bucket: `character-references` (public read, auth upload/delete)

## Frontend
- `useCharacterProfiles` hook: CRUD + `buildCharacterBlock()` + ReferenceImage types
- `CharacterProfileManager`: Dialog form CRUD + **multi-image upload** với label selector
- `CharacterPicker`: Select dropdown dùng trong QuickClipTab, **StoryboardVideoTab**, **ScriptFormStepper**

## Backend Prompt Injection
- `generate-video`: Nếu có `character_profile_id` → fetch profile → prepend `[CHARACTER CONSISTENCY]` block + **smart image selection** (front cho scene thường, close-up cho cận cảnh) + multi-ref fallback
- `generate-video-prompt`: Inject `CHARACTER` context vào user prompt cho AI
- `generate-script`: Nếu có `character_profile_id` → fetch profile → append `[NHÂN VẬT CHÍNH]` block vào system prompt, yêu cầu mô tả nhất quán trong mọi PROMPT block

## Storyboard Batch Character Injection
- CharacterPicker trên StoryboardVideoTab, phía trên nút "Quay tự động"
- Mỗi scene inject character block vào prompt + truyền character_profile_id

## Last-Frame Chaining
- Batch generate sequential: sau scene N hoàn thành, `video_url` truyền làm `starting_frame_url` cho scene N+1
- Fallback chain: previousVideoUrl > character reference_image > none

## Script Integration
- `ScriptFormData` có `character_profile_id`
- `ActiveScript` interface có `characterProfileId` — propagate qua ScriptToVideoContext
- ScriptFormStepper hiển thị CharacterPicker cạnh Character Type chip
