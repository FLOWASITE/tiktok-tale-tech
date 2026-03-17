

# Kế hoạch: Chi tiết Workspace khi click (Expandable Row)

## Mô tả
Khi admin click vào một workspace row trong bảng, sẽ expand ra panel chi tiết hiển thị:
- **Thành viên**: Danh sách user (avatar, tên, email, role)
- **Brands**: Danh sách brand templates (logo, tên, industry)
- **Thống kê nội dung**: Số bài multichannel, carousels, ảnh AI

## Thay đổi

### 1. Hook `useAdminWorkspaces.ts` — Thêm query chi tiết workspace
Thêm function `useAdminWorkspaceDetail(orgId)` hoặc inline query:
- Fetch `organization_members` + join `profiles` (id, full_name, email, avatar_url, role)
- Fetch `brand_templates` (id, brand_name, logo_url, industry_template_id) where `organization_id = orgId`
- Fetch counts: `multi_channel_contents` count, `carousels` count, `channel_image_history` count — all where `organization_id = orgId`

### 2. Component `AdminWorkspacesTab.tsx` — Expandable detail row
- Track `expandedWorkspaceId` state
- Click workspace row → toggle expand
- Expanded section shows 3 columns/sections:
  - **Thành viên** (avatar list with role badges)
  - **Brands** (logo + name cards)  
  - **Thống kê** (multichannel count, carousel count, AI images count as stat cards)
- Use `Collapsible` or simple conditional render with animation

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaces.ts` | Thêm `useAdminWorkspaceDetail` hook |
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm expandable row với chi tiết |

Không cần migration DB — dữ liệu đã có sẵn, chỉ cần query và hiển thị.

