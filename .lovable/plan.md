

# Thêm Badge gói đăng ký lên Workspace

## Thay đổi

### 1. `src/components/AppSidebar.tsx`
- Thay badge "PRO" hardcoded (line 234-237) bằng badge dynamic từ `useSubscription()`
- Hiển thị tên gói thực tế: FREE, STARTER, PRO, BUSINESS, ENTERPRISE
- Màu sắc theo gói: Free (gray), Starter (blue), Pro (primary), Business (amber), Enterprise (purple)
- Khi gói là `free` → hiển thị nút "Nâng cấp" nhỏ thay vì badge

### 2. `src/components/dashboard/DashboardHeader.tsx`
- Thêm badge gói bên cạnh tên user (sau greeting line)
- Import `useSubscription` để lấy `subscription.plan_type`
- Badge style giống sidebar, click navigate đến `/pricing`

### 3. `src/components/UserAvatar.tsx`
- Thêm badge gói nhỏ bên cạnh workspace name trong dropdown menu (line 178-182)

## Chi tiết kỹ thuật
- Tạo helper map `PLAN_BADGE_CONFIG` cho màu sắc + label của từng gói
- Dùng `useSubscription().subscription?.plan_type` để lấy gói hiện tại
- Fallback "Free" nếu chưa có subscription
- Badge clickable → navigate `/pricing` để nâng cấp

## Files thay đổi (3 files)
| File | Thay đổi |
|---|---|
| `AppSidebar.tsx` | Dynamic badge thay "PRO" hardcoded |
| `DashboardHeader.tsx` | Badge gói bên cạnh greeting |
| `UserAvatar.tsx` | Badge gói trong dropdown workspace |

