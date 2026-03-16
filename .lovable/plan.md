

# Trang Admin Quản lý Tổ chức

## Mục tiêu
Tạo trang `/admin/organizations` cho phép admin (flowasite@gmail.com) xem và quản lý tất cả tổ chức trong hệ thống — không chỉ "Công ty CP Công nghệ Flowa".

## Tính năng

### 1. Danh sách tổ chức
- Bảng hiển thị tất cả org: tên, slug, owner, số thành viên, ngày tạo
- Tìm kiếm theo tên
- Phân trang

### 2. Chi tiết tổ chức (Sheet/Dialog)
- Thông tin org (tên, logo, màu chủ đạo)
- Danh sách thành viên + role
- Số content đã tạo
- Chỉnh sửa: đổi tên, thêm/xóa thành viên, đổi role thành viên
- Xóa tổ chức

### 3. Tạo tổ chức mới
- Dialog tạo org với tên + chọn owner từ danh sách user

## Thay đổi cụ thể

### File mới: `src/pages/AdminOrganizations.tsx`
- Fetch tất cả org từ `organizations` table (admin có quyền qua RLS hoặc service role)
- Join với `organization_members` để đếm thành viên
- Join với `profiles` để hiển thị owner name
- Bảng với search, sort, phân trang
- Sheet chi tiết khi click vào org

### File mới: `src/components/admin/OrgDetailSheet.tsx`
- Hiển thị chi tiết org + danh sách members
- Cho phép admin thêm/xóa member, đổi role, đổi tên org

### Sửa: `src/components/AppSidebar.tsx`
- Thêm menu item `{ title: 'Organizations', url: '/admin/organizations', icon: Building2 }` vào `adminItems`

### Sửa: `src/App.tsx`
- Thêm route `/admin/organizations` → `AdminOrganizations` (wrapped trong `AdminProtectedRoute`)

### RLS
- Cần kiểm tra admin có quyền `SELECT` trên bảng `organizations` — hiện RLS chỉ cho phép org members xem. Sẽ thêm policy cho admin: `has_role(auth.uid(), 'admin')` để admin xem tất cả org.
- Tương tự cho `organization_members` table.

### Migration
Thêm RLS policies:
```sql
-- Admin can view all organizations
CREATE POLICY "Admin can view all organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all organization members  
CREATE POLICY "Admin can view all org members"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage organization members
CREATE POLICY "Admin can manage org members"
ON public.organization_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update organizations
CREATE POLICY "Admin can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete organizations
CREATE POLICY "Admin can delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

## Scope
- 2 file mới, 2 file sửa, 1 migration
- UI theo pattern giống `AdminUsers.tsx` (bảng + sheet chi tiết)

