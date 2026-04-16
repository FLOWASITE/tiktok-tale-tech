

## Phân tích lỗi `file_format_check_failed`

**Nguyên nhân gốc**: Ảnh carousel được lưu dưới dạng **PNG** trong Supabase Storage. TikTok Photo API chỉ chấp nhận **JPEG** và **WebP**. Việc thay hostname hay dùng Supabase Image Transformation qua proxy đều không giải quyết được vì ảnh vẫn là PNG.

**Giải pháp đã có sẵn**: `publish-zalo` đã dùng thư viện `imagescript` để convert PNG→JPEG trước khi đăng. Áp dụng pattern tương tự cho `publish-tiktok`.

## Kế hoạch sửa

### File: `supabase/functions/publish-tiktok/index.ts`

1. **Import `imagescript`** — thêm `import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";` (dòng 1)

2. **Thêm hàm `convertImagesToJpeg()`** — download từng ảnh, kiểm tra nếu là PNG thì convert sang JPEG (quality 85), upload lại vào `carousel-images/social/tiktok-optimized/`, trả về URL mới. Nếu đã là JPEG/WebP thì giữ nguyên.

3. **Gọi `convertImagesToJpeg()` trong `publishPhotoPost()`** — trước khi rewrite URL và preflight, convert tất cả ảnh sang JPEG trước:
   ```
   // Trước dòng 295 (rewrite URLs)
   const jpegUrls = await convertImagesToJpeg(imageUrls);
   const rewrittenUrls = jpegUrls.map(rewriteImageUrlForTikTok);
   ```

### Logic convert chi tiết
- Fetch ảnh gốc từ Supabase Storage
- Kiểm tra Content-Type hoặc extension: nếu `image/png` hoặc `.png` → decode bằng `Image.decode()` → `encodeJPEG(85)`
- Upload file JPEG mới vào `carousel-images/social/tiktok-optimized/{timestamp}-{uuid}.jpg`
- Trả về public URL mới
- Nếu convert/upload fail → giữ URL gốc (graceful fallback)

### Không thay đổi
- Logic rewrite hostname (`media.flowa.one`) giữ nguyên
- Logic preflight và fallback giữ nguyên
- Các file khác không bị ảnh hưởng

