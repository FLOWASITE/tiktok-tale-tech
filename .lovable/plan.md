
## Nguyên nhân thật (đọc logs)

1. `generate-carousel-images-batch` bị **shutdown giữa chừng** (timestamp 22763, 22765) — trước khi xử lý xong slide 2. Lý do: code dùng `(Deno as any).serve?.context?.waitUntil` — **API này không tồn tại** trong Supabase Edge Runtime. Background promise không được giữ sống → Supabase free worker bất kỳ lúc nào sau khi response 200 trả về → slide 3..N không bao giờ chạy.
2. Slide 2 (img2img với `previousImage`) GeminiGen render lâu hơn slide 1 → poll 99s không đủ → attempt 1 fail. Attempt 2 mới chạy thì batch đã bị kill.
3. `generate-carousel-image` cũng bị shutdown ở giữa polling (22768) — cùng lý do.

→ Slide 1 may mắn xong trước khi shutdown; slide 2+ không bao giờ tới đích.

## Kế hoạch sửa

### 1. Dùng đúng API `EdgeRuntime.waitUntil` cho batch
File: `supabase/functions/generate-carousel-images-batch/index.ts`
- Thay block `(Deno as any).serve?.context?.waitUntil` (không tồn tại) bằng `EdgeRuntime.waitUntil(responsePromise)`.
- Đây là API chính thức Supabase Edge Runtime giữ background task sống tới khi promise resolve.
- `generate-carousel-image` đã dùng đúng pattern này cho mirror — copy y nguyên.

### 2. Nâng GeminiGen poll budget cho carousel slide phức tạp
File: `supabase/functions/generate-carousel-image/index.ts`
- Nâng `maxAttempts` từ 33 (99s) → **40 (120s)** cho GeminiGen call.
- Vẫn dưới 150s edge timeout.
- Slide có `previousImage` (img2img) cần thêm thời gian render.

### 3. Heartbeat update mỗi slide để chống "zombie"
File: `supabase/functions/generate-carousel-images-batch/index.ts`
- Trước khi vào mỗi slide, update `generation_tasks.updated_at = now()` → trigger `recover_stuck_generation_tasks` không kill nhầm.
- Đã có persist incremental progress, chỉ cần đảm bảo update đều.

### 4. Verify
- Tạo 1 carousel 5-7 slide.
- Đọc logs `generate-carousel-images-batch` xem có còn shutdown giữa chừng không.
- Đọc `generate-carousel-image` xem slide 2-N có ra ảnh không.

## Files đụng
- `supabase/functions/generate-carousel-images-batch/index.ts` — dùng `EdgeRuntime.waitUntil` đúng API + heartbeat
- `supabase/functions/generate-carousel-image/index.ts` — nâng GeminiGen `maxAttempts` lên 40

## Kết quả mong đợi
- Batch không còn bị Supabase kill giữa chừng → tất cả slide đều được xử lý tuần tự.
- GeminiGen có đủ thời gian render slide img2img phức tạp.
- Nếu vẫn fail, sẽ fail rõ ở provider chứ không phải "im lặng mất slide 2-N".
