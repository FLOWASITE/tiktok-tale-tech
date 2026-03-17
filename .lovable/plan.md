

# Kế hoạch: Sửa logic tạo Workspace mặc định khi user được tạo bởi Admin/Owner

## Vấn đề
Khi admin của workspace (ví dụ CÔNG TY TNHH TƯ VẤN KIỂM TOÁN TAF) tạo user `lanvien@gmail.com` qua chức năng "Thêm thành viên", hệ thống vẫn tạo ra workspace cá nhân "Nguyễn Lan Viên's Workspace" — dù user này không cần workspace riêng.

## Nguyên nhân gốc

Có **2 luồng** tạo user mà cần kiểm tra:

1. **`create-org-member`** (Owner workspace thêm thành viên): ✅ Đã có `skip_default_org: true` — hoạt động đúng.

2. **`admin-manage-user` action `create_user`** (Admin hệ thống tạo user): ⚠️ Chỉ set `skip_default_org: true` khi `organization_ids?.length > 0`. Nếu admin tạo user mà không gán org → vẫn tạo workspace thừa.

3. **Logic hiện tại thiếu**: Khi admin tạo user, nên **luôn** `skip_default_org = true` vì admin sẽ tự quản lý việc gán org.

## Thay đổi cần thực hiện

### 1. Edge Function `admin-manage-user` — Luôn skip default org
File: `supabase/functions/admin-manage-user/index.ts`

```typescript
// Trước:
const shouldSkipDefaultOrg = organization_ids?.length > 0;

// Sau:
const shouldSkipDefaultOrg = true; // Admin tạo user → luôn skip default workspace
```

Admin luôn chủ động gán org, không cần tạo workspace cá nhân tự động.

### 2. Cleanup dữ liệu: Xóa workspace "cá nhân" thừa
Cần xóa các workspace được tạo tự động cho user mà thực tế được tạo bởi admin/owner và đã thuộc workspace khác. Logic:
- Workspace có `slug = user_id` (format tự động của trigger `handle_new_user`)
- Owner chỉ có 1 member (chính họ)
- User đã là member của workspace khác

Thực hiện qua Edge Function `admin-manage-user` thêm action `cleanup_orphan_workspaces` để admin có thể chạy từ UI.

### 3. UI: Thêm nút "Dọn dẹp Workspace thừa" trong AdminWorkspacesTab
File: `src/components/admin/AdminWorkspacesTab.tsx`

Thêm nút trong header cho phép admin:
- Xem danh sách workspace cá nhân tự động (slug = UUID format)
- Chọn xóa hàng loạt các workspace chỉ có 1 member và member đó đã thuộc workspace khác

### 4. Hiển thị tag "Auto-created" trên workspace cá nhân
Trong bảng workspace, thêm badge nhỏ cho các workspace có `slug` trùng format UUID để admin dễ nhận biết workspace nào được tạo tự động.

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/admin-manage-user/index.ts` | Luôn set `skip_default_org = true` khi admin tạo user + thêm action `cleanup_orphan_workspaces` |
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm nút cleanup + badge "Tự động" cho workspace cá nhân |
| `src/hooks/useAdminWorkspaces.ts` | Thêm mutation `cleanupOrphanWorkspaces` |

Không cần migration DB.

