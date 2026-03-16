

## Phát triển chức năng quản trị User

### Hiện trạng
- Trang `/admin/users` có: bảng users, filter (search/role/plan), stats cards, inline change role & plan
- Thiếu: chi tiết user, tạo/xóa/ban, quản lý subscription nâng cao, pagination, export

### Kế hoạch

#### 1. User Detail Dialog
- Click vào row → mở dialog/sheet hiển thị:
  - Thông tin cá nhân (avatar, name, email, created_at)
  - Organization memberships (query `organization_members`)
  - Usage history gần đây (query `usage_logs` theo user_id, group by type)
  - Subscription timeline (plan, status, period start/end)
  - Activity log (last content created, etc.)

#### 2. Tạo/Xóa/Ban User
- **Tạo user**: Button "Thêm user" → dialog nhập email, password, full_name, role, plan → gọi edge function `admin-manage-user` dùng `supabase.auth.admin.createUser()`
- **Ban user**: Toggle trạng thái → gọi edge function `admin-manage-user` dùng `supabase.auth.admin.updateUserById({ ban_duration })` 
- **Xóa user**: Confirm dialog → gọi edge function `admin-manage-user` dùng `supabase.auth.admin.deleteUser()`
- Tất cả qua 1 edge function `admin-manage-user` với action param, verify caller is admin

#### 3. Quản lý Subscription nâng cao
- Trong User Detail Dialog: form chỉnh subscription
  - Thay đổi plan + status
  - Gia hạn period (chọn ngày hết hạn)
  - Reset usage (xóa usage_logs trong current period)
  - Grant trial extension
- Update trực tiếp qua supabase client (admin đã có RLS access)

#### 4. Pagination & Export
- **Pagination**: Server-side pagination với `.range()`, 20 users/page, prev/next buttons
- **Export CSV**: Button export → generate CSV từ filtered users list, download client-side

### Files cần tạo/sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/admin-manage-user/index.ts` | Edge function: create/ban/delete user (service role) |
| `src/components/admin/UserDetailSheet.tsx` | Sheet hiển thị chi tiết user + usage + org |
| `src/components/admin/CreateUserDialog.tsx` | Dialog tạo user mới |
| `src/hooks/useAdmin.ts` | Thêm pagination, mutations cho create/ban/delete, fetch user detail |
| `src/pages/AdminUsers.tsx` | Tích hợp detail sheet, create dialog, pagination, export button |

### Ước tính: 2 lần triển khai
- Lần 1: Edge function + Create/Ban/Delete user + User Detail Sheet
- Lần 2: Subscription nâng cao + Pagination + Export CSV

