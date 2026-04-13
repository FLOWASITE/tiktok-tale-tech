

## Thêm lối vào "Kết nối" dễ tiếp cận hơn

### Hiện trạng
Kết nối social chỉ truy cập được qua: Brand Card → click → tab Kết nối. Không có mục nào trên sidebar hay dashboard trỏ thẳng đến.

### Thay đổi

**1. Thêm mục "Kết nối kênh" vào sidebar — nhóm Settings**
- File: `src/components/AppSidebar.tsx`
- Thêm item mới vào `settingsItems` với icon `Globe` (hoặc `Link2`), URL `/connections`
- Đặt ngay dưới "Quản lý Brand"

**2. Tạo trang `/connections` — redirect thông minh**
- File mới: `src/pages/Connections.tsx`
- Logic: Lấy current brand từ `useCurrentBrand()` → redirect đến `/brands/{currentBrandId}?tab=connections`
- Nếu chưa có brand → hiển thị thông báo + nút tạo brand

**3. Đăng ký route mới**
- File: `src/App.tsx` (hoặc file routing) — thêm route `/connections` → `Connections.tsx`

**4. Thêm Quick Action "Kết nối kênh" trên Dashboard**
- File: `src/components/dashboard/QuickActionGrid.tsx`
- Thêm 1 item mới vào `quickActions` với icon `Globe`, href `/connections`, gradient xanh lá

### Kết quả
- User thấy "Kết nối kênh" ngay trên sidebar (luôn hiện)
- Dashboard có quick action card dẫn thẳng đến kết nối
- Mọi đường đều dẫn đến đúng tab Kết nối của brand hiện tại

### File cần tạo/sửa
- **Tạo**: `src/pages/Connections.tsx`
- **Sửa**: `src/components/AppSidebar.tsx`, `src/components/dashboard/QuickActionGrid.tsx`, file routing

