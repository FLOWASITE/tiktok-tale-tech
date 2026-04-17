
## Update Privacy Policy — Mention app by name

Reviewer (likely Google Play / App Store) yêu cầu Privacy Policy phải nhắc rõ **tên app**. Hiện file có "Flowa" trong section 1 nhưng:
- Hero title chỉ ghi "Chính sách bảo mật" — không có tên app.
- Không có tuyên bố rõ "This Privacy Policy applies to the **[App Name]** application/app".
- Có 2 file trùng lặp: `src/pages/PrivacyPolicy.tsx` và `src/landing/pages/PrivacyPolicy.tsx` → cần update cả 2.

### Thay đổi

**File:** `src/landing/pages/PrivacyPolicy.tsx` và `src/pages/PrivacyPolicy.tsx` (cùng nội dung)

1. **Hero subtitle**: thêm dòng nêu rõ tên app:
   > "Chính sách bảo mật này áp dụng cho ứng dụng **Flowa** (flowa.one) — nền tảng AI Content Marketing."

2. **Section 1 — Giới thiệu**: viết lại câu mở đầu để nhắc tên app rõ ràng nhiều lần:
   > "Chính sách Bảo mật này ("Chính sách") áp dụng cho ứng dụng **Flowa** ("Flowa", "ứng dụng", "chúng tôi") — nền tảng AI Content Marketing được vận hành tại flowa.one và app.flowa.one. Chính sách này giải thích cách ứng dụng Flowa thu thập, sử dụng..."

3. **SEO title**: đổi `title="Chính sách bảo mật"` → `title="Chính sách bảo mật — Flowa"` để tên app xuất hiện trong metadata.

4. **Cập nhật ngày**: "Cập nhật lần cuối: 17 tháng 4, 2026".

### Không đổi
- Cấu trúc section, styling, routes.
- Nội dung pháp lý khác giữ nguyên.
