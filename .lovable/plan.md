

# Tích hợp VNPay thanh toán nâng cấp gói

## Tổng quan

Tạo flow thanh toán VNPay để user nâng cấp gói từ trong app. VNPay hoạt động theo mô hình redirect: user chọn gói → tạo URL thanh toán → redirect sang VNPay → thanh toán → VNPay callback (IPN) về server → cập nhật subscription.

```text
User chọn gói → Edge Function tạo VNPay URL → Redirect VNPay → Thanh toán
                                                                    ↓
App hiển thị kết quả ← Redirect return_url ← VNPay IPN callback → Update DB
```

## Yêu cầu từ bạn

Bạn cần đăng ký tài khoản merchant tại [VNPay](https://vnpay.vn) để lấy 3 thông tin:
- **vnp_TmnCode** — Mã website (terminal code)
- **vnp_HashSecret** — Chuỗi bí mật để ký checksum
- **VNPay URL** — Sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`

Tôi sẽ yêu cầu bạn nhập 2 secret: `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET`.

## Phạm vi thay đổi (~6 files)

### 1. Edge Function: `create-vnpay-payment` (mới)
- Nhận `organization_id`, `plan_type` (starter/pro/enterprise), `billing_cycle` (monthly/yearly)
- Xác thực user đang đăng nhập và là member của org
- Tính giá từ bảng `plan_limits`
- Tạo VNPay payment URL với checksum HMAC-SHA512
- Lưu pending order vào DB
- Trả về URL redirect

### 2. Edge Function: `vnpay-callback` (mới)
- Nhận VNPay IPN callback (GET params)
- Verify checksum bằng `VNPAY_HASH_SECRET`
- Nếu thành công: cập nhật `subscriptions` (plan_type, status, period, payment_provider = 'vnpay')
- Nếu thất bại: log lỗi, giữ nguyên subscription

### 3. Database: Bảng `payment_orders` (mới)
- Lưu mỗi lần thanh toán: `id`, `organization_id`, `plan_type`, `amount`, `billing_cycle`, `vnpay_txn_ref`, `status` (pending/success/failed), `vnpay_response`, `created_at`
- RLS: chỉ org member đọc được order của org mình

### 4. `src/pages/Account.tsx`
- Nút "Nâng cấp gói" mở dialog chọn gói
- Hiển thị bảng giá (từ `plan_limits`) với nút "Thanh toán"
- Gọi `create-vnpay-payment`, redirect user sang VNPay

### 5. `src/pages/PaymentResult.tsx` (mới)
- Route `/payment/result` — VNPay redirect về đây sau thanh toán
- Parse query params, hiển thị kết quả (thành công/thất bại)
- Nếu thành công: refetch subscription, hiển thị thông báo

### 6. `src/components/landing/PricingSection.tsx`
- Nút CTA cho user đã đăng nhập → mở flow thanh toán thay vì redirect register

## Chi tiết kỹ thuật

### VNPay Payment URL params
- `vnp_Version`: 2.1.0
- `vnp_TmnCode`: từ secret
- `vnp_Amount`: giá × 100 (VNPay yêu cầu đơn vị nhỏ nhất)
- `vnp_OrderInfo`: "Nang cap goi {plan} cho {org_name}"
- `vnp_ReturnUrl`: `{app_url}/payment/result`
- `vnp_IpnUrl`: `{supabase_url}/functions/v1/vnpay-callback`
- `vnp_SecureHash`: HMAC-SHA512 của tất cả params

### Bảo mật
- `create-vnpay-payment`: verify JWT, check org membership
- `vnpay-callback`: verify_jwt = false (VNPay gọi trực tiếp), verify bằng checksum
- Idempotent: check `vnpay_txn_ref` unique trước khi update subscription

