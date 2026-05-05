## Mục tiêu
Tắt hoàn toàn pipeline "canvas text overlay" (Satori/Resvg) để không bao giờ ghép chữ lên ảnh ở backend nữa. Mọi text trong ảnh sẽ chỉ do AI render trực tiếp (text-in-prompt).

## Thay đổi

### 1. Frontend — chặn mọi call tới `overlay-text-canvas`
**`src/hooks/useAutoImageGeneration.ts`**
- Force `shouldFallbackText = false` và `finalStructuredOverlay = undefined` (hoặc bỏ qua 2 nhánh `if`).
- Step 3 và Step 4 luôn log `SKIPPED — canvas overlay disabled`, không invoke edge function.

**`src/hooks/useSocialImageGeneration.ts`** (line 293)
- Bỏ qua block gọi `overlay-text-canvas`, giữ ảnh AI gốc.

### 2. Edge function — kill-switch ở server
**`supabase/functions/overlay-text-canvas/index.ts`**
- Ngay đầu `Deno.serve` trả về `200 { success: false, disabled: true, error: 'overlay-text-canvas đã bị vô hiệu hoá', imageUrl: baseImageUrl }` để mọi caller cũ (nếu có) tự fallback về ảnh gốc, không tốn CPU/Resvg.

### 3. Carousel
**`supabase/functions/generate-carousel-image/index.ts`** đã không gọi function này (chỉ comment ghi chú) → không sửa.

### 4. Registry & docs
**`src/data/edgeFunctionRegistry.ts`** (line 104) — đánh dấu function là `deprecated` trong description: `'[DISABLED] Canvas text overlay đã tắt'`.

## Không làm
- Không xoá file edge function (giữ để tránh break import/log lịch sử, kill-switch là đủ).
- Không sửa migration, không đụng DB.
- Không sửa `trustedTextBakingModels.ts` (chỉ là metadata).

## Kết quả
- Không còn ảnh nào bị canvas overlay text.
- Mọi nhánh fallback text/structured đều skip, ảnh trả về = ảnh AI gốc.
- Edge function `overlay-text-canvas` còn tồn tại nhưng trả về no-op an toàn.
