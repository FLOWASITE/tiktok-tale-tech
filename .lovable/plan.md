# Đăng ký Palette Extractor vào AI Model Management

## Vấn đề
Trong `generate-carousel-images-batch/index.ts` (lines 354-405), bước extract 5 hex màu chủ đạo từ slide 1 đang:
- Hardcode `model: 'google/gemini-2.5-flash-lite'`
- `fetch` trực tiếp `ai.gateway.lovable.dev` (bypass `callAI()`)
- Không có entry trong `ai_function_configs` → admin không override được
- Không log `saveMetrics()` → cost ~$0.0001/carousel "vô hình" trong dashboard

Cùng lúc, function `validate-seamless-consistency` cũng chưa có config row (cần check tương tự).

## Thay đổi

### 1. Tách helper `extractLockedPalette()` mới
Tạo function name riêng để admin config độc lập:
- **Function name**: `extract-carousel-palette` (sub-function của batch, đăng ký như virtual function)
- Dùng `getAIConfig('extract-carousel-palette', organizationId)` lấy model + temperature + max_tokens
- Gọi qua `callAI()` từ `_shared/ai-provider.ts` với multimodal payload (image_url + text)
- Default model: `google/gemini-2.5-flash-lite` (giữ nguyên, rẻ + nhanh)
- Log qua `saveMetrics({ traceId, function: 'extract-carousel-palette', model, cost, latency })`
- Giữ nguyên timeout 12s + try/catch non-fatal (palette là optional, fail thì skip lock)

### 2. Migration: seed row mặc định
```sql
INSERT INTO ai_function_configs (function_name, model_override, max_tokens, temperature, is_enabled, priority_level)
VALUES 
  ('extract-carousel-palette', 'google/gemini-2.5-flash-lite', 120, 0.0, true, 1),
  ('validate-seamless-consistency', NULL, NULL, NULL, true, 2)
ON CONFLICT DO NOTHING;
```
(NULL `model_override` cho validate = dùng default từ code; chỉ tạo row để admin thấy + override được sau.)

### 3. Đảm bảo `callAI()` hỗ trợ multimodal
Verify `_shared/ai-provider.ts` accept `messages: [{ role, content: [{type:'image_url',...}, {type:'text',...}] }]`. Nếu chưa, thêm pass-through (Gemini Flash Lite qua Lovable Gateway support sẵn).

### 4. UI Admin (không đổi)
`/admin/ai-models` đã list từ `ai_function_configs` → row mới sẽ tự xuất hiện, không cần code FE.

## Files
- `supabase/functions/generate-carousel-images-batch/index.ts` — replace inline fetch bằng `extractLockedPalette()` helper
- `supabase/functions/_shared/ai-provider.ts` — verify/extend multimodal support nếu cần
- `supabase/migrations/<new>.sql` — seed 2 rows

## Không làm
- Không đổi logic palette (vẫn 5 hex, ≥3 mới lock, lưu `carousels.locked_palette`)
- Không đổi default model (Flash Lite vẫn là lựa chọn đúng cho task này)
- Không đụng `validate-seamless-consistency` code — chỉ seed config row
