Sẽ sửa đúng vị trí người dùng khoanh trong popup “Import Brand”:

1. Trong `BrandImportDialog.tsx`, thêm logic lấy danh sách ngành từ hệ thống Industry Packs ngay khi có kết quả import.
2. Dòng “Ngành (gợi ý)” sẽ không chỉ hiển thị 1 text nữa, mà hiển thị các lựa chọn dạng danh sách/chip ngay bên dưới text gợi ý:
   - Ưu tiên match theo `industry_suggestion` từ AI import.
   - Nếu có nhiều ngành gần đúng, show khoảng 5 ngành để user bấm chọn/xác nhận.
   - Nếu không match được, fallback sang ngành phổ biến để không bị trống.
3. Thay vòng tròn checkbox của “Ngành (gợi ý)” thành trạng thái bắt buộc chọn ngành khi tạo brand mới:
   - Ban đầu chưa chọn thì vòng tròn rỗng.
   - User bấm một ngành trong danh sách thì vòng tròn/tick được bật và ngành được lưu vào `raw_meta.selected_industry_pack`.
4. Khi bấm “Tiếp tục tạo brand”, `BrandCreate.tsx` sẽ ưu tiên ngành đã chọn trong popup:
   - Set `globalPackId` đúng pack user chọn.
   - Set `industries` theo tên ngành đã chọn.
   - Không còn phụ thuộc vào dialog sau import để xác nhận ngành.

Phạm vi chỉ frontend import/create brand, không đổi backend/schema.