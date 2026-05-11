## Nguyên nhân
`taf.vn` không khai báo `theme-color`, không có CSS variable inline như `--primary`, và màu brand nằm trong logo raster `/uploads/logo.jpg`. Pipeline hiện tại có gọi AI vision để đọc màu từ logo, nhưng nếu AI gateway thiếu key/thất bại/timeout thì không có fallback local cho ảnh raster, nên `color_palette.primary` rỗng và UI không có “Màu chủ đạo”.

## Kế hoạch sửa
1. **Thêm fallback đọc màu từ raster logo trong edge function**
   - Trong `supabase/functions/import-brand-from-website/index.ts`, mở rộng `extractColorFromLogo()`.
   - Giữ logic SVG hiện tại.
   - Với JPG/PNG/WebP: nếu AI vision không trả màu, dùng fallback deterministic bằng Canvas API trong Deno để lấy dominant non-neutral color từ pixel ảnh.
   - Lọc trắng/đen/xám như logic hiện tại, gom màu theo bucket để tránh nhiễu.

2. **Ưu tiên logo thật của website**
   - `taf.vn` có logo trong `<header><div class="logo"><img src="/uploads/logo.jpg">` và JSON-LD.
   - Giữ scoring hiện tại nhưng đảm bảo logo raster vẫn được xử lý nếu lấy được URL.

3. **Đồng bộ fallback khi lưu màu**
   - Trong `BrandImportDialog.tsx`, cập nhật `handleApply` để nếu `selectedPrimaryColor` rỗng thì fallback thêm `palette.candidates?.[0]` trước `theme_color`/AI suggestion.
   - Tránh case UI có candidate nhưng submit không lưu.

4. **Test mục tiêu**
   - Import `https://taf.vn`.
   - Kỳ vọng `raw_meta.color_palette.primary` ra đỏ brand khoảng `#c01020`/đỏ gần tương đương.
   - Checkbox “Màu chủ đạo” tự tick, swatch Primary active, và khi bấm lưu thì `primary_color` được ghi.