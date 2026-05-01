
# Bố trí trang Video Studio hợp lý hơn

## Vấn đề hiện tại

1. **Header trùng lặp**: VideoStudioPage có header riêng ("Biến ý tưởng thành video sẵn-đăng") + ScriptsTab có ScriptHeroSection riêng ("Kịch bản") -- 2 hero section chồng nhau chiếm quá nhiều không gian trước khi thấy card.

2. **Stats hero quá to**: ScriptHeroSection có 4 stat cards + progress ring + gradient background + blur effects chiếm ~250px vertical trước khi thấy nội dung chính.

3. **Grid responsive chưa tối ưu**: Ở viewport ~707px (current), grid `grid-cols-1 xs:grid-cols-2` hiển thị 2 cột nhưng card min-h-[170px] + padding khiến mỗi card khá cao.

4. **Filters + CampaignSelector xếp dọc trên mobile** chiếm thêm không gian.

## Thay đổi

### 1. Compact ScriptHeroSection

- Thu gọn stats thành **1 dòng inline** (chips nhỏ) thay vì grid 4 cards riêng biệt
- Bỏ progress ring SVG, thay bằng text nhỏ "X% hoàn thành"
- Bỏ gradient background + blur decorative elements
- Layout: 1 hàng gồm title + stats chips + view toggle + nút Thêm mới

### 2. Gộp page header vào tab

- Giảm VideoStudioPage header xuống 1 dòng breadcrumb nhỏ (icon + "Video Studio")
- Bỏ h1 lớn và paragraph mô tả (đã hiển thị trong tab hints)

### 3. Cải thiện card grid

- Giảm skeleton loading cards từ 8 xuống 4 trên mobile
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (bỏ xs breakpoint và 2xl:5-cols không cần thiết)

### 4. Filters compact hơn

- Đặt CampaignSelector và ScriptFilters trên cùng 1 hàng, wrap khi cần

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/script/ScriptHeroSection.tsx` | Thu gọn thành 1-2 dòng inline stats |
| `src/pages/VideoStudioPage.tsx` | Compact page header |
| `src/components/video/ScriptsTab.tsx` | Cập nhật grid breakpoints, giảm skeletons |
