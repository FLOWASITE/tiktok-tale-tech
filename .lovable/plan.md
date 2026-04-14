

## Hoàn thiện Quản lý Lịch sử Thanh toán

### Hiện trạng

Hiện tại lịch sử thanh toán chỉ được xem **theo từng workspace** qua `PaymentHistoryDialog` (mở từ bảng Subscription). Chưa có trang tổng hợp toàn bộ giao dịch.

### Cải tiến

**1. Trang "Lịch sử thanh toán" toàn cục cho Admin**
- Component mới `PaymentHistoryManager.tsx` hiển thị **tất cả** payment_orders across all organizations
- Summary cards: Tổng giao dịch, Tổng doanh thu (success), Giao dịch thất bại, Tỷ lệ thành công
- Bảng đầy đủ: Ngày, Workspace, Email, Gói, Chu kỳ, Mã GD (copy), Số tiền, Trạng thái
- Filter: theo trạng thái (success/pending/failed), theo gói, theo date range (từ ngày - đến ngày)
- Search: tìm theo workspace name, email, mã giao dịch
- Sort: theo ngày, số tiền
- Pagination: 20 items/page
- Export CSV toàn bộ dữ liệu đã lọc

**2. Tích hợp vào Admin Plans tab**
- Thêm tab/section "Lịch sử thanh toán" trong trang admin plans
- Hoặc thêm như một sub-tab cùng cấp với Subscriptions và Revenue

**3. Cải thiện PaymentHistoryDialog hiện tại**
- Thêm date range filter nhỏ gọn
- Thêm nút export CSV cho từng workspace

### Kỹ thuật

**File mới:**
- `src/components/admin/plans/PaymentHistoryManager.tsx` — Component chính với summary cards, bảng, filters, pagination, export

**File sửa:**
- `src/components/admin/plans/PaymentHistoryDialog.tsx` — Thêm date filter + export CSV per-org
- File chứa tab admin plans — Thêm tab/entry point cho PaymentHistoryManager

**Query:** Fetch payment_orders join organizations (name) + profiles (email) tương tự pattern SubscriptionManager đang dùng

