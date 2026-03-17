

# Vấn đề: "User ẩn danh" trong Gallery workspace Kiểm Toán TAF

## Nguyên nhân gốc

User `c618b2dc` (flowasite@gmail.com - tài khoản Global Admin) đã tạo **12 ảnh** trong workspace "CÔNG TY TNHH TƯ VẤN KIỂM TOÁN TAF" nhưng **không phải là thành viên** của workspace đó. Admin truy cập workspace nhờ RLS policy đặc biệt (`has_role`), không cần membership.

Kết quả:
- `created_by = c618b2dc` → profile lookup lấy được tên "Võ Duy" + email `flowasite@gmail.com`
- Nhưng khi hiển thị trên Gallery, user này xuất hiện như người ngoài (không thuộc org), gây nhầm lẫn "ẩn danh"

Dữ liệu xác nhận:
- Workspace TAF có 6 thành viên: duy@gmail.com (owner), voduy@gmail.com, tuongvi@gmail.com, nguyendiem@gmail.com, nguyennhi@gmail.com, lanvien@gmail.com
- Tài khoản flowasite@gmail.com **không có trong danh sách thành viên** nhưng tạo 12 ảnh qua quyền admin

## Giải pháp

### 1. Gallery hiển thị rõ ràng cho creator không thuộc org
- Khi `createdByName` có giá trị nhưng user không phải thành viên org → hiển thị tên kèm badge "(Admin)" hoặc icon đặc biệt
- Trong creator filter dropdown, nhóm riêng các creator ngoài org

### 2. Thêm thông tin membership vào GalleryImage
- Fetch danh sách `organization_members` của org hiện tại
- So sánh `created_by` với danh sách members → đánh dấu `isOrgMember: boolean`
- Creator ngoài org hiển thị: tên + "(Quản trị viên)" thay vì ẩn danh

| File | Thay đổi |
|------|----------|
| `src/hooks/useCarouselGallery.ts` | Fetch org members, thêm field `isOrgMember` vào GalleryImage, hiển thị "(QTV)" cho non-members |
| `src/components/carousel/CarouselGalleryView.tsx` | Hiển thị badge/label phân biệt creator ngoài org |

