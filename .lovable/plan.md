

## Sửa lỗi: Không thể tạo Core Content

### Nguyên nhân

Phát hiện 2 vấn đề chính:

1. **CORS headers thiếu** - Edge function `generate-core-content` thiếu các headers `x-supabase-client-*` trong cấu hình CORS, khiến browser chặn request ở bước preflight.

2. **Thông báo lỗi sai** - Khi `organizationId` chưa có (chưa chọn tổ chức), hệ thống hiện "Vui lòng nhập chủ đề" thay vì thông báo đúng lỗi.

### Kế hoạch sửa

**File 1: `supabase/functions/generate-core-content/index.ts`**
- Cập nhật `corsHeaders` để bao gồm đầy đủ headers theo chuẩn:
  ```
  authorization, x-client-info, apikey, content-type,
  x-supabase-client-platform, x-supabase-client-platform-version,
  x-supabase-client-runtime, x-supabase-client-runtime-version
  ```

**File 2: `src/components/multichannel/MultiChannelFormWizard.tsx`**
- Tách riêng 2 điều kiện validation trong `handleGenerateCoreContent`:
  - Thiếu topic: "Vui lòng nhập chủ đề"
  - Thiếu organizationId: "Không tìm thấy tổ chức. Vui lòng chọn tổ chức trước."

### Chi tiết kỹ thuật

Thay đổi nhỏ, chỉ sửa 2 dòng CORS header và thêm 1 block validation. Không ảnh hưởng đến logic generation hay streaming.

