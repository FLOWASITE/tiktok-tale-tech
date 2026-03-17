

# Fix UsageQuotaWidget không hiển thị trên Dashboard

## Nguyên nhân gốc

**RLS policy trên bảng `subscriptions` quá hẹp.** Policy hiện tại:
- `Users can view own subscription`: `auth.uid() = user_id`

Hook `useSubscription` query theo `organization_id`, nhưng chỉ user tạo subscription mới thấy được. Các thành viên khác trong organization → subscription = null → usage không load → widget return null (ẩn hoàn toàn).

## Thay đổi

### 1. Migration: Sửa RLS policy cho `subscriptions`
Thêm policy cho phép **thành viên organization** xem subscription của org mình:

```sql
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;

CREATE POLICY "Org members can view subscription"
ON subscriptions FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

### 2. `UsageQuotaWidget.tsx`: Hiển thị fallback thay vì ẩn
Khi `!currentPlanLimits || !usage`, thay vì `return null`, hiển thị card placeholder với thông báo "Chưa có gói đăng ký" và nút "Chọn gói" → navigate `/pricing`.

## Files thay đổi (2)
| Thay đổi | Chi tiết |
|---|---|
| DB Migration | Sửa RLS policy subscriptions cho org members |
| `UsageQuotaWidget.tsx` | Fallback UI thay vì return null |

