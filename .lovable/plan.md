

## Chỉnh chu UI cho nhiều Fanpage Facebook

### Thay đổi trong `src/components/brand/BrandViewConnectionsTab.tsx`

**1. Thêm số thứ tự và nhóm visual cho các Fanpage**
- Mỗi Fanpage active hiển thị label nhỏ "Fanpage 1", "Fanpage 2", "Fanpage 3"... phía trên hoặc bên cạnh tên Page
- Giúp user phân biệt rõ khi có nhiều kết nối

**2. Cải thiện layout cho danh sách nhiều Fanpage**
- Fanpage đầu tiên giữ border solid (chính), các Fanpage tiếp theo dùng border nhẹ hơn nhưng vẫn rõ ràng
- Thêm divider hoặc khoảng cách hợp lý giữa các connection
- Nút "Thêm Fanpage" chuyển sang style nhỏ gọn hơn (border dashed, text muted) để không lẫn với các connection đã có

**3. Hiển thị thông tin phụ hữu ích**
- Thêm thời gian kết nối (connected_at) dạng relative ("2 ngày trước") dưới mỗi connection
- Giúp phân biệt các Fanpage khi tên giống nhau

### Kết quả
Danh sách nhiều Fanpage Facebook trông gọn gàng, có thứ tự rõ ràng, dễ quản lý.

