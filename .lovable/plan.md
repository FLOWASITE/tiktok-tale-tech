

# Fix: Ảnh AI không thống kê được cho duy@gmail.com

## Nguyên nhân gốc

Bảng `channel_image_history` có RLS policy SELECT yêu cầu `is_org_member(auth.uid(), organization_id)`. Tuy nhiên, **100% ảnh (41 bản ghi) có `organization_id = NULL`**, khiến RLS luôn chặn — user không đọc được ảnh của mình.

## Giải pháp

### 1. Backfill `organization_id` cho dữ liệu cũ (Data update)
```sql
UPDATE channel_image_history h
SET organization_id = m.organization_id
FROM multi_channel_contents m
WHERE h.content_id = m.id AND h.organization_id IS NULL;
```

### 2. Edge Functions: Set `organization_id` khi insert
- `generate-brand-image/index.ts` và `_shared/tool-executor.ts`: thêm `organization_id` khi insert vào `channel_image_history` (lấy từ `multi_channel_contents` record hoặc request context).

### 3. Scope
- **1 data update** (backfill organization_id)
- **2 edge function files** (đảm bảo insert tương lai có organization_id)

