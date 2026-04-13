

## Nâng cấp hiển thị kết nối social trên Brand Card

### Hiện trạng
Brand Card đã có hiển thị kết nối nhưng bị lẫn trong hàng badges nhỏ (personas, products, industry memory) → user khó nhận ra.

### Thay đổi trong `src/components/BrandCard.tsx`

**Tách phần kết nối thành section riêng, nổi bật hơn:**

1. **Tách ra khỏi hàng badges** — Di chuyển phần kết nối social ra khỏi `flex-wrap` chung với personas/products, đặt thành một row riêng phía dưới.

2. **Khi chưa kết nối — CTA rõ ràng hơn:**
   - Thay badge nhỏ "Chưa kết nối" bằng một mini-banner ngang full-width
   - Background amber nhẹ, icon `Link2Off` + text "Chưa kết nối kênh nào" + nút "Kết nối ngay →"
   - Click dẫn đến `/brands/{id}?tab=connections`

3. **Khi đã kết nối — row riêng với icon lớn hơn:**
   - Hiển thị các platform icons với size rõ hơn (không bị chen giữa badges khác)
   - Thêm text nhỏ "{n} kênh" bên cạnh icons
   - Vẫn click được để vào tab connections

### Kết quả
- User thấy ngay trạng thái kết nối trên mỗi brand card
- CTA "Kết nối ngay" nổi bật khi chưa kết nối → thúc đẩy user hành động
- Không thay đổi logic, chỉ cải thiện visual hierarchy

### File cần sửa
- `src/components/BrandCard.tsx` — phần Quick Stats (line ~304-364)

