

# Làm lại UI Popup Xác nhận đăng bài

## Thay đổi

Redesign dialog xác nhận trong `DirectPublishButton.tsx` cho chuyên nghiệp hơn:

### 1. Header nổi bật theo platform
- Icon platform lớn hơn với background màu đặc trưng (Facebook xanh, Twitter đen, etc.)
- Hiển thị tên platform đầy đủ ("Facebook Page", "Twitter / X") thay vì raw platform name
- Badge hiển thị username/page name của connection

### 2. Preview nội dung giống social post thực tế
- Card preview mô phỏng giao diện post thật: avatar + tên trang/tài khoản ở trên, nội dung ở giữa, ảnh ở dưới
- Ảnh đính kèm hiển thị đẹp hơn với aspect ratio chuẩn, hỗ trợ nhiều ảnh (grid 2x2 nếu >1)
- Hiển thị số ký tự đếm ngược (character count) cho Twitter

### 3. Thông tin bổ sung
- Hiển thị thời gian đăng: "Đăng ngay" với timestamp
- Warning rõ ràng hơn khi nội dung vượt giới hạn ký tự (amber banner thay vì text nhỏ)

### 4. Footer buttons cải thiện
- Nút "Đăng ngay" có màu đặc trưng theo platform (xanh Facebook, đen Twitter)
- Thêm trạng thái loading đẹp hơn khi đang publish

### File thay đổi
- `src/components/social/DirectPublishButton.tsx` — redesign phần Dialog confirmation

Không thay đổi logic publish, không thay đổi backend.

