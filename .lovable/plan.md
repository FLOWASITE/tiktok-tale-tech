

## Nguyên nhân (đọc logs cụ thể)

Logs slide 2 cho thấy chuỗi sự kiện:

```
t+0ms      [generate-carousel-image] Step 1: Generating background...
t+6s       [geminigen] Task submitted
t+7s..96s  Polling 32 attempts
t+121s     [geminigen] Image ready after 96s ✓ ẢNH ĐÃ TẠO XONG
t+122s     [generate-carousel-image] FAST PATH: using external URL directly
t+122s     [generate-carousel-image] Background uploaded (R2 URL)
t+122s     [describe] Failed status=402   ← Gemini Flash Lite hết credits
t+122s     [generate-carousel-image] Returning background image: https://...r2...
t+122.9s   [PERF][SLOW] status=200 durationMs=122952  ← Edge function ĐÃ TRẢ 200 OK
t+125s     shutdown
```

→ **GeminiGen tạo ảnh xong, edge function trả 200 OK với URL R2 trong 122.9s.**

Nhưng client log:
```
Error: Edge Function timed out after 150s
at invokeWithTimeout (src/lib/invokeEdgeFunctionWithTimeout.ts:85)
```

## Root cause

Mismatch timing **client ↔ edge**:
- Edge function cold-start mất ~6s trước khi log đầu tiên (Step 1).
- Tổng thời gian thực client phải chờ = cold-start + 122.9s ≈ **128-130s**.
- Nhưng `useImageGeneration.ts` set `timeoutMs: 150_000` — về lý thuyết đủ.
- **Vấn đề thật:** Có thể request bị retry/queue ở Supabase gateway, hoặc cold-start lần này lâu hơn (Lovable preview proxy + browser fetch overhead) → AbortController fire ở 150s **trước khi** response stream về tới client.

Đồng thời, có 1 vấn đề phụ làm chậm: dù `[describe] Failed 402` chỉ tốn ~400ms, mỗi slide vẫn chạy describe call sequential **sau khi** đã có ảnh — đẩy thêm độ trễ trước khi return.

## Hệ quả người dùng thấy

- GeminiGen dashboard: ảnh xong ✓
- R2 storage: ảnh đã upload ✓
- DB `carousel_images`: **KHÔNG có row** vì client throw timeout → không gọi `saveImage()` lưu vào DB
- Carousel viewer: trống

→ Ảnh "mồ côi" trên R2, DB không biết.

## Kế hoạch sửa

### 1. Skip describe call khi đã 402 (loại bỏ 400ms+ thừa)
File: `supabase/functions/generate-carousel-image/index.ts`
- Cache `describeFailed=true` ở module scope. Nếu đã fail 402 trong session, slide tiếp theo bỏ qua describe → trả response ngay → giảm tail latency ~500ms-1s.

### 2. Nâng client timeout lên 180s (buffer cho cold-start + proxy)
File: `src/hooks/useImageGeneration.ts`
- `timeoutMs: 150_000` → `180_000`.
- Edge runtime hard limit 150s nhưng client phải cộng thêm cold-start + network round-trip → cần buffer 30s.

### 3. Background-safe persistence: lưu DB ngay trong edge function
File: `supabase/functions/generate-carousel-image/index.ts`
- Sau khi có `imageUrl`, **insert vào `carousel_images` ngay trong edge function** (dùng service client) **trước khi** return response.
- Wrap bằng `EdgeRuntime.waitUntil()` để nếu client đã disconnect (timeout), edge vẫn hoàn tất ghi DB.
- Frontend đã có realtime subscription `carousel-card-images` → ảnh sẽ tự xuất hiện kể cả khi client báo timeout.

### 4. Frontend: handle timeout gracefully
File: `src/hooks/useImageGeneration.ts`
- Khi catch timeout error, **không hiện toast đỏ ngay**. Thay vào đó:
  - Hiện toast info: "Ảnh đang được hoàn tất ở nền, sẽ xuất hiện trong giây lát…"
  - Trigger `refetch()` của `useCarouselImages` sau 5-10s để pick up ảnh đã được edge function lưu background.

## Files đụng

- `supabase/functions/generate-carousel-image/index.ts` — skip describe khi 402, persist DB inline với `EdgeRuntime.waitUntil`
- `src/hooks/useImageGeneration.ts` — timeout 180s + graceful timeout handling với refetch trigger

## Kết quả mong đợi

- Ảnh GeminiGen tạo xong → **luôn được lưu DB** dù client timeout hay không.
- User thấy ảnh trong viewer trong vòng vài giây sau khi GeminiGen done, không cần reload.
- Không còn cảnh "ảnh có ở GeminiGen nhưng viewer trống".

