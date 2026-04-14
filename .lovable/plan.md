

## Hoàn thiện Subscription Manager

Nâng cấp tab Subscriptions với giao diện chuyên nghiệp hơn, thêm tính năng quản lý chi tiết và bảo vệ dữ liệu.

### Vấn đề hiện tại

1. **Không có xác nhận** khi đổi gói, hủy, gia hạn - thao tác nguy hiểm không có confirm
2. **Thiếu thông tin chi tiết** - không hiển thị ngày tạo, chu kỳ bắt đầu, email user
3. **Không có pagination** - load tất cả subscriptions cùng lúc
4. **Đổi gói không ghi log** - admin đổi gói trực tiếp không có audit trail
5. **Payment history dialog** không hiện đúng khi click nhiều workspace (stale data)
6. **Thiếu summary cards** - không có tổng quan nhanh (total, active, expired, cancelled)
7. **Không sort được** - bảng không hỗ trợ sắp xếp theo cột

### Cải tiến

**1. Summary cards phía trên bảng**
- 4 cards: Tổng subscriptions, Active, Cancelled/Expired, Paid ratio
- Mỗi card có icon và màu sắc tương ứng

**2. Confirm dialog cho mọi thao tác nguy hiểm**
- Đổi gói: AlertDialog hiển thị "Đổi từ X → Y cho workspace Z?"
- Hủy subscription: Confirm "Bạn chắc chắn muốn hủy?"
- Gia hạn: Confirm với thông tin ngày mới

**3. Bảng chi tiết hơn**
- Thêm cột "Ngày tạo" (created_at) và "Chu kỳ bắt đầu"
- Fetch thêm email từ profiles table để hiển thị owner
- Sort theo cột (workspace, gói, trạng thái, ngày hết hạn)
- Pagination (20 items/page) với nút Previous/Next

**4. Payment history cải thiện**
- Hiển thị thêm billing_cycle, vnpay_txn_ref
- Badge màu cho status (success/pending/failed)
- Tổng chi tiêu ở footer dialog

**5. Bulk actions**
- Checkbox chọn nhiều subscriptions
- Bulk gia hạn / bulk cancel cho các subscription đã chọn

### Kỹ thuật

**File sửa:** `src/components/admin/plans/SubscriptionManager.tsx`
- Thêm `AlertDialog` cho confirm đổi gói, hủy, gia hạn
- Thêm state `sortField`, `sortOrder`, `page` cho sort + pagination
- Fetch thêm `created_at` từ subscriptions và email từ profiles
- Thêm summary cards component phía trên bảng
- Thêm checkbox + bulk action toolbar
- Sửa payment dialog: reset `paymentOrgId` khi close để tránh stale data

