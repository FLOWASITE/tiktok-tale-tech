# Biểu đồ xu hướng cho Cron Monitor

## Mục tiêu
Trên trang `/admin/cron-monitor`, bổ sung khu vực biểu đồ trực quan giúp admin theo dõi xu hướng:
1. **Số bản ghi đã xóa theo thời gian** (DB rows + storage files + orphan files)
2. **Thời gian chạy (duration)** mỗi lần cron

## Vị trí trên UI
Chèn 1 Card mới **giữa** khu vực "Stats cards" và "Lịch sử chạy" — chứa 2 biểu đồ cạnh nhau (responsive: 1 cột trên mobile, 2 cột trên desktop).

```text
[ Stats Cards (4 cái) ]
[ ▼ MỚI: Card "Xu hướng"  ────────────────────── ]
  ┌─ Tabs: [Theo ngày] [Theo tuần] ─────────────┐
  │ ┌─ Bản ghi đã xóa ─┐  ┌─ Thời gian chạy ─┐ │
  │ │ Stacked Bar      │  │ Line chart       │ │
  │ │ (3 lớp màu)      │  │ (avg + max)      │ │
  │ └──────────────────┘  └──────────────────┘ │
  └────────────────────────────────────────────┘
[ Lịch sử chạy (table) ]
```

## Chi tiết hai biểu đồ

### 1. Biểu đồ "Bản ghi đã xóa"
- **Loại**: Stacked Bar Chart (recharts `BarChart`)
- **Trục X**: Mốc thời gian (ngày hoặc tuần tùy tab)
- **Trục Y**: Tổng số bản ghi đã xóa
- **3 lớp xếp chồng** (semantic colors):
  - DB records (`channel_images_deleted + carousel_images_deleted + videos_deleted`)
  - Storage files DB-linked (`storage_files_removed`)
  - Orphan files (`orphan_storage_files_removed`)
- **Tooltip**: hiển thị breakdown chi tiết + tổng

### 2. Biểu đồ "Thời gian chạy"
- **Loại**: Line Chart (recharts `LineChart`) với 2 đường:
  - **Đường trung bình** (avg duration của ngày/tuần)
  - **Đường tối đa** (max duration — phát hiện spike)
- **Trục Y**: format giây (s) tự động
- **Tooltip**: avg, max, số lần chạy trong mốc đó

## Logic gom dữ liệu (frontend)
- Tận dụng dữ liệu `logs` đã có sẵn từ query `cron-logs` — **không cần query mới**
- Hàm `aggregateByPeriod(logs, granularity: 'day' | 'week')`:
  - Group logs theo `format(started_at, 'yyyy-MM-dd')` hoặc tuần ISO
  - Với mỗi nhóm: tính sum (records, storage, orphan) và avg/max duration
  - Fill các ngày trống trong khoảng đã chọn để biểu đồ liên tục
- Granularity tự động:
  - Range `24h` → ẩn biểu đồ (quá ít data) hoặc nhóm theo giờ
  - Range `7d` → mặc định "Theo ngày"
  - Range `30d` → mặc định "Theo ngày", cho phép chuyển "Theo tuần"

## Tương tác với bộ lọc hiện có
- Biểu đồ tự động cập nhật theo `rangeFilter` (24h/7d/30d) sẵn có
- Bộ lọc `statusFilter` **không** áp dụng cho chart (luôn vẽ tất cả status để thấy cả lần lỗi) — thêm chú thích nhỏ

## Kỹ thuật
- **File sửa**: chỉ `src/pages/AdminCronMonitor.tsx`
- **Components mới (nội bộ trong file)**:
  - `<DeletionTrendChart logs={logs} granularity={...} />`
  - `<DurationTrendChart logs={logs} granularity={...} />`
- **Helpers**:
  - `aggregateByPeriod(logs, granularity)` — pure function
  - `fillEmptyPeriods(data, range, granularity)` — đảm bảo trục X liên tục
- **Recharts**: dùng `ResponsiveContainer`, `BarChart`, `LineChart`, `Tooltip`, `XAxis`, `YAxis`, `CartesianGrid`, `Legend`, `Bar`, `Line`
- **Màu**: dùng semantic tokens qua CSS vars (`hsl(var(--primary))`, `hsl(var(--accent))`, `hsl(var(--muted-foreground))`) thay vì raw colors — phù hợp Soft Luxury
- **Empty state**: nếu không có log → hiển thị placeholder "Chưa đủ dữ liệu để vẽ biểu đồ"
- **date-fns**: dùng `startOfDay`, `startOfWeek`, `eachDayOfInterval`, `eachWeekOfInterval` (đã có sẵn trong dự án)

## Không thay đổi
- ❌ Không động vào edge function `cleanup-old-media`
- ❌ Không sửa schema DB / không tạo migration
- ❌ Không thay đổi stats cards và bảng lịch sử hiện có
- ❌ Không cài thêm package (recharts đã có sẵn)
