## Vấn đề

Header brand switcher đang chọn **TAF**, nhưng các trang danh sách vẫn hiện content của brand khác trong cùng workspace. Nguyên nhân: hooks `useMultiChannelContents`, `useCarousels`, các tab của Video Studio (Scripts, Storyboard, QuickClip list) chỉ filter theo `organization_id`, **không** filter theo `currentBrand.id`.

Hệ quả: 1 workspace có nhiều brand → mọi list view đều trộn chung content.

## Giải pháp: Auto-filter theo `currentBrand` ở list views

Áp dụng pattern: **khi `currentBrand` có giá trị → chỉ hiện row có `brand_template_id === currentBrand.id` + row legacy `brand_template_id IS NULL`**. Khi không có brand → hiện tất cả của org (giữ hành vi cũ).

### 1. `src/pages/MultiChannel.tsx`
- Đổi default `brandFilter` từ `'all'` → `currentBrand?.id ?? 'all'`, sync khi switch brand.
- Giữ dropdown filter để user vẫn override sang "Tất cả brand" nếu muốn.
- Active filter chip hiển thị "Brand: TAF" như indicator.

### 2. `src/pages/Carousel.tsx`
- Thêm `useCurrentBrand()` + `useMemo` filter `carousels.filter(c => !currentBrand || c.brand_template_id === currentBrand.id || !c.brand_template_id)`.
- Empty state: "Brand TAF chưa có carousel nào — tạo mới?".

### 3. Video Studio (`src/pages/VideoStudioPage.tsx` + tabs)
- **ScriptsTab**: filter list scripts theo `currentBrand.id` (giống pattern `QuickClipContextPicker.tsx:63`).
- **StoryboardTab / QuickClipTab list**: filter các project/clip có sẵn theo brand.
- QuickClip create đã gắn `brand_id: currentBrand.id` → giữ nguyên.

### 4. Empty state + Switch hint
Khi list rỗng vì filter brand → hiện banner nhỏ: *"Đang xem brand **TAF**. [Xem tất cả brand]"* để user không bối rối.

### 5. Không đụng vào
- `useMultiChannelContents` / `useCarousels` query cấp DB: **giữ filter theo `organization_id`** để cache theo org (tránh refetch mỗi lần đổi brand). Filter theo brand làm ở client (memoized) — nhanh hơn và cho phép toggle "all brands".
- RLS, schema, edge functions: không thay đổi.
- Brand switcher header: đã hoạt động đúng.

## Files sẽ sửa
- `src/pages/MultiChannel.tsx` — set default brandFilter theo currentBrand
- `src/pages/Carousel.tsx` — thêm client-side brand filter + empty state
- `src/components/video/ScriptsTab.tsx` — filter theo currentBrand
- `src/components/video/StoryboardTab.tsx` (nếu có list) — filter theo currentBrand
- `src/components/video/QuickClipTab.tsx` — nếu có list quick clips cũ thì filter

Tổng: chỉ frontend, không động backend/RLS.
