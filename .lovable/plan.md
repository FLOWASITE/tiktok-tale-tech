

## Nguyên nhân (đọc logs)

Logs slide 2 cho thấy lỗi rõ ràng:

```
[generate-carousel-image] Unexpected error: ReferenceError: GEMINIGEN_MAX_RETRIES is not defined
    at generate-carousel-image/index.ts:1047:75
[batch] Slide 2 attempt 1 failed: HTTP 500: {"error":"GEMINIGEN_MAX_RETRIES is not defined"}
[batch] Slide 2 attempt 2/2 (prevImage=yes)
```

Đồng thời slide 1 đã thành công nhưng:
```
[generate-carousel-image] DB persist failed: duplicate key value violates unique constraint "carousel_images_carousel_id_slide_number_version_key"
```

## Root cause (2 bug riêng biệt)

### Bug 1: `GEMINIGEN_MAX_RETRIES is not defined` (line 1047)
Lần sửa trước đã **xóa biến `GEMINIGEN_MAX_RETRIES`** khỏi code retry-loop của GeminiGen, nhưng còn 1 chỗ khác (line 1047) vẫn tham chiếu biến này → ReferenceError → edge function trả 500 → batch coi slide 2 fail → retry attempt 2.

→ **Đây không phải "tạo lại từ đầu"** — batch chỉ retry slide 2 thôi (đúng logic). Nhưng vì mỗi attempt GeminiGen vẫn submit task → user thấy ảnh xuất hiện trong GeminiGen dashboard nhiều lần cho cùng 1 slide.

### Bug 2: Duplicate key violation khi persist slide 1
Trigger DB `auto_increment_carousel_image_version` tự bump version dựa trên MAX(version) hiện có. Nhưng nếu có **2 INSERT đồng thời** (race condition giữa main edge persist + mirror persist), cả 2 cùng tính ra version=N → 1 thành công, 1 violate unique constraint `(carousel_id, slide_number, version)`.

→ Slide 1 may mắn — main persist fail nhưng mirror persist thành công (hoặc ngược lại) → DB vẫn có row → user vẫn thấy ảnh. Nhưng nếu cả 2 cùng fail thì mất ảnh.

## Hệ quả user thấy

- Slide 2 fail liên tiếp → batch retry → mỗi retry tạo thêm 1 task ở GeminiGen → "ảnh được tạo ra quá nhiều" trên dashboard provider.
- Slide 1 đôi khi có 2 row trong DB (nếu race không trùng version), đôi khi có warning duplicate.
- Toàn bộ quá trình kéo dài vô ích vì lỗi ReferenceError chặn slide 2 vĩnh viễn.

## Kế hoạch sửa

### Fix 1: Xóa tham chiếu `GEMINIGEN_MAX_RETRIES` còn sót
File: `supabase/functions/generate-carousel-image/index.ts` (line ~1047)
- Tìm chỗ vẫn dùng `GEMINIGEN_MAX_RETRIES` → thay bằng giá trị literal `1` (đã quyết định không retry trong cùng edge function nữa, để batch handle retry ở tầng trên).

### Fix 2: Loại bỏ double-persist (main + mirror cùng insert)
File: `supabase/functions/generate-carousel-image/index.ts`
- Chọn **1 nguồn truth duy nhất**: main edge persist là chính, **mirror chỉ UPDATE** `image_url` của row đã insert (không INSERT mới).
- Hoặc: nếu mirror chạy trong `EdgeRuntime.waitUntil` background, thì main persist phải bỏ — chỉ mirror persist. Cần đọc code chính xác để chọn approach.

### Fix 3: Reduce batch attempts từ 2 xuống 1 cho lỗi non-retryable
File: `supabase/functions/generate-carousel-images-batch/index.ts`
- Khi attempt 1 fail với lỗi `ReferenceError`, `TypeError`, hoặc HTTP 5xx có message "is not defined" → **không retry** (đây là code bug, retry vô ích).
- Chỉ retry với lỗi network/timeout/429.

## Files đụng

- `supabase/functions/generate-carousel-image/index.ts` — fix ReferenceError + dedupe persist
- `supabase/functions/generate-carousel-images-batch/index.ts` — smart retry logic

## Kết quả mong đợi

- Slide 2 không còn fail vì ReferenceError → tạo thành công lần đầu.
- GeminiGen dashboard chỉ thấy đúng N task cho N slide (không +retry waste).
- DB không còn warning duplicate key — mỗi slide chỉ 1 row.
- Nếu có lỗi thật, batch fail nhanh thay vì retry mù quáng tạo task thừa.

