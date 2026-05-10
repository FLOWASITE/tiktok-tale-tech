Sẽ sửa đúng lỗi màu brand trong flow Import Brand:

1. Backend import website
- Chặn màu đen/xám/trắng lọt vào `color_palette.primary`, `theme_color` khi đó chỉ là màu UI/fav icon/CSS chứ không phải brand color.
- Ưu tiên màu lấy từ logo đã chọn/được detect (`logo` source) hơn `theme-color`, CSS variable, frequency trong HTML.
- Với logo SVG: bỏ qua `none`, `transparent`, `currentColor`, `black`, `white`, `#000`, `#fff`; chọn màu không-neutral nổi bật nhất.
- Với logo raster: giữ prompt AI “bỏ qua đen/trắng/xám”, nhưng nếu AI trả màu neutral thì không set primary.

2. Popup Import Brand
- Dòng “Màu chủ đạo” sẽ không tự coi màu đen là Primary nếu nguồn không đáng tin.
- Hiển thị danh sách swatch theo thứ tự: màu logo trước, rồi theme/CSS/AI nếu hợp lệ.
- Nếu phát hiện màu đang là neutral/không chắc, không auto-select; user phải click chọn màu.

3. BrandCreate hydrate
- Khi nhận dữ liệu import, chỉ auto-fill màu nếu đã được user chọn trong popup hoặc chỉ có 1 candidate hợp lệ.
- Nếu có nhiều màu, giữ UI yêu cầu xác nhận màu để tránh lưu nhầm màu đen.

Phạm vi: chỉ sửa frontend popup/create brand và edge function import website; không đổi schema/database.