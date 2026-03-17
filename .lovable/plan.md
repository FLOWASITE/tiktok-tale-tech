

# Kế hoạch: Tab Quản lý Workspace trong trang Admin Users

## Bối cảnh hiện tại
- **Subscriptions đang gắn với user** (`subscriptions.user_id`), chưa có `organization_id`
- **Organizations** chỉ có metadata cơ bản (name, slug, owner_id, logo)
- Trang Admin Users có 2 tab: "Quản lý Users" và "Audit Log"
- Hệ thống sẽ chuyển sang **tính phí theo workspace** (organization)

## Thay đổi cần thực hiện

### 1. Database Migration — Thêm subscription cho workspace
```sql
-- Thêm cột organization_id vào bảng subscriptions (nullable để tương thích ngược)
ALTER TABLE subscriptions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Migrate: gán subscription hiện tại cho org mà user đang own
UPDATE subscriptions s
SET organization_id = (
  SELECT o.id FROM organizations o WHERE o.owner_id = s.user_id LIMIT 1
)
WHERE organization_id IS NULL;

-- RLS cho admin đọc tất cả
CREATE POLICY "Admins can view all subscriptions"
ON subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Hook mới — `useAdminWorkspaces`
File: `src/hooks/useAdminWorkspaces.ts`

Fetch tất cả organizations kèm:
- Owner profile (name, email)
- Số thành viên (`organization_members` count)
- Subscription hiện tại (plan, status, period end)
- Usage stats (tổng content, images trong kỳ)

Interface `AdminWorkspace`:
```text
id, name, slug, logo_url, owner (name, email), 
member_count, created_at,
subscription: { plan_type, status, current_period_end },
usage: { scripts, carousels, images, multichannel }
```

### 3. Component mới — `AdminWorkspacesTab`
File: `src/components/admin/AdminWorkspacesTab.tsx`

Gồm:
- **Stats row**: Tổng workspaces, Workspaces trả phí, MRR từ workspace, Avg members/workspace
- **Bộ lọc**: Search (tên/owner email), Filter plan (Free/Starter/Pro/Business/Enterprise), Filter status
- **Bảng chính**: Tên workspace + logo, Owner, Thành viên (count), Plan (badge), Status, Ngày tạo, Actions
- **Actions per row**: Đổi plan, Xem chi tiết (expand members list), Xóa workspace
- **Bulk actions**: Đổi plan hàng loạt, Export CSV

### 4. Tích hợp vào AdminUsers.tsx
Thêm tab thứ 3 "Quản lý Workspaces" với icon `Building2` vào `TabsList` hiện tại:

```text
[Quản lý Users] [Quản lý Workspaces] [Audit Log]
```

### 5. Edge Function update — `admin-manage-user`
Thêm actions:
- `update_workspace_plan`: Đổi plan cho workspace (upsert subscriptions với organization_id)
- `delete_workspace`: Xóa workspace và tất cả dữ liệu liên quan

## Files thay đổi

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Thêm `organization_id` vào `subscriptions` |
| `src/hooks/useAdminWorkspaces.ts` | **Mới** — Fetch & manage workspaces |
| `src/components/admin/AdminWorkspacesTab.tsx` | **Mới** — UI tab quản lý workspaces |
| `src/pages/AdminUsers.tsx` | Thêm tab "Quản lý Workspaces" |
| `supabase/functions/admin-manage-user/index.ts` | Thêm actions workspace plan/delete |

## Lưu ý quan trọng
- Giữ nguyên `subscriptions.user_id` để tương thích ngược — giai đoạn chuyển tiếp cả user và workspace đều có subscription
- Khi tính phí theo workspace, usage limits sẽ check theo `organization_id` thay vì `user_id` (cần migration riêng sau)

