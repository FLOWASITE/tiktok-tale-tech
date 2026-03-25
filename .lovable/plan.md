
# Plan: UI Chi tiết Kế hoạch Chiến dịch theo Kênh

## Vấn đề hiện tại
`CampaignPlanReview` hiện hiển thị danh sách phẳng (flat list) các content pieces — khó nhìn tổng thể từng kênh có bao nhiêu bài, chủ đề gì, ngày nào.

## Giải pháp
Thêm **2 chế độ xem** vào `CampaignPlanReview`:
1. **View theo kênh (Channel View)** — mặc định mới, nhóm content pieces theo social channel
2. **View danh sách (List View)** — giữ nguyên giao diện hiện tại

### Chi tiết UI — Channel View

```text
┌─────────────────────────────────────────────────────┐
│  [Kế hoạch header + progress]                       │
│  Toggle: [📋 Danh sách] [📊 Theo kênh] [📅 Timeline]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌── 📘 Facebook (3 bài) ─────────────────────────┐│
│  │ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ ││
│  │ │ 25/03       │ │ 28/03       │ │ 01/04      │ ││
│  │ │ 🌱 Seed     │ │ 🌿 Sprout   │ │ 🌾 Harvest │ ││
│  │ │ "5 sai lầm  │ │ "Case study │ │ "Ưu đãi   │ ││
│  │ │  kế toán"   │ │  ABC Corp"  │ │  tháng 4"  │ ││
│  │ │ 📝 Post     │ │ 🎠 Carousel │ │ 📝 Post    │ ││
│  │ │ ○ Chờ       │ │ ○ Đang chạy │ │ ○ Chờ      │ ││
│  │ └─────────────┘ └─────────────┘ └────────────┘ ││
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌── 🎵 TikTok (2 bài) ──────────────────────────┐│
│  │ ┌─────────────┐ ┌─────────────┐                 ││
│  │ │ 26/03       │ │ 30/03       │                 ││
│  │ │ 🌱 Seed     │ │ 🌿 Sprout   │                 ││
│  │ │ "Tips kế    │ │ "Hậu trường │                 ││
│  │ │  toán"      │ │  văn phòng" │                 ││
│  │ │ 🎬 Video    │ │ 🎬 Video    │                 ││
│  │ └─────────────┘ └─────────────┘                 ││
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Chi tiết UI — Timeline View
Hiển thị dạng timeline theo ngày, mỗi ngày liệt kê các bài kèm icon kênh.

```text
┌── 25/03 (Thứ Ba) ──────────────────┐
│  📘 "5 sai lầm kế toán" 🌱 Post    │
│  🎵 "Tips kế toán nhanh" 🌱 Video  │
├── 28/03 (Thứ Sáu) ─────────────────┤
│  📘 "Case study ABC"    🌿 Carousel│
├── 30/03 (Chủ nhật) ────────────────┤
│  🎵 "Hậu trường văn phòng" 🌿 Video│
└─────────────────────────────────────┘
```

## File changes

### 1. `src/components/agents/CampaignPlanReview.tsx` (sửa lớn)
- Thêm state `viewMode: 'list' | 'channel' | 'timeline'` (default: `'channel'`)
- Thêm toggle buttons ở header
- **Channel View**: Group `pieces` theo `target_channel`, render mỗi nhóm trong Card riêng với `ChannelIcon`, channel label, count. Bên trong mỗi channel: grid cards sắp theo `scheduled_date`, mỗi card hiển thị ngày, role badge, title, format icon, key_message (truncated), status dot
- **Timeline View**: Group `pieces` theo `scheduled_date`, render theo ngày với channel icon + title + format
- **List View**: Giữ nguyên code hiện tại
- Import `ChannelIcon`, `getChannelLabel` từ streaming/ChannelIcon
- Mỗi piece card có thể click để edit (reuse dialog hiện tại)

### 2. Không cần thêm file mới
Tất cả logic nằm trong `CampaignPlanReview.tsx`, dùng lại components có sẵn (ChannelIcon, Badge, Card, format date).

## Technical notes
- Grouping: `pieces.reduce()` by `target_channel` hoặc `scheduled_date`
- Sort pieces trong mỗi group theo `scheduled_date` ascending
- Pieces chưa có `scheduled_date` hiển thị "Chưa lên lịch" ở cuối
- Responsive: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` cho channel view cards
- Tái sử dụng `ROLE_CONFIG`, `ANGLE_LABELS`, `FORMAT_LABELS`, `statusBadge()` hiện có
