## Kế hoạch sửa lỗi “Không thấy tên Board”

### Vấn đề hiện tại
- Database đã có board Pinterest cho tài khoản `@flowasite`: board tên **Flowa**.
- Brand `Flowa` đã lưu `pinterest_default_board_id` đúng.
- UI dropdown vẫn nhìn như trống vì selector đang chỉ render label trong danh sách option, nhưng chưa có cơ chế hiển thị rõ tên board đã chọn / fallback khi `SelectValue` không nhận được text từ item hoặc dữ liệu load chậm.

### Thay đổi sẽ làm
1. **Sửa `PinterestBoardSelector.tsx`**
   - Tính `selectedBoard` từ `boards` + `selected`.
   - Hiển thị placeholder rõ ràng theo trạng thái:
     - Loading: `Đang tải boards…`
     - Có board đã chọn: tên board, ví dụ `Flowa`
     - Có boards nhưng chưa chọn: `Chọn board mặc định`
     - Không có boards: `Chưa có board nào — bấm Đồng bộ`
   - Trong từng option, dùng text trực tiếp thay vì cấu trúc `span` phức tạp để tránh `SelectValue` render rỗng.
   - Nếu chỉ có 1 board sau khi sync và chưa có board mặc định, tự set dropdown sang board đó để người dùng chỉ cần bấm lưu.

2. **Cải thiện sau khi bấm Đồng bộ**
   - `loadBoards()` trả về danh sách mới thay vì chỉ set state.
   - Sau sync, nếu có đúng 1 board thì tự chọn board đó.
   - Toast báo đúng tên board vừa đồng bộ nếu có.

3. **Không đổi backend/policy**
   - Hiện board đã được lưu trong `pinterest_boards`, nên lỗi lần này nằm ở UI hiển thị/chọn mặc định, không cần migration.

### Kiểm tra sau sửa
- Mở phần Pinterest connection.
- Dropdown phải hiển thị board **Flowa** thay vì ô trống.
- Khi bấm lưu, brand sẽ giữ `pinterest_default_board_id` và publish Pinterest không còn báo thiếu board.