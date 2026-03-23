

# Tích hợp GEO Score vào Nội dung đa kênh

## Vấn đề
GEO Score hiện chỉ hoạt động ở tab riêng trong GEO Dashboard — user phải copy-paste nội dung thủ công. Không có liên kết nào với nội dung đa kênh đã tạo.

## Giải pháp

### 1. Thêm GEO Score vào MultiChannelViewer
- Thêm tab/section GEO Score trong sidebar của MultiChannelViewer (bên cạnh các panel Gallery, Schedule, Team)
- Tự động lấy `website_content` (hoặc channel content đang xem) làm input cho GEO scoring
- Truyền `contentId` và `organizationId` để lưu score vào DB
- Hiển thị `GEOScorePanel` với đầy đủ 8 yếu tố + issues

### 2. Hiển thị GEO Score badge trên MultiChannelCard
- Query `geo_content_scores` cho mỗi content đã có score
- Hiển thị badge nhỏ (ví dụ: "GEO: 78 B") trên card, bên cạnh status/priority
- Dùng màu theo mức điểm (xanh/vàng/cam/đỏ)

### 3. Tạo hook `useGEOContentScore`
- Hook mới fetch score từ `geo_content_scores` theo `content_id`
- Dùng chung cho cả MultiChannelCard và MultiChannelViewer
- Realtime subscribe để cập nhật khi score thay đổi

### Files cần sửa/tạo
- `src/hooks/useGEOContentScore.ts` — hook mới
- `src/components/MultiChannelViewer.tsx` — thêm nút/panel GEO Score
- `src/components/MultiChannelCard.tsx` — thêm badge GEO Score
- `src/components/geo/GEOScorePanel.tsx` — thêm prop `channelContents` để auto-fill text từ content

### Luồng hoạt động
1. User mở MultiChannelViewer → thấy nút "GEO Score" trên toolbar
2. Click → mở panel GEO Score ở sidebar, tự động điền nội dung website/channel đang active
3. Click "Chấm điểm" → score được lưu với `content_id` vào `geo_content_scores`
4. Quay lại danh sách → card hiển thị badge score đã chấm

