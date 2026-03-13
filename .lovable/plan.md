

## Phương án tốt hơn "Expert Mode": Smart Prompt Routing

### Vấn đề với phương án "Expert Mode" đơn giản

Expert Mode chỉ là toggle bật/tắt — user phải tự quyết định dùng mode nào, và khi bật Expert thì mất hết brand context (màu sắc, logo, persona, channel specs). Đây là trải nghiệm "all or nothing" không linh hoạt.

### Phương án đề xuất: 3-Layer Prompt Architecture

Thay vì 2 mode cứng nhắc, tách prompt thành **3 layer độc lập**, user có thể bật/tắt từng layer:

```text
┌─────────────────────────────────────────┐
│  Layer 1: USER PROMPT (luôn có)         │
│  → contentSummary / prompt chi tiết     │
├─────────────────────────────────────────┤
│  Layer 2: BRAND IDENTITY (tùy chọn)     │
│  → Màu sắc, logo, country, persona     │
│  → Footer info, CTA                    │
├─────────────────────────────────────────┤
│  Layer 3: AI OPTIMIZATION (tùy chọn)    │
│  → Channel specs, style preset          │
│  → Content role/angle, journey stage    │
│  → Structured layout, typography        │
└─────────────────────────────────────────┘
```

### Cách hoạt động

| Kịch bản | Layer 1 | Layer 2 | Layer 3 | Kết quả |
|-----------|---------|---------|---------|---------|
| Mặc định (như hiện tại) | ✅ | ✅ | ✅ | Full auto — AI tối ưu hoàn toàn |
| Prompt chi tiết + giữ brand | ✅ | ✅ | ❌ | Prompt user + brand colors/logo, KHÔNG thêm channel specs/layout |
| Prompt thuần (Expert) | ✅ | ❌ | ❌ | Chỉ gửi prompt, thêm aspect ratio |

Với prompt infographic ở trên, user chọn **Layer 1 + Layer 2**: giữ brand color (đỏ-trắng) + logo, nhưng tắt AI optimization để layout infographic không bị ghi đè.

### Thay đổi cụ thể (4 file, ~80 dòng)

#### 1. `image-prompt-builder.ts` — Thêm param `promptMode`
- Thêm type: `type PromptMode = 'full' | 'brand_only' | 'raw'`
- Thêm `promptMode` vào `ImagePromptParams`
- Trong `buildImagePrompt()`:
  - `'full'` (mặc định): giữ nguyên logic hiện tại — tất cả sections
  - `'brand_only'`: chỉ inject Layer 1 + Layer 2 (user prompt + brand colors + country character + negative prompt). Bỏ qua channel specs, style preset, structured layout, content role/angle, persona, journey stage
  - `'raw'`: chỉ Layer 1 + aspect ratio + country reminder

#### 2. `generate-brand-image/index.ts` — Nhận `promptMode` param
- Thêm `promptMode` vào `GenerateImageRequest` interface
- Truyền xuống `buildImagePrompt()`

#### 3. `useSocialImageGeneration.ts` — Truyền `promptMode`
- Thêm `promptMode` vào `GenerateImageParams`
- Gửi trong body request

#### 4. `SimpleImageGenerator.tsx` — UI control
- Thêm dropdown/radio 3 options trong phần "Tùy chỉnh nâng cao":
  - **"AI tự động"** (`full`) — mặc định, mô tả: "AI tối ưu bố cục, màu sắc, phong cách cho từng kênh"
  - **"Giữ thương hiệu"** (`brand_only`) — mô tả: "Dùng prompt của bạn + brand color/logo. Phù hợp khi bạn tự viết prompt chi tiết"
  - **"Tự do hoàn toàn"** (`raw`) — mô tả: "Gửi prompt nguyên vẹn, không thêm bất kỳ gì"
- Khi chọn `brand_only` hoặc `raw`: ẩn các options không liên quan (style preset, typography, text position...)

### Tại sao tốt hơn Expert Mode đơn giản?

1. **Không mất brand identity**: Prompt chi tiết vẫn giữ được brand colors, logo, country — thay vì mất hết
2. **Gradual control**: 3 mức thay vì 2, user chọn đúng mức cần thiết
3. **Backward compatible**: Mặc định là `full`, không thay đổi trải nghiệm hiện tại
4. **Prompt infographic kia**: Chọn `brand_only` → prompt gửi nguyên vẹn + brand red-white colors + VN character ethnicity, không bị channel specs hay structured layout ghi đè

