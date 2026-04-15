

## Sửa lỗi PayOS webhook không được gọi → subscription không cập nhật

### Nguyên nhân gốc
Khi tạo link thanh toán (`create-payos-payment`), request gửi tới PayOS **thiếu trường `webhookUrl`**. PayOS chỉ redirect user về `returnUrl` sau khi thanh toán, nhưng **không gọi webhook** để cập nhật trạng thái đơn hàng và subscription.

Kết quả: 2 payment_orders enterprise đang `pending`, subscription vẫn là `pro`.

### Sửa chữa

#### 1. `supabase/functions/create-payos-payment/index.ts`
- Thêm `webhookUrl` vào body gửi PayOS API, trỏ tới edge function `payos-webhook`:
  ```
  webhookUrl: `${supabaseUrl}/functions/v1/payos-webhook`
  ```
- Cập nhật checksum string theo spec PayOS (nếu PayOS yêu cầu webhookUrl trong checksum)

#### 2. Xử lý 2 đơn hàng pending hiện tại
- Gọi PayOS API kiểm tra trạng thái 2 order đang pending (`orderCode: 177623065749` và `177622981687`)
- Nếu đã thanh toán thành công → cập nhật thủ công `payment_orders.status = 'success'` và nâng subscription lên `enterprise`

#### 3. Thêm fallback tại `returnUrl` page
- Tại trang `/payment/result`, khi user quay về sau thanh toán, gọi API check trạng thái order
- Nếu webhook chưa xử lý kịp, frontend tự verify và trigger update

### File cần sửa
- `supabase/functions/create-payos-payment/index.ts` — thêm `webhookUrl`
- `src/pages/PaymentResult.tsx` (hoặc tương đương) — thêm fallback verify
- Migration SQL — fix 2 đơn hàng pending hiện tại

