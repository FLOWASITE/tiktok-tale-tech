

# Thêm bộ lọc thời gian cho thống kê Workspace: Tổng cộng / Kỳ này / Kỳ trước

## Mô tả
Thêm tabs/selector cho phần thống kê nội dung trong chi tiết workspace với 3 chế độ:
- **Tổng cộng**: Tất cả dữ liệu (như hiện tại)
- **Kỳ thanh toán này**: Lọc theo `current_period_start` → `current_period_end` từ bảng `subscriptions` (where `organization_id`)
- **Các kỳ trước**: Dữ liệu trước `current_period_start`

## Thay đổi

### 1. Hook `useAdminWorkspaceDetail.ts`
- Thêm param `periodFilter: "all" | "current" | "previous"` cho `statsQuery` và `contributionsQuery`
- Khi filter !== "all", fetch subscription của workspace (`subscriptions.organization_id = orgId`) để lấy `current_period_start` / `current_period_end`
- Áp dụng `.gte("created_at", start).lte("created_at", end)` cho tất cả content queries
- QueryKey thêm `periodFilter` để cache riêng biệt

### 2. Component `AdminWorkspacesTab.tsx` — `WorkspaceDetailPanel`
- Thêm state `periodFilter` với 3 giá trị
- Render 3 nút toggle (giống Tabs) ngay trên stats grid: `Tổng cộng | Kỳ này | Kỳ trước`
- Truyền `periodFilter` vào hook
- Hiển thị nhỏ thời gian kỳ thanh toán bên cạnh nếu filter !== "all"

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaceDetail.ts` | Thêm periodFilter param, lọc theo subscription period |
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm toggle UI 3 kỳ trong detail panel |

Không cần migration — chỉ filter client-side dựa trên dữ liệu subscription đã có.

