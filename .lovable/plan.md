
Mình đã rà code và nguyên nhân chính nhiều khả năng là frontend đang giữ dữ liệu cũ, không phải X đăng thất bại.

1. Điều mình thấy
- `publish-twitter` trả về `success: true`.
- `channel-publisher` đã có logic cập nhật `multi_channel_contents.status` và `channel_statuses.twitter = 'published'`.
- `DirectPublishButton` chỉ đổi khỏi `Đăng ngay` khi `channelStatus === 'published'`.
- `MultiChannelViewer` đang truyền `channelStatus`, nhưng sau khi đăng chỉ gọi `queryClient.invalidateQueries(...)`.
- `useMultiChannelContents` không dùng React Query cho danh sách nội dung; nó dùng `useState + fetchContents()`. Vì vậy `invalidateQueries(['multi-channel-contents'])` gần như không refresh gì cả.
- `MultiChannel.tsx` và `ContentCalendar.tsx` đang lưu cả `selectedContent` object vào state, nên viewer dễ bị giữ “snapshot cũ”.
- `SchedulePanel.tsx` đang render `DirectPublishButton` mà không truyền `channelStatus`, nên riêng chỗ này có thể luôn hiện `Đăng ngay` dù bài đã đăng.

2. Kế hoạch fix
- Chuyển state đang mở viewer từ `selectedContent` sang `selectedContentId`.
- Derive `selectedContent` từ mảng `contents` mới nhất để UI luôn bám dữ liệu mới.
- Thay callback sau khi publish từ `invalidateQueries(...)` sang gọi `refetch()` thật sự từ `useMultiChannelContents`.
- Truyền `channelStatus` vào mọi `DirectPublishButton` của nội dung đa kênh, đặc biệt trong `SchedulePanel`.
- Giữ published state nhất quán: đã đăng thì không còn hiện text `Đăng ngay`; hiển thị đúng state đã đăng theo UI hiện tại.

3. Files cần sửa
- `src/pages/MultiChannel.tsx`
- `src/pages/ContentCalendar.tsx`
- `src/components/MultiChannelViewer.tsx`
- `src/components/SchedulePanel.tsx`
- `src/components/social/DirectPublishButton.tsx` (nếu cần chỉnh published CTA cho thống nhất)

4. Technical details
```text
Hiện tại:
Direct publish success
  -> invalidateQueries(['multi-channel-contents'])
  -> useMultiChannelContents không nghe query này
  -> selectedContent snapshot cũ không đổi
  -> channelStatus vẫn là approved
  -> button vẫn hiện "Đăng ngay"

Sau khi sửa:
Direct publish success
  -> refetch() contents thật sự
  -> selectedContent lấy theo selectedContentId từ contents mới
  -> channelStatus.twitter = published
  -> button chuyển sang state đã đăng
```

5. QA sau khi implement
- Đăng X từ viewer và kiểm tra ngay trong popup: không còn hiện `Đăng ngay`.
- Kiểm tra cả action bar và `SchedulePanel`.
- Kiểm tra card/list master status đổi sang `Đăng 1 phần` hoặc `Đã đăng` mà không cần đóng mở lại.
- Test lại Facebook/Zalo để tránh lặp bug stale-state ở các kênh khác.
