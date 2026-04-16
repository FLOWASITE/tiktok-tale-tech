

## Fix: 404 khi click social icon chưa kết nối

### Nguyên nhân
`DirectPublishButton` navigate tới `/settings?tab=social` khi platform chưa kết nối — nhưng route `/settings` không tồn tại trong `src/app/routes.tsx`. Route đúng là `/connections`.

Tương tự, `GoogleBusinessCallback.tsx` navigate tới `/settings/connections` — cũng không tồn tại.

### Cách sửa

**File: `src/components/social/DirectPublishButton.tsx`**
- Đổi `navigate('/settings?tab=social')` → `navigate('/connections')` (2 chỗ: line 294 và line 319)

**File: `src/pages/GoogleBusinessCallback.tsx`**
- Đổi `navigate('/settings/connections')` → `navigate('/connections')` (2 chỗ: line 41 và line 76)

### Kết quả
- Click icon social chưa kết nối → chuyển đến trang Connections thay vì 404

