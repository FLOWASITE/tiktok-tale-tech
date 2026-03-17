

# Kế hoạch: Hoàn thiện phân hệ quản lý User

## Hiện trạng đã có
- Danh sách user: search, filter (role/plan), sort, phân trang client-side
- Tạo user mới (chọn role, plan, gán org)
- Chi tiết user: orgs, usage, content stats, subscription edit
- Hành động: Ban/Unban, Delete, Reset password, Reset usage
- Bulk: Ban hàng loạt, Export CSV
- Stats: Tổng users, active subs, revenue, usage today

## Các điểm cần bổ sung (6 module)

### 1. Bộ lọc nâng cao + Filter trạng thái Banned
Hiện chỉ filter theo Role và Plan. Thiếu filter theo **trạng thái tài khoản** (Active/Banned) và **khoảng thời gian đăng ký**.

**Thay đổi:** Thêm Select filter "Trạng thái" (All / Active / Banned) và DateRange filter "Ngày tham gia" vào `AdminUsers.tsx`.

### 2. Chỉnh sửa Profile từ Admin
Hiện admin không thể sửa tên, email user. Chỉ xem được.

**Thay đổi:**
- `UserDetailSheet.tsx`: Thêm form edit `full_name` với nút Save, gọi `serviceClient.from('profiles').update()`
- `admin-manage-user/index.ts`: Thêm action `update_profile` (update profiles table + audit log)

### 3. Quản lý Org từ User Detail
Hiện UserDetailSheet chỉ hiển thị danh sách org. Không thể **thêm/xóa user khỏi org** hay **đổi role trong org**.

**Thay đổi:**
- `UserDetailSheet.tsx`: Thêm nút "Thêm vào Org" (dialog chọn org + role), nút "Xóa khỏi Org" và dropdown đổi role cho mỗi org membership
- `admin-manage-user/index.ts`: Thêm actions `add_to_org`, `remove_from_org`, `update_org_role`

### 4. Bulk Actions mở rộng
Hiện chỉ có Bulk Ban. Thiếu **Bulk Unban**, **Bulk Delete**, **Bulk đổi Plan**.

**Thay đổi:**
- `AdminUsers.tsx`: Thay thế `BrandBulkActionsBar` bằng `UserBulkActionsBar` mới với các nút: Ban, Unban, Delete (confirm dialog), Đổi Plan (select plan), Export CSV
- Tạo component `src/components/admin/UserBulkActionsBar.tsx`

### 5. Audit Log Viewer
Bảng `admin_audit_logs` đã có nhưng **không có UI** để xem lịch sử hành động admin.

**Thay đổi:**
- Tạo `src/components/admin/AuditLogPanel.tsx`: Hiển thị danh sách logs với filter theo action type, target user, thời gian. Mỗi entry hiện: Admin nào → Action gì → User nào → Khi nào → Chi tiết
- Tích hợp vào `AdminUsers.tsx` dưới dạng tab hoặc expandable panel

### 6. Bulk Import Users từ CSV
Hiện chỉ tạo từng user. Thiếu khả năng **import hàng loạt từ file CSV**.

**Thay đổi:**
- Tạo `src/components/admin/ImportUsersDialog.tsx`: Upload CSV (email, name, password, role, plan), preview bảng dữ liệu, chọn org gán chung, nút Import với progress bar
- Gọi `admin-manage-user` action `create_user` tuần tự cho mỗi row, hiển thị kết quả success/failed

## Tổng hợp files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/AdminUsers.tsx` | Thêm filter Banned/DateRange, tab Audit Log, nút Import CSV |
| `src/components/admin/UserDetailSheet.tsx` | Edit profile, quản lý org membership |
| `src/components/admin/UserBulkActionsBar.tsx` | **Mới** - Bulk Unban, Delete, Đổi Plan |
| `src/components/admin/AuditLogPanel.tsx` | **Mới** - Viewer cho admin_audit_logs |
| `src/components/admin/ImportUsersDialog.tsx` | **Mới** - CSV import |
| `supabase/functions/admin-manage-user/index.ts` | Thêm actions: update_profile, add_to_org, remove_from_org, update_org_role |

Không cần migration DB — sử dụng các bảng đã có (`profiles`, `organization_members`, `admin_audit_logs`).

