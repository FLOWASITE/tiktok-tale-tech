

# Thêm tổ chức khi tạo user mới

## Vấn đề
Hiện tại `CreateUserDialog` chỉ tạo user với role + plan. Không có tùy chọn thêm user vào tổ chức cụ thể (như "Công ty CP CÔNG NGHỆ FLOWA"). Khi tạo user, trigger `handle_new_user()` tự động tạo workspace cá nhân, nhưng không thêm vào org nào khác.

## Thay đổi

### 1. Sửa `src/components/admin/CreateUserDialog.tsx`
- Fetch danh sách tất cả organizations từ DB
- Thêm dropdown **multi