

## Thêm UI chọn phương thức thanh toán VNPay (QR Code / ATM / Ví điện tử)

### Mô tả
Thêm bước chọn phương thức thanh toán trong PaymentConfirmDialog. User chọn 1 trong 3 phương thức, hệ thống truyền `vnp_BankCode` tương ứng sang VNPay để redirect đúng luồng.

### Phương thức VNPay hỗ trợ
| Phương thức | vnp_BankCode | Mô tả |
|---|---|---|
| QR Code | `VNPAYQR` | Quét mã QR bằng app ngân hàng |
| ATM nội địa | `VNBANK` | Thẻ ATM/Internet Banking |
| Ví điện tử | `VNPAYEWALLET` | Ví VNPay, MoMo qua VNPay |
| Thẻ quốc tế | `INTCARD` | Visa/Mastercard/JCB |

### Kỹ thuật

**1. `src/components/PaymentConfirmDialog.tsx`**
- Thêm state `paymentMethod` (default: `VNPAYQR`)
- Thêm section UI chọn phương thức: grid 2x2 với icon + label cho mỗi option (QR Code, ATM, Ví điện tử, Thẻ quốc tế)
- Style: radio-card pattern (border highlight khi selected)
- Thêm prop `onPaymentMethodChange?: (bankCode: string) => void` hoặc bổ sung `paymentMethod` vào `onConfirm`
- Thay section "Payment method" tĩnh hiện tại bằng grid chọn interactive

**2. `src/components/UpgradePlanDialog.tsx`**
- Nhận `paymentMethod` từ PaymentConfirmDialog
- Truyền `bank_code` vào body khi gọi `create-vnpay-payment`

**3. `src/pages/Pricing.tsx`**
- Tương tự: truyền `bank_code` vào edge function call

**4. `supabase/functions/create-vnpay-payment/index.ts`**
- Nhận thêm param `bank_code` từ body
- Nếu có, thêm `vnp_BankCode` vào `vnpParams` trước khi ký hash
- Nếu không có, bỏ qua (VNPay sẽ hiện tất cả phương thức)

**5. `src/pages/PaymentResult.tsx`**
- Hiển thị phương thức thanh toán đã dùng dựa trên `vnp_CardType` hoặc `vnp_BankCode` từ response

