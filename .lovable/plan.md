
## Vấn đề
Trang `/multichannel` (form tạo nội dung đa kênh) hiện đang render **bên ngoài AppLayout** — không có sidebar, header, organization switcher... User muốn form này nằm trong layout chính như các trang khác.

## Cần kiểm tra
- `src/App.tsx` (route definition cho `/multichannel`)
- So sánh với route đã wrap `AppLayout` (vd `/scripts`, `/scripts/new`)

## Plan

### 1. Wrap route `/multichannel` bằng `AppLayout`
Trong `src/App.tsx`:
- Tìm route `<Route path="/multichannel" element={<MultiChannel />} />`
- Đổi thành:
  ```tsx
  <Route path="/multichannel" element={<AppLayout><MultiChannel /></AppLayout>} />
  ```
- Áp dụng tương tự cho các sub-route liên quan nếu có (`/multichannel/new`, `/multichannel/:id`...).

### 2. Kiểm tra padding/width nội bộ
- Nếu trang `MultiChannel` đang tự set `min-h-screen` hoặc full-bleed background, gỡ bỏ để khớp với `<main>` của `AppLayout` (đã có `p-4 sm:p-6`).

## Files sẽ sửa
- `src/App.tsx` — wrap route với `AppLayout`
- `src/pages/MultiChannel.tsx` (chỉ nếu cần gỡ wrapper trùng)

## Kết quả
- Form đa kênh hiển thị cùng sidebar + header + brand switcher như `/scripts`.
- Điều hướng nhất quán toàn app.
