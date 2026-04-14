

## Hoàn thiện Subscription Manager - Bản polish cuối

### Vấn đề còn lại sau review

1. **Component quá lớn (830 dòng)** - Khó maintain, nên tách thành sub-components
2. **Không có subscription detail view** - Click vào row không hiện chi tiết đầy đủ (metadata, payment_provider, trial_end, cancelled_at)
3. **Không ghi audit log** - Admin đổi gói/hủy/gia hạn không lưu lại ai làm, lúc nào
4. **Bulk action chạy tuần tự không có progress** - Bulk 50 subscriptions không biết đang xử lý đến đâu
5. **Đổi gói reset period** - `changePlanMutation` đang reset `current_period_start` về hôm nay, lẽ ra nên giữ nguyên period khi chỉ đổi gói (proration logic)
6. **Không có trial/pending filter** - Thiếu 2 trạng thái trong filter
7. **Payment dialog không phân biệt refund** - Số tiền âm (hoàn tiền) không được highlight
8. **Summary cards không click-to-filter** - Click vào card "Sắp hết hạn" nên tự set filter

### Cải tiến

**1. Tách component**
- `SubscriptionSummaryCards` - 5 cards, click để filter
- `SubscriptionTable` - bảng + pagination
- `SubscriptionDetailDrawer` - sheet/dialog hiện full detail khi click row
- `PaymentHistoryDialog` - giữ nguyên, tách riêng file

**2. Click-to-filter trên summary cards**
- Click card "Active" → set `filterStatus = "active"`
- Click card "Sắp hết hạn" → set `filterStatus = "expiring_soon"`
- Active card có ring highlight

**3. Subscription Detail Drawer**
- Click vào tên workspace → mở Sheet bên phải
- Hiển thị: metadata, payment_provider, payment_reference, trial_end, cancelled_at, previous_plan_type
- Timeline các thay đổi gần đây (từ payment_orders)

**4. Bulk progress indicator**
- Khi bulk action chạy, hiện progress bar "Đang xử lý 3/10..."
- Không đóng dialog cho đến khi hoàn tất

**5. Sửa đổi gói giữ nguyên period**
- `changePlanMutation` chỉ update `plan_type`, không reset period dates
- Thêm option "Reset chu kỳ" checkbox trong confirm dialog nếu admin muốn

**6. Thêm filter trial + pending**
- Bổ sung 2 SelectItem cho trial và pending

**7. Payment refund highlight**
- Amount < 0 hiện màu đỏ với prefix "Hoàn"

### Kỹ thuật

**Files mới:**
- `src/components/admin/plans/SubscriptionSummaryCards.tsx`
- `src/components/admin/plans/SubscriptionTable.tsx`  
- `src/components/admin/plans/SubscriptionDetailDrawer.tsx`
- `src/components/admin/plans/PaymentHistoryDialog.tsx`

**File sửa:** `src/components/admin/plans/SubscriptionManager.tsx`
- Giữ làm orchestrator: state, queries, mutations
- Import và compose 4 sub-components
- Giảm từ 830 dòng xuống ~200 dòng

**Logic changes:**
- `changePlanMutation`: chỉ update `plan_type` (bỏ reset period)
- Confirm dialog đổi gói: thêm checkbox "Reset chu kỳ thanh toán"
- Summary cards nhận `onFilter` callback
- Bulk action: thêm state `bulkProgress: { current: number; total: number } | null`
- Filter status: thêm `trial`, `pending`

