

# Kế hoạch: Thêm 4 Carousel Style vào hệ thống

## Tổng quan

Hiện tại carousel **không có khái niệm style** — mọi carousel đều dùng cùng logic nội dung (Hook → Problem → Explain → Solution → CTA) và prompt tạo ảnh giống nhau. Cần thêm 4 style carousel với logic nội dung và prompt hình ảnh khác biệt cho từng style.

## 4 Carousel Styles

| Style | Key | Đặc điểm prompt ảnh | Logic nội dung |
|-------|-----|---------------------|----------------|
| Seamless | `seamless` | Các phần tử vắt ngang qua biên ảnh, palette + background liền mạch, mũi tên/hình khối nối slide | Một bức tranh dài, mỗi slide là fragment |
| Educational | `educational` | Mỗi slide có số bước rõ ràng, progress indicator | Hook → Bước 1 → Bước 2 → ... → CTA |
| Listicle | `listicle` | Mỗi slide = 1 item đánh số, layout đồng nhất | Top N list, mỗi slide 1 điểm |
| Gallery | `gallery` | Background-only, ảnh thực tế, minimal text overlay | Bộ sưu tập ảnh cùng chủ đề |

## Thay đổi kỹ thuật

### 1. Type definitions — `src/types/carousel.ts`
- Thêm `CarouselStyleType = 'seamless' | 'educational' | 'listicle' | 'gallery'`
- Thêm `CAROUSEL_STYLE_OPTIONS` array với label, description, icon cho UI
- Thêm `carouselStyle` vào `CarouselFormData`
- Thêm `carousel_style` vào interface `Carousel`

### 2. Database migration
- `ALTER TABLE carousels ADD COLUMN carousel_style text DEFAULT 'educational'`
- Không cần enum vì dùng text linh hoạt hơn

### 3. UI chọn style — `src/components/carousel/CarouselStyleSelector.tsx` (mới)
- Grid 2x2 cards với icon, tên, mô tả ngắn cho 4 styles
- Tương tự pattern `PlatformSelector` đã có

### 4. Form integration — `src/components/CarouselForm.tsx`
- Thêm `CarouselStyleSelector` vào form, đặt trước Platform selector
- Truyền `carouselStyle` trong `formData`

### 5. Backend: Prompt theo style — `supabase/functions/generate-carousel/index.ts`
- **Thay đổi chính**: `getSystemPrompt()` điều chỉnh logic nội dung theo style:
  - `seamless`: Yêu cầu visual continuity, palette thống nhất, phần tử vắt ngang biên
  - `educational`: Giữ logic hiện tại (Hook → Problem → Explain → CTA) + thêm step numbering
  - `listicle`: Mỗi slide = 1 item, layout đồng nhất, numbering rõ ràng
  - `gallery`: Chỉ tạo prompt ảnh, minimal text, ưu tiên visual quality
- `getSlideObjective()` trả về objective khác theo style
- Truyền `carousel_style` khi insert vào DB

### 6. Image generation: Style-aware prompts — `supabase/functions/generate-carousel-image/index.ts`
- `buildBackgroundPrompt()` nhận thêm `carouselStyle` và `slideNumber`/`totalSlides`:
  - `seamless`: Inject chỉ dẫn "extend visual elements to left/right edges, use consistent color palette across all slides, elements should appear to continue beyond frame boundary"
  - `educational`: Inject step indicator visual cue
  - `listicle`: Inject uniform layout structure
  - `gallery`: Skip text overlay entirely, focus trên ảnh chất lượng cao

### 7. Hook update — `src/hooks/useCarousels.ts`
- Truyền `carouselStyle` trong body gửi đến edge function

### 8. Viewer update — `src/components/CarouselViewer.tsx`
- Hiển thị badge style trên header

## Thứ tự triển khai

1. DB migration (thêm cột)
2. Types + Style constants
3. `CarouselStyleSelector` component
4. Form integration
5. Backend prompt logic theo style
6. Image generation prompt theo style
7. Hook + Viewer updates

## Lưu ý kỹ thuật

- Style `seamless` là phức tạp nhất vì cần context cross-slide (slide n biết slide n+1). Giải pháp: trong system prompt yêu cầu AI tạo palette + visual motif thống nhất, và chỉ dẫn edge-bleeding cho mỗi slide.
- Style `gallery` có thể skip overlay-text-canvas hoàn toàn (đã có logic conditional trong `generate-carousel-image`).
- Backward compatible: default `'educational'` cho carousel cũ.

