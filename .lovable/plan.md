

# Chuyển Subscription từ User sang Workspace (Organization)

## Mô hình mới

```text
┌─────────┐  N:N   ┌──────────────┐  1:1   ┌──────────────┐
│  User    │───────▶│ Organization │◀──────│ Subscription │
└─────────┘        │ (Workspace)  │        │ (plan, quota)│
                   └──────────────┘        └──────────────┘
```

**Nguyên tắc**: Subscription gắn với Workspace. Mọi thành viên trong workspace dùng chung quota của workspace đó. Owner workspace là người trả tiền.

## Phạm vi thay đổi

### 1. Database migration
- Thay đổi `subscriptions`: biến `organization_id` thành **NOT NULL** (required), bỏ unique constraint trên `user_id`, thêm unique constraint trên `organization_id`
- Update `handle_new_user()`: tạo subscription gắn với org thay vì user
- Update `can_use_feature()`: nhận `_org_id` thay vì `_user_id`, đếm usage theo org
- Update `get_user_usage()`: đếm theo `organization_id`

### 2. `src/hooks/useSubscription.ts` — thay đổi lớn nhất
- Query subscription theo `organization_id` (từ OrganizationContext) thay vì `user_id`
- Usage stats: đếm content/scripts/carousels/images/brands theo `organization_id` thay vì `user_id`
- Import `useOrganizationContext` thay vì chỉ `useAuth`

### 3. `src/hooks/useUsageLogger.ts`
- Thêm `organization_id` vào usage_logs insert

### 4. `supabase/functions/_shared/rate-limiter.ts`
- `checkUserQuota()` → lookup subscription theo org_id (cần truyền org_id hoặc lookup từ user)
- `getUserPlanType()` → lookup qua org membership
- `logUsage()` → thêm organization_id

### 5. `supabase/functions/payment-webhook/index.ts`
- Nhận `organization_id` thay vì `user_id` cho payment events
- Upsert subscription theo `organization_id`

### 6. `src/components/admin/UserDetailSheet.tsx`
- Đổi plan: update theo `organization_id` thay vì `user_id`

### 7. `src/pages/Account.tsx`
- Hiển thị subscription của workspace hiện tại (currentOrganization)

### 8. Admin pages (workspace management)
- Đảm bảo admin có thể xem/đổi subscription theo workspace

## Xử lý edge cases
- User thuộc nhiều workspace → mỗi workspace có subscription riêng, khi switch workspace thì quota thay đổi theo
- User chưa có workspace → dùng gói Free mặc định
- Data migration: gán subscription hiện tại cho org đã có `organization_id`, tạo mới cho org chưa có

## Files thay đổi (~8 files)

| File | Thay đổi |
|---|---|
| DB Migration | `subscriptions` constraint, `handle_new_user`, `can_use_feature`, `get_user_usage` |
| `useSubscription.ts` | Query theo org_id, usage theo org |
| `useUsageLogger.ts` | Thêm org_id |
| `rate-limiter.ts` | Quota check theo org |
| `payment-webhook/index.ts` | Event theo org_id |
| `Account.tsx` | Hiển thị theo workspace |
| `UserDetailSheet.tsx` | Update plan theo org |
| `request-validator.ts` | Truyền org context |

