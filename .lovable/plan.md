

# Hoàn thiện UI Dashboard

## Vấn đề phát hiện

### 1. Header truyền data cứng = 0
`DashboardHeader` nhận `pendingCount={0}` và `todayScheduleCount={0}` — không phản ánh dữ liệu thực tế. Cần lấy từ `TodaySchedules` và `PendingReviews` hooks.

### 2. Text hardcoded tiếng Việt — không qua i18n
Nhiều component dashboard dùng text cứng thay vì `t()`:
- **QuickActionGrid**: "Bắt đầu nhanh", "Phím tắt hoạt động", tên actions (Nội dung đa kênh, Kịch bản Video...)
- **TodayFocus**: "Trọng tâm hôm nay", "Tạo nội dung mới", "Thời điểm tốt để đăng"...
- **ActivityTimeline**: "Hoạt động gần đây", "Hôm nay", "Hôm qua", "Chưa có hoạt động nào"
- **ActiveCampaignsWidget**: "Chiến dịch đang chạy", "Chưa có chiến dịch nào"
- **PerformanceReminderWidget**: "Cập nhật hiệu suất", "Tất cả đã được cập nhật!"
- **DashboardStats**: "Kịch bản Video", "Carousel", "Nội dung đa kênh", "Brand Templates"
- **TopicQuickAccess**: "Ý tưởng hôm nay"

### 3. Layout chưa tối ưu trên viewport hiện tại (~707px)
Ở `md` breakpoint, grid 12-col chưa hiển thị tốt — một số card bị hẹp.

## Kế hoạch thực hiện

### A. Truyền data thực cho DashboardHeader
- Lấy `todayScheduleCount` từ `useContentSchedules` (lọc isToday)
- Đếm pending reviews và truyền vào `pendingCount`
- File: `src/pages/Dashboard.tsx`

### B. i18n hóa toàn bộ Dashboard components
Thêm keys vào `vi.json` / `en.json` và thay thế text cứng bằng `t()` trong:

| Component | Số text cần thay |
|-----------|-----------------|
| QuickActionGrid | ~10 strings |
| TodayFocus | ~8 strings |
| ActivityTimeline | ~6 strings |
| ActiveCampaignsWidget | ~5 strings |
| PerformanceReminderWidget | ~5 strings |
| DashboardStats | ~4 labels |
| TopicQuickAccess | ~3 strings |

### C. Cải thiện responsive layout
- Điều chỉnh grid breakpoints: dùng `md:grid-cols-6` thay vì nhảy thẳng sang `lg:grid-cols-12`
- Đảm bảo cards có `min-height` hợp lý trên tablet

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Dashboard.tsx` | Truyền data thực cho Header |
| `src/components/dashboard/QuickActionGrid.tsx` | i18n |
| `src/components/dashboard/TodayFocus.tsx` | i18n |
| `src/components/dashboard/ActivityTimeline.tsx` | i18n |
| `src/components/dashboard/ActiveCampaignsWidget.tsx` | i18n |
| `src/components/PerformanceReminderWidget.tsx` | i18n |
| `src/components/DashboardStats.tsx` | i18n |
| `src/components/TopicQuickAccess.tsx` | i18n |
| `src/i18n/locales/vi.json` | Thêm ~40 keys dashboard |
| `src/i18n/locales/en.json` | Thêm ~40 keys dashboard |

