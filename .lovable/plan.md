
# Nâng cấp đồng nhất nhân vật (Phase 2)

Phase 1 đã triển khai: bảng `character_profiles`, CRUD UI, CharacterPicker trên QuickClip, prompt injection trong `generate-video` và `generate-video-prompt`.

Phase 2 sẽ bổ sung 4 khả năng chính:

---

## 1. Multi-Reference Images (nhiều ảnh tham chiếu)

**Hiện tại**: Mỗi nhân vật chỉ có 1 `reference_image_url`.

**Nâng cấp**:
- Thêm cột `reference_images jsonb default '[]'` vào `character_profiles` (mảng URLs, tối đa 5 ảnh: chính diện, nghiêng, toàn thân, cận mặt, trang phục).
- UI cho phép upload nhiều ảnh, kéo thả sắp xếp, gắn label (front/side/full-body/close-up/outfit).
- Edge function chọn ảnh phù hợp nhất theo context: scene đầu dùng ảnh chính diện, scene cận cảnh dùng close-up.

**Files thay đổi**:
- Migration: thêm cột `reference_images`
- `CharacterProfileManager.tsx`: multi-image upload UI
- `useCharacterProfiles.ts`: cập nhật types
- `generate-video/index.ts`: smart image selection logic

---

## 2. Storyboard Batch Character Injection

**Hiện tại**: `StoryboardVideoTab.runBatchGenerate()` gọi `generateVideo()` không truyền `character_profile_id`, nên batch generate không có character consistency.

**Nâng cấp**:
- Thêm `CharacterPicker` vào StoryboardVideoTab (phía trên nút "Quay tất cả").
- Khi batch generate, mỗi scene tự động truyền `character_profile_id` + inject character block vào prompt.
- Hiển thị badge nhân vật đang active trên mỗi scene card.

**Files thay đổi**:
- `StoryboardVideoTab.tsx`: thêm CharacterPicker + truyền character vào loop generate

---

## 3. Script-to-Video Character Integration

**Hiện tại**: `ScriptNew` page và `ScriptToVideoContext` không biết về character profiles. Khi viết kịch bản, không có cách chọn nhân vật để AI giữ nhất quán từ khâu viết script đến khâu quay video.

**Nâng cấp**:
- Thêm `characterProfileId` vào `ActiveScript` interface trong `ScriptToVideoContext`.
- Thêm `CharacterPicker` vào ScriptNew page (cạnh chọn video type/character type).
- Khi tạo script AI (`generate-script`), inject structured character description vào prompt thay vì chỉ dùng `characterType` generic.
- Khi chuyển script sang Video Studio, character profile tự động propagate qua context.

**Files thay đổi**:
- `ScriptToVideoContext.tsx`: thêm `characterProfileId` vào `ActiveScript`
- `ScriptNew.tsx` hoặc component con: thêm CharacterPicker
- `generate-script/index.ts`: inject character profile details vào continuityRules + mỗi PROMPT block

---

## 4. Last-Frame Chaining (Scene Continuity)

**Hiện tại**: Mỗi scene dùng cùng 1 reference image tĩnh. Không có liên kết visual giữa scene trước và scene sau.

**Nâng cấp**:
- Khi batch generate (Storyboard), sau khi scene N hoàn thành, tự động extract thumbnail/last-frame URL từ video đã tạo.
- Truyền URL đó làm `starting_frame_url` cho scene N+1, tạo chuỗi visual liên tục.
- Fallback: nếu scene trước chưa xong hoặc không có video URL, dùng reference image gốc của character.

**Files thay đổi**:
- `StoryboardVideoTab.tsx`: sequential batch logic (chờ scene trước xong rồi mới submit scene sau)
- `generate-video/index.ts`: ưu tiên `previous_scene_url` > `character reference` > none

---

## Technical Details

### Database Migration
```sql
ALTER TABLE public.character_profiles 
  ADD COLUMN IF NOT EXISTS reference_images jsonb DEFAULT '[]';
```

### ScriptToVideoContext Changes
```typescript
export interface ActiveScript {
  // ...existing fields
  characterProfileId?: string;
}
```

### Batch Chaining Logic (pseudo)
```
for scene in scenes:
  starting_frame = previousVideoUrl || characterRefImage || null
  result = await generateVideo({ ...scene, starting_frame_url, character_profile_id })
  wait for completion
  previousVideoUrl = result.video_url  // for next scene
```

### Estimated Scope
- 1 migration (add column)
- 5 files modified (StoryboardVideoTab, ScriptToVideoContext, ScriptNew/component, CharacterProfileManager, generate-script edge function)
- 1 file minor update (generate-video edge function)
