

## Cập nhật edge function `create-vnpay-payment` hỗ trợ sandbox/production

### Thay đổi

**`supabase/functions/create-vnpay-payment/index.ts`** (dòng 84)

Thay URL sandbox hardcode bằng logic chọn URL dựa trên `VNPAY_ENV`:

```typescript
// Trước (hardcode sandbox)
const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// Sau (dynamic)
const vnpEnv = Deno.env.get('VNPAY_ENV') || 'sandbox';
const vnpUrl = vnpEnv === 'production'
  ? 'https://pay.vnpay.vn/vpcpay.html'
  : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
```

Thêm `environment: vnpEnv` vào response JSON để frontend biết đang dùng môi trường nào (hữu ích cho debug/hiển thị badge).

**`supabase/functions/vnpay-callback/index.ts`**

Tương tự cập nhật nếu có hardcode URL sandbox (để đảm bảo đồng bộ).

**Secret `VNPAY_ENV`**

Thêm secret `VNPAY_ENV` với giá trị `sandbox` (mặc định). Khi go-live, đổi thành `production` cùng với `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` tương ứng production.

