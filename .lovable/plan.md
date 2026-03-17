

# Hoàn thiện thống kê nội dung Workspace

## Hiện trạng
Panel chi tiết workspace chỉ hiển thị 3 số đơn giản: Bài viết (multi_channel), Carousel, Ảnh AI. Thiếu nhiều chỉ số quan trọng.

## Cải tiến

### 1. Mở rộng thống kê trong hook `useAdminWorkspaceDetail`
Thêm các chỉ số:
- **Bài Social** (tổng kênh selected_channels) — phản ánh khối lượng thực tế, không chỉ số bản ghi
- **Scripts** (đếm từ bảng `scripts` where `organization_id`)
- **Carousel Images** (đếm từ `carousel_images` where `organization_id`)
- **Phân bổ theo thành viên**: Mỗi member tạo bao nhiêu bài/ảnh (query `multi_channel_contents.user_id` + `channel_image_history` grouped by user)

### 2. RLS policies cho Admin
Cần thêm admin SELECT policy cho:
- `scripts` — hiện chỉ có policy cho org members
- `carousel_images` — hiện chỉ cho owner

### 3. UI cải tiến `WorkspaceDetailPanel`
Thay layout 3 cột đơn giản bằng:
- **Hàng 1**: Grid 5 stat cards (Bài viết, Bài Social, Carousel, Ảnh AI, Scripts)
- **Hàng 2**: 3 cột như cũ (Thành viên, Brands, Đóng góp theo member) — cột thứ 3 mới hiển thị top contributors với số bài + ảnh mỗi người

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaceDetail.ts` | Thêm socialPostCount, scriptCount, carouselImageCount + per-member breakdown |
| `src/components/admin/AdminWorkspacesTab.tsx` | Mở rộng stat grid 5 cards + thêm cột "Đóng góp" |
| **Migration SQL** | Thêm admin SELECT policy cho `scripts` và `carousel_images` |

