

# Thêm dropdown nhảy nhanh đến tháng cụ thể

## Mô tả
Khi chế độ "Theo tháng" đang bật, thêm một dropdown thứ 2 liệt kê các tháng có bài (VD: "Tháng 4, 2026", "Tháng 3, 2026"). Khi chọn tháng, tự động cuộn đến nhóm tháng đó.

## Thay đổi

### `src/components/multichannel/ChannelGroupView.tsx`

1. **Thêm dropdown chọn tháng** (chỉ hiện khi `sortBy === 'month_group'`):
   - Đặt bên cạnh dropdown sort hiện tại
   - Liệt kê các tháng có bài viết từ `groupByMonth(items)`
   - Option đầu tiên: "Tất cả tháng" (mặc định)

2. **Gắn `id` cho mỗi nhóm tháng**:
   - Mỗi `<div>` nhóm tháng sẽ có `id={group.key}` (VD: `id="2026-03"`)

3. **Scroll đến tháng khi chọn**:
   - Khi user chọn tháng từ dropdown, gọi `document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
   - Dùng state `selectedMonth` để track tháng đang chọn

4. **Reset** `selectedMonth` khi chuyển tab kênh hoặc chuyển sort mode

