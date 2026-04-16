

## Sửa lỗi: Thông tin Key bị mất khi chỉnh sửa Social Credentials

### Nguyên nhân
Trong `SocialPlatformCredentialsDialog.tsx`, dòng 164-165 luôn reset `consumerKey` và `consumerSecret` thành chuỗi rỗng khi mở dialog chỉnh sửa. Giá trị masked (vd: `sbaw****79qu`) chỉ hiển thị nhỏ bên dưới input dưới dạng text mờ, khiến người dùng cảm thấy dữ liệu bị mất.

### Giải pháp
1. **Hiển thị masked value trực tiếp trong input** thay vì để trống — set giá trị masked làm placeholder rõ ràng hơn, và thêm badge "Đã lưu" để người dùng biết credentials vẫn còn.
2. **Thêm thông báo rõ ràng** phía trên form khi đang chỉnh sửa: "Credentials hiện tại vẫn được lưu. Chỉ nhập mới nếu muốn thay đổi."
3. **Cải thiện placeholder text** — thay vì "Giữ nguyên hoặc nhập mới", hiển thị masked value trực tiếp trong placeholder (vd: `sbaw****79qu — nhập mới để thay đổi`).

### File thay đổi
- `src/components/admin/SocialPlatformCredentialsDialog.tsx`
  - Thêm alert/notice box khi `existingSettings?.has_credentials` là true
  - Cập nhật placeholder của input key/secret để hiển thị masked value
  - Đổi label "Hiện tại:" thành badge nổi bật hơn

