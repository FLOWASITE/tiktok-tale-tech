

# Thêm thông tin thời gian chu kỳ vào Widget hạn mức

## Thay đổi

### 1. `src/components/dashboard/UsageQuotaWidget.tsx`
- Thêm dòng hiển thị **chu kỳ hiện tại** (ví dụ: "01/03 – 31/03/2026") và **số ngày còn lại** (ví dụ: "Còn 14 ngày") ngay dưới tiêu đề card
- Dùng `currentPeriod` từ `useSubscription()` (đã có sẵn) để tính
- Hiển thị icon `Calendar` + progress bar nhỏ cho thời gian (ngày đã qua / tổng ngày)
- Khi còn ≤ 5 ngày → text đỏ cảnh báo sắp reset

### 2. `src/components/AppSidebar.tsx` (QuotaWarningIndicator)
- Bổ sung cảnh báo khi chu kỳ sắp hết (≤ 3 ngày) bên cạnh cảnh báo hạn mức hiện có

## Chi tiết kỹ thuật
- Không cần migration DB — `currentPeriod.start` và `currentPeriod.end` đã có sẵn trong hook `useSubscription`
- Tính `daysRemaining = Math.ceil((endDate - now) / 86400000)` và `totalDays = Math.ceil((endDate - startDate) / 86400000)`
- Format ngày dùng `date-fns` với locale `vi`

## Files thay đổi (2 files)
| File | Thay đổi |
|---|---|
| `UsageQuotaWidget.tsx` | Thêm dòng chu kỳ + số ngày còn lại + progress bar thời gian |
| `AppSidebar.tsx` | Cảnh báo chu kỳ sắp hết trong sidebar |

