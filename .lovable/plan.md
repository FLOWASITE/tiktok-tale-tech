

## Mở rộng `generate-carousel-image` hỗ trợ PoYo, KIE và tất cả model tùy chọn

### Vấn đề hiện tại

Edge function `generate-carousel-image` có **whitelist cứng** chỉ cho phép Lovable AI Gateway models (Gemini series). Khi admin chọn PoYo hoặc KIE model trong AI Management, backend **âm thầm fallback** về `google/gemini-3-pro-image-preview` mà không báo lỗi.

Trong khi đó, `generate-brand-image` đã có **đầy đủ multi-provider routing** (PoYo → KIE → Lovable), chứng tỏ hạ tầng đã sẵn sàng.

### Thay đổi cần thực hiện

**1. `supabase/functions/generate-carousel-image/index.ts` — Multi-provider routing**
- Import `generateImageViaKie`, `isKieModel`, `mapAspectRatioToKie` từ `_shared/kie-image-generator.ts`
- Import `generateImageViaPoyo`, `isPoyoModel`, `mapAspectRatioToPoyo` từ `_shared/poyo-image-generator.ts`
- Xóa bỏ `LOVABLE_COMPATIBLE_MODELS` whitelist (lines 247-256)
- Thay bằng logic routing giống `generate-brand-image`:
  - `isPoyoModel(model)` → gọi PoYo API với `POYO_API_KEY`
  - `isKieModel(model)` → gọi KIE API với `KIE_API_KEY`
  - Mặc định → gọi Lovable AI Gateway như hiện tại
- Nếu PoYo/KIE fail → fallback về Lovable AI Gateway + trả `modelUsed` để frontend biết
- Trả thêm `modelUsed` và `modelRequested` trong response JSON

**2. `src/hooks/useAIConfig.ts` — Sửa config mặc định**
- Đổi `generate-carousel-image` type từ `'image-direct'` sang `'image'`
- Cập nhật `currentModel` thành `google/gemini-3-pro-image-preview`

**3. `src/components/CarouselViewer.tsx` — Hiển thị model đã dùng**
- Hiển thị `ModelUsedBadge` khi có `modelUsed` trong response tạo ảnh

### Luồng hoạt động sau fix

```text
Admin chọn model (AI Management)
        ↓
   ai_function_configs DB
        ↓
generate-carousel-image đọc config
        ↓
  ┌─PoYo model? → POYO_API_KEY → api.poyo.ai
  ├─KIE model?  → KIE_API_KEY  → api.kie.ai
  └─Khác        → LOVABLE_API_KEY → ai.gateway.lovable.dev
        ↓
  Nếu fail → fallback Lovable AI + ghi "fallback from X"
        ↓
  Response: { imageUrl, modelUsed, modelRequested }
```

### Files sẽ chỉnh
| File | Thay đổi |
|------|----------|
| `supabase/functions/generate-carousel-image/index.ts` | Thêm multi-provider routing, xóa whitelist |
| `src/hooks/useAIConfig.ts` | Sửa config mặc định cho carousel-image |
| `src/components/CarouselViewer.tsx` | Hiển thị ModelUsedBadge |

### Tiêu chí nghiệm thu
1. Chọn PoYo model trong AI Management → carousel image dùng PoYo API thực sự
2. Chọn KIE model → dùng KIE API thực sự
3. Nếu API key thiếu → trả lỗi rõ ràng (không fallback âm thầm)
4. Nếu provider fail → fallback về Lovable + badge cảnh báo "fallback from X"
5. Không ảnh hưởng các function khác

