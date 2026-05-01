
# Hoàn thiện còn lại: generate-video-prompt + cleanup

## 1. Edge function `generate-video-prompt` -- Multi-character

Hiện tại chỉ xử lý 1 `character_profile_id`. Cần nâng cấp giống `generate-video`:
- Thêm `character_profile_ids?: string[]` vào interface
- Destructure `character_profile_ids` từ body  
- Resolve array (prefer `character_profile_ids`, fallback `character_profile_id`)
- Fetch all profiles with `.in('id', ids)`, build multi-character context block

## 2. QuickClipTab -- gửi `character_profile_ids` cho Smart Prompt

Line 150: thay `character_profile_id: selectedCharacterIds[0]` bằng gửi cả `character_profile_ids: selectedCharacterIds` (giữ `character_profile_id` cho backward compat).

## 3. Deploy edge functions

Deploy `generate-video`, `generate-script`, `generate-video-prompt` để test.

---

### Files modified
- `supabase/functions/generate-video-prompt/index.ts` -- multi-character fetch + context
- `src/components/video/QuickClipTab.tsx` -- send `character_profile_ids` to Smart Prompt
