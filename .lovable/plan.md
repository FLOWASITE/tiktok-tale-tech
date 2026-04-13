

## Chỉnh chu UI cho nhiều Website (tương tự Facebook)

### Thay đổi trong `src/components/brand/BrandViewConnectionsTab.tsx` — hàm `renderWebsitePlatform()`

**1. Thêm số thứ tự khi có nhiều website**
- Label "Website 1", "Website 2"... khi có ≥2 kết nối active
- Dùng cùng style với Facebook: `text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded`

**2. Thêm thời gian kết nối (relative)**
- Hiển thị `formatDistanceToNow(connected_at)` dưới mỗi connection
- Cùng format "· X ngày trước" như Facebook

**3. Badge "Đã xác thực" khi có `last_verified_at`**
- Hiện tại website chỉ hiển thị "Đã kết nối" (xanh dương) hoặc "Đã ngắt" (đỏ)
- Thêm logic: nếu `last_verified_at` có giá trị → hiển thị badge "Đã xác thực" (xanh lá) thay vì "Đã kết nối"

**4. Avatar overlay cho website**
- Nếu connection có `platform_avatar_url`, hiển thị avatar + icon Website nhỏ ở góc (giống Facebook)

**5. Nút "Thêm Website" nhỏ gọn hơn**
- Text muted, style dashed border (đã có sẵn phần nào), đảm bảo đồng nhất với nút "Thêm Fanpage khác" của Facebook

### File cần sửa
- `src/components/brand/BrandViewConnectionsTab.tsx` — chỉ hàm `renderWebsitePlatform()`

