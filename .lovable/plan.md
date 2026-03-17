

# Hiển thị hạn mức gói cho User + Admin quản lý hạn mức Workspace

## Phân tích hiện trạng

- **User side**: Trang Account đã có progress bar hiển thị `used / limit` cho scripts, carousels, multichannel, images, brands. Tuy nhiên chưa có **widget tóm tắt hạn mức** ở dashboard chính và sidebar.
- **Admin side**: AdminWorkspacesTab hiển thị usage (nội dung, ảnh, scripts, carousels) nhưng **không so sánh với plan limits** → admin không biết workspace nào sắp hết hạn mức.
- Hook `useSubscription` đã có `isWithinLimits()` và `getRemainingUsage()` sẵn.

## Thay đổi

### 1. Component `UsageQuotaWidget` (mới) — cho User
- Widget nhỏ gọn hiển thị ở **Dashboard chính** (trang Home)
- Dạng card với progress bars cho 5 loại: Scripts, Carousels, Đa kênh, Ảnh AI, Brands
- Mỗi loại: icon + tên + `used/limit` + progress bar có màu (xanh < 70%, vàng 70-90%, đỏ > 90%)
- Nút "Xem chi tiết" → navigate `/account`
- Nút "Nâng cấp" khi bất kỳ loại nào > 80%

### 2. Sidebar quota indicator (AppSidebar)
- Thêm mini progress bar hoặc badge cảnh báo bên dưới plan badge hiện tại
- Chỉ hiển thị khi có resource > 80% limit → badge warning "Sắp hết hạn mức"
- Click → navigate `/account`

### 3. Admin: Cột hạn mức trong AdminWorkspacesTab
- Thêm cột **"Hạn mức"** trong bảng workspace: hiển thị tỷ lệ sử dụng cao nhất (ví dụ "85% Ảnh")
- Badge màu: xanh (< 70%), vàng (70-90%), đỏ (> 90%)
- Trong **WorkspaceDetailPanel**: thêm section "Hạn mức gói" hiển thị đầy đủ progress bars so sánh usage vs plan limits cho workspace đó

### 4. Admin: Hook mở rộng `useAdminWorkspaces`
- Fetch `plan_limits` cùng workspaces
- Tính `usage_percentage` cho từng workspace bằng cách so sánh `content_count`, `image_count`, etc. với limits tương ứng của plan
- Thêm field `quota_status` (ok/warning/critical) vào `AdminWorkspace`

## Files thay đổi (~4 files)

| File | Thay đổi |
|---|---|
| `src/components/dashboard/UsageQuotaWidget.tsx` | **Mới** — Widget hạn mức cho dashboard user |
| `src/components/AppSidebar.tsx` | Thêm cảnh báo hạn mức dưới plan badge |
| `src/hooks/useAdminWorkspaces.ts` | Fetch plan_limits, tính quota_status per workspace |
| `src/components/admin/AdminWorkspacesTab.tsx` | Cột hạn mức + detail panel quota bars |

## Chi tiết kỹ thuật

- Không cần migration DB — tất cả dữ liệu đã có sẵn (plan_limits + usage counts)
- Reuse `useSubscription` hook cho user side, mở rộng `useAdminWorkspaces` cho admin side
- Progress bar colors: dùng className conditionals trên component `Progress` hiện có
- Quota calculation: `max(scripts%, carousels%, multichannel%, images%, brands%)` → overall quota status

