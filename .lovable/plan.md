## Mục tiêu
Tích hợp quản lý nhân vật Video (đang ở route `/characters`) vào trang Brand View dưới dạng 1 tab mới, để mỗi brand có "ngăn nhân vật" riêng — đúng tinh thần character có `brand_template_id` và constraint mỗi brand 1 vai chính.

## Thay đổi

### 1. Tab mới "Nhân vật" trong `src/pages/BrandView.tsx`
- Thêm `TabsTrigger value="characters"` (icon `UserSquare2` hoặc `Film` từ lucide) sau tab **Sản phẩm**, trước **Chiến lược**.
- Hiển thị badge đếm số nhân vật của brand hiện tại.
- Thêm `TabsContent value="characters"` render `<BrandViewCharactersTab template={template} />`.

### 2. Component mới `src/components/brand/BrandViewCharactersTab.tsx`
Tái sử dụng toàn bộ logic của `CharactersPage` nhưng **scoped theo brand đang xem** (không phải currentBrand context):
- Dùng `useCharacterProfiles()` rồi `filter(p => p.brand_template_id === template.id)`.
- Render lại UI: header nhỏ ("Nhân vật của brand X"), nút **Tạo nhân vật** + **Tạo bằng AI**, grid `CharacterCard`, `CharacterFilters` (ẩn switch "chỉ brand hiện tại" vì đã mặc định scoped), `CharacterBulkBar`.
- Mở `CharacterFormSheet` với `defaultBrandId={template.id}` để form auto-gán brand.
- Mở `AIBulkGenerateSheet` với `brand={{ id: template.id, name, industry, tone_of_voice }}`.
- Empty state: "Brand này chưa có nhân vật nào" + 2 CTA (Tạo thủ công / Tạo bằng AI).
- Reuse handler `handleGenerateAvatar` từ `CharactersPage` (copy nguyên).

### 3. Cập nhật điều hướng
- `src/components/AppSidebar.tsx`: giữ link `/characters` (trang tổng hợp toàn org) nhưng đổi label/mô tả thành "Nhân vật (toàn bộ)" hoặc gắn tooltip "hoặc xem trong từng Brand".
- Trong `CharactersPage`, mỗi `CharacterCard` đã có `brandName` → thêm link nhỏ "Mở trong Brand →" navigate tới `/brands/{brand_template_id}?tab=characters`.

### 4. Không thay đổi
- Hook `useCharacterProfiles`, edge functions, schema DB — giữ nguyên.
- Trang `/characters` vẫn hoạt động như cross-brand view.

## Kỹ thuật
- Tab key `characters` đồng bộ với `searchParams.get('tab')` đã có sẵn trong BrandView.
- TabsList hiện 8 tabs → thành 9. Đã dùng `flex-wrap`/`overflow-x-auto` (kiểm tra lại class hiện tại; nếu chật, rút gọn label "NV" trên mobile như các tab khác).
- Constraint `uniq_main_character_per_brand` đã có sẵn → form sheet xử lý lỗi sẵn, không cần làm thêm.
