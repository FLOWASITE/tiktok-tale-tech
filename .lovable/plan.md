

# Rà soát & hoàn thiện phân hệ Lịch đăng (Content Calendar)

## Kết quả rà soát — 8 vấn đề cần sửa

| # | Vấn đề | Mức độ | Component |
|---|--------|--------|-----------|
| 1 | **Không có auto-refresh / realtime** | Cao | ContentCalendar, PublishingQueue |
| 2 | **Duplicate data fetching** | Cao | ContentCalendar tự fetch + PublishingQueue tự fetch riêng |
| 3 | **`useRetryPublish` update fields không tồn tại** | Cao | `last_attempt_at`, `last_error` không có trong DB schema |
| 4 | **Stats card hiện ở cả Calendar + Queue nhưng data khác** | Trung bình | Calendar dùng unfiltered, Queue dùng filtered |
| 5 | **Quá hạn (past due) không có notification/cảnh báo** | Trung bình | PublishingQueue chỉ highlight nhưng không auto-detect |
| 6 | **Drag-drop reschedule không validate ngày quá khứ** | Trung bình | ContentCalendar handleDragEnd |
| 7 | **Day View không kết nối với form tạo nội dung** | Thấp | `onCreateSchedule` không được truyền |
| 8 | **Mini calendar sidebar thiếu filter theo status** | Thấp | Hiện tất cả schedules |

## Chi tiết & giải pháp

### 1. Thêm Realtime subscription cho content_schedules
- Thêm `supabase.channel('content_schedules').on('postgres_changes', ...)` trong ContentCalendar
- Khi nhận event INSERT/UPDATE/DELETE → auto-refresh schedules
- Cần migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_schedules;`

### 2. Sửa `useRetryPublish` — bỏ fields không tồn tại
- DB `content_schedules` KHÔNG có `last_attempt_at` hay `last_error` (chỉ có `publish_error`)
- Sửa: dùng `publish_error` thay `last_error`, bỏ `last_attempt_at`

### 3. Validate drag-drop — không cho kéo vào ngày quá khứ
- Trong `handleDragEnd`: kiểm tra `newScheduledAt > now()` trước khi update
- Toast lỗi nếu user kéo vào ngày đã qua

### 4. Auto-detect quá hạn schedules — hiện cảnh báo tổng hợp
- Thêm `overdueCount` vào stats bar ở Calendar page
- Hiện badge cảnh báo "X bài quá hạn" nổi bật

### 5. Kết nối Day View → tạo schedule từ hour slot
- Truyền `onCreateSchedule` callback vào CalendarDayView
- Click slot trống → mở QuickScheduleDialog hoặc navigate tạo nội dung

### 6. Thống nhất stats card
- Calendar page stats dùng `filteredSchedules` thay vì `schedules` (unfiltered) để nhất quán

### 7. Mini calendar sidebar — highlight theo status
- Thêm modifier khác nhau cho ngày có schedule published (xanh) vs scheduled (vàng) vs failed (đỏ)

### 8. Thêm nút Refresh + auto-refresh sau khi publish thành công
- PublishingQueue đã có retry nhưng không auto-refresh khi DirectPublish thành công
- SchedulePanel cũng cần refresh sau khi DirectPublish

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/pages/ContentCalendar.tsx` | Realtime subscription, validate drag-drop, stats dùng filtered, truyền onCreateSchedule, highlight mini calendar theo status, cảnh báo quá hạn |
| `src/hooks/useRetryPublish.ts` | Sửa field names: `last_error` → `publish_error`, bỏ `last_attempt_at` |
| `src/components/SchedulePanel.tsx` | Refresh sau DirectPublish thành công |

**Migration cần thiết**: Enable realtime cho `content_schedules`

