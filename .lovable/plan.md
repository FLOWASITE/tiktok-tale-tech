

## Hoàn thiện chức năng đăng lịch

### Vấn đề hiện tại

1. **QuickScheduleDialog cũng bị lỗi giống SchedulePanel**: Hàm `schedulableChannels` và `pendingChannels` trong `QuickScheduleDialog.tsx` (dòng 77-90) chỉ kiểm tra `channel_statuses[channel]`, không xét `content.status` master. Khi bài được duyệt tổng, dialog "Lên lịch nhanh" vẫn hiện "Không có kênh nào sẵn sàng" hoặc liệt kê kênh vào nhóm "Cần duyệt".

2. **Thiếu thông báo khi chọn thời gian quá khứ**: `SchedulePanel` chặn lưu nhưng không báo lỗi cho người dùng (dòng 88-89: `return` im lặng).

3. **Thiếu nút "Lên lịch tất cả" trong SchedulePanel**: Phải lên lịch từng kênh một, không có cách lên lịch tất cả cùng lúc.

4. **Thiếu xác nhận trước khi hủy lịch**: Hủy lịch không có bước xác nhận, dễ bấm nhầm.

### Giải pháp

#### 1. Sửa QuickScheduleDialog - Xét master status (quan trọng nhất)

**File: `src/components/QuickScheduleDialog.tsx`** (dòng 77-90)

Cập nhật `schedulableChannels` và `pendingChannels` để xét thêm `content.status`:

```typescript
const schedulableChannels = useMemo(() => {
  const masterApproved = content.status === 'approved' || content.status === 'published';
  return content.selected_channels.filter(channel => {
    if (masterApproved) return true;
    const status = content.channel_statuses?.[channel] || 'draft';
    return status === 'approved' || status === 'published';
  });
}, [content.selected_channels, content.channel_statuses, content.status]);

const pendingChannels = useMemo(() => {
  const masterApproved = content.status === 'approved' || content.status === 'published';
  if (masterApproved) return [];
  return content.selected_channels.filter(channel => {
    const status = content.channel_statuses?.[channel] || 'draft';
    return status !== 'approved' && status !== 'published';
  });
}, [content.selected_channels, content.channel_statuses, content.status]);
```

#### 2. Thêm toast cảnh báo khi chọn thời gian quá khứ

**File: `src/components/SchedulePanel.tsx`** (dòng 88-89)

Thay `return;` bằng toast thông báo rõ ràng:

```typescript
if (isBefore(scheduledAt, new Date())) {
  toast({
    title: 'Thời gian không hợp lệ',
    description: 'Vui lòng chọn thời gian trong tương lai',
    variant: 'destructive',
  });
  return;
}
```

#### 3. Thêm nút "Lên lịch tất cả kênh" trong SchedulePanel

**File: `src/components/SchedulePanel.tsx`**

Thêm nút bên cạnh tiêu đề để lên lịch tất cả kênh đã duyệt cùng lúc. Khi bấm, mở form chung với ngày/giờ, sau đó upsert cho tất cả kênh đủ điều kiện.

#### 4. Thêm xác nhận trước khi hủy lịch

**File: `src/components/SchedulePanel.tsx`**

Sử dụng `AlertDialog` để xác nhận trước khi hủy, tránh bấm nhầm.

### Tác động

- QuickScheduleDialog sẽ hoạt động đúng khi bài được duyệt tổng (master approved)
- Người dùng nhận được phản hồi rõ ràng khi chọn sai thời gian
- Tiết kiệm thời gian khi lên lịch nhiều kênh cùng lúc
- Tránh hủy lịch nhầm nhờ bước xác nhận

### File cần sửa
- `src/components/QuickScheduleDialog.tsx` -- Sửa logic kiểm tra trạng thái duyệt
- `src/components/SchedulePanel.tsx` -- Thêm toast lỗi, nút lên lịch tất cả, xác nhận hủy

