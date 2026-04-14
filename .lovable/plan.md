

## Hoàn thiện PaymentConfirmDialog

### Cải tiến

**1. Thêm thông tin chi tiết gói mới**
- Hiển thị danh sách tính năng chính của gói đang nâng cấp (quota: content, ảnh, scripts, carousels)
- Giúp user biết mình sẽ nhận được gì

**2. Cải thiện UI/UX**
- Thêm hiệu ứng gradient/highlight cho tổng thanh toán
- Thêm icon Lock/Shield nhỏ bên cạnh nút thanh toán để tạo cảm giác an toàn
- Thêm dòng "Bảo mật bởi VNPay" với icon khóa ở footer
- Thêm animation nhẹ khi dialog mở (scale-in)

**3. Hiển thị tiết kiệm**
- Khi chọn gói yearly, hiển thị số tiền tiết kiệm so với monthly (ví dụ: "Tiết kiệm 1.188.000₫/năm")
- Khi có voucher hoặc prorate, hiển thị gạch ngang giá gốc

**4. Thêm điều khoản**
- Dòng text nhỏ: "Bằng việc thanh toán, bạn đồng ý với Điều khoản sử dụng"
- Link đến terms of service

**5. Props bổ sung**
- Thêm prop `yearlyDiscount` (optional) để hiển thị mức tiết kiệm
- Thêm prop `planFeatures` (optional) để hiển thị tóm tắt tính năng gói mới

### Kỹ thuật

**File sửa:**

**`src/components/PaymentConfirmDialog.tsx`**
- Thêm interface `PlanFeatureSummary` với các trường quota
- Thêm section "Tính năng gói mới" với grid hiển thị quota (brands, content, ảnh, scripts, carousels)
- Thêm badge "Tiết kiệm X₫" khi yearly
- Thêm gạch ngang giá gốc khi có discount
- Thêm dòng bảo mật + điều khoản ở cuối
- Thêm props: `yearlyDiscount?: number`, `planFeatures?: { label: string; value: string }[]`

**`src/components/UpgradePlanDialog.tsx`**
- Truyền thêm `planFeatures` và `yearlyDiscount` vào PaymentConfirmDialog khi mở confirm

**`src/pages/Pricing.tsx`**
- Tương tự, truyền thêm props mới vào PaymentConfirmDialog

