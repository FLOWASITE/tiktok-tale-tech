

# Fix: Ảnh tạo xong trên PoYo nhưng app không cập nhật

## Nguyên nhân gốc

PoYo.ai tạo ảnh thành công nhưng **polling timeout trước khi ảnh sẵn sàng**.

Từ edge function logs: slide 1 hoàn thành ở **attempt 20/20** (đúng giây cuối cùng - 60s). Nếu bất kỳ slide nào mất >60s, polling sẽ timeout → edge function trả về lỗi → tracker đánh dấu slide thất bại. Trong khi đó, task trên PoYo vẫn chạy tiếp và hoàn thành → ảnh có trên PoYo web nhưng app không nhận được.

**Cấu hình hiện tại:**
- Polling: 20 attempts × 3s = **60s** (quá ngắn)
- Edge function wall clock: ~150s
- Client timeout (`invokeWithTimeout`): 150s

## Giải pháp

### File 1: `supabase/functions/_shared/poyo-image-generator.ts`
- Tăng `maxAttempts` từ 20 → **35** (35 × 3s = 105s)
- Vẫn nằm trong giới hạn edge function (105s polling + ~30s xử lý upload/overlay = ~135s < 150s)
- Cập nhật comment cho phù hợp

### File 2: `src/lib/invokeEdgeFunctionWithTimeout.ts`
- Tăng timeout mặc định từ 120s → 150s (đã đúng rồi, chỉ cần kiểm tra)
- Kiểm tra `useImageGeneration.ts` đã đặt `timeoutMs: 150_000` (đã đúng)

Thay đổi nhỏ, chỉ 1 dòng code chính: `maxAttempts = 35` thay vì `20`.

