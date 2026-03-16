
## Fix: Layout luôn chỉ có 1 kiểu — đã sửa

### Vấn đề
Frontend dùng ternary cứng thay vì lấy layout từ template, khiến tất cả ảnh đều render cùng 1 layout.

### Đã sửa (3 files)
1. **`src/hooks/useAutoImageGeneration.ts`** — Mở rộng type union thêm `'split' | 'stack'`
2. **`src/lib/hybridImageGenerator.ts`** — `DecomposedRequest` thêm field `layout?`, `applyTemplate` trả về `layout` từ template
3. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Dùng `applyResult.layout` thay vì ternary cứng, fallback vẫn giữ logic cũ cho template 'auto'
