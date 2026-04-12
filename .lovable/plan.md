

# Fix: Thêm 'website' vào check constraint của social_connections

## Nguyên nhân lỗi

Bảng `social_connections` có check constraint chỉ cho phép các platform: twitter, facebook, instagram, linkedin, tiktok, threads, youtube, zalo_oa, google_business. **Không có 'website'**, nên insert bị reject.

## Giải pháp

### 1. Migration — Cập nhật check constraint

```sql
ALTER TABLE social_connections DROP CONSTRAINT social_connections_platform_check;
ALTER TABLE social_connections ADD CONSTRAINT social_connections_platform_check 
  CHECK (platform = ANY (ARRAY['twitter','facebook','instagram','linkedin','tiktok','threads','youtube','zalo_oa','google_business','website']));
```

### 2. Fix connect-website — Xử lý flowa_blog

Trong `connect-website/index.ts`, khi `integrationType === 'flowa_blog'`, field `access_token` đang set `'manual'` nhưng có thể cần đảm bảo không bị null constraint. Kiểm tra và đảm bảo data hợp lệ.

## Files thay đổi
- **Migration**: Cập nhật check constraint thêm `'website'`
- Không cần sửa code — logic đã đúng, chỉ thiếu constraint value

