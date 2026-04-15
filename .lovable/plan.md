

## Sửa lỗi thanh toán PayOS và màn hình trắng

### Vấn đề 1: PayOS lỗi 214 (cổng tạm dừng)
PayOS vẫn trả mã lỗi `214: "Cổng thanh toán không tồn tại hoặc đã tạm dừng"` ngay cả sau khi cập nhật credentials. Đây là lỗi từ phía PayOS — cổng thanh toán cần được **kích hoạt (Active)** trên dashboard PayOS tại https://my.payos.vn.

**Bạn cần kiểm tra trên PayOS dashboard:**
- Đăng nhập → Cổng thanh toán → Đảm bảo trạng thái là "Hoạt động"
- Nếu đang ở chế độ "Test", cần bật cổng test

### Vấn đề 2: Màn hình trắng khi thanh toán lỗi

**Nguyên nhân:** Edge function `create-payos-payment` trả `status: 500` khi PayOS lỗi. `supabase.functions.invoke` ném exception, nhưng UI có thể crash nếu error object không có `.message` chuẩn.

**Sửa:**

1. **`supabase/functions/create-payos-payment/index.ts`** (dòng 283-290):
   - Khi PayOS trả lỗi, đổi từ `status: 500` thành `status: 200` kèm `{ error: ..., errorCode: 'GATEWAY_ERROR' }`.
   - Giúp frontend nhận `data` thay vì `error`, tránh crash.

2. **`src/components/UpgradePlanDialog.tsx`** (dòng 176-184):
   - Sau `supabase.functions.invoke`, kiểm tra `data?.error` trước khi đọc `payment_url`.
   - Nếu `data.error` tồn tại, hiện toast lỗi thay vì crash.

3. **`src/pages/Pricing.tsx`**: Áp dụng cùng pattern xử lý lỗi.

### Chi tiết kỹ thuật

```typescript
// Edge function: trả 200 thay vì 500 cho lỗi PayOS
if (payosResult.code !== '00') {
  return new Response(JSON.stringify({ 
    error: payosResult.desc || 'Không thể tạo link thanh toán',
    errorCode: 'GATEWAY_ERROR',
  }), {
    status: 200,  // thay vì 500
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Frontend: check data.error
const { data, error } = await supabase.functions.invoke(functionName, { body });
if (error) throw error;
if (data?.error) throw new Error(data.error);
```

### File cần sửa
- `supabase/functions/create-payos-payment/index.ts`
- `src/components/UpgradePlanDialog.tsx`
- `src/pages/Pricing.tsx`

