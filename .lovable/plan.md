

# Cải thiện giao diện quản lý thành viên tổ chức

## Phân tích hiện trạng

Component `OrganizationMembersList.tsx` **đã có sẵn**:
- Tìm kiếm theo tên/email
- Lọc theo role (owner/admin/member/viewer)
- Hiển thị trạng thái online (qua `usePresence` + `MemberAvatar`)
- Thêm thành viên từng người (tạo mới hoặc mời)

**Thiếu**: Bulk invite (thêm nhiều thành viên cùng lúc)

## Thay đổi

### Sửa: `src/components/OrganizationMembersList.tsx`

**1. Thêm Bulk Invite tab** trong Dialog "Thêm thành viên":
- Tab thứ 3: "Thêm hàng loạt" với textarea nhập nhiều email (mỗi dòng 1 email)
- Chọn role chung cho tất cả
- Chọn password chung (mặc định `abc123`)
- Hiển thị progress khi đang tạo (ví dụ: "3/5 đã tạo")
- Hiển thị kết quả: thành công/thất bại cho từng email

**2. Cải thiện hiển thị online status**:
- Thêm filter "Đang hoạt động" bên cạnh filter role
- Hiển thị badge số lượng online/offline trong filter
- Sắp xếp: online users hiện trước offline users (tùy chọn)

**3. Cải thiện filter role**:
- Hiển thị số lượng thành viên cho mỗi role trong dropdown (ví dụ: "Thành viên (5)")
- Thêm filter chips phía trên danh sách để nhanh chóng lọc

### Sửa: `src/hooks/useOrganizationMembers.ts`

Thêm function `bulkCreateMembers`:
```typescript
const bulkCreateMembers = async (
  emails: string[], 
  role: OrgRole, 
  password: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: string[]; failed: { email: string; error: string }[] }>
```
- Gọi `create-org-member` edge function cho từng email tuần tự
- Callback progress sau mỗi lần tạo
- Trả về danh sách thành công/thất bại
- Gọi `fetchMembers()` một lần sau khi hoàn thành

### Scope
- **2 file sửa**: `OrganizationMembersList.tsx`, `useOrganizationMembers.ts`
- Không cần migration hay edge function mới (tái sử dụng `create-org-member`)

