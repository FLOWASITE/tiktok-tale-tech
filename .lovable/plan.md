
# Kế hoạch: Thêm 5 phong cách ảnh mới (không có người)

## Mục tiêu
Thêm 5 phong cách ảnh mới để người dùng có nhiều lựa chọn hơn, đặc biệt là các phong cách ít/không có người:
- **Abstract** - Hình ảnh trừu tượng nghệ thuật
- **Geometric** - Hình học, shapes đồ họa  
- **Isometric** - Góc nhìn isometric 3D
- **Gradient** - Gradient màu sắc
- **Product Only** - Chỉ sản phẩm, không có người

## Chi tiết kỹ thuật

### File 1: `src/hooks/useSocialImageGeneration.ts`

Cập nhật type và thêm labels cho 5 phong cách mới:

```typescript
// Line 15: Mở rộng type
export type ImageStylePreset = 
  | 'photorealistic' | 'illustration' | 'minimalist' 
  | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic'
  | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

// Line 17-49: Thêm vào IMAGE_STYLE_PRESETS
abstract: {
  label: 'Trừu tượng',
  description: 'Nghệ thuật trừu tượng, hình khối sáng tạo',
},
geometric: {
  label: 'Hình học',
  description: 'Đồ họa hình học, shapes hiện đại',
},
isometric: {
  label: 'Isometric',
  description: 'Góc nhìn 3D isometric, phong cách tech',
},
gradient: {
  label: 'Gradient',
  description: 'Dải màu gradient mềm mại',
},
product_only: {
  label: 'Sản phẩm',
  description: 'Focus sản phẩm, không có người',
},
```

### File 2: `src/utils/imageStyleSuggestion.ts`

Cập nhật tất cả các mapping và scoring:

**1. Thêm vào styleScores initialization (line 221-229):**
```typescript
const styleScores: Record<ImageStylePreset, { score: number; reasons: string[] }> = {
  // ...existing styles...
  abstract: { score: 0, reasons: [] },
  geometric: { score: 0, reasons: [] },
  isometric: { score: 0, reasons: [] },
  gradient: { score: 0, reasons: [] },
  product_only: { score: 0, reasons: [] },
};
```

**2. Cập nhật INDUSTRY_STYLE_MAP (thêm các phong cách mới cho phù hợp):**
```typescript
// Technology - thêm isometric, geometric
technology: ['isometric', '3d_render', 'flat_design'],
tech: ['isometric', '3d_render', 'geometric'],
saas: ['isometric', 'flat_design', 'gradient'],
software: ['isometric', 'flat_design', 'geometric'],
ai: ['abstract', '3d_render', 'gradient'],

// Creative - thêm abstract, gradient
art: ['abstract', 'watercolor', 'illustration'],
design: ['geometric', 'minimalist', 'abstract'],
creative: ['abstract', 'illustration', 'gradient'],

// E-commerce - thêm product_only
ecommerce: ['product_only', 'photorealistic', '3d_render'],
retail: ['product_only', 'photorealistic', 'flat_design'],
luxury: ['product_only', 'minimalist', 'cinematic'],
```

**3. Cập nhật TONE_STYLE_AFFINITY:**
```typescript
// Modern/Innovative - map to abstract, geometric
modern: ['geometric', 'minimalist', 'isometric'],
innovative: ['abstract', '3d_render', 'isometric'],
cutting_edge: ['abstract', 'geometric', 'gradient'],

// Trendy - add gradient
trendy: ['gradient', '3d_render', 'cinematic'],
```

**4. Cập nhật mapExplicitStyle (line 180-203):**
```typescript
'abstract': 'abstract',
'geometric': 'geometric', 
'isometric': 'isometric',
'gradient': 'gradient',
'product': 'product_only',
'product_only': 'product_only',
```

**5. Cập nhật getStyleLabel (line 329-339):**
```typescript
abstract: 'Trừu tượng',
geometric: 'Hình học',
isometric: 'Isometric',
gradient: 'Gradient',
product_only: 'Sản phẩm',
```

### File 3: `supabase/functions/_shared/image-prompt-builder.ts`

Cập nhật backend prompt builder:

**1. Mở rộng type (line 98):**
```typescript
export type ImageStylePreset = 
  | 'photorealistic' | 'illustration' | 'minimalist' 
  | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic'
  | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';
```

**2. Thêm vào IMAGE_STYLE_PRESETS (line 100-140):**
```typescript
abstract: {
  description: 'Abstract art with organic shapes and creative compositions',
  keywords: ['abstract art', 'organic shapes', 'fluid forms', 'artistic expression', 'creative composition', 'color harmony'],
  negativeKeywords: ['realistic', 'photographic', 'literal', 'human faces', 'portraits', 'people'],
},
geometric: {
  description: 'Clean geometric patterns with modern shapes',
  keywords: ['geometric patterns', 'clean shapes', 'modern design', 'symmetry', 'polygons', 'lines and angles'],
  negativeKeywords: ['organic', 'realistic', 'photographs', 'human faces', 'portraits', 'people'],
},
isometric: {
  description: 'Isometric 3D perspective with tech-inspired aesthetics',
  keywords: ['isometric view', '3D perspective', 'tech aesthetic', 'clean lines', 'isometric illustration', 'data visualization style'],
  negativeKeywords: ['photorealistic', 'organic', 'messy', 'human faces', 'portraits', 'people'],
},
gradient: {
  description: 'Smooth gradient backgrounds with color transitions',
  keywords: ['gradient background', 'smooth color transitions', 'mesh gradients', 'soft colors', 'ambient lighting', 'ethereal feel'],
  negativeKeywords: ['harsh edges', 'busy patterns', 'cluttered', 'human faces', 'portraits', 'people', 'noisy textures'],
},
product_only: {
  description: 'Clean product-focused imagery without people',
  keywords: ['product photography', 'clean background', 'studio lighting', 'product focus', 'commercial quality', 'no people', 'object only'],
  negativeKeywords: ['people', 'human faces', 'portraits', 'hands', 'models', 'lifestyle with people', 'crowds'],
},
```

## Mapping chiến lược cho phong cách mới

| Phong cách | Ngành phù hợp | Tone phù hợp | Đặc điểm |
|------------|---------------|--------------|----------|
| abstract | Art, AI, Creative | Innovative, Artistic | Không có người, nghệ thuật |
| geometric | Tech, Design, Saas | Modern, Professional | Không có người, đồ họa |
| isometric | Tech, Software, Fintech | Trendy, Innovative | Không có người, 3D cách điệu |
| gradient | AI, Creative, Wellness | Calm, Trendy | Không có người, màu gradient |
| product_only | E-commerce, Retail, Luxury | Any | Chỉ sản phẩm, không người |

## Lợi ích

1. **Đa dạng hóa** - 5 phong cách mới giúp ảnh không đơn điệu
2. **Không có người** - Tất cả 5 phong cách mới đều tự nhiên không có người (negative keywords)
3. **Phù hợp ngành nghề** - Mỗi phong cách được map với các ngành phù hợp
4. **Tự động gợi ý** - Hệ thống sẽ tự gợi ý phong cách phù hợp dựa trên brand

## Files sẽ chỉnh sửa

1. `src/hooks/useSocialImageGeneration.ts` - Type + Labels
2. `src/utils/imageStyleSuggestion.ts` - Suggestion logic + Mappings
3. `supabase/functions/_shared/image-prompt-builder.ts` - Prompt keywords

## Testing

1. Mở generator ảnh → kiểm tra dropdown có 12 phong cách (7 cũ + 5 mới)
2. Tạo ảnh với phong cách "Trừu tượng" → không có người
3. Tạo ảnh với phong cách "Sản phẩm" → chỉ có sản phẩm
4. Kiểm tra Auto-suggestion với brand ngành Tech → nên gợi ý Isometric/Geometric
