

## Tích hợp payOS làm cổng thanh toán thứ 2 (bên cạnh VNPay)

### Tổng quan
Thêm payOS như một phương thức thanh toán mới. User chọn giữa **VNPay** hoặc **payOS** trước khi thanh toán. payOS sử dụng mô hình A2A (tiền về tài khoản ngay), SDK REST API (không cần npm package trong Deno edge function).

### Kiến trúc

```text
PaymentConfirmDialog
  ├── [Bước 1] Chọn cổng: VNPay | payOS
  ├── [Bước 2] Chọn phương thức (VNPay: QR/ATM/Ví/Thẻ, payOS: QR VietQR)
  └── Xác nhận → gọi edge function tương ứng

Edge Functions:
  create-payos-payment  → tạo link thanh toán payOS
  payos-webhook         → nhận webhook từ payOS, cập nhật payment_orders + subscriptions
```

### Chi tiết kỹ thuật

**1. Secrets cần thêm (3 keys)**
- `PAYOS_CLIENT_ID` — Client ID từ kênh thanh toán payOS
- `PAYOS_API_KEY` — API Key
- `PAYOS_CHECKSUM_KEY` — Checksum Key để verify webhook

**2. Edge function `supabase/functions/create-payos-payment/index.ts`**
- Nhận body: `{ organization_id, plan_type, billing_cycle, return_url, voucher_code }`
- Auth check, voucher validation, proration — tái sử dụng logic giống VNPay
- Gọi payOS REST API `POST https://api-merchant.payos.vn/v2/payment-requests` với:
  - `orderCode`: số nguyên unique (timestamp-based)
  - `amount`, `description`, `items[]`
  - `cancelUrl`, `returnUrl`
- Tạo checksum HMAC-SHA256 theo spec payOS
- Lưu `payment_orders` với `payment_provider: 'payos'`, `payos_order_code` trong metadata
- Trả về `{ checkout_url, qr_code }` cho frontend

**3. Edge function `supabase/functions/payos-webhook/index.ts`**
- Verify webhook signature bằng `PAYOS_CHECKSUM_KEY`
- Nếu `code === '00'` → cập nhật `payment_orders` thành `success`, kích hoạt subscription (logic giống `vnpay-callback`)
- Idempotent qua `orderCode`

**4. Migration: thêm cột `payment_provider` vào `payment_orders`**
- Thêm cột `payment_provider TEXT DEFAULT 'vnpay'` nếu chưa có
- Đảm bảo `vnpay_txn_ref` nullable (payOS dùng `orderCode` riêng)

**5. Frontend `PaymentConfirmDialog.tsx`**
- Thêm bước chọn cổng thanh toán (VNPay vs payOS) phía trên phương thức thanh toán
- Khi chọn payOS: ẩn grid 4 phương thức VNPay, chỉ hiện "QR VietQR — tiền về tài khoản ngay"
- Khi chọn VNPay: giữ nguyên grid 4 phương thức hiện tại
- Truyền `payment_gateway: 'vnpay' | 'payos'` trong `onConfirm`

**6. `UpgradePlanDialog.tsx` + `Pricing.tsx` + `landing/Pricing.tsx`**
- Nhận `payment_gateway` từ `onConfirm`
- Nếu `'payos'` → gọi `create-payos-payment`, redirect đến `checkout_url`
- Nếu `'vnpay'` → giữ logic hiện tại

**7. `PaymentResult.tsx`**
- Xử lý return URL từ payOS (query params khác VNPay)
- Phân biệt kết quả dựa trên params có trong URL

**8. `supabase/config.toml`**
- Thêm `[functions.create-payos-payment]` và `[functions.payos-webhook]` với `verify_jwt = false`

**9. Security footer**
- Cập nhật text "Bảo mật bởi VNPay" → dynamic theo cổng đã chọn ("Bảo mật bởi payOS" hoặc "Bảo mật bởi VNPay")

### Thứ tự thực hiện
1. Yêu cầu user nhập 3 secrets payOS
2. Tạo edge function `create-payos-payment`
3. Tạo edge function `payos-webhook`
4. Migration DB nếu cần
5. Cập nhật UI: PaymentConfirmDialog, UpgradePlanDialog, Pricing, PaymentResult

