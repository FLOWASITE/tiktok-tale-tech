
## Giả thuyết người dùng
"GeminiGen đã tạo ra ảnh rồi, nhưng hệ thống không kịp xử lý/đưa ảnh vào DB → fail"

## Kiểm chứng

Đọc lại flow `generate-carousel-image` + `_shared/geminigen-image-generator.ts` để xem sau khi GeminiGen trả URL R2, hệ thống làm gì:

1. Poll GeminiGen status mỗi 3s.
2. Khi status = done → lấy `imageUrl` (R2 cloudflarestorage signed URL).
3. Trả về cho `generate-carousel-image`.
4. `generate-carousel-image` upload R2 URL → Supabase Storage (`carousel-images` bucket) bằng fetch + putObject.
5. Insert row vào `carousel_images` với URL Supabase.

→ **Có 2 điểm có thể fail SAU khi GeminiGen đã có ảnh:**

### Điểm fail A: Download R2 URL bị timeout
- R2 signed URL hết hạn rất nhanh hoặc edge function không reach được R2.
- Nếu fetch R2 mất 20-30s × 7 slide = tốn thêm 150s+ → đụng trần edge timeout dù GeminiGen đã xong.

### Điểm fail B: Upload Supabase Storage chậm
- Bucket `carousel-images` upload qua REST có thể chậm khi file >2MB.
- Nếu fail → throw error → toàn bộ slide mất, dù ảnh GeminiGen đã sẵn sàng.

### Điểm fail C (nghi ngờ chính): Không persist URL R2 trực tiếp
- `generate-brand-image` (đa kênh) **trả thẳng R2 URL về frontend** (xem console log: `mediaUrls` chứa link `cloudflarestorage.com`) → không cần re-upload → nhanh + không fail.
- `generate-carousel-image` cố **download R2 → upload Supabase Storage** → tốn thời gian + có điểm fail.

→ Đây có thể là **lý do thực sự** carousel fail trong khi đa kênh OK, ngoài chuyện poll budget đã fix.

## Kế hoạch sửa

### 1. Bỏ bước re-upload Supabase Storage cho carousel
- Trong `generate-carousel-image/index.ts`, sau khi GeminiGen trả `externalImageUrl` (R2 link), **lưu thẳng URL R2 vào `carousel_images.image_url`** giống như đa kênh đang làm.
- Bỏ block `fetch(R2) → uploadToStorage()` đang gây timeout/fail.
- R2 signed URL có expires=604800 (7 ngày), đủ cho preview + publish ngay.

### 2. Optional: Background mirror sang Supabase Storage
- Nếu cần persist >7 ngày, dùng `EdgeRuntime.waitUntil()` mirror R2 → Supabase Storage **sau khi đã trả response** cho client.
- Frontend không cần đợi.
- Nếu mirror fail cũng không break user flow.

### 3. Thêm log rõ ràng từng bước
- Log timing: `geminigen_done_at`, `r2_fetch_start`, `storage_upload_start`, `db_insert_start`.
- Để lần sau debug được chính xác bottleneck nằm đâu.

### 4. Verify với logs
- Sau fix, chạy 1 carousel 5-7 slide, đọc log `generate-carousel-image` + `generate-carousel-images-batch` xem có còn timeout sau khi GeminiGen done không.

## Files đụng
- `supabase/functions/generate-carousel-image/index.ts` — bỏ re-upload, dùng thẳng R2 URL + thêm timing log
- (Optional) `supabase/functions/generate-carousel-image/index.ts` — thêm `EdgeRuntime.waitUntil` mirror background

## Kết quả mong đợi
- Carousel hoạt động giống đa kênh: GeminiGen done → URL R2 lưu thẳng vào DB → frontend nhận trong vài giây.
- Loại bỏ điểm fail "ảnh đã tạo nhưng không vào được hệ thống" mà bạn vừa chỉ ra.
- Nếu vẫn fail sau fix, log timing sẽ chỉ ra chính xác bước nào nghẽn.
