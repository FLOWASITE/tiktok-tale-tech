
## Vấn đề (đồng ý — đây là dealbreaker Enterprise)

Hiện tại pipeline `generate-carousel-image` chỉ truyền logo dưới dạng **text reference** trong prompt (kiểu `"include the brand logo in top-right corner"`). Model không "thấy" logo thực → AI tự "vẽ lại" logo theo trí tưởng tượng → sai chữ, sai shape, sai màu. Với Haravan, chuỗi F&B, hoặc bất kỳ thương hiệu có logo đăng ký → **toàn bộ deliverable bị trả lại**.

Nano-banana (gemini-2.5-flash-image), nano-banana-pro (gemini-3-pro-image-preview), nano-banana-2 (gemini-3.1-flash-image-preview) **đều hỗ trợ multi-image input** qua content array `[{type:"text"}, {type:"image_url", image_url:{url}}]`. Đây là quick win 1-2 ngày, không phải roadmap.

## Khảo sát cần làm

1. `supabase/functions/generate-carousel-image/index.ts` — tìm chỗ build payload gọi AI gateway, xem hiện đang truyền logo như thế nào (text only? có URL field không?).
2. Xem `carousels` table có `brand_logo_url` (hoặc field tương đương) chưa — `Carousel` type đã có `include_logo: boolean` nhưng chưa chắc có URL.
3. `brand_templates` table — chắc chắn có `logo_url`. Cần verify.
4. Frontend `CarouselFormData` — đã có `logoUrl?: string | null`. Tốt, frontend sẵn sàng.
5. Có function nào khác cũng generate image với logo cần fix cùng pattern? (`generate-image`, `decompose-image-request`, multichannel image generation) — audit nhanh.

## Giải pháp (3 lớp)

### Lớp 1 — Backend: Truyền logo image vào model payload

**File:** `supabase/functions/generate-carousel-image/index.ts`

Pattern thay thế khi gọi AI gateway:

```typescript
// TRƯỚC (text-only)
body: JSON.stringify({
  model: "google/gemini-2.5-flash-image",
  messages: [{ role: "user", content: prompt }],
  modalities: ["image", "text"]
})

// SAU (multi-image: logo + scene reference)
const userContent: any[] = [{ type: "text", text: prompt }];

if (includeLogo && brandLogoUrl) {
  userContent.push({
    type: "image_url",
    image_url: { url: brandLogoUrl }
  });
  // Thêm chỉ dẫn rõ ràng cho model
  userContent[0].text += `\n\n[REFERENCE IMAGE]: The provided image is the EXACT brand logo. You MUST place it in the design WITHOUT modifying its shape, colors, typography, or proportions. Position: top-right corner with 5% padding. Size: ~12% of canvas width.`;
}

// (Optional) Seamless V2: previous slide image cho consistency
if (previousSlideImageUrl) {
  userContent.push({
    type: "image_url",
    image_url: { url: previousSlideImageUrl }
  });
  userContent[0].text += `\n\n[CONTINUITY REFERENCE]: Match the visual style, palette, and lighting of the previous slide image.`;
}

body: JSON.stringify({
  model: "google/gemini-2.5-flash-image",  // hoặc gemini-3-pro-image-preview cho Enterprise
  messages: [{ role: "user", content: userContent }],
  modalities: ["image", "text"]
})
```

### Lớp 2 — Resolve logo URL trong edge function

Edge function nhận `brandTemplateId` → query `brand_templates.logo_url`. Nếu logo là Supabase Storage path → dùng `getPublicUrl()` để resolve thành URL accessible.

```typescript
let resolvedLogoUrl: string | null = null;
if (formData.includeLogo && formData.brandTemplateId) {
  const { data: brand } = await supabase
    .from('brand_templates')
    .select('logo_url')
    .eq('id', formData.brandTemplateId)
    .maybeSingle();
  if (brand?.logo_url) {
    // Handle both full URLs and storage paths
    resolvedLogoUrl = brand.logo_url.startsWith('http')
      ? brand.logo_url
      : supabase.storage.from('brand-assets').getPublicUrl(brand.logo_url).data.publicUrl;
  }
}
```

### Lớp 3 — Cache key bao gồm logo URL hash

Cache key hiện chỉ có `brandGuidelineHash`. Phải thêm `logoUrlHash` (SHA-256 của URL) vào cache input — admin đổi logo → cache miss → regen với logo mới. Logo của Enterprise đổi rất thường xuyên (rebrand, seasonal logo) → critical.

```typescript
const cacheInput = {
  ...,
  logoFingerprint: resolvedLogoUrl ? await sha256Hex(resolvedLogoUrl).slice(0, 16) : 'no-logo',
};
```

### Lớp 4 — Validation post-generation (defensive)

Sau khi nhận image, **không có cách nào** verify model dùng đúng logo (model có thể ignore image input — hiếm nhưng có). Để defense-in-depth:
- Log warning nếu `includeLogo=true` mà generation time < ngưỡng (model có thể skip image conditioning).
- Future: thêm step gọi vision model so sánh logo region với reference (Phase 2, không nằm trong scope task này).

## Files dự kiến sửa

- `supabase/functions/generate-carousel-image/index.ts` — main implementation
- `supabase/functions/_shared/cache/redis-cache.ts` (hoặc cache-utils.ts) — không cần đổi signature, logoFingerprint chỉ là field trong `input`
- (Audit only) `supabase/functions/generate-image/index.ts` nếu có — apply cùng pattern
- (Audit only) `supabase/functions/decompose-image-request/index.ts` — không cần đổi (chỉ build prompt text)

## Trade-off

- **Cost**: Multi-image input đắt hơn ~1.3x text-only (logo image ~1k tokens). Acceptable cho ROI Enterprise.
- **Latency**: +0.5-1s mỗi slide (model phải decode image input). Negligible so với 15-30s sinh ảnh.
- **Cache invalidation**: Logo đổi → toàn bộ carousel cache cũ miss. Đúng — đó là mục tiêu.
- **Backward compat**: Brand không có logo → không gửi `image_url` → behavior cũ giữ nguyên.

## Out of scope (nêu rõ để không scope creep)

- Vision-based logo verification (Phase 2)
- Logo placement DSL (Phase 2)
- Multi-logo support (sub-brand, partner co-brand) — Phase 3

## Sau khi user approve

Đọc `generate-carousel-image/index.ts` + verify schema `brand_templates.logo_url` rồi triển khai theo thứ tự: (1) resolve logo URL, (2) inject vào messages payload, (3) thêm fingerprint vào cache key, (4) log + smoke test bằng `supabase--edge_function_logs`.
