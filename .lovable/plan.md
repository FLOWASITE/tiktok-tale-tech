

# Fix: Header Brand trên mobile khó nhìn

## Vấn đề

Trên mobile (707px), header có nhiều vấn đề:
1. **OrganizationSwitcher** có `min-w-[350px]` — chiếm gần hết chiều ngang, đẩy brand switcher và các nút khác
2. **HeaderBrandSwitcher** ẩn tên brand trên mobile (`hidden sm:inline`), chỉ hiện avatar 24x24px rất nhỏ, khó nhận biết
3. Quá nhiều icon bên phải (Search, Help, Notification, Theme, Avatar) chiếm hết không gian

## Giải pháp

### 1. `src/components/OrganizationSwitcher.tsx`
- Bỏ `min-w-[350px]`, thay bằng responsive: mobile chỉ hiện logo/icon + chevron, không hiện tên org và role
- Desktop giữ nguyên layout hiện tại

### 2. `src/components/HeaderBrandSwitcher.tsx`
- Tăng kích thước avatar trên mobile từ `w-6 h-6` → `w-7 h-7`
- Hiện tên brand rút gọn trên mobile (thay vì ẩn hoàn toàn): `max-w-[60px] truncate` trên mobile, `max-w-[100px]` trên sm+
- Thêm viền màu `primary_color` của brand quanh avatar để dễ nhận biết hơn

### 3. `src/components/AppLayout.tsx`
- Ẩn bớt một số icon ít dùng trên mobile: `ThemeToggle` và `HelpHeaderButton` ẩn trên mobile (`hidden sm:flex`)
- Giảm `gap` header trên mobile từ `gap-3` → `gap-1.5 sm:gap-3`

Sửa 3 file, ~10-15 dòng thay đổi.

