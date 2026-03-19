
Mục tiêu: làm form “Chỉnh sửa Brand Template” rộng đủ để không còn thanh scroll ngang trên màn `/brands/:id` (đúng chỗ bạn đang mở trong ảnh).

1) Xác định đúng điểm đang gây lỗi
- `src/pages/BrandView.tsx` đang mở dialog edit bằng:
  - `DialogContent className="max-w-[95vw] md:max-w-2xl ..."`
- Ở desktop, `md:max-w-2xl` (≈ 672px) đang ghi đè và bóp form quá hẹp, trong khi `BrandForm` có layout 2 cột (form + preview), nên phát sinh scroll ngang.

2) Điều chỉnh kích thước dialog đúng màn hình desktop
- Cập nhật `DialogContent` trong `BrandView.tsx` sang cấu hình rộng thật sự cho desktop:
  - bỏ giới hạn `md:max-w-2xl`
  - dùng `w-[95vw] max-w-[95vw]` (hoặc tương đương) + `overflow-x-hidden`
  - giữ `max-h-[90vh]` + `overflow-y-auto` để vẫn cuộn dọc khi nội dung dài

3) Chặn overflow ngang từ bên trong form
- Bọc `BrandForm` bằng container `min-w-0` (nếu cần) để tránh phần tử con ép tràn.
- Giữ layout hiện tại của `BrandForm` (2 cột ở `lg`) vì khi dialog đủ rộng sẽ không còn tạo tràn ngang.

4) Đồng bộ để tránh lặp lỗi ở các điểm mở form khác
- Soát và đồng bộ class width của các dialog edit brand khác (`SettingsDropdown` / `BrandManagementDialog`) theo cùng chuẩn kích thước, để không còn tình trạng “màn này rộng, màn kia hẹp”.

5) Kiểm tra sau chỉnh sửa
- Kiểm tra trực tiếp flow edit brand trên `/brands/:id`:
  - mở dialog edit, kéo xuống cuối form
  - xác nhận không còn thanh scroll ngang
  - xác nhận vẫn cuộn dọc bình thường
- Kiểm tra thêm ở viewport nhỏ hơn (tablet/laptop) để đảm bảo không vỡ layout.

Chi tiết kỹ thuật (ngắn gọn)
- File chính cần sửa: `src/pages/BrandView.tsx`
- Thay đổi trọng tâm: class `DialogContent`
- Không đụng backend/database; chỉ chỉnh UI layout và overflow handling.
