# Bổ sung model tạo ảnh PoYo & GeminiGen

## Research findings

### PoYo.ai (`docs.poyo.ai/llms.txt`)
PoYo hiện đã có 22 model image series. Chúng ta đang dùng 15 (`nano-banana-2*`, `gpt-4o-image*`, `gpt-image-1.5`, `z-image`, `flux-2-*`, `seedream-4.5*`, `grok-imagine`).

**Còn thiếu — đáng bổ sung:**
| Model | Mô tả | Use case |
|---|---|---|
| `poyo/nano-banana` | Gemini 2.5 Flash legacy, rẻ + nhanh | Bulk/draft |
| `poyo/nano-banana-pro` | Gemini 3 Pro, chất lượng cao nhất Nano Banana series | Premium |
| `poyo/gpt-image-1` + `-edit` | GPT Image 1 official (Fal-backed) | Text rendering tốt |
| `poyo/gpt-image-1.5-official` + `-edit` | Phiên bản chính thức Fal | Tin cậy hơn |
| `poyo/gpt-image-2` + `-edit` | Multi-image editing | Carousel consistency |
| `poyo/seedream-4` + `-edit` | ByteDance Seedream 4 base | Phong cách Á Đông |
| `poyo/seedream-5.0-lite` + `-edit` | Seedream 5 Lite, multi-ref tới 10 ảnh | Character consistency |
| `poyo/wan-2.7-image` | Alibaba Wan 2.7 unified text+edit | Custom size |
| `poyo/wan-2.7-image-pro` | Wan 2.7 Pro chất lượng cao | Premium Á |
| `poyo/kling-o1` | High consistency reference alignment | Character/product |
| `poyo/kling-o3` | High expressiveness, semantic strong | Creative scene |
| `poyo/flux-kontext-pro` + `-max` | Flux Kontext (đã có ở KIE, thêm qua PoYo cho fallback) | Edit chính xác |

### GeminiGen.ai
Docs bị 404 nhiều endpoint, chỉ confirm 3 model ảnh hiện có (`nano-banana-pro`, `nano-banana-2`, `imagen-4`). **Không bổ sung mới** cho đến khi có docs chính thức — sẽ giữ nguyên list này.

## Files cần update

### 1. `src/types/aiProvider.ts` (~line 100, 123)
- Mở rộng `AI_PROVIDERS.poyo.models[]` thêm 15 model PoYo mới ở trên (giữ thứ tự: legacy → flagship → edit pairs).
- GeminiGen: giữ nguyên.

### 2. `src/hooks/useAIConfig.ts` (~line 225-242)
- Mirror danh sách PoYo mới trong mảng image models để admin override.
- GeminiGen: giữ nguyên.

### 3. `src/components/admin/ai/InlineModelPicker.tsx`
- Thêm 1-2 quick-pick presets nổi bật: `poyo/seedream-5.0-lite-edit` (multi-ref character) và `poyo/wan-2.7-image-pro`.

### 4. `supabase/functions/_shared/poyo-image-generator.ts`
- Code generic theo `model + input.size`, **không cần đổi gì** cho hầu hết model mới — chỉ check 2 điểm:
  - `wan-2.7-image*`: hỗ trợ custom `{width, height}` object size — đã pass qua nguyên `size` string nên OK với preset.
  - `seedream-5.0-lite-edit`: hỗ trợ multi-ref ảnh (mảng `image_urls` thay vì `image_url`). **Tương lai** mới cần — chưa làm trong scope này.
- Cập nhật comment list model ở line 13 cho đúng.

### 5. `src/components/ui/ModelUsedBadge.tsx`
- Đã handle prefix `poyo/` chung. Không đổi.

## Không thay đổi
- Edge function `generate-character-image`, `generate-brand-image`, `generate-carousel-image`: dùng provider router theo prefix → tự động nhận model mới.
- GeminiGen image generator + model list giữ nguyên.
- DB migration không cần (model chỉ là string trong `ai_function_configs.model_override`).

## Lưu ý
- Tất cả model mới đều yêu cầu `POYO_API_KEY` đã có sẵn.
- Pricing/credit do PoYo tính riêng từng model — admin tự chọn theo budget.
- Multi-ref (seedream-5-lite-edit, kling-o1) nếu cần dùng full power thì mở task riêng để mở rộng `PoyoGenerateParams.inputImages: string[]`.
