

## Chuyển tab Workspace từ Users sang Quản lý gói

### Thay đổi

Di chuyển tab "Quản lý Workspaces" từ trang AdminUsers sang trang AdminPlans, vì workspace gắn liền với subscription (mô hình organization-centric).

### Kỹ thuật

**File sửa:**

**1. `src/pages/AdminUsers.tsx`**
- Xóa import `AdminWorkspacesTab` (dòng 52)
- Xóa import `Building2` (dòng 28)
- Xóa TabsTrigger "Quản lý Workspaces" (dòng 390-393)
- Xóa TabsContent "workspaces" (dòng 679-681)

**2. `src/pages/AdminPlans.tsx`**
- Import `AdminWorkspacesTab` và icon `Building2`
- Thêm TabsTrigger "Workspaces" vào TabsList (sau Lịch sử thanh toán)
- Thêm TabsContent render `<AdminWorkspacesTab />`

