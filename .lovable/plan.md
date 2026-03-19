

## Thay emoji bằng Lucide icons cho Carousel Style & Visual Preset

### Vấn đề
Các card "Phong cách nội dung" và "Phong cách thiết kế ảnh" đang dùng emoji (`🎞️`, `📚`, `📋`, `🖼️`, `✨`, `📊`, `🌈`, `🏢`, `🎨`, `📸`) — trông cũ và không đồng nhất.

### Giải pháp
Chuyển sang **Lucide React icons** với render dạng component thay vì string emoji.

### Thay đổi

**1. `src/types/carousel.ts`** — Đổi type `icon` từ `string` sang `string` (tên Lucide icon)

| Option | Emoji cũ | Lucide icon mới |
|--------|----------|-----------------|
| **Carousel Style** | | |
| seamless | 🎞️ | `Layers` |
| educational | 📚 | `GraduationCap` |
| listicle | 📋 | `ListOrdered` |
| gallery | 🖼️ | `Images` |
| **Visual Preset** | | |
| minimalist | ✨ | `Minus` (clean/minimal) |
| flat_design | 📊 | `BarChart3` |
| gradient | 🌈 | `Blend` |
| geometric | 🏢 | `Hexagon` |
| illustration | 🎨 | `Paintbrush` |
| product_only | 📸 | `Focus` |

**2. `src/components/carousel/CarouselStyleSelector.tsx`** — Import Lucide icons, render `<IconComponent>` thay vì `{option.icon}` text

**3. `src/components/carousel/VisualPresetSelector.tsx`** — Tương tự, render Lucide icon component

### Chi tiết kỹ thuật
- Thay `icon: string` (emoji) thành `icon: string` (Lucide icon name) trong type definition
- Tạo icon map trong mỗi selector component để map tên → component
- Render với `size={18}` và `className="text-primary"` khi selected, `"text-muted-foreground"` khi chưa chọn

