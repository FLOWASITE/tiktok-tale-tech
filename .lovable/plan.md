
Di chuyển 2 menu "Quản lý Brand" và "Kết nối kênh" từ sidebar vào menu Profile (user dropdown).

## Thay đổi
1. **`src/components/AppSidebar.tsx`**: Xóa 2 menu items "Quản lý Brand" (`/brands`) và "Kết nối kênh" (`/social-connections`) khỏi sidebar.
2. **Profile dropdown menu**: Tìm component dropdown của user (avatar góc phải/dưới) và thêm 2 entries này.

## Cần xác định
- File nào chứa user profile dropdown để thêm vào.
