

## Thêm CTA thông minh & Entry point nâng cấp gói

### Hiện trạng
- Nút "Nâng cấp" chỉ xuất hiện ở: Dashboard widget (khi quota >= 80%), trang Account, trang Pricing, và khi bị lỗi quota
- User phải tự navigate đến `/pricing` hoặc `/account` mới thấy nút upgrade
- Không có CTA proactive khi user gần hết quota trong lúc làm việc

### Cải tiến

**1. Upgrade banner trong Sidebar (free/starter plan)**
- Thêm compact upgrade card phía trên footer trong `AppSidebar.tsx`
- Chỉ hiện với user đang dùng gói `free` hoặc `starter`
- Hiển thị: icon Sparkles + "Nâng cấp để mở khóa thêm" + nút CTA nhỏ
- Click mở `UpgradePlanDialog` trực tiếp (không redirect sang `/pricing`)
- Khi sidebar collapsed: chỉ hiện icon Zap với tooltip

**2. Quota warning toast khi gần hết (80%+)**
- Tạo hook `useQuotaWarning` kiểm tra usage khi mount
- Khi bất kỳ metric nào >= 80%: hiện toast 1 lần/session với nút "Nâng cấp"
- Khi >= 100%: hiện toast warning rõ ràng hơn
- Đặt trong `AppLayout.tsx` để chạy globally
- Dùng `sessionStorage` để không spam toast mỗi lần navigate

**3. Inline upgrade prompt khi hết quota**
- Tạo component `QuotaExhaustedBanner` — banner nhỏ hiện khi user cố tạo content mà hết quota
- Props: `usageType`, `onUpgrade`
- Hiển thị: "Bạn đã hết {N} lượt {type} tháng này. Nâng cấp để tiếp tục."
- Tích hợp vào các trang tạo content chính (ScriptGenerator, CarouselBuilder, MultiChannelViewer)

**4. Plan badge click-to-upgrade**
- Badge gói hiện tại ở DashboardHeader đã clickable navigate `/pricing`
- Thêm tương tự cho badge trong UsageQuotaWidget và Account page: click mở UpgradePlanDialog

### Kỹ thuật

**File mới:**
- `src/hooks/useQuotaWarning.ts` — Hook kiểm tra quota và hiện toast cảnh báo
- `src/components/QuotaExhaustedBanner.tsx` — Banner inline khi hết quota

**File sửa:**
- `src/components/AppSidebar.tsx` — Thêm upgrade card trước footer
- `src/components/AppLayout.tsx` — Gọi `useQuotaWarning()`
- `src/components/dashboard/UsageQuotaWidget.tsx` — Badge click mở upgrade dialog
- Các trang tạo content — Thêm `QuotaExhaustedBanner` khi cần

