

# Vấn đề: Thống kê trang Account chỉ đếm trong chu kỳ đã hết hạn

## Nguyên nhân gốc

Subscription của duy@gmail.com có chu kỳ **22/12/2025 → 21/01/2026** (đã hết hạn từ lâu, hôm nay là 17/03/2026). Trang Account lọc usage theo `current_period_start` và `current_period_end`, nên chỉ đếm được **4 bản nội dung = 6 bài social** trong khoảng đó. Còn 8 bản nội dung khác (16 bài social) tạo SAU 21/01 bị bỏ qua.

Tổng all-time: **12 bản = 22 bài social**. Trong period: **4 bản = 6 bài**.

## Giải pháp

### 1. Auto-renew period cho free plan (`useSubscription.ts`)
Khi subscription period đã hết hạn, tự động tính period mới dựa trên tháng hiện tại thay vì dùng period cũ. Cách tính:
- Nếu `current_period_end < now()`: dùng period = đầu tháng hiện tại → cuối tháng hiện tại
- Điều này đảm bảo user free plan luôn thấy usage của tháng đang dùng

### 2. Migration: Auto-renew period trong DB
Thêm migration cập nhật `current_period_start/end` cho các subscription free đã hết hạn, reset về tháng hiện tại. Có thể thêm trigger hoặc function tự động renew.

### Scope
- **1 file code**: `src/hooks/useSubscription.ts` - thêm logic fallback period
- **1 migration**: cập nhật subscription period cho free plans đã expired

