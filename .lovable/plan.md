

## Hỗ trợ kết nối nhiều Fanpage Facebook cho 1 Brand

### Hiện trạng
- `facebook-oauth-callback/index.ts` (line 210-221): query `maybeSingle()` tìm connection theo `brand_template_id` + `platform = 'facebook'`. Nếu đã có → update, không tạo mới.
- Kết quả: mỗi brand chỉ có tối đa 1 Fanpage Facebook.

### Thay đổi

**1. Edge function `supabase/functions/facebook-oauth-callback/index.ts` (line 210-221)**
- Thêm filter theo `platform_user_id` (Page ID) vào query tìm existing connection.
- Cùng Page ID → ghi đè (cập nhật token). Khác Page ID → tạo mới.

```text
Trước:  WHERE brand_template_id = X AND platform = 'facebook'  → ghi đè
Sau:    WHERE brand_template_id = X AND platform = 'facebook' AND platform_user_id = pageId → chỉ ghi đè cùng Page
```

**2. Frontend `src/components/brand/BrandViewConnectionsTab.tsx`**
- Áp dụng pattern tương tự website: hiển thị danh sách nhiều Facebook connections thay vì chỉ 1.
- Mỗi connection hiển thị tên Page, avatar, nút test/xóa.
- Nút "Kết nối thêm Fanpage" luôn hiển thị.

### Kết quả
- 1 brand có thể kết nối nhiều Fanpage khác nhau.
- Cùng Page thì ghi đè (cập nhật token), khác Page thì tạo mới.

