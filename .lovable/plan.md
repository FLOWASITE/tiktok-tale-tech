## Mục tiêu
Thêm bộ lọc date range riêng cho tab **Engagement**, cho phép xem nhanh theo **tuần / tháng / quý**, chọn **custom range**, và đổi **bucket hiển thị** (ngày / tuần / tháng) cho biểu đồ "Reach & Engagement theo thời gian".

Hiện tại chỉ có thanh filter global ở đầu trang (`ReportFiltersBar`) áp dụng cho tất cả tab. Khi chuyển sang Engagement, user vẫn phải scroll lên đầu trang để đổi range, và biểu đồ luôn bucket theo ngày (gây nhiễu khi xem range dài).

## Thay đổi

### 1. Component mới: `EngagementDateRangeControl`
File: `src/components/reports/EngagementDateRangeControl.tsx`

Đặt ngay dưới header của tab Engagement (cạnh nút "Sync ngay"). Gồm:
- **Preset chips**: `7 ngày`, `Tuần này`, `30 ngày`, `Tháng này`, `90 ngày`, `Quý này`, `Năm nay`
- **Custom range picker** (shadcn Calendar `mode="range"`, `numberOfMonths={2}`, `pointer-events-auto`)
- **Bucket selector**: `Ngày | Tuần | Tháng` (auto-suggest theo độ dài range: ≤14 ngày → Ngày, ≤90 → Tuần, >90 → Tháng; user có thể override)
- Hiển thị label range đang chọn + số ngày

State được nâng lên `Reports.tsx` (local state `engagementRange` + `engagementBucket`), KHÔNG ghi đè `filters` global. Các tab khác tiếp tục dùng `filters` global.

### 2. Mở rộng `useEngagementReport`
File: `src/hooks/reports/useEngagementReport.ts`

- Thêm tham số tùy chọn `overrideRange?: { from: Date; to: Date }` và `bucket?: 'day' | 'week' | 'month'`
- Nếu `overrideRange` có thì dùng thay cho `filters.dateFrom/dateTo` (vẫn giữ `brandId`, `channel` từ filter global)
- Bucket logic mới trong `aggregators.ts`:
  - `bucketByWeek(rows, from, to)` — gom theo ISO week (thứ 2 đầu tuần, locale `vi`)
  - `bucketByMonth(rows, from, to)` — gom theo `yyyy-MM`
  - `fillDateGaps` đã có cho bucket ngày, mở rộng tương tự cho tuần/tháng
- `byDay` được rename về `byBucket` trong response (giữ alias `byDay` để không vỡ chỗ gọi khác); thêm field `bucketType` để chart format label.

### 3. Cập nhật `Reports.tsx` — tab Engagement
- Thêm `useState` cho `engagementRange` (default = `filters.dateFrom/dateTo`) và `engagementBucket` (default auto theo range)
- Truyền vào `useEngagementReport(orgId, filters, { overrideRange, bucket })`
- Hiển thị `EngagementDateRangeControl` trong header card của tab
- Format trục X của LineChart theo `bucketType`:
  - `day` → `dd/MM`
  - `week` → `Tuần W (dd/MM)`
  - `month` → `MM/yyyy`
- Thêm badge nhỏ "Filter riêng cho tab này" để user biết range này không sync với filter global

### 4. Cập nhật aggregators
File: `src/lib/reports/aggregators.ts`
- Thêm `bucketByWeek`, `bucketByMonth`
- Thêm helper `suggestBucket(rangeDays): 'day' | 'week' | 'month'`
- Thêm `formatBucketLabel(date, bucketType, locale)`

### 5. PDF/CSV (giữ tương thích)
- `pdfBuilder.ts` và `csvBuilder.ts`: nếu engagement có `bucketType !== 'day'`, thêm cột header tương ứng (`Tuần` / `Tháng`) thay vì `Ngày`. Logic đơn giản, không breaking change.

## Edge cases
- Khi `overrideRange` rỗng → fallback về filter global.
- Khi user đổi filter global (date range) → option: hiện toast nhắc "Tab Engagement đang dùng range riêng, bấm Reset để dùng theo global". Hoặc thêm nút **"Đồng bộ với filter global"** trong `EngagementDateRangeControl`.
- Preset "Tuần này" / "Tháng này" / "Quý này" / "Năm nay" tính theo timezone local của user (`date-fns/startOfWeek/Month/Quarter/Year` với `weekStartsOn: 1`).
- Với bucket tuần/tháng, snapshot vẫn lấy "latest per post" rồi gom vào bucket theo `snapshot_at` của latest snapshot (giữ logic cũ, chỉ đổi bucketize).

## Files
- **Tạo mới**: `src/components/reports/EngagementDateRangeControl.tsx`
- **Sửa**: `src/hooks/reports/useEngagementReport.ts`, `src/lib/reports/aggregators.ts`, `src/pages/Reports.tsx`, `src/lib/reports/pdfBuilder.ts`, `src/lib/reports/csvBuilder.ts`

Không có DB migration, không cần edge function mới — chỉ là client-side filter + bucket logic.