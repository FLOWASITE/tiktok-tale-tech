
# Đổi UI Card cho chế độ xem "Theo kênh"

## Vấn đề
Khi xem theo kênh (ví dụ tab Facebook), `MultiChannelCard` vẫn hiển thị tất cả thông tin đa kênh (thanh tiến độ kênh, grid icon tất cả kênh, số kênh đã điền...) — thông tin này thừa và gây nhiễu vì user đã biết mình đang xem kênh nào.

## Giải pháp
Tạo component `SocialPostCard` mới — card đơn giản hơn, tập trung vào nội dung của **1 kênh cụ thể**, giống phong cách quản lý bài đăng social:

```text
┌──────────────────────────────────┐
│ 📷 [Ảnh kênh rộng]              │  ← Thumbnail lớn chiếm full width
├──────────────────────────────────┤
│ Tiêu đề bài viết                │
│ "Nội dung kênh cụ thể preview.."│  ← Text preview của kênh đang xem
│                                  │
│ [Đã duyệt] [Giáo dục]  ⭐ 85   │  ← Status + Goal + Score
│                                  │
│ 👤 Creator · Brand · 2 giờ trước│
│ [Xem] [Lịch] [Xóa]             │
└──────────────────────────────────┘
```

## Thay đổi

### 1. `src/components/multichannel/SocialPostCard.tsx` — **Mới**
- Props: nhận thêm `activeChannel: Channel` để biết đang xem kênh nào
- Thumbnail: hiển thị ảnh của kênh đang xem (`channel_images[activeChannel]`), full width, aspect-ratio 16:9
- Nội dung preview: hiển thị `{channel}_content` thay vì chỉ title — 2-3 dòng text
- Bỏ hoàn toàn: grid icon kênh, thanh tiến độ kênh, số kênh đã điền
- Giữ: status badge, goal badge, critique/GEO score, tags, creator, brand, actions
- Trạng thái kênh: hiển thị `channel_statuses[activeChannel]` thay vì status tổng

### 2. `src/components/multichannel/ChannelGroupView.tsx`
- Import `SocialPostCard` thay vì `MultiChannelCard`
- Truyền `activeChannel={channel}` cho mỗi card
- Giữ nguyên grid layout nhưng có thể giảm columns (3-4 cột thay vì 5) vì card giờ cao hơn do có thumbnail lớn

### Files
| File | Thay đổi |
|------|----------|
| `src/components/multichannel/SocialPostCard.tsx` | **Mới** — Card tối ưu cho view theo kênh |
| `src/components/multichannel/ChannelGroupView.tsx` | Dùng SocialPostCard thay MultiChannelCard |
