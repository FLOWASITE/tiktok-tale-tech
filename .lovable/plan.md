

# Tăng cường màu Brand — Xử lý gốc rễ: Design Token Backgrounds

## Chẩn đoán

Bạn đúng. Vấn đề chính nằm ở **màu nền cứng trong DB presets** — chúng vẫn được truyền vào prompt dù brand colors đã có:

| Preset | Background mặc định | Accent |
|--------|---------------------|--------|
| Bold Infographic (`flat_design`) | `#1A1A2E` (navy đen) | `#E94560` |
| Corporate (`geometric`) | `#0A1628` (đen xanh) | `#C9A84C` |
| Gradient Flow | `#667eea → #764ba2` (xanh tím) | `#00f2fe` |
| Clean Modern | `#FFFFFF` | `#2563EB` (xanh) |

Hàm `blendBrandColors()` hiện tại **chỉ thay accent**, **không thay background**. Kết quả: nền vẫn xanh/đen của preset, brand color chỉ xuất hiện ở chi tiết nhỏ.

Ngoài ra, `seamlessContext.colorPalette` có thể ghi đè brand colors bằng câu "Use ONLY these colors" — nếu palette này chứa màu từ slide 1 (đã bị xanh/đen), tất cả slide sau đều bị ảnh hưởng.

## Giải pháp (2 file)

### 1. `generate-carousel-image/index.ts` — `blendBrandColors()` thay cả background

Mở rộng logic blend để **thay thế background chính** bằng brand primary color (hoặc biến thể sáng/tối) cho mỗi preset:

- `minimalist`: background.primary → lighten(brand, 95%), accent → brand
- `flat_design`: background.primary → darken(brand, 40%), background.secondary → darken(brand, 30%)
- `gradient`: gradient từ brand primary → brand secondary (hoặc darken)
- `geometric`: background.primary → darken(brand, 50%), accent → brand
- `illustration`: background.primary → lighten(brand, 90%)
- `product_only`: cta + accent → brand

### 2. `generate-carousel-image/index.ts` — Seamless palette ưu tiên brand

Khi có `brandColors`, lọc `seamlessContext.colorPalette` để **thêm brand colors vào đầu palette** và loại bỏ câu "Use ONLY these colors" để tránh khóa cứng palette cũ.

### 3. `generate-carousel-image/index.ts` — Tăng cường brandColorDirective thêm 1 bước

Thêm dòng rõ ràng: "The IMAGE BACKGROUND itself must use brand colors or tints/shades of brand colors. Do NOT use preset default backgrounds like dark navy, black, or blue gradients."

## Tóm tắt thay đổi
- **1 file**: `supabase/functions/generate-carousel-image/index.ts`
- Sửa `blendBrandColors()` để thay background, không chỉ accent
- Sửa seamless palette để không ghi đè brand colors
- Bổ sung chỉ dẫn background vào brandColorDirective

