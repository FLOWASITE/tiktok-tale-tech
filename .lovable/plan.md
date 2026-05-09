## Chẩn đoán lại (anh nói GeminiGen còn nhiều credits → đúng)

Database `ai_function_configs` cho `generate-carousel-image`:
```
model_override: geminigen/imagen-4
```

Flow thực tế khi tạo carousel:
1. Function gọi GeminiGen với model `imagen-4` → **GeminiGen trả lỗi (KHÔNG phải 402)** — có thể là `400 INVALID_INPUT` (giống lỗi video Veo trước đây: tên model không nằm trong danh sách hợp lệ), hoặc timeout, hoặc lỗi shape response.
2. Code fallback sang **PoYo** (`poyo/nano-banana-2-new`).
3. PoYo trả `402 insufficient_credits` (PoYo mới là cái thật sự hết credits).
4. Code ráp message: **"Tất cả provider ảnh đã hết credits (GeminiGen/PoYo)"** → gây hiểu lầm rằng GeminiGen cũng hết credits.

→ Bug = (a) message gây hiểu lầm + (b) tên model GeminiGen có thể sai, và (c) PoYo thực sự hết credits.

## Việc cần làm

### 1. Sửa message gây hiểu lầm (`generate-carousel-image/index.ts` line 967-976)
Phân biệt rõ provider nào lỗi gì thay vì gộp chung "GeminiGen/PoYo":
- Nếu GeminiGen lỗi non-credits + PoYo 402 → "PoYo hết credits. GeminiGen lỗi: <chi tiết>" (status 200, errorCode `PROVIDER_ERROR` không phải `CREDITS_EXHAUSTED`).
- Chỉ trả `CREDITS_EXHAUSTED` khi GeminiGen cũng thật sự 402.
- Đồng thời log đầy đủ `lastGeminiGenErr` để debug nhanh hơn.

### 2. Verify tên model GeminiGen `imagen-4`
GeminiGen image API yêu cầu tên model chính xác. Theo memory/code comment thì hỗ trợ `nano-banana-pro`, `nano-banana-2`, `imagen-4`, nhưng API thực có thể đòi `imagen4` (no dash) hoặc tên khác. Cần:
- Bật log đầy đủ `errorText` ở `geminigen-image-generator.ts` line 92-93 (đã có sẵn — chỉ cần xem edge function logs sau khi tạo lại 1 carousel).
- Hoặc đổi tạm `model_override` sang `geminigen/nano-banana-pro` (chắc chắn hoạt động) và xác nhận carousel chạy được. Sau đó mới quay lại fix tên `imagen-4`.

### 3. Giải quyết PoYo hết credits
- Nạp credits PoYo (poyo.ai dashboard) — nó là provider chính được code gọi đầu tiên ở các trường hợp khác (sequential, kinetic).
- Hoặc disable PoYo branch và để hệ thống đi thẳng GeminiGen → Lovable Gateway fallback.

### 4. (Tùy chọn) Tạm chuyển default sang `geminigen/nano-banana-pro`
Update DB:
```sql
UPDATE ai_function_configs
SET model_override = 'geminigen/nano-banana-pro'
WHERE function_name = 'generate-carousel-image';
```
→ Xác nhận GeminiGen hoạt động trước, sau đó nghiên cứu cú pháp model `imagen-4` đúng.

## Đề xuất thứ tự

1. **Đổi tạm model về `geminigen/nano-banana-pro`** (1 query SQL) → tạo thử carousel ngay.
2. **Sửa message error** để tương lai không bị hiểu lầm provider nào hết credits.
3. **Nạp PoYo credits** (vẫn nên có để fallback).
4. Sau khi (1) hoạt động → research lại cú pháp đúng cho `imagen-4` rồi đổi lại nếu muốn.

## File sẽ sửa
- `supabase/functions/generate-carousel-image/index.ts` (logic phân biệt provider error)
- Migration SQL update `ai_function_configs.model_override`

Anh xác nhận em làm theo thứ tự trên (đổi sang nano-banana-pro + sửa message), hay muốn em giữ `imagen-4` và chỉ sửa message + log để debug tên model?
