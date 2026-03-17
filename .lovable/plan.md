

# Hiển thị chu kỳ sử dụng và lịch sử usage

## Yêu cầu
1. Ghi rõ chu kỳ hiện tại (ví dụ: "01/03/2026 – 31/03/2026") trong phần "Sử dụng trong tháng"
2. Theo dõi được lịch sử sử dụng theo các chu kỳ trước

## Thay đổi

### 1. Hook `useSubscription.ts`
- Export thêm `currentPeriod: { start: string, end: string }` từ hook để UI có thể hiển thị chu kỳ
- Giá trị này lấy từ logic đã có (auto-fallback to current month nếu expired)

### 2. Trang `Account.tsx` — Hiển thị chu kỳ
- Thêm dòng text dưới CardDescription hiển thị chu kỳ cụ thể: "Chu kỳ: 01/03/2026 – 31/03/2026"
- Thêm phần "Lịch sử sử dụng" bên dưới usage grid:
  - Dropdown/select chọn tháng (ví dụ: "Tháng 3/2026", "Tháng 2/2026", ...)
  - Khi chọn tháng khác, query usage cho khoảng thời gian đó
  - Hiển thị bảng/grid tương tự usage hiện tại nhưng cho tháng đã chọn

### 3. Hook mới hoặc mở rộng `useSubscription` — Query lịch sử
- Thêm function `getUsageForPeriod(start, end)` để query usage cho bất kỳ khoảng thời gian nào
- Hoặc tạo state trong Account.tsx với `selectedMonth` và query trực tiếp

### Chi tiết kỹ thuật
- Chu kỳ hiển thị: dùng `format(date, "dd/MM/yyyy")` từ date-fns
- Lịch sử: tạo danh sách 6 tháng gần nhất, mỗi tháng là 1 option trong select
- Query lịch sử dùng cùng logic query hiện tại nhưng thay periodStart/periodEnd
- Không cần migration — chỉ thay đổi frontend

### Scope
- **2 files**: `useSubscription.ts`, `Account.tsx`

