

## Fix: Test Facebook không cập nhật "Đã xác thực"

### Nguyên nhân
Edge function `test-facebook-connection/index.ts` khi test thành công chỉ update `is_active`, `platform_username`, và `metadata` — nhưng **không update `last_verified_at`**.

Frontend (`BrandViewConnectionsTab.tsx`) kiểm tra `connection.last_verified_at` để hiển thị badge "Đã xác thực" (xanh lá) thay vì "Đã kết nối" (xanh dương). Vì `last_verified_at` luôn là `null` nên badge không bao giờ chuyển sang "Đã xác thực".

### Thay đổi

**File: `supabase/functions/test-facebook-connection/index.ts` (line ~171)**

Thêm `last_verified_at: new Date().toISOString()` vào câu lệnh update khi test thành công (cùng chỗ đang update `is_active: true`).

Một dòng duy nhất cần thêm, không thay đổi logic khác.

