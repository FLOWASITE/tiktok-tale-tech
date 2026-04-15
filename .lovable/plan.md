

## Sửa lỗi "webhookUrl: property webhookUrl should not exist"

### Nguyên nhân
PayOS API v2 **không chấp nhận** trường `webhookUrl` trong body của request tạo payment. Webhook URL phải được cấu hình trực tiếp trên **dashboard PayOS** (https://my.payos.vn → Kênh thanh toán → Webhook URL).

### Sửa chữa

#### 1. `supabase/functions/create-payos-payment/index.ts`
- **Xóa** dòng khai báo `webhookUrl` (dòng 256)
- **Xóa** `webhookUrl` khỏi body gửi tới PayOS API (dòng 281)
- Giữ nguyên checksum (checksum không bao gồm webhookUrl)

#### 2. Cấu hình webhook trên PayOS dashboard
Bạn cần vào https://my.payos.vn → Kênh thanh toán → cài đặt Webhook URL:
```
https://rllyipiyuptkibqinotz.supabase.co/functions/v1/payos-webhook
```

#### 3. Fallback verify vẫn hoạt động
Trang `/payment/result` đã có logic gọi `verify-payos-order` khi user quay về — đây là backup trong trường hợp webhook chậm.

### File cần sửa
- `supabase/functions/create-payos-payment/index.ts` — xóa 2 dòng liên quan `webhookUrl`

