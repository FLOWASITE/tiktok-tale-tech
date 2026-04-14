

## Trang Admin Quản lý Gói (`/admin/plans`)

Tạo trang admin tổng hợp quản lý gói cước với 3 tab chính: Cấu hình gói, Subscriptions, và Thống kê doanh thu.

### Tab 1: Cấu hình gói (CRUD `plan_limits`)

- Hiển thị 4 gói hiện tại (Free/Starter/Pro/Enterprise) dạng card grid
- Mỗi card hiển thị: tên gói, giá tháng/năm, hạn mức (brands, scripts, carousels, multichannel, images, AI edits), features
- Inline edit: click vào giá trị hạn mức hoặc giá để sửa trực tiếp
- Nút "Lưu thay đổi" cập nhật `plan_limits` qua Supabase
- Hiển thị badge số lượng workspace đang dùng gói đó (từ `subscriptions`)

### Tab 2: Quản lý Subscription

- Bảng danh sách tất cả subscriptions kèm thông tin workspace (org name), plan, status, chu kỳ, ngày hết hạn
- Bộ lọc: theo gói (Free/Starter/Pro/Enterprise), theo trạng thái (active/cancelled/expired)
- Hành động từng dòng: đổi gói, gia hạn (reset period), hủy subscription
- Xem lịch sử thanh toán (`payment_orders`) khi click vào workspace
- Export CSV

### Tab 3: Thống kê doanh thu

- MRR (Monthly Recurring Revenue) tính từ số subscriptions * giá gói
- Biểu đồ phân bổ gói (pie chart: bao nhiêu workspace ở mỗi gói)
- Conversion rate: Free → Paid
- Bảng top workspaces theo chi tiêu (từ `payment_orders`)
- Churn rate cơ bản (số cancelled/total)

### Kỹ thuật

**Files mới:**
- `src/pages/AdminPlans.tsx` — Trang chính với 3 tab (Tabs component)
- `src/components/admin/plans/PlanLimitsManager.tsx` — Tab 1: CRUD plan_limits
- `src/components/admin/plans/SubscriptionManager.tsx` — Tab 2: Bảng subscriptions + actions
- `src/components/admin/plans/RevenueStats.tsx` — Tab 3: Thống kê doanh thu với recharts

**Files sửa:**
- `src/app/routes.tsx` — Thêm route `/admin/plans`
- `src/components/AppSidebar.tsx` — Thêm menu item "Quản lý gói" với icon `CreditCard`

**Không cần migration** — Dùng bảng hiện có (`plan_limits`, `subscriptions`, `payment_orders`). Cập nhật plan_limits dùng Supabase client trực tiếp (admin đã có quyền).

