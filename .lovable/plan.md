

## Hoàn thiện trang Dashboard

### Phân tích hiện trạng

Dashboard hiện tại có layout bento grid 12 cột với nhiều widget. Các vấn đề cần cải thiện:

1. **Layout không đều** - Hàng giữa có 3 widget (4+4+4 cols) cùng kích thước, thiếu hierarchy visual
2. **Stats cards row** chiếm quá nhiều không gian ngang (6 cards trên 1 hàng ở desktop) → khó đọc số liệu
3. **Thiếu section grouping** - Tất cả widget nằm chung 1 grid phẳng, không có phân nhóm logic
4. **Responsive chưa tối ưu** - Mobile chỉ đơn giản stack 1 cột, thiếu ưu tiên widget quan trọng
5. **Animation delay dài** - delay từ 0.2 đến 1.0 giây, trang mất ~1s mới render xong
6. **PendingReviews chiếm full-width** (12 cols) ở cuối dù thường ít data

### Cải tiến

**1. Restructure layout thành sections có heading**
- Section "Tổng quan nhanh": Stats cards + TodayFocus (compact row)
- Section "Hành động": QuickActions + AI Insights (2 cột chính)  
- Section "Lịch & Chiến dịch": TodaySchedules + ActiveCampaigns + Milestones
- Section "Hoạt động": Assignments + Timeline + PendingReviews

**2. Cải thiện Stats Cards**
- Giữ 6 cards nhưng responsive tốt hơn: 2 cols mobile → 3 cols tablet → 6 cols desktop
- Thêm hover card flip effect nhẹ (scale + shadow)
- Compact hơn trên mobile (giảm padding)

**3. Tối ưu grid layout**
- QuickActions: 5 cols → 7 cols (chiếm nhiều hơn vì là primary action)
- AI Insights + TodayFocus: gộp cùng cột phải (5 cols)
- Campaigns + Milestones + UsageQuota: hàng 3 cột đều (4+4+4)
- Assignments + Timeline: 2 cột đều (6+6)
- PendingReviews + PerformanceReminder: 2 cột (8+4) thay vì full-width

**4. Thêm section dividers với labels**
- Mỗi section có heading nhỏ (text-xs uppercase tracking-wide) + đường kẻ mờ
- Giúp user scan nhanh dashboard

**5. Giảm animation delay**
- Tất cả delay chia thành 2 wave: wave 1 (0-0.3s) cho stats + header, wave 2 (0.3-0.5s) cho widgets
- Bỏ delay > 0.5s

**6. Thêm welcome back summary (cho returning users)**
- Dòng tóm tắt dưới DashboardHeader: "Từ lần đăng nhập trước: +3 nội dung mới, 1 milestone hoàn thành"
- Chỉ hiện khi có thay đổi, auto-dismiss sau 10 giây

### Kỹ thuật

**File sửa:**

**`src/pages/Dashboard.tsx`**
- Restructure grid layout thành sections với headings
- Điều chỉnh col-span: QuickActions 7 cols, AI+TodayFocus 5 cols
- PendingReviews + PerformanceReminder: 8+4 cols thay vì 12+4
- Giảm tất cả animation delays xuống max 0.5s
- Thêm `DashboardSection` component inline để render section dividers

**`src/components/DashboardStats.tsx`**
- Thêm `compact` variant cho mobile (giảm padding p-3, text nhỏ hơn)
- Cải thiện responsive: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`
- Thêm subtle hover transform (scale-[1.02])

**`src/components/dashboard/DashboardHeader.tsx`**
- Thêm optional prop `activitySummary` hiển thị tóm tắt hoạt động gần đây
- Render dòng summary text nhỏ bên dưới greeting khi có data

