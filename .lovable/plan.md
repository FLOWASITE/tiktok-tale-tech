

## Fix: Hiển thị Facebook icon khi chưa có kết nối Fanpage

### Vấn đề
Hàm `renderFacebookPlatform()` (line 644-684) chỉ render:
1. Active connections (nếu có)
2. Inactive connections toggle
3. Nút "Thêm Fanpage khác" (dashed, icon Plus, không có Facebook icon)

Khi chưa có kết nối nào → chỉ thấy nút dashed "Thêm Fanpage khác" mà không có icon Facebook, tên platform hay mô tả → user không nhận ra đây là Facebook.

### Giải pháp
Sửa `renderFacebookPlatform()` trong `src/components/brand/BrandViewConnectionsTab.tsx`:

- **Khi chưa có active connection nào**: Hiển thị một card chính giống các platform khác — có icon Facebook (bg xanh), tên "Facebook", mô tả "Đăng lên Page", và nút "Kết nối" (style primary).
- **Khi đã có active connection**: Giữ nguyên danh sách + nút "Thêm Fanpage khác" dashed như hiện tại.

### Thay đổi cụ thể
Trong hàm `renderFacebookPlatform()` (~line 644), thêm điều kiện: nếu `activeConns.length === 0 && inactiveConns.length === 0` (hoặc chỉ có inactive), render card Facebook đầy đủ thay vì nút dashed.

```text
// Pseudo-code
if (activeConns.length === 0) {
  // Render full Facebook card with icon + name + description + "Kết nối" button
  // (same layout as renderConnection for other platforms)
}
// Then render inactive toggle + "Thêm Fanpage khác" as before
```

### File cần sửa
- `src/components/brand/BrandViewConnectionsTab.tsx` — hàm `renderFacebookPlatform()` (~line 644-684)

