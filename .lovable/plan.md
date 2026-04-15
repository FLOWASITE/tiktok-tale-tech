

## Fix: Lịch sử thanh toán không hiển thị sau thanh toán

### Nguyên nhân
Trang `PaymentResult` sau khi xác nhận thanh toán thành công chỉ gọi `refetch()` cho subscription, nhưng **không invalidate query `user_payments`**. Khi user được redirect về `/account`, React Query vẫn serve cache cũ (rỗng) từ trước khi thanh toán.

### Giải pháp

**1. Invalidate `user_payments` sau thanh toán thành công**
- File: `src/pages/PaymentResult.tsx`
- Trong effect khi `isSuccess`, thêm `queryClient.invalidateQueries({ queryKey: ["user_payments"] })`

**2. Thêm `refetchOnMount` cho PaymentHistorySection**
- File: `src/pages/PaymentHistory.tsx`
- Thêm `staleTime: 0` vào query `user_payments` để đảm bảo luôn refetch khi mount

### Files thay đổi
- `src/pages/PaymentResult.tsx` — invalidate user_payments cache
- `src/pages/PaymentHistory.tsx` — thêm staleTime: 0

