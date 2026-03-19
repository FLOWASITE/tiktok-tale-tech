

## Vấn đề: Ảnh Carousel không sử dụng model đã cấu hình

### Phân tích

Dữ liệu từ database cho thấy:
- **Function Configuration**: `generate-carousel-image` → `model_override: poyo/nano-banana-2` ✅
- **Metrics thực tế**: `models_used: {image: google/gemini-3-pro-image-preview}` ❌

Logic routing trong code hoạt động đúng: nhận diện `poyo/nano-banana-2` → gọi PoYo API. Tuy nhiên, **PoYo API đang thất bại** và code tự động fallback về Lovable AI (`google/gemini-3-pro-image-preview`) một cách **im lặng** — không ghi nhận `used_fallback` trong metrics, không thông báo rõ ràng cho user.

### Nguyên nhân gốc

1. PoYo API gọi thất bại (có thể do model name, credits, hoặc lỗi API)
2. Code fallback im lặng — `used_fallback` **không bao giờ được set** trong metrics
3. Metrics ghi `hadError: false` dù đã xảy ra fallback
4. User không biết model thực tế đang được sử dụng

### Kế hoạch sửa

**File 1: `supabase/functions/generate-carousel-image/index.ts`**

1. Thêm biến `usedFallback` và `fallbackModel` để track fallback state
2. Khi PoYo/KIE fail và fallback, set `usedFallback = true` và `fallbackModel = requestedModel`
3. Cập nhật tất cả các chỗ `saveMetrics()` để ghi `usedFallback` và `fallbackModel`
4. Đảm bảo response trả về `modelUsed` có thông tin fallback rõ ràng

**File 2: `src/components/CarouselViewer.tsx`**

5. Hiển thị toast cảnh báo khi response trả về cho thấy fallback đã xảy ra (modelUsed chứa "fallback")

### Chi tiết kỹ thuật

```text
Flow hiện tại:
  getAIConfig → poyo/nano-banana-2
  → isPoyoModel ✓ → gọi PoYo API → FAIL
  → fallback: imageModel = gemini-3-pro
  → saveMetrics({ usedFallback: false }) ← BUG

Flow sau fix:
  getAIConfig → poyo/nano-banana-2
  → isPoyoModel ✓ → gọi PoYo API → FAIL
  → fallback: imageModel = gemini-3-pro, usedFallback = true
  → saveMetrics({ usedFallback: true, fallbackModel: 'poyo/nano-banana-2' })
  → response: modelUsed includes "(fallback)"
  → UI: toast warning "Model PoYo thất bại, đã dùng Lovable AI thay thế"
```

