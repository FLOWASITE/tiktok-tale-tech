

# Hiển thị kênh cụ thể cho nội dung đa kênh trong Activity Timeline

## Vấn đề

Hiện tại nội dung đa kênh chỉ hiển thị label "Đa kênh" chung chung. Dữ liệu `metadata.channels` (selected_channels) đã được truyền vào nhưng chưa được render.

## Thay đổi

### `src/components/dashboard/ActivityTimeline.tsx`

- Lấy `metadata.channels` và hiển thị dưới dạng badge nhỏ (tương tự `PublishedChannelBadges` nhưng không có icon CheckCircle)
- Hiển thị ngay sau dòng label + thời gian, trước publishedChannels
- Dùng lại `getChannelColorClasses` và `CHANNEL_LABELS` đã có sẵn

UI mỗi item multichannel sẽ như sau:
```text
┌─────────────────────────────────────┐
│ 🟣 Bài giới thiệu sản phẩm X      │
│   Đa kênh • 2 giờ trước            │
│   facebook  instagram  tiktok       │
│   ✅ facebook  ✅ instagram         │
└─────────────────────────────────────┘
```

Chỉ cần sửa 1 file: `src/components/dashboard/ActivityTimeline.tsx` — thêm render `metadata.channels` badges cho multichannel items.

