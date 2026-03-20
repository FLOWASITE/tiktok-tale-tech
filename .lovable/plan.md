

# Sửa lỗi ảnh Carousel không có màu thương hiệu

## Nguyên nhân gốc

Luồng truyền màu thương hiệu bị **đứt đoạn**:

```text
Brand Template (primary_color: "#E53E3E", secondary_colors: ["#FFD700"])
        ↓
CarouselForm.applyTemplate() ← CHỈ copy brand_name, brand_guideline, include_logo
        ↓                        ❌ KHÔNG copy primary_color, secondary_colors
Carousel DB record (brand_guideline = "")
        ↓
extractBrandColors() ← Parse brand_guideline → tìm hex colors → KHÔNG CÓ
        ↓
brandColors = undefined ← AI không nhận được màu nào
        ↓
Ảnh mặc định xanh/đen (do AI tự chọn)
```

**Không phải do phong cách thiết kế** — hệ thống `blendBrandColors()` và `brandColorDirective` trong prompt đều hoạt động đúng, nhưng không bao giờ nhận được dữ liệu màu.

## Giải pháp

### 1. `src/types/carousel.ts` — Thêm fields màu vào `CarouselFormData`
- Thêm `brandPrimaryColor?: string` và `brandSecondaryColors?: string[]`

### 2. `src/components/CarouselForm.tsx` — Copy màu từ template
- `applyTemplate()`: thêm `setPrimaryColor(template.primary_color)` và `setSecondaryColors(template.secondary_colors)`  
- Truyền vào `onSubmit()` cùng form data

### 3. `supabase/functions/generate-carousel/index.ts` — Lưu màu vào DB
- Lưu `primary_color` và `secondary_colors` vào record carousel (hoặc nhúng vào `brand_guideline` JSON)

### 4. `src/components/CarouselViewer.tsx` — Sửa `extractBrandColors()`
- Ưu tiên đọc từ `carousel.brand_guideline` parsed JSON
- **Fallback**: Tra cứu brand template gốc bằng `carousel.brand_template_id` để lấy `primary_color`

### 5. `supabase/functions/generate-carousel-image/index.ts` — Không cần sửa
- Logic `blendBrandColors()` và `brandColorDirective` đã hoạt động đúng, chỉ cần nhận đúng data

## Tổng hợp

| File | Thay đổi |
|------|----------|
| `types/carousel.ts` | Thêm `brandPrimaryColor`, `brandSecondaryColors` vào form data |
| `CarouselForm.tsx` | Copy `primary_color`/`secondary_colors` từ brand template |
| `generate-carousel/index.ts` | Lưu brand colors vào record carousel |
| `CarouselViewer.tsx` | Sửa `extractBrandColors()` fallback từ brand template |

Sửa 4 file, không cần migration.

