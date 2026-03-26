

# Fix: Text trên Carousel Agent tạo không giống với tự tạo

## Nguyên nhân

Trong `routeCarousel()` (line 533-547), Agent truyền thiếu/sai nhiều params so với UI:

| Param | UI (CarouselForm) | Agent (routeCarousel) |
|-------|---|---|
| `brandGuideline` | **Full brand_guideline** từ brand_templates (chi tiết tone, rules, examples) | `brief.unique_value_proposition` — chỉ 1 câu UVP ngắn |
| `carouselStyle` | User chọn (seamless/educational/listicle/gallery) | Hardcode `"educational"` |
| `visualPreset` | User chọn (minimalist/flat_design/gradient/geometric/illustration/product_only) | Hardcode `"minimalist"` |
| `brandPrimaryColor` | Từ brand template | Không truyền |
| `brandSecondaryColors` | Từ brand template | Không truyền |
| `includeLogo` | Từ brand template | Hardcode `false` |
| `logoUrl` | Từ brand template | Không truyền |

Hậu quả: `generate-carousel` dùng `brandGuideline` làm system prompt chính → Agent chỉ có 1 câu UVP → nội dung text trên slide thiếu tone/voice/style → text khác hoàn toàn so với tự tạo.

## Giải pháp

### File: `supabase/functions/agent-creator-v2/index.ts`

**1. Trong `assembleBrief()`** — thêm fetch `brand_guideline`, `primary_color`, `secondary_colors`, `include_logo` từ brand_templates (thêm vào select query line 97-99, thêm field vào BrandBrief interface)

**2. Trong `routeCarousel()`** — truyền đúng params:

```typescript
const carouselOutput = await callFunction(supabaseUrl, serviceKey, "generate-carousel", {
  topic: input.topic,
  platform: targetChannel,
  carouselStyle: carouselStyle,
  visualPreset: visualPreset,
  slideCount,
  aiTool: "ideogram",
  brandName: brief.brand_name || "Brand",
  brandGuideline: brief.brand_guideline || brief.unique_value_proposition || "",
  includeLogo: brief.include_logo ?? false,
  logoUrl: brief.logo_url || undefined,
  organization_id: input.organization_id,
  brandTemplateId: input.brand_template_id,
  autoGenerateImages: false,
  userId,
  brandPrimaryColor: brief.primary_color || undefined,
  brandSecondaryColors: brief.secondary_colors || undefined,
});
```

**3. BrandBrief interface** — thêm fields:
```typescript
brand_guideline?: string;
include_logo?: boolean;
logo_url?: string;
primary_color?: string;
secondary_colors?: string[];
```

**4. assembleBrief() select** — thêm `brand_guideline, primary_color, secondary_colors, include_logo` vào query

### Phạm vi: 1 file
`supabase/functions/agent-creator-v2/index.ts`

