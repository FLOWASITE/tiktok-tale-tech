

# Sửa lỗi: Ảnh AI không thống kê được

## Nguyên nhân

Bảng `channel_image_history` có cột `created_by` nhưng **100% bản ghi đều NULL** (183 ảnh). Cả 2 nơi insert (`generate-brand-image` và `tool-executor`) đều không set `created_by`. Query thống kê dùng `.eq("created_by", user.id)` nên luôn trả về 0.

## Giải pháp

### 1. Frontend: Thay đổi cách query ảnh (`useSubscription.ts` + `Account.tsx`)

Thay vì filter bằng `created_by`, join qua bảng `multi_channel_contents` để lấy ảnh theo `user_id`:
- Query `channel_image_history` với filter `content_id` thuộc danh sách content của user
- Hoặc đơn giản hơn: đếm ảnh qua subquery lọc `content_id IN (select id from multi_channel_contents where user_id = ...)`

Vì Supabase JS client không hỗ trợ subquery trực tiếp, cách tốt nhất là:
- Query `multi_channel_contents` lấy danh sách `id` của user trong period
- Dùng danh sách đó filter `channel_image_history.content_id.in(ids)`

### 2. Edge Functions: Thêm `created_by` vào insert

- `generate-brand-image/index.ts`: thêm `created_by` từ user context khi insert
- `_shared/tool-executor.ts`: thêm `created_by` từ context

### 3. Migration: Backfill `created_by` từ dữ liệu hiện có

```sql
UPDATE channel_image_history h
SET created_by = m.user_id
FROM multi_channel_contents m
WHERE h.content_id = m.id AND h.created_by IS NULL;
```

### Scope
- **3 files code**: `useSubscription.ts`, `Account.tsx`, `generate-brand-image/index.ts`, `tool-executor.ts`
- **1 migration**: backfill `created_by`

