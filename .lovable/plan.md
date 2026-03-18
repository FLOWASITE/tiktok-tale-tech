
# Hoàn thiện Popup xác nhận đăng bài — Rộng hơn, hiển thị nhiều nội dung hơn

## Thay đổi trong `src/components/social/DirectPublishButton.tsx`

### 1. Mở rộng dialog
- Thay `sm:max-w-lg` thành `sm:max-w-2xl` để popup rộng hơn (~672px → ~896px)

### 2. Hiển thị nội dung nhiều hơn
- Tăng `max-h-32` (128px) lên `max-h-60` (240px) cho vùng preview text — thấy được nhiều nội dung hơn mà không bị cắt

### 3. Cải thiện media preview
- Ảnh đơn: tăng chiều cao tối đa, hiển thị rõ hơn
- Nhiều ảnh: tăng kích thước grid items

### 4. Bổ sung thông tin
- Thêm số lượng ảnh đính kèm (ví dụ: "📷 2 ảnh đính kèm")
- Thêm icon trạng thái kết nối (CheckCircle2 xanh) bên cạnh tên tài khoản ở header

### 5. Footer cải thiện
- Buttons dàn hàng ngang rõ ràng hơn, nút "Đăng ngay" nổi bật hơn với `font-semibold`

**File thay đổi**: chỉ `src/components/social/DirectPublishButton.tsx`
