

# Thêm chi tiết cho Brands và Đóng góp

## Thay đổi

### 1. Hook `useAdminWorkspaceDetail.ts`
- Mở rộng `WorkspaceBrand` thêm `content_count`, `image_count`, `created_at`
- Trong `brandsQuery`: sau khi fetch brands, query thêm `multi_channel_contents` group by `brand_template_id` và `channel_image_history` qua join để đếm số bài viết + ảnh AI cho mỗi brand
- Mở rộng `MemberContribution` thêm `carouselCount`, `scriptCount`
- Trong `contributionsQuery`: query thêm `carousels` và `scripts` group by `user_id` để có thêm số carousel và script cho mỗi member

### 2. Component `AdminWorkspacesTab.tsx`

**Brands section** — mỗi brand hiển thị thêm:
- Số bài viết (icon FileText + count)  
- Số ảnh AI (icon Wand2 + count)
- Ngày tạo nhỏ bên dưới industry

**Đóng góp section** — mỗi member hiển thị thêm:
- Số carousel (icon mới)
- Số script (icon mới)
- Tổng cộng 4 chỉ số: Bài viết, Ảnh AI, Carousel, Script

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaceDetail.ts` | Thêm stats per brand + thêm carousel/script per member |
| `src/components/admin/AdminWorkspacesTab.tsx` | Hiển thị stats cho mỗi brand row + thêm cột carousel/script trong đóng góp |

