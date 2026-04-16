

## Mở rộng UI chỉnh sửa Brand

**Vấn đề**: Trang Brand View (`/brands/:id`) bị giới hạn bởi `max-w-4xl` (~896px), quá hẹp trên màn hình lớn (1728px).

**Giải pháp**: Thay `max-w-4xl` thành `max-w-6xl` (~1152px) trong `src/pages/BrandView.tsx` dòng 175.

### Thay đổi

**File**: `src/pages/BrandView.tsx` (dòng 175)
- `max-w-4xl` → `max-w-6xl`

Chỉ 1 dòng thay đổi.

