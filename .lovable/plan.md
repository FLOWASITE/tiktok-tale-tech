

# Sửa lỗi màu Brand không áp dụng vào ảnh Carousel

## Nguyên nhân gốc

Có 3 vấn đề trong chuỗi truyền màu brand:

```text
CarouselForm → generate-carousel → DB (brand_guideline) → CarouselViewer → generate-carousel-image

❌ Vấn đề 1: Hầu hết carousel cũ lưu brand_guideline dưới dạng TEXT thuần
   (không phải JSON), nên extractBrandColors() không lấy được màu hex.

❌ Vấn đề 2: Fallback query brand_templates theo brand_name thất bại
   vì tên không khớp (VD: "Công ty TNHH Tư vấn Kiểm toán TAF" ≠ "Thuế Hộ by TAF.vn")

❌ Vấn đề 3: CarouselGenerationTracker.extractBrandColors() không có
   fallback nào — trả về undefined luôn khi brand_guideline là text.
```

**Bằng chứng từ DB**: 9/10 carousel gần nhất có `brand_guideline` là text thuần (`is_json: false`), chỉ 1 carousel Flowa mới nhất có JSON.

## Giải pháp

### 1. Thêm cột `brand_template_id` vào bảng `carousels`
- Migration: thêm cột `brand_template_id UUID REFERENCES brand_templates(id)`
- Đây là cách chính xác nhất để truy vết brand template gốc

### 2. `supabase/functions/generate-carousel/index.ts` — Lưu brand_template_id
- Lưu `formData.brandTemplateId` vào cột mới khi insert carousel

### 3. `src/components/CarouselViewer.tsx` — Sửa fallback query
- Thay query by `brand_name` bằng query by `carousel.brand_template_id` (nếu có)
- Giữ fallback by `brand_name` cho carousel cũ
- `extractBrandColors()` thêm `brandTemplate` param fallback mạnh hơn

### 4. `src/components/carousel/CarouselGenerationTracker.tsx` — Thêm brand template lookup
- Thêm query `brand_templates` by carousel's `brand_template_id` hoặc `brand_name`
- Truyền `primary_color` vào `brandColors` khi `extractBrandColors()` trả về undefined

### 5. Cập nhật TypeScript types
- Thêm `brand_template_id` vào Carousel type

| File | Thay đổi |
|------|----------|
| Migration SQL | Thêm cột `brand_template_id` |
| `generate-carousel/index.ts` | Lưu `brandTemplateId` vào DB |
| `CarouselViewer.tsx` | Sửa fallback: query by template ID + brand_name |
| `CarouselGenerationTracker.tsx` | Thêm brand template lookup + fallback |
| `src/types/carousel.ts` | Thêm `brand_template_id` vào type |

Thay đổi ~50 dòng, 5 file + 1 migration.

