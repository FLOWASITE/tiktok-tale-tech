

## Hoàn thiện chức năng "Lên lịch" trong CarouselViewer

### Vấn đề hiện tại
Nút "Lên lịch" trong CarouselViewer (line 823-836) dùng `querySelector('[data-schedule-channel]')` để tìm nút schedule bên trong `DirectPublishButton` — nhưng ở chế độ `iconOnly`, không có element nào với `data-schedule-channel` → nút bấm không làm gì.

Ngoài ra, schedule dialog hiện nằm riêng trong mỗi `DirectPublishButton` và chỉ schedule cho 1 platform — không phù hợp với thiết kế "nút lịch gộp chung".

### Giải pháp
Chuyển logic schedule ra CarouselViewer: nút "Lên lịch" mở Popover cho phép chọn platform → chọn ngày giờ → gọi `upsertSchedule`.

### Thay đổi

**File: `src/components/CarouselViewer.tsx` (Row 2, lines 822-836)**

Thay nút Button đơn giản bằng Popover 2 bước:
1. **Bước 1**: Hiện danh sách 5 platform icons (giống row publish) để chọn platform cần schedule
2. **Bước 2**: Sau khi chọn platform → hiện inline date picker + time input + nút xác nhận

```text
┌──────────────────────────────┐
│ 📅 Lên lịch đăng             │
│                              │
│ Chọn kênh:                   │
│ [FB] [IG] [LI] [X] [TT]     │
│                              │
│ Ngày: [dd/MM/yyyy      📅]  │
│ Giờ:  [09:00           🕐]  │
│ Ghi chú: [____________]     │
│                              │
│ [Hủy]        [Lên lịch]     │
└──────────────────────────────┘
```

- Import `useContentSchedules` tại CarouselViewer level (đã có `contentId = carousel.id`)
- State: `schedulePopoverOpen`, `selectedScheduleChannel`, `scheduleDate`, `scheduleTime`, `scheduleNotes`
- Gọi `upsertSchedule(carousel.id, { channel, scheduled_at, timezone, notes })` khi submit
- Hiện existing schedules nếu có (từ `schedules` array)

**File: `src/components/social/DirectPublishButton.tsx`**

- Bỏ schedule dialog + state khi `iconOnly=true` (lines 172-176, 316-351, 861-946) — không cần nữa vì parent quản lý
- Giữ schedule dialog cho mode non-iconOnly (multichannel viewer vẫn dùng)

### Files thay đổi
- `src/components/CarouselViewer.tsx` — thêm schedule Popover với channel picker + date/time
- `src/components/social/DirectPublishButton.tsx` — bỏ schedule logic khi iconOnly

