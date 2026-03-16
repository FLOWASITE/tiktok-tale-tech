

## Hoàn thiện chức năng quản trị User

Sau khi rà soát toàn bộ code, hệ thống admin users đã có nền tảng tốt nhưng cần hoàn thiện các điểm sau:

### Vấn đề hiện tại

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | **Edge function dùng `getClaims()` không tồn tại** trong Supabase JS client — sẽ lỗi runtime. Cần đổi sang `getUser()` | Critical |
| 2 | **Admin check trong edge function dùng anonClient** — RLS có thể chặn query `user_roles`. Cần dùng serviceClient để check admin | Critical |
| 3 | **Không có sort columns** trong bảng users (click header để sort theo email, date, plan) | UX |
| 4 | **Không hiển thị trạng thái ban** — user bị ban không có indicator nào trên bảng | UX |
| 5 | **Responsive kém** trên viewport 707px — stats cards 4 cột bị chật, bảng thiếu horizontal scroll | UX |
| 6 | **Usage trong detail sheet lấy tất cả** thay vì chỉ current period | Data accuracy |
| 7 | **Thiếu loading/feedback khi export CSV** với dataset lớn | Minor |
| 8 | **Thiếu bulk actions** — chọn nhiều user để ban/change plan cùng lúc | Feature gap |

### Kế hoạch triển khai (1 lần)

#### 1. Fix edge function `admin-manage-user`
- Thay `getClaims()` bằng `getUser()` để lấy caller ID
- Dùng `serviceClient` thay vì `anonClient` để check admin role (tránh RLS block)

#### 2. Cải thiện bảng users
- Thêm sortable columns (click header → sort asc/desc) cho Name, Role, Plan, Date
- Hiển thị badge "Banned" cho user bị ban (cần thêm field vào AdminUser interface — fetch từ edge function hoặc kiểm tra metadata)
- Responsive: dùng `overflow-x-auto` cho bảng, stats cards `grid-cols-2` trên mobile

#### 3. Fix usage query trong UserDetailSheet
- Lọc usage_logs theo `current_period_start` và `current_period_end` của subscription thay vì lấy toàn bộ

#### 4. Thêm bulk actions
- Checkbox select trên mỗi row + "Select All"
- Floating action bar khi có items selected: Ban, Change Plan, Export Selected

### Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/admin-manage-user/index.ts` | Fix auth (getUser thay getClaims), dùng serviceClient check admin |
| `src/pages/AdminUsers.tsx` | Sortable columns, responsive, bulk select UI |
| `src/components/admin/UserDetailSheet.tsx` | Fix usage query theo current period |
| `src/hooks/useAdmin.ts` | Thêm sort state support |

