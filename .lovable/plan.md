

# Đồng bộ số "Tổng" giữa hàng Workspace và phần Đóng góp

## Vấn đề
- Hàng Workspace chính: Tổng = `content_count + image_count` = 11 + 49 = **60**
- Phần Đóng góp: Tổng = `Σ(contentCount + imageCount + carouselCount + scriptCount)` = **11**
- Sự khác biệt do: (1) image trong `channel_image_history` có `user_id` null nên không được tính vào đóng góp, (2) hàng chính chỉ tính 2 metric (content + image) nhưng đóng góp tính 4 metric (content + image + carousel + script)

## Giải pháp
Đồng bộ cách tính: hàng Workspace chính cũng phải hiển thị đủ 4 metric giống phần detail, hoặc ít nhất cột "Tổng" phải khớp với tổng thực tế trong kỳ.

### 1. `useAdminWorkspaces.ts` — Thêm carousel_count và script_count
- Fetch thêm `carousels` (select `organization_id, created_at`) và `scripts` (select `organization_id, created_at`)
- Đếm theo period tương tự content/image
- Thêm `carousel_count` và `script_count` vào interface `AdminWorkspace`
- Cột "Tổng" = `content_count + image_count + carousel_count + script_count`

### 2. `AdminWorkspacesTab.tsx` — Cập nhật cột Tổng
- Cột "Tổng" trong bảng chính: `ws.content_count + ws.image_count + ws.carousel_count + ws.script_count`
- Footer tổng dọc cũng cộng đủ 4 metric

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaces.ts` | Thêm fetch carousels + scripts, thêm carousel_count & script_count |
| `src/components/admin/AdminWorkspacesTab.tsx` | Cập nhật công thức cột Tổng |

