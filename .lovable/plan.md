

# Fix: Tài khoản mới tự tạo workspace riêng khi được admin thêm vào org

## Nguyên nhân

Trigger `handle_new_user` trên bảng `auth.users` tự động tạo một workspace mặc định cho **mọi** user mới. Khi admin tạo tài khoản qua `create-org-member` hoặc `admin-manage-user`, trigger vẫn chạy → user có 2 workspace (1 tự tạo + 1 được thêm vào).

## Giải pháp

### 1. Sửa trigger `handle_new_user` (Migration)

Thêm kiểm tra `user_metadata` cho flag `skip_default_org`. Nếu có flag này, bỏ qua bước tạo organization mặc định:

```sql
-- Chỉ tạo org mặc định nếu KHÔNG có flag skip
IF NOT COALESCE((NEW.raw_user_meta_data->>'skip_default_org')::boolean, false) THEN
  -- tạo org + membership như cũ
END IF;
```

### 2. Sửa Edge Functions (2 files)

- **`create-org-member/index.ts`**: Thêm `skip_default_org: true` vào `user_metadata` khi gọi `createUser`
- **`admin-manage-user/index.ts`**: Khi có `organization_ids`, thêm `skip_default_org: true` vào `user_metadata`. Khi không chọn org nào thì giữ hành vi cũ (tạo workspace mặc định).

### 3. Dọn dữ liệu cũ (Data update)

Xóa các workspace mặc định thừa của user đã bị tạo sai trước đó (nếu cần, thực hiện thủ công sau).

### Scope
- **1 migration**: cập nhật function `handle_new_user`
- **2 edge functions**: `create-org-member/index.ts`, `admin-manage-user/index.ts`

