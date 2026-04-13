

## Hỗ trợ kết nối nhiều Website cho 1 Brand

### Hiện trạng
- Edge function `connect-website/index.ts` (line 155-167): query `maybeSingle()` tìm connection theo `brand_template_id` + `platform = 'website'`. Nếu đã có → update, không tạo mới.
- Frontend: nút "Kết nối" website luôn mở form tạo mới, nhưng backend ghi đè connection cũ.
- Kết quả: mỗi brand chỉ có tối đa 1 website.

### Thay đổi

**1. Edge function `supabase/functions/connect-website/index.ts` (line 155-167)**
- Thay đổi logic tìm existing connection: thêm điều kiện `integration_type` vào query, hoặc bỏ hẳn logic "tìm & ghi đè" → luôn insert mới.
- Cụ thể: query existing connection thêm filter theo `platform_user_id` (domain) để chỉ ghi đè khi cùng domain, khác domain thì tạo mới.

```text
Trước:  WHERE brand_template_id = X AND platform = 'website'  → 1 kết quả → ghi đè
Sau:    WHERE brand_template_id = X AND platform = 'website' AND platform_user_id = domain → chỉ ghi đè cùng domain
```

**2. Frontend `src/components/brand/BrandViewConnectionsTab.tsx`**
- Hiện danh sách nhiều website connections (không chỉ 1).
- Mỗi connection hiển thị riêng với domain, loại tích hợp (WordPress/NukeViet/...), nút test/xóa.
- Nút "Thêm website" luôn hiển thị (không ẩn khi đã có 1 connection).

### Kết quả
- 1 brand có thể kết nối nhiều website khác nhau (vd: 1 WordPress + 1 NukeViet).
- Cùng domain thì ghi đè (cập nhật credentials), khác domain thì tạo mới.

