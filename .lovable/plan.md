# Auto-tạo ảnh nhân vật khi AI bulk-generate

## Vấn đề
`AIBulkGenerateSheet` chỉ gọi `generate-character` (sinh metadata text) rồi `onCreateProfile` → các nhân vật vừa tạo có `reference_image_url = null` → Card/Detail trống ảnh.

## Thay đổi

### 1. `src/components/characters/AIBulkGenerateSheet.tsx`
- Thêm prop `onUpdateProfile` (đã có sẵn từ `useCharacterProfiles`)
- Thêm switch **"Tự động tạo ảnh chân dung"** (default ON) + hint về credit ảnh
- Trong `saveSelectedGenerated`: sau mỗi `createProfile`, nếu bật autoGen → gọi `supabase.functions.invoke('generate-character-image', { name, appearance, wardrobe, description, view: 'front', organization_id })` → patch profile với `reference_image_url` + `reference_images: [{url, label:'front'}]`
- Thêm progress indicator `Đang tạo ảnh i/N`
- Lỗi ảnh từng cái chỉ đếm `imgFails` và toast.warning ở cuối, không rollback profile
- `onCreateProfile` đổi return type thành `Promise<CharacterProfile>` để lấy `id`

### 2. `src/components/characters/CharacterCard.tsx`
- Thêm prop optional `onGenerateAvatar?: () => void` + `isGeneratingAvatar?: boolean`
- Khi `!reference_image_url` → thay placeholder `<User>` bằng nút ghost "✨ Tạo ảnh AI" (nếu có handler), bấm → loading spinner

### 3. `src/pages/CharactersPage.tsx`
- Truyền `onUpdateProfile={(input) => updateProfile.mutateAsync(input)}` vào `AIBulkGenerateSheet`
- Thêm state `generatingAvatarFor: string | null` + handler `handleGenerateAvatar(p)`:
  - Gọi `generate-character-image` với view=`front`
  - `updateProfile.mutateAsync({ id: p.id, name: p.name, reference_image_url, reference_images })`
- Truyền xuống `CharacterCard`

## Không đụng
- Edge functions (`generate-character`, `generate-character-image`) — đã hoạt động đúng
- Schema DB, `useCharacterProfiles` — `reference_image_url` đã có sẵn

## Chi phí
Mỗi character bulk = 1 text call + 1 image call (Gemini). User có thể tắt switch để tiết kiệm credit.
