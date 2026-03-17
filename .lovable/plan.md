

# Thống kê sử dụng trong tháng theo User và Brand trong Workspace

## Tổng quan

Bổ sung 2 section mới vào trang Account, ngay dưới phần "Sử dụng trong tháng" hiện tại:
1. **Theo thành viên** — hiển thị số bài Social + ảnh AI mỗi user đã tạo trong tháng
2. **Theo Brand** — hiển thị số bài Social + ảnh AI theo từng brand template

## Dữ liệu

Truy vấn bảng `multi_channel_contents` với filter `organization_id` = workspace hiện tại + khoảng thời gian chu kỳ hiện tại. Group by `user_id` và `brand_template_id`.

Với ảnh AI: truy vấn `channel_image_history` qua content_ids đã lấy.

Với tên user: join hoặc lookup riêng từ bảng `profiles` (id, full_name, email, avatar_url).

Với tên brand: lookup từ `brand_templates` (id, name, logo_url).

## Thay đổi

### 1. `src/pages/Account.tsx`

- Import `useOrganizationContext` để lấy `currentOrganization`
- Import `useCurrentBrand` để lấy danh sách brands
- Thêm 1 `useQuery` mới: `workspace_usage_stats` — fetch `multi_channel_contents` grouped by `user_id` và `brand_template_id` trong chu kỳ hiện tại, kèm lookup profiles và brands
- Thêm 2 Card/Section mới sau card "Sử dụng trong tháng":

**Section "Theo thành viên":**
```
Avatar | Tên (email) | Bài Social: X | Ảnh AI: Y
```

**Section "Theo Brand":**  
```
Logo | Tên Brand | Bài Social: X | Ảnh AI: Y
```

- Chỉ hiện khi `currentOrganization` tồn tại (workspace mode)
- Hiển thị dạng bảng/list compact, sort theo số lượng giảm dần

### 2. Không cần migration

Tất cả dữ liệu đã có sẵn trong `multi_channel_contents` (user_id, brand_template_id, selected_channels, organization_id) và `channel_image_history` (content_id, channel). Chỉ cần query client-side.

## Kỹ thuật

- Query `multi_channel_contents` với `.select('user_id, brand_template_id, selected_channels')` filter by `organization_id` + period → group client-side
- Query `channel_image_history` via content_ids → group by user/brand qua content lookup
- Lookup `profiles` cho tên + avatar, `brand_templates` cho name + logo
- ~80 dòng code mới trong Account.tsx

