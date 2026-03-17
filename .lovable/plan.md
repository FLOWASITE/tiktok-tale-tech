

# Thêm cột tổng quan (Nội dung, Ảnh, Brands) vào bảng Workspace

## Vấn đề hiện tại
Bảng danh sách workspace chỉ hiển thị: Tên, Owner, Thành viên, Plan, Status, Ngày tạo. Muốn xem chi tiết nội dung/brand/đóng góp phải bấm mở expand từng workspace.

## Giải pháp
Thêm 3 cột tổng hợp trực tiếp vào mỗi row trong bảng workspace: **Brands**, **Nội dung**, **Ảnh** — để admin nhìn nhanh mà không cần expand.

### 1. Hook `useAdminWorkspaces.ts`
- Trong `workspacesQuery`, thêm 3 query song song:
  - `brand_templates` → count group by `organization_id`
  - `multi_channel_contents` → count group by `organization_id`
  - `channel_image_history` → count group by `organization_id`
- Map counts vào mỗi workspace object: `brand_count`, `content_count`, `image_count`
- Cập nhật interface `AdminWorkspace` thêm 3 fields

### 2. Component `AdminWorkspacesTab.tsx`
- Thêm 3 cột vào table header: **Brands**, **Nội dung**, **Ảnh**
- Hiển thị badge nhỏ với số lượng ở mỗi row
- Cập nhật `colSpan` của detail panel (7 → 10)

### 3. Tổng cộng dòng cuối
- Thêm footer row trong bảng hiển thị tổng: Tổng thành viên, Tổng brands, Tổng nội dung, Tổng ảnh (tính từ filtered list)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaces.ts` | Thêm brand_count, content_count, image_count vào mỗi workspace |
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm 3 cột + footer tổng cộng |

Không cần migration — admin đã có RLS SELECT trên các bảng này.

