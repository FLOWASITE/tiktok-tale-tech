# Avatar regenerate + Role badge/toggle trên CharacterCard

## Vấn đề
- Nút "Tạo lại avatar" đã tồn tại nhưng nằm trong action bar **chỉ hiện khi hover** (`opacity-0 group-hover:opacity-100`) → user không thấy.
- Chỉ nhân vật `default_role = 'main'` mới có badge "Vai chính"; **không có badge "Vai phụ"**, và không có cách set nhanh main/phụ ngoài việc mở form edit.

## Thay đổi
### 1. `src/components/characters/CharacterCard.tsx`
- **Badge vai trò luôn hiển thị** ở góc phải trên (cạnh CompletenessRing):
  - `main` → badge vàng "Vai chính" (giữ nguyên, có icon Star fill)
  - `supporting` → badge xám trung tính "Vai phụ" (icon Star outline)
- **Thêm callback `onToggleRole?: (next: 'main'|'supporting') => void`** + prop `isUpdatingRole?: boolean`. Click badge → toggle role (stopPropagation), hiện spinner khi đang update.
- **Tách nút "Tạo lại avatar" ra khỏi hover bar**: render dạng chip nhỏ luôn hiện ở góc dưới-phải hero image (chỉ khi đã có `reference_image_url`), icon `RefreshCw` + tooltip "Tạo lại ảnh AI". Khi đang generate vẫn hiện overlay loading như cũ.
- Giữ Edit/Clone/Delete trong hover bar (đỡ rối).

### 2. `src/pages/CharactersPage.tsx` & `src/components/brand/BrandViewCharactersTab.tsx`
- Thêm state `updatingRoleFor: string | null`.
- Hàm `handleToggleRole(p, next)` → `updateProfile.mutateAsync({ id, name, default_role: next })` + toast.
- Truyền `onToggleRole` + `isUpdatingRole` vào `<CharacterCard>` ở cả 2 nơi.

## Kỹ thuật
- Không cần migration: `default_role` đã tồn tại trên `character_profiles`.
- Reuse `updateProfile` mutation hiện có (đã hỗ trợ `default_role`).
- Style badge "Vai phụ": `variant="secondary"` `bg-background/85 backdrop-blur` cho nhất quán Soft Luxury, không dùng raw color.

## Acceptance
- Mỗi card hiển thị 1 badge role (chính hoặc phụ), click đổi tức thời.
- Nút regenerate avatar luôn thấy được trên card có ảnh, không cần hover.
- Cả `/characters` và Brand View → tab Nhân vật đều áp dụng.
