

User muốn tối ưu UI Admin Industries trên mobile (viewport ~707px). Hiện tại header + 4 stats cards chiếm quá nhiều không gian, làm cho phần Categories sidebar và Industry Park browser bị thu hẹp.

Cần xem `IndustryBrowserV2` để hiểu layout chính.

## Kế hoạch: Tối ưu UI Admin Industries cho Mobile

### Vấn đề
Trên mobile (~707px), trang `/admin/industries` có:
- Header lớn với icon + title + description + 2 nút import
- 4 stats cards chiếm 2 hàng (grid-cols-2)
- → Phần Categories sidebar và Industry Park browser bị đẩy xuống dưới, ít không gian hiển thị

### Giải pháp
Làm gọn header và stats cards trên mobile, dành nhiều không gian hơn cho nội dung chính.

### Thay đổi trong `src/pages/AdminIndustriesV2.tsx`

**1. Header gọn hơn trên mobile:**
- Icon nhỏ hơn (`p-1.5`, `h-5 w-5` thay vì `p-2`, `h-6 w-6`)
- Title nhỏ hơn (`text-lg` mobile, `text-2xl` desktop)
- Ẩn description trên mobile
- Nút Import: chỉ hiện icon trên mobile (ẩn text), full button trên desktop
- Ẩn badge "v2.1" trên mobile

**2. Stats cards collapsible trên mobile:**
- Mobile: gộp 4 stats thành 1 hàng compact (grid-cols-4) chỉ hiện số + icon nhỏ, ẩn label
- Hoặc: thêm nút toggle "Hiện thống kê" để ẩn/hiện cards (mặc định ẩn trên mobile)
- → Chọn phương án **compact 1 hàng** với padding nhỏ (`p-2`), icon `h-3 w-3`, số `text-sm font-bold`, ẩn label phụ

**3. Container padding gọn hơn:**
- `py-6` → `py-3 md:py-6`
- `space-y-4` → `space-y-3 md:space-y-4`

### Kết quả
- Header + stats chiếm ~80px trên mobile (giảm từ ~200px)
- Phần Categories và Industry Park có thêm ~120px chiều cao
- Desktop UI giữ nguyên không đổi

### File chỉnh sửa
- `src/pages/AdminIndustriesV2.tsx` (chỉ 1 file)

