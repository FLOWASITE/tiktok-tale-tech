

## Sửa lỗi không lên lịch được dù bài đã duyệt

### Nguyên nhân
Hàm `canSchedule` trong `SchedulePanel.tsx` (dòng 52-55) chỉ kiểm tra `channel_statuses[channel]` (trạng thái riêng từng kênh). Khi nội dung được duyệt qua nút "Duyệt" tổng thể, trạng thái master `content.status` được cập nhật thành `approved`, nhưng `channel_statuses` của từng kênh vẫn giữ nguyên là `draft`.

Kết quả: Nút "Lên lịch" bị disable và hiển thị "Cần duyệt nội dung trước khi lên lịch" mặc dù bài đã được duyệt.

### Giải pháp
Mở rộng logic `canSchedule` để xét thêm trạng thái master `content.status`. Nếu `content.status` là `approved` hoặc `published`, cho phép lên lịch cho tất cả các kênh, bất kể `channel_statuses` riêng lẻ.

### Chi tiết thay đổi

**File: `src/components/SchedulePanel.tsx`** (dòng 52-55)

Thay:
```typescript
const canSchedule = (channel: Channel) => {
  const status = getChannelStatus(channel);
  return status === 'approved' || status === 'published';
};
```

Thành:
```typescript
const canSchedule = (channel: Channel) => {
  const channelStatus = getChannelStatus(channel);
  const masterStatus = content.status;
  return channelStatus === 'approved' || channelStatus === 'published' 
    || masterStatus === 'approved' || masterStatus === 'published';
};
```

### Tác động
- Khi bài được duyệt tổng (master status = approved), tất cả kênh đều có thể lên lịch
- Khi chỉ duyệt riêng từng kênh, logic cũ vẫn hoạt động bình thường
- Không ảnh hưởng đến các component khác

