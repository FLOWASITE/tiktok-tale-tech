

# Fix: Resize ảnh trong overlay-logo-canvas + Bỏ render URL trong publish-zalo

## Nguyên nhân
- `overlay-logo-canvas` encode output là **PNG** (dòng 196), file 2MB+
- `publish-zalo` chuyển sang `/render/image/public/` để resize (dòng 123-128), nhưng Zalo không tải được từ endpoint này → lỗi `-200`

## Thay đổi

### 1. `supabase/functions/overlay-logo-canvas/index.ts`

**Resize ảnh gốc xuống max 800px width trước khi composite** (dòng 146, trong `compositeImages`):
- Sau khi decode base image, nếu `baseImg.width > 800` → `baseImg.resize(800, auto)` giữ tỷ lệ
- Giữ nguyên nếu ảnh đã ≤ 800px

**Encode sang JPEG thay PNG** (dòng 196):
- Thay `baseImg.encode()` (PNG) bằng `baseImg.encodeJPEG(80)` (JPEG quality 80%)
- Output < 200KB thay vì 2MB

**Cập nhật upload path** (dòng 217):
- Đổi extension từ `.png` sang `.jpg`
- Đổi `contentType` từ `image/png` sang `image/jpeg`

### 2. `supabase/functions/publish-zalo/index.ts`

**Bỏ logic render URL** (dòng 120-128):
- Xóa toàn bộ block chuyển `/object/public/` → `/render/image/public/`
- Dùng `coverImageUrl` gốc trực tiếp làm `photo_url` cho Zalo
- Ảnh đã được resize sẵn ở bước overlay, không cần transform nữa

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/overlay-logo-canvas/index.ts` | Resize base image ≤800px, encode JPEG 80%, upload `.jpg` |
| `supabase/functions/publish-zalo/index.ts` | Bỏ render URL transform, dùng URL gốc |

