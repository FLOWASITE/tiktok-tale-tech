

## Hoàn thiện Subscription Manager - Bản cuối

### Vấn đề còn lại

1. **Không hiển thị thời gian còn lại** - Chỉ hiện ngày hết hạn, không cho biết "còn X ngày"
2. **Không highlight subscription sắp hết hạn** - Admin không nhận biết nhanh subscription nào cần chú ý
3. **Thiếu nút Refresh data** - Phải reload trang để lấy dữ liệu mới
4. **Payment dialog thiếu VNPay ref** - Không hiển thị mã giao dịch VNPay để tra cứu
5. **Không có tooltip cho action buttons** - Icon buttons khó hiểu trên mobile
6. **Thiếu empty state cho summary** khi chưa có data
7. **CSV export không escape** - Tên workspace chứa dấu phẩy sẽ vỡ CSV
8. **Bulk action không disable khi đang xử lý** - Có thể click nhiều lần

### Cải tiến

**1. Hiển thị "còn X ngày" + highlight sắp hết hạn**
- Cột "Hết hạn" thêm dòng nhỏ "còn X ngày" bên dưới ngày
- Row highlight vàng nhạt nếu còn dưới 7 ngày
- Row highlight đỏ nhạt nếu đã hết hạn

**2. Nút Refresh + loading state**
- Thêm nút RefreshCw bên cạnh Export CSV
- Spin animation khi đang refetch

**3. Payment dialog bổ sung**
- Thêm cột "Mã GD" hiển thị `vnpay_txn_ref` hoặc `payment_reference`
- Copy-to-clipboard khi click vào mã

**4. CSV export an toàn**
- Wrap giá trị trong dấu ngoặc kép, escape ký tự đặc biệt

**5. Disable bulk buttons khi mutation đang chạy**
- Kiểm tra `renewMutation.isPending || cancelMutation.isPending`

**6. Thêm filter "Sắp hết hạn"**
- Option mới trong filter trạng thái: "Sắp hết hạn (< 7 ngày)"

### Kỹ thuật

**File sửa:** `src/components/admin/plans/SubscriptionManager.tsx`
- Thêm helper `getDaysRemaining(dateStr)` trả về số ngày còn lại
- Thêm helper `getRowHighlight(sub)` trả về className cho row
- Sửa cột "Hết hạn": render thêm `<span>` nhỏ với days remaining
- Thêm nút Refresh gọi `subsQuery.refetch()`
- Payment table: thêm cột "Mã GD" lấy từ `vnpay_txn_ref` hoặc `metadata.vnpay_txn_ref`
- CSV export: wrap values với `"` và escape `"` thành `""`
- Filter status thêm option `expiring_soon` với logic `period_end < now + 7 days`
- Bulk buttons: `disabled={renewMutation.isPending || cancelMutation.isPending}`

