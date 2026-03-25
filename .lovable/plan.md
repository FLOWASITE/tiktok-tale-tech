

# Chi tiết hóa phần "Dự kiến chiến dịch" trong bước Xác nhận GoalWizard

## Hiện tại
Phần "Dự kiến chiến dịch" chỉ hiển thị 3 số: **Bài viết**, **Kênh**, **Ngày** — không phân biệt loại nội dung.

## Thay đổi

Thay thế grid 3 cột đơn giản bằng layout chi tiết hơn, bao gồm:

### 1. Tổng quan (hàng trên)
- Giữ 3 metric chính: Tổng bài viết · Kênh · Ngày

### 2. Phân bổ theo loại nội dung (hàng dưới)
Hiển thị breakdown dự kiến cho mỗi loại content mà pipeline sẽ tạo:

| Loại | Icon | Cách tính |
|------|------|-----------|
| Nội dung đa kênh | FileText | = estimatedPosts (mỗi bài viết = 1 multichannel) |
| Carousel | Images | = số kênh visual (instagram, tiktok, facebook, pinterest) × weeks × frequency |
| Video Script | Video | = số kênh video (tiktok, youtube, instagram) × weeks × frequency |

Logic tính: Dựa trên `selectedChannels` — kênh nào thuộc nhóm visual/video sẽ được đếm vào carousel/video tương ứng.

### 3. Style
- Giữ aesthetic hiện tại (gradient bg, primary/5 → primary/10)
- Phần breakdown dùng divider ngang nhẹ, mỗi loại content hiển thị 1 dòng compact: icon + tên + số lượng dự kiến
- Text nhỏ gọn, sang trọng (text-[10px], muted colors)

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/agents/GoalWizard.tsx` | Thêm computed values cho carousel/video estimates, redesign phần "Dự kiến chiến dịch" với breakdown chi tiết |

