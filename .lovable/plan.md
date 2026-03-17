

# Sửa Brand Selector trong Tạo Nội dung Đa kênh

## Vấn đề

Trong database có **2 bản ghi trùng** tên "Công ty Kế toán TAF" cùng thuộc organization `f28873d2`:
- `188f65cc` — "Công ty Kế toán TAF"
- `75a2db5a` — "Công ty Kế toán TAF"

Điều này khiến dropdown brand hiển thị 2 mục giống nhau.

## Giải pháp

### 1. Xóa bản ghi brand trùng lặp (Migration)
- Giữ lại 1 bản ghi (`188f65cc` — tạo trước), xóa bản ghi thừa (`75a2db5a`)
- Cập nhật các bảng liên quan (nếu có FK reference tới brand bị xóa) để trỏ về brand được giữ lại

### 2. Cải thiện query trong `useBrandTemplates.ts`
- Khi có `currentOrganization`, chỉ lọc theo `organization_id` thay vì dùng `.or(user_id, organization_id)` — tránh hiển thị brand cá nhân lẫn brand tổ chức gây nhầm lẫn
- Brand trong workspace nên chỉ hiển thị brand thuộc organization đó

### Scope
- 1 migration: xóa brand trùng, migrate references
- 1 file sửa: `src/hooks/useBrandTemplates.ts` — cải thiện filter query

