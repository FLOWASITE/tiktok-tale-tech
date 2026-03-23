

# Trang Agent Team Management — Quản lý thành viên & phân quyền cho AI Agents

## Mục tiêu

Tạo trang `/agents/team` cho phép Owner/Admin quản lý ai trong team được dùng AI Agents, phân quyền mức độ tự động (autonomy level) cho từng thành viên, và xem activity log.

## Database

**Bảng mới: `agent_team_permissions`**
- `id` UUID PK
- `organization_id` FK organizations
- `user_id` FK profiles
- `can_create_goals` boolean default false — được tạo campaign mới
- `can_approve` boolean default false — được approve content trong pipeline
- `can_override` boolean default false — được pause/resume/skip pipeline stages
- `max_autonomy_level` text default 'human_in_loop' — mức tự động tối đa cho phép
- `monthly_pipeline_limit` int default null — giới hạn pipeline/tháng (null = unlimited)
- `is_active` boolean default true
- `granted_by` UUID FK profiles
- `created_at`, `updated_at`

RLS: `is_org_member()` cho SELECT, `is_org_admin()` cho INSERT/UPDATE/DELETE.

## Frontend

### Trang `AgentTeamPage.tsx` (`/agents/team`)

**Layout 2 phần:**

1. **Danh sách thành viên** — table hiển thị tất cả org members với:
   - Avatar, tên, email, org role (owner/admin/member/viewer)
   - Agent permissions: badges cho create/approve/override
   - Max autonomy level
   - Pipeline count tháng này
   - Toggle active/inactive
   - Edit button → mở dialog chỉnh quyền

2. **Quick stats cards** — trên cùng:
   - Tổng thành viên có quyền agent
   - Số người có quyền approve
   - Pipelines đã dùng tháng này

### Dialog `AgentPermissionDialog.tsx`
- Chọn permissions: checkboxes cho create_goals, can_approve, can_override
- Dropdown max_autonomy_level (3 cấp)
- Input monthly_pipeline_limit (optional)
- Save → upsert `agent_team_permissions`

### Hook `useAgentTeam.ts`
- Fetch org members + join `agent_team_permissions`
- CRUD permissions (upsert/update)
- Count pipelines per user this month

## Routing & Navigation
- Thêm route `/agents/team` trong `routes.tsx`
- Thêm sub-item "Team" dưới "AI Agents" trong AppSidebar (icon: Users)

## Files

| File | Loại |
|------|------|
| Migration SQL | Tạo — bảng `agent_team_permissions` + RLS |
| `src/pages/AgentTeamPage.tsx` | Tạo |
| `src/components/agents/AgentPermissionDialog.tsx` | Tạo |
| `src/hooks/useAgentTeam.ts` | Tạo |
| `src/types/agent.ts` | Sửa — thêm types |
| `src/app/routes.tsx` | Sửa — thêm route |
| `src/components/AppSidebar.tsx` | Sửa — thêm sub-item Team |

