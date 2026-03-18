

# Hệ thống Voucher giảm giá Subscription

## Tổng quan

Xây dựng hệ thống voucher cho phép Admin tạo/quản lý mã giảm giá, và người dùng nhập mã khi thanh toán nâng cấp gói để được giảm giá.

## 1. Database — Bảng `vouchers` + `voucher_usages`

### Bảng `vouchers`
```sql
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,        -- % hoặc số tiền VND
  max_uses INTEGER DEFAULT NULL,          -- NULL = không giới hạn
  used_count INTEGER DEFAULT 0,
  applicable_plans TEXT[] DEFAULT NULL,    -- NULL = áp dụng tất cả, ['pro','business']
  min_amount NUMERIC DEFAULT 0,           -- Đơn hàng tối thiểu
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL,    -- NULL = không hết hạn
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.voucher_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  payment_order_id UUID REFERENCES payment_orders(id),
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: Chỉ admin đọc/ghi `vouchers`. Authenticated users đọc voucher active (để validate). `voucher_usages` chỉ admin đọc.

## 2. Edge Function — Validate & Apply voucher

### Cập nhật `create-vnpay-payment/index.ts`
- Thêm param `voucher_code` (optional) từ body
- Nếu có `voucher_code`:
  - Query `vouchers` → validate: active, chưa hết hạn, chưa hết lượt, applicable_plans match
  - Tính `discount_amount` (percentage hoặc fixed), trừ vào `amount`
  - Lưu `voucher_id` + `discount_amount` vào `payment_orders.metadata`
  
### Cập nhật `vnpay-callback/index.ts`
- Khi payment success, nếu metadata có `voucher_id`:
  - Tăng `vouchers.used_count += 1`
  - Insert vào `voucher_usages`

## 3. Frontend — Nhập voucher khi thanh toán

### `src/components/UpgradePlanDialog.tsx`
- Thêm input "Mã voucher" + nút "Áp dụng"
- Gọi edge function hoặc query trực tiếp để validate mã → hiển thị giảm giá preview
- Truyền `voucher_code` vào `create-vnpay-payment`

### `src/pages/Pricing.tsx`
- Tương tự, thêm input voucher trước khi redirect thanh toán

## 4. Admin — Quản lý voucher

### Trang mới `src/pages/AdminVouchers.tsx`
- Danh sách voucher (Table): code, loại giảm, giá trị, đã dùng/tối đa, trạng thái, hạn
- Tạo voucher mới (Dialog form)
- Bật/tắt voucher, xem lịch sử sử dụng
- Route: `/admin/vouchers`

### Cập nhật `src/App.tsx` + `src/components/AppSidebar.tsx`
- Thêm route `/admin/vouchers` → `AdminVouchers`
- Thêm menu item "Vouchers" trong nhóm Admin sidebar (icon: Ticket)

## Tóm tắt file thay đổi

| File | Thay đổi |
|---|---|
| Migration SQL | Tạo bảng `vouchers`, `voucher_usages` + RLS |
| `supabase/functions/create-vnpay-payment/index.ts` | Validate & apply voucher code |
| `supabase/functions/vnpay-callback/index.ts` | Ghi nhận voucher usage khi thanh toán thành công |
| `src/components/UpgradePlanDialog.tsx` | Thêm input voucher + preview giảm giá |
| `src/pages/Pricing.tsx` | Thêm input voucher |
| `src/pages/AdminVouchers.tsx` | Trang quản lý voucher (mới) |
| `src/App.tsx` | Thêm route admin/vouchers |
| `src/components/AppSidebar.tsx` | Thêm menu Vouchers trong admin |

